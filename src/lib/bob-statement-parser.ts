import type { AccountDetailsType, TransactionType } from '@/lib/types';

export interface ParsedBobStatement {
  accountNumber: string;
  accountDetails: Partial<AccountDetailsType>;
  transactions: TransactionType[];
  openingBalance?: number;
  closingBalance?: number;
  periodFrom?: string;
  periodTo?: string;
}

export interface StatementBrandAssets {
  bobWorldLogo?: string;
  bankLogo?: string;
}

type PdfInput = string | ArrayBuffer | Uint8Array;
type TextCell = { text: string; x: number; y: number };
type TextRow = { y: number; cells: TextCell[] };

const DATE_RE = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})$/;
const MONEY_RE = /^\(?-?\s*(?:₹|INR|Rs\.?\s*)?\d[\d,]*(?:\.\d{1,2})?\)?$/i;

function bytesFromInput(input: PdfInput): Uint8Array {
  if (typeof input !== 'string') {
    return input instanceof Uint8Array ? input.slice() : new Uint8Array(input.slice(0));
  }
  const base64 = input.includes(',') ? input.slice(input.indexOf(',') + 1) : input;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', window.location.origin).href;
  }
  return pdfjs;
}

async function openPdf(input: PdfInput) {
  const pdfjs = await loadPdfJs();
  return pdfjs.getDocument({
    data: bytesFromInput(input),
    useSystemFonts: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise;
}

function parseDate(value: string): string | null {
  const raw = value.trim();
  if (!DATE_RE.test(raw)) return null;
  const parts = raw.split(/[/-]/).map(Number);
  let year: number;
  let month: number;
  let day: number;
  if (parts[0] > 31) [year, month, day] = parts;
  else [day, month, year] = parts;
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function parseMoney(value: string): number | null {
  if (!MONEY_RE.test(value)) return null;
  const normalized = value
    .replace(/[₹,\s]/g, '')
    .replace(/^(?:INR|Rs\.?)/i, '')
    .replace(/[()]/g, '')
    .trim();
  const parsed = Number(normalized);
  return normalized && Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

function buildRows(items: TextCell[], tolerance = 2.2): TextRow[] {
  const rows: TextRow[] = [];
  for (const item of items) {
    let row = rows.find(candidate => Math.abs(candidate.y - item.y) <= tolerance);
    if (!row) {
      row = { y: item.y, cells: [] };
      rows.push(row);
    }
    row.cells.push(item);
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map(row => ({ ...row, cells: row.cells.sort((a, b) => a.x - b.x) }));
}

function fieldFromText(text: string, labels: string[]): string {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const fieldBoundary = /(?:^|\s)(?:account\s+(?:name|number|no\.?|type)|branch\s+(?:name|address|city|pin)|customer\s+(?:name|id|address|city|pin)|ifsc(?:\s+code)?|micr(?:\s+code)?|ckyc(?:\s+number|\s+no)?|nominee(?:\s+name)?|statement\s+(?:of\s+account|period)|serial\s+no\.?|s\.?\s*no\.?|transaction\s+date|value\s+date|description|cheque\s+number|debit|credit|balance)\b/i;
  for (let i = 0; i < lines.length; i++) {
    for (const label of labels) {
      const escaped = label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const labelPattern = new RegExp('(?:^|\\s)' + escaped + '\\s*[:\\-]?\\s*', 'i');
      const match = labelPattern.exec(lines[i]);
      if (!match) continue;
      let inline = lines[i].slice(match.index + match[0].length);
      const boundary = fieldBoundary.exec(inline);
      if (boundary) inline = inline.slice(0, boundary.index);
      const values: string[] = [];
      if (inline.trim() && !/^(?:details|information)$/i.test(inline.trim())) {
        values.push(inline.trim());
      }
      for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
        if (fieldBoundary.test(lines[j]) || DATE_RE.test(lines[j])) break;
        if (/^(?:opening|closing)\s+balance$/i.test(lines[j])) break;
        values.push(lines[j]);
      }
      return values.join(' ').replace(/\s{2,}/g, ' ').trim();
    }
  }
  return '';
}

function parseHocrWords(
  hocr: string,
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
): TextCell[] {
  const parsed = new DOMParser().parseFromString(hocr, 'text/html');
  return Array.from(parsed.querySelectorAll('.ocrx_word')).flatMap(element => {
    const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
    const title = element.getAttribute('title') || '';
    const box = /bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i.exec(title);
    if (!text || !box) return [];
    const x1 = Number(box[1]);
    const y1 = Number(box[2]);
    const x2 = Number(box[3]);
    const y2 = Number(box[4]);
    if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) return [];
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    return [{
      text,
      x: centerX / imageWidth * pageWidth,
      y: (imageHeight - centerY) / imageHeight * pageHeight,
    }];
  });
}
function parseStatementPeriod(text: string): { from?: string; to?: string } {
  const match = text.match(/(?:from|period\s*[:\-]?)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(?:to|through)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  return {
    from: match ? parseDate(match[1]) || undefined : undefined,
    to: match ? parseDate(match[2]) || undefined : undefined,
  };
}

/**
 * Extracts the BOB World and Bank of Baroda logo artwork from the logo band
 * below the transaction table on page one of this BOB statement template.
 * The crops are stored as independent PNG assets; date banners and statement
 * background artwork are intentionally not reused because they contain
 * account-specific date text.
 */
export async function extractStatementBrandAssets(input: PdfInput): Promise<StatementBrandAssets> {
  if (typeof window === 'undefined') {
    throw new Error('Statement asset extraction is available in the browser only.');
  }
  const pdf = await openPdf(input);
  try {
    if (!pdf.numPages) return {};
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable for statement image extraction.');
    await page.render({ canvasContext: context, viewport }).promise;

    const crop = (left: number, top: number, width: number, height: number): string | undefined => {
      const sx = Math.max(0, Math.round(canvas.width * left));
      const sy = Math.max(0, Math.round(canvas.height * top));
      const sw = Math.min(canvas.width - sx, Math.round(canvas.width * width));
      const sh = Math.min(canvas.height - sy, Math.round(canvas.height * height));
      if (sw < 16 || sh < 16) return undefined;
      const output = document.createElement('canvas');
      output.width = sw;
      output.height = sh;
      const out = output.getContext('2d');
      if (!out) return undefined;
      out.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      const data = output.toDataURL('image/png');
      output.width = 0;
      output.height = 0;
      return data;
    };

    // Co-ordinates are proportional to the raster page dimensions. BOB World
    // is at the lower-left of the logo band; Bank of Baroda is at the right.
    return {
      bobWorldLogo: crop(0.000, 0.685, 0.175, 0.110),
      bankLogo: crop(0.710, 0.700, 0.280, 0.100),
    };
  } finally {
    await pdf.destroy();
  }
}

/**
 * Local PDF.js text-layer parser. No Genkit, LLM, OCR engine, cloud OCR or
 * external document processing is called. Image-only scans are rejected so
 * no transaction data is inferred or silently fabricated.
 */
export async function parseBobStatementPdf(input: PdfInput): Promise<ParsedBobStatement> {
  const pdf = await openPdf(input);
  let ocrWorker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null;

  try {
    const allTextLines: string[] = [];
    const leftTextLines: string[] = [];
    const rightTextLines: string[] = [];
    const transactions: TransactionType[] = [];
    let textItemCount = 0;
    let openingBalance: number | undefined;
    let closingBalance: number | undefined;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageWidth = Math.max(1, Math.abs(page.view[2] - page.view[0]));
      const pageHeight = Math.max(1, Math.abs(page.view[3] - page.view[1]));
      let items: TextCell[] = content.items.flatMap(item => {
        if (!('str' in item) || typeof item.str !== 'string' || !item.str.trim() || !('transform' in item)) return [];
        const transform = item.transform as number[];
        return [{ text: item.str.trim(), x: transform[4] ?? 0, y: transform[5] ?? 0 }];
      });

      // The supplied BOB sample is a scanned/image-only PDF. Use an entirely
      // local Tesseract.js worker for pages that have no selectable text.
      if (!items.length) {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          throw new Error('This statement is image-only. Open it in the BOB World app to run the bundled on-device OCR engine.');
        }
        if (!ocrWorker) {
          const { createWorker } = await import('tesseract.js');
          const origin = window.location.origin;
          ocrWorker = await createWorker('eng', 1, {
            workerPath: new URL('/tesseract/worker.min.js', origin).href,
            corePath: new URL('/tesseract/core/', origin).href.replace(/\/$/, ''),
            langPath: new URL('/tesseract/lang', origin).href,
            gzip: true,
            workerBlobURL: true,
            logger: message => {
              if (message.status === 'recognizing text' && message.progress > 0) {
                // Intentionally local-only: no telemetry or document content is sent anywhere.
              }
            },
          });
          await ocrWorker.setParameters({
            tessedit_pageseg_mode: '6',
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
          });
        }

        const viewport = page.getViewport({ scale: 3.2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('The browser could not render the scanned statement for local OCR.');
        try {
          await page.render({ canvasContext: context, viewport }).promise;
          const result = await ocrWorker.recognize(canvas, {}, { hocr: true });
          items = parseHocrWords(
            result.data.hocr || '',
            canvas.width,
            canvas.height,
            pageWidth,
            pageHeight,
          );
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
        if (!items.length) {
          throw new Error('Local OCR could not read page ' + pageNumber + '. Existing account and transaction data were not changed.');
        }
      }

      textItemCount += items.length;
      const rows = buildRows(items, 2.5);
      let lastTransaction: TransactionType | undefined;
      let lastTransactionY: number | undefined;

      for (const row of rows) {
        const line = row.cells.map(cell => cell.text).join(' ').replace(/\s+/g, ' ').trim();
        if (line) {
          allTextLines.push(line);
          const leftLine = row.cells.filter(cell => cell.x / pageWidth < 0.5).map(cell => cell.text).join(' ').trim();
          const rightLine = row.cells.filter(cell => cell.x / pageWidth >= 0.5).map(cell => cell.text).join(' ').trim();
          if (leftLine) leftTextLines.push(leftLine);
          if (rightLine) rightTextLines.push(rightLine);
        }

        const dateCells = row.cells
          .filter(cell => cell.x / pageWidth < 0.24)
          .map(cell => ({ cell, date: parseDate(cell.text) }))
          .filter((item): item is { cell: TextCell; date: string } => Boolean(item.date));

        if (!dateCells.length) {
          if (lastTransaction && lastTransactionY !== undefined && Math.abs(row.y - lastTransactionY) <= 14) {
            const continuation = row.cells
              .filter(cell => cell.x / pageWidth >= 0.2 && cell.x / pageWidth < 0.56)
              .map(cell => cell.text)
              .filter(value => value && !MONEY_RE.test(value))
              .join(' ')
              .trim();
            if (continuation) {
              lastTransaction.description = (lastTransaction.description + ' ' + continuation).trim();
              lastTransactionY = row.y;
            }
          }
          continue;
        }

        const transactionDate = dateCells[0];
        const description = row.cells
          .filter(cell => {
            const fraction = cell.x / pageWidth;
            return fraction >= 0.2 && fraction < 0.56 &&
              !parseDate(cell.text) && !MONEY_RE.test(cell.text) &&
              !/^description$/i.test(cell.text);
          })
          .map(cell => cell.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!description) continue;

        const amountInColumn = (min: number, max: number): number | undefined => {
          const candidates = row.cells
            .filter(cell => cell.x / pageWidth >= min && cell.x / pageWidth < max)
            .map(cell => parseMoney(cell.text))
            .filter((value): value is number => value !== null);
          return candidates.length ? candidates[0] : undefined;
        };
        const debit = amountInColumn(0.64, 0.77);
        const credit = amountInColumn(0.77, 0.90);
        const balance = amountInColumn(0.90, 1.02);

        if (/opening\s+balance|balance\s+brought\s+forward/i.test(description)) {
          if (balance !== undefined) openingBalance = balance;
          continue;
        }
        const amount = debit ?? credit;
        if (amount === undefined) continue;

        const valueDate = dateCells[1]?.date || transactionDate.date;
        const chequeNumber = row.cells
          .filter(cell => cell.x / pageWidth >= 0.54 && cell.x / pageWidth < 0.64)
          .map(cell => cell.text)
          .join(' ')
          .trim();
        const serial = row.cells.find(cell => cell.x / pageWidth < 0.07 && /^\d{1,4}$/.test(cell.text))?.text;
        const transaction: TransactionType = {
          id: 'bob-statement-' + pageNumber + '-' + (serial || transactions.length + 1),
          date: transactionDate.date,
          valueDate,
          description,
          amount,
          type: debit !== undefined ? 'debit' : 'credit',
          ...(chequeNumber ? { chequeNumber } : {}),
          ...(balance !== undefined ? { balanceAfter: balance } : {}),
        };
        transactions.push(transaction);
        if (balance !== undefined) closingBalance = balance;
        lastTransaction = transaction;
        lastTransactionY = row.y;
      }
    }

    if (textItemCount === 0) {
      throw new Error('No selectable text or readable scanned content was found. Existing account and transaction data were not changed.');
    }
    if (!transactions.length) {
      throw new Error('The PDF was read locally, but no transaction rows matched the BOB statement layout. Existing account and transaction data were not changed.');
    }

    const text = allTextLines.join('\n');
    const leftText = leftTextLines.join('\n');
    const rightText = rightTextLines.join('\n');
    const accountMatch = leftText.match(/(?:Account\s*(?:Number|No\.?|#)|A\/c\s*(?:No\.?|Number))\s*[:\-]?\s*([0-9][0-9\s-]{5,})/i);
    const accountNumber = accountMatch?.[1]?.replace(/\D/g, '') || '';
    if (!accountNumber) {
      throw new Error('Transactions were found, but the account number could not be verified. Add it in Settings. No existing account or transaction data was changed.');
    }

    const period = parseStatementPeriod(text);
    const accountDetails: Partial<AccountDetailsType> = {
      name: fieldFromText(leftText, ['Account Name', 'Account Holder Name', 'Customer Name']),
      accountNumber,
      ifscCode: fieldFromText(rightText, ['IFSC Code', 'IFSC']),
      branchName: fieldFromText(rightText, ['Branch Name']),
      branchAddress: fieldFromText(rightText, ['Branch Address']),
      customerAddress: fieldFromText(leftText, ['Customer Address', 'Mailing Address', 'Communication Address']),
      customerCity: fieldFromText(leftText, ['Customer City']),
      customerPin: fieldFromText(leftText, ['Customer PIN', 'PIN Code', 'Pincode']),
      branchCity: fieldFromText(rightText, ['Branch City']),
      branchPin: fieldFromText(rightText, ['Branch PIN', 'PIN Code', 'Pincode']),
      micrCode: fieldFromText(rightText, ['MICR Code', 'MICR']),
      nominee: fieldFromText(leftText, ['Nominee Name', 'Nominee']),
      ckycNumber: fieldFromText(leftText, ['CKYC Number', 'CKYC No']),
      customerId: fieldFromText(leftText, ['Customer ID', 'Customer Id', 'CIF ID', 'CIF Number']),
      accountType: /\bcurrent\s+account\b/i.test(text) ? 'Current' :
        /\bsaving(?:s)?\s+account\b|\bSBA\b/i.test(text) ? 'Saving' : undefined,
      statementOpeningBalance: openingBalance,
      statementPeriodFrom: period.from,
      statementPeriodTo: period.to,
    };
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      accountNumber,
      accountDetails,
      transactions,
      openingBalance,
      closingBalance,
      periodFrom: period.from,
      periodTo: period.to,
    };
  } finally {
    if (ocrWorker) {
      try { await ocrWorker.terminate(); } catch (error) { console.warn('Local OCR worker cleanup failed:', error); }
    }
    await pdf.destroy();
  }
}
