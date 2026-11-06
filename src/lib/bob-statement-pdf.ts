import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import type { AccountDetailsType, TransactionType } from '@/lib/types';
import { getAccountTypeLabel } from '@/lib/account-type';

export interface BobStatementPdfOptions {
  account: AccountDetailsType;
  transactions: TransactionType[];
  currentBalance: number;
  from: Date;
  to: Date;
  bobWorldLogo?: string | null;
  bankLogo?: string | null;
}

interface StatementRow {
  serial: string;
  transactionDate: string;
  valueDate: string;
  description: string;
  chequeNumber: string;
  debit: string;
  credit: string;
  balance: string;
}

type TextAlign = 'left' | 'center' | 'right';

const PAGE_WIDTH = 210;
const TABLE_X = 7.25;
const TABLE_WIDTH = 195.5;
// Measured from the supplied 595 x 842 pt reference PDF.
const COLUMN_WIDTHS = [9, 16.2, 15.2, 60.6, 19.8, 23.3, 23.3, 28.1];
const HEADER_HEIGHT = 13.8;
const FIRST_TABLE_Y = 149;
const CONTINUATION_TABLE_Y = 64;
const FOOTER_TOP = 223.3;
const FOOTER_NOTE_HEIGHT = 38.8;
const FIRST_PAGE_ROW_LIMIT = 7;
const CONTINUATION_ROW_LIMIT = 18;
const SOURCE_HEADER_X = 6.88;
const SOURCE_HEADER_Y = 6.88;
const SOURCE_HEADER_WIDTH = 195.8;
const SOURCE_HEADER_HEIGHT = 52.2;
const HINDI_IMAGE_CACHE = new Map<string, { data: string; height: number }>();

const DEFAULT_NOTE_HINDI = 'नोट : हम आपको यह सूचित करते हैं कि इसमें किसी प्रकार की विसंगति पाए जाने पर अपनी मूल शाखा से संपर्क करें अथवा बॉब वर्ल्ड ऐप की सहायता से अपनी शिकायत दर्ज करें।';
const DEFAULT_NOTE_ENGLISH = 'Note: In case you find any discrepancy, we advise you to take it up with your base branch or raise a complaint using bob World.';

const money = (value: number): string => new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Math.abs(value));

const dateText = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? format(date, 'dd-MM-yyyy') : '';
};

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

function movement(transaction: TransactionType): number {
  const amount = Math.abs(Number(transaction.amount) || 0);
  return transaction.type === 'credit' ? amount : -amount;
}

function openingBalanceForRange(
  account: AccountDetailsType,
  transactions: TransactionType[],
  currentBalance: number,
  from: Date,
): number {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const startTime = start.getTime();
  const ordered = transactions
    .filter(tx => Number.isFinite(new Date(tx.date).getTime()) && Number.isFinite(Number(tx.amount)))
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const prior = ordered.filter(tx => new Date(tx.date).getTime() < startTime);
  const lastBalance = prior.slice().reverse().find(tx =>
    typeof tx.balanceAfter === 'number' && Number.isFinite(tx.balanceAfter),
  );
  if (lastBalance && typeof lastBalance.balanceAfter === 'number') {
    return roundMoney(lastBalance.balanceAfter);
  }

  if (typeof account.statementOpeningBalance === 'number' && Number.isFinite(account.statementOpeningBalance)) {
    const configuredStart = account.statementPeriodFrom ? new Date(account.statementPeriodFrom) : null;
    const baseTime = configuredStart && Number.isFinite(configuredStart.getTime())
      ? new Date(configuredStart.getFullYear(), configuredStart.getMonth(), configuredStart.getDate()).getTime()
      : Number.NEGATIVE_INFINITY;
    if (startTime >= baseTime) {
      const movementSinceOpening = ordered
        .filter(tx => {
          const time = new Date(tx.date).getTime();
          return time >= baseTime && time < startTime;
        })
        .reduce((sum, tx) => sum + movement(tx), 0);
      return roundMoney(account.statementOpeningBalance + movementSinceOpening);
    }
  }

  const futureMovement = ordered
    .filter(tx => new Date(tx.date).getTime() >= startTime)
    .reduce((sum, tx) => sum + movement(tx), 0);
  return roundMoney((Number.isFinite(currentBalance) ? currentBalance : 0) - futureMovement);
}

async function fetchFontBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load the statement PDF font: ' + url);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function registerStatementFonts(doc: jsPDF): Promise<void> {
  const [regular, bold] = await Promise.all([
    fetchFontBase64('/assets/fonts/LiberationSans-Regular.ttf'),
    fetchFontBase64('/assets/fonts/LiberationSans-Bold.ttf'),
  ]);
  doc.addFileToVFS('LiberationSans-Regular.ttf', regular);
  doc.addFileToVFS('LiberationSans-Bold.ttf', bold);
  doc.addFont('LiberationSans-Regular.ttf', 'LiberationSans', 'normal');
  doc.addFont('LiberationSans-Bold.ttf', 'LiberationSans', 'bold');
}

async function fetchPngDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load statement artwork: ' + url);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return 'data:image/png;base64,' + btoa(binary);
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (context.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Rasterises only Devanagari runs using the platform's own Hindi font stack.
 * English stays as PDF text. This avoids jsPDF Helvetica missing-glyph boxes
 * while preserving Hindi shaping and matras in every generated page.
 */
function hindiImage(
  text: string,
  widthMm: number,
  fontSizePt: number,
  align: TextAlign,
  bold: boolean,
  color: string,
): { data: string; height: number } {
  if (typeof document === 'undefined') {
    throw new Error('Bilingual statement generation requires a browser with Hindi text rendering support.');
  }
  const key = [text, widthMm, fontSizePt, align, bold, color].join('|');
  const cached = HINDI_IMAGE_CACHE.get(key);
  if (cached) return cached;

  const pixelsPerMm = 96 / 25.4;
  const cssWidth = Math.max(8, widthMm * pixelsPerMm);
  const fontPixels = fontSizePt * 96 / 72;
  const linePixels = fontPixels * 1.34;
  const fontFamily = '"Nirmala UI", "Noto Sans Devanagari", "Mangal", "Arial Unicode MS", sans-serif';

  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = Math.ceil(cssWidth);
  measureCanvas.height = Math.ceil(linePixels * 2);
  const measure = measureCanvas.getContext('2d');
  if (!measure) throw new Error('Hindi text measurement is unavailable.');
  measure.font = (bold ? '700 ' : '400 ') + fontPixels + 'px ' + fontFamily;
  const lines = wrapText(measure, text, Math.max(8, cssWidth - 2));
  const cssHeight = Math.max(linePixels, lines.length * linePixels + 1.5);

  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(cssWidth * scale);
  canvas.height = Math.ceil(cssHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Hindi statement canvas could not be created.');
  context.scale(scale, scale);
  context.font = (bold ? '700 ' : '400 ') + fontPixels + 'px ' + fontFamily;
  context.fillStyle = color;
  context.textBaseline = 'top';
  context.textAlign = align;
  const x = align === 'left' ? 1 : align === 'center' ? cssWidth / 2 : cssWidth - 1;
  lines.forEach((line, index) => context.fillText(line, x, index * linePixels, cssWidth - 2));

  const result = { data: canvas.toDataURL('image/png'), height: cssHeight / pixelsPerMm };
  canvas.width = 0;
  canvas.height = 0;
  HINDI_IMAGE_CACHE.set(key, result);
  return result;
}

function addHindi(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  align: TextAlign = 'left',
  bold = false,
  color = '#202020',
): number {
  if (!text.trim()) return 0;
  const image = hindiImage(text, width, size, align, bold, color);
  doc.addImage(image.data, 'PNG', x, y, width, image.height, undefined, 'FAST');
  return image.height;
}

function drawHeader(doc: jsPDF, from: Date, to: Date, headerArtwork: string): void {
  doc.addImage(
    headerArtwork,
    'PNG',
    SOURCE_HEADER_X,
    SOURCE_HEADER_Y,
    SOURCE_HEADER_WIDTH,
    SOURCE_HEADER_HEIGHT,
    'bob-reference-header',
    'FAST',
  );

  const hindiTitle = 'दिनांक ' + dateText(from) + ' से ' + dateText(to) + ' तक की खाता विवरणी';
  addHindi(doc, hindiTitle, 17.0, 41.0, 176.0, 13.0, 'center', true, '#ffffff');

  doc.setFont('LiberationSans', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Account Statement from ' + dateText(from) + ' to ' + dateText(to), PAGE_WIDTH / 2, 51.0, { align: 'center' });
}

function drawAccountPanel(doc: jsPDF, account: AccountDetailsType, titleArtwork: string): void {
  const x = 6.88;
  const y = 63.35;
  const width = 195.8;
  // The source has a pale peach header cap and a white, thin pink-bordered body.
  doc.setFillColor(255, 224, 214);
  doc.roundedRect(x, y, width, 10.8, 2.8, 2.8, 'F');
  doc.addImage(titleArtwork, 'PNG', x + 2.1, y + 0.65, 57.5, 8.15, 'personal-report-account-title', 'FAST');
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 153, 153);
  doc.setLineWidth(0.18);
  doc.roundedRect(x + 0.08, y + 10.0, width - 0.16, 70.2, 1.7, 1.7, 'FD');

  const leftX = 9.15;
  const rightX = 119.7;
  const leftWidth = 80.0;
  const rightWidth = 82.0;
  const rowStart = 75.4;
  const rowGap = 17.0;
  const rows = [
    { hi: 'ग्राहक का नाम', en: 'Account Name', value: account.name || '-', maxLines: 1 },
    { hi: 'खाता संख्या', en: 'Account Number', value: account.accountNumber || '-', maxLines: 1 },
    { hi: 'खाता प्रकार', en: 'Account Type', value: getAccountTypeLabel(account), maxLines: 1 },
    { hi: 'ग्राहक का पता', en: 'Customer Address', value: [account.customerAddress, account.customerCity, account.customerPin].filter(Boolean).join(', ') || '-', maxLines: 4 },
  ];
  const rightRows = [
    { hi: 'शाखा का नाम', en: 'Branch Name', value: account.branchName || '-', maxLines: 2 },
    { hi: 'आईएफएससी कोड', en: 'IFSC Code', value: account.ifscCode || '-', maxLines: 1 },
    { hi: 'एमआईसीआर कोड', en: 'MICR Code', value: account.micrCode || '-', maxLines: 1 },
    { hi: 'शाखा का पता', en: 'Branch Address', value: [account.branchAddress, account.branchCity, account.branchPin].filter(Boolean).join(', ') || '-', maxLines: 4 },
  ];

  const label = (hi: string, en: string, xPos: number, yPos: number, maxWidth: number): void => {
    // Render the complete bilingual label as one shaped Devanagari-aware line.
    // Canvas applies proper matra shaping; English follows the slash on that same line.
    addHindi(doc, hi + ' / ' + en, xPos, yPos, maxWidth, 5.15, 'left', false, '#232323');
  };
  const value = (text: string, xPos: number, yPos: number, maxWidth: number, maxLines: number): void => {
    doc.setFont('LiberationSans', 'bold');
    doc.setTextColor(18, 18, 18);
    let fontSize = 7.8;
    let lines: string[] = [];
    const fullText = text.trim() || '-';
    do {
      doc.setFontSize(fontSize);
      lines = doc.splitTextToSize(fullText, maxWidth);
      if (lines.length <= maxLines || fontSize <= 5.2) break;
      fontSize = Math.max(5.2, fontSize - 0.4);
    } while (true);
    // Never silently discard part of an account address or branch name.
    doc.text(lines, xPos, yPos, { align: 'left', lineHeightFactor: 1.0 });
  };

  rows.forEach((field, index) => {
    const rowY = rowStart + index * rowGap;
    label(field.hi, field.en, leftX, rowY, leftWidth);
    value(field.value, leftX, rowY + 5.2, leftWidth, field.maxLines);
  });
  rightRows.forEach((field, index) => {
    const rowY = rowStart + index * rowGap;
    label(field.hi, field.en, rightX, rowY, rightWidth);
    value(field.value, rightX, rowY + 5.2, rightWidth, field.maxLines);
  });
}


function columnPositions(): number[] {
  const positions = [TABLE_X];
  COLUMN_WIDTHS.forEach(width => positions.push(positions[positions.length - 1] + width));
  return positions;
}

function drawTableHeader(doc: jsPDF, y: number): void {
  const hindi = ['क्र.सं', 'लेनदेन की तारीख', 'प्रभाव तारीख', 'विवरण', 'चेक नंबर', 'नामे', 'जमा', 'शेष'];
  const english = ['Sr.No', 'Transaction Date', 'Value Date', 'Description', 'Cheque Number', 'Debit', 'Credit', 'Balance'];
  const xPositions = columnPositions();

  doc.setFillColor(204, 204, 204);
  doc.rect(TABLE_X, y, TABLE_WIDTH, HEADER_HEIGHT, 'F');
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.15);
  doc.line(TABLE_X, y, TABLE_X + TABLE_WIDTH, y);
  doc.line(TABLE_X, y + HEADER_HEIGHT, TABLE_X + TABLE_WIDTH, y + HEADER_HEIGHT);
  doc.line(TABLE_X, y, TABLE_X, y + HEADER_HEIGHT);
  doc.line(TABLE_X + TABLE_WIDTH, y, TABLE_X + TABLE_WIDTH, y + HEADER_HEIGHT);

  // The source has no vertical separators between the first four text columns.
  [4, 5, 6, 7].forEach(index => doc.line(xPositions[index], y, xPositions[index], y + HEADER_HEIGHT));

  for (let index = 0; index < COLUMN_WIDTHS.length; index += 1) {
    const x = xPositions[index];
    const width = COLUMN_WIDTHS[index];
    const compact = index === 0 || index >= 5;
    addHindi(doc, hindi[index], x + 0.6, y + 1.0, width - 1.2, compact ? 5.4 : 5.8, 'center', true, '#111111');
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(index === 1 || index === 4 ? 5.4 : 6.0);
    doc.setTextColor(25, 25, 25);
    const lines = doc.splitTextToSize(english[index], width - 1.2).slice(0, 2);
    const textY = y + HEADER_HEIGHT - lines.length * 2.55 - 1.1;
    doc.text(lines, x + width / 2, textY, { align: 'center' });
  }
}

function estimateRowHeight(doc: jsPDF, row: StatementRow): number {
  doc.setFont('LiberationSans', 'normal');
  doc.setFontSize(7.0);
  const descriptionLines = doc.splitTextToSize(row.description || '-', COLUMN_WIDTHS[3] - 1.4);
  return Math.max(7.76, 4.5 + descriptionLines.length * 3.0);
}

function drawTableRow(doc: jsPDF, row: StatementRow, y: number, height: number, alternate: boolean): void {
  const values = [
    String(row.serial),
    row.transactionDate || '-',
    row.valueDate || '-',
    row.description || '-',
    row.chequeNumber || '-',
    row.debit || '-',
    row.credit || '-',
    row.balance || '-',
  ];
  const alignments: TextAlign[] = ['center', 'center', 'center', 'left', 'center', 'right', 'right', 'right'];
  const xPositions = columnPositions();

  doc.setFillColor(alternate ? 231 : 255, alternate ? 231 : 255, alternate ? 231 : 255);
  doc.rect(TABLE_X, y, TABLE_WIDTH, height, 'F');
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.13);
  doc.line(TABLE_X, y + height, TABLE_X + TABLE_WIDTH, y + height);
  doc.line(TABLE_X, y, TABLE_X, y + height);
  doc.line(TABLE_X + TABLE_WIDTH, y, TABLE_X + TABLE_WIDTH, y + height);
  [4, 5, 6, 7].forEach(index => doc.line(xPositions[index], y, xPositions[index], y + height));

  for (let index = 0; index < COLUMN_WIDTHS.length; index += 1) {
    const x = xPositions[index];
    const width = COLUMN_WIDTHS[index];
    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(27, 27, 27);
    const lines = doc.splitTextToSize(values[index], width - 1.4);
    const visibleLines = lines;
    const lineHeight = 3.0;
    const textY = y + Math.max(2.0, (height - visibleLines.length * lineHeight) / 2 + 2.35);
    const textX = alignments[index] === 'left'
      ? x + 0.7
      : alignments[index] === 'center'
        ? x + width / 2
        : x + width - 0.8;
    doc.text(visibleLines, textX, textY, { align: alignments[index], lineHeightFactor: 1.0 });
  }
}

function drawFooter(
  doc: jsPDF,
  _account: AccountDetailsType,
  pageNumber: number,
  totalPages: number,
  noteArtwork: string,
  bottomGradient: string,
): void {
  const noteX = 5.47;
  const noteY = FOOTER_TOP;
  doc.addImage(noteArtwork, 'PNG', noteX, noteY, 199.0, FOOTER_NOTE_HEIGHT, 'personal-report-note', 'FAST');

  doc.setFont('LiberationSans', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(35, 35, 35);
  doc.text('Page ' + pageNumber + ' of ' + totalPages, PAGE_WIDTH / 2, 281.2, { align: 'center' });

  doc.addImage(
    bottomGradient,
    'PNG',
    SOURCE_HEADER_X,
    285.0,
    SOURCE_HEADER_WIDTH,
    3.53,
    'personal-report-bottom-gradient',
    'FAST',
  );
}

function makeRows(
  transactions: TransactionType[],
  openingBalance: number,
  from: Date,
  to: Date,
): StatementRow[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  const selected = transactions
    .filter(tx => {
      const time = new Date(tx.date).getTime();
      return Number.isFinite(time) && Number.isFinite(Number(tx.amount)) &&
        (tx.type === 'credit' || tx.type === 'debit') &&
        time >= start.getTime() && time <= end.getTime();
    })
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const rows: StatementRow[] = [{
    serial: '1',
    transactionDate: dateText(from),
    valueDate: '-',
    description: 'Opening Balance',
    chequeNumber: '-',
    debit: '-',
    credit: '-',
    balance: money(openingBalance),
  }];

  let running = openingBalance;
  for (const transaction of selected) {
    running = typeof transaction.balanceAfter === 'number' && Number.isFinite(transaction.balanceAfter)
      ? transaction.balanceAfter
      : roundMoney(running + movement(transaction));
    rows.push({
      serial: String(rows.length + 1),
      transactionDate: dateText(transaction.date),
      valueDate: transaction.valueDate ? dateText(transaction.valueDate) : dateText(transaction.date),
      description: transaction.description || '-',
      chequeNumber: transaction.chequeNumber || transaction.instrumentNumber || transaction.referenceNumber || '-',
      debit: transaction.type === 'debit' ? money(Number(transaction.amount)) : '-',
      credit: transaction.type === 'credit' ? money(Number(transaction.amount)) : '-',
      balance: money(running),
    });
  }

  return rows;
}

function paginate(doc: jsPDF, rows: StatementRow[]): StatementRow[][] {
  const pages: StatementRow[][] = [];
  let pageRows: StatementRow[] = [];
  let usedHeight = 0;
  let pageIndex = 0;
  for (const row of rows) {
    const tableY = pageIndex === 0 ? FIRST_TABLE_Y : CONTINUATION_TABLE_Y;
    const availableHeight = FOOTER_TOP - 1.5 - (tableY + HEADER_HEIGHT);
    const rowHeight = estimateRowHeight(doc, row);
    if (pageRows.length > 0 && usedHeight + rowHeight > availableHeight) {
      pages.push(pageRows);
      pageRows = [];
      usedHeight = 0;
      pageIndex += 1;
    }
    pageRows.push(row);
    usedHeight += rowHeight;
  }
  if (pageRows.length) pages.push(pageRows);
  return pages;
}

/**
 * Creates a fresh bilingual BOB World statement. Both scripts appear on the
 * title banner, all eight table columns, account fields and page numbering.
 * Page one has account details; continuation pages repeat the header/table.
 */
export async function generateBobStatementPdf(options: BobStatementPdfOptions): Promise<Blob> {
  const account = options.account;
  if (!Number.isFinite(options.from.getTime()) || !Number.isFinite(options.to.getTime()) || options.from > options.to) {
    throw new Error('Choose a valid statement date range.');
  }
  if (!account.accountNumber || !account.accountNumber.trim()) {
    throw new Error('Add the account number in Settings before generating the report.');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  await registerStatementFonts(doc);

  const [headerArtwork, accountTitleArtwork, noteArtwork, bottomGradient] = await Promise.all([
    fetchPngDataUri('/assets/statement/reference-header.png'),
    fetchPngDataUri('/assets/statement/reference-account-title.png'),
    fetchPngDataUri('/assets/statement/reference-note-panel.png'),
    fetchPngDataUri('/assets/statement/reference-bottom-gradient.png'),
  ]);

  const opening = openingBalanceForRange(account, options.transactions, options.currentBalance, options.from);
  const rows = makeRows(options.transactions, opening, options.from, options.to);
  const pages = paginate(doc, rows);
  pages.forEach((pageRows, pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    drawHeader(doc, options.from, options.to, headerArtwork);
    if (pageIndex === 0) drawAccountPanel(doc, account, accountTitleArtwork);

    const tableY = pageIndex === 0 ? FIRST_TABLE_Y : CONTINUATION_TABLE_Y;
    drawTableHeader(doc, tableY);
    let y = tableY + HEADER_HEIGHT;
    pageRows.forEach((row, rowIndex) => {
      const height = estimateRowHeight(doc, row);
      drawTableRow(doc, row, y, height, rowIndex % 2 === 1);
      y += height;
    });
    drawFooter(doc, account, pageIndex + 1, pages.length, noteArtwork, bottomGradient);
  });

  return doc.output('blob');
}
