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
type TextCell = { text: string; x: number; y: number; confidence?: number };
type TextRow = { y: number; cells: TextCell[] };

const DATE_RE = /^(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{8})$/;
const MONEY_RE = /^\(?-?\s*(?:₹|INR|Rs\.?\s*)?\d[\d,.\s]*(?:CR|DR)?\)?$/i;

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
  const raw = value.trim().replace(/[()]/g, '');
  if (!DATE_RE.test(raw)) return null;
  let year: number;
  let month: number;
  let day: number;
  if (/^\d{8}$/.test(raw)) {
    const first = Number(raw.slice(0, 4));
    if (first >= 1900 && first <= 2100) {
      year = first;
      month = Number(raw.slice(4, 6));
      day = Number(raw.slice(6, 8));
    } else {
      day = Number(raw.slice(0, 2));
      month = Number(raw.slice(2, 4));
      year = Number(raw.slice(4, 8));
    }
  } else {
    const parts = raw.split(/[./-]/).map(Number);
    if (parts.length !== 3) return null;
    if (parts[0] > 31) [year, month, day] = parts;
    else [day, month, year] = parts;
  }
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function parseMoney(value: string): number | null {
  let raw = value.trim()
    .replace(/^(?:INR|Rs\.?|₹)\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/(?:CR|DR)$/i, '');
  let negative = false;
  if (raw.startsWith('(') && raw.endsWith(')')) {
    negative = true;
    raw = raw.slice(1, -1);
  }
  if (raw.startsWith('-')) {
    negative = true;
    raw = raw.slice(1);
  }
  if (!raw || !/^[\d,.]+$/.test(raw)) return null;
  const lastSeparator = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','));
  let normalized: string;
  if (lastSeparator >= 0) {
    const integerDigits = raw.slice(0, lastSeparator).replace(/\D/g, '');
    const decimalDigits = raw.slice(lastSeparator + 1).replace(/\D/g, '');
    if (decimalDigits.length === 1 || decimalDigits.length === 2) {
      normalized = (integerDigits || '0') + '.' + decimalDigits.padEnd(2, '0');
    } else {
      normalized = raw.replace(/\D/g, '');
    }
  } else {
    normalized = raw.replace(/\D/g, '');
  }
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : Math.abs(parsed);
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
  const fieldBoundary = /(?:^|\s)(?:account\s+(?:name|number|no\.?|type)|branch\s+(?:name|address|city|pin)|customer\s+(?:name|id|address|city|pin)|ifsc(?:\s+code)?|micr(?:\s+code)?|ckyc(?:\s+number|\s+no)?|nominee(?:\s+name)?|statement\s+(?:of\s+account|period)|serial\s+no\.?|s\.?\s*no\.?|transaction\s+date|value\s+date|description|cheque\s+number|debit|credit|balance)\b|(?:^|\s)(?:क\.?\s*सं|लेनदेन\s+की|प्रभाव\s+तारीख|पभाव\s+तारीख|ववरण|चेक\s+नंबर|नामे|जमा|शेष)/i;
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

    // The supplied reference prints BOB World at the upper-left and the
    // bilingual Bank of Baroda wordmark at the upper-right of every page.
    return {
      bobWorldLogo: crop(0.020, 0.035, 0.175, 0.090),
      bankLogo: crop(0.700, 0.035, 0.285, 0.090),
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

      if (!items.length) {
        throw new Error('This PDF page has no selectable text. Image-only or scanned pages are not supported; upload a text-selectable statement. Existing data was not changed.');
      }

      textItemCount += items.length;
      const rows = buildRows(items, 7.5);
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
              !parseDate(cell.text) &&
              !/^description$/i.test(cell.text);
          })
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map(cell => cell.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!description) continue;

        const amountInColumn = (min: number, max: number) => {
          const columnCells = row.cells
            .filter(cell => cell.x / pageWidth >= min && cell.x / pageWidth < max)
            .sort((a, b) => a.x - b.x);
          const candidates: Array<{ cell: TextCell; value: number; score: number }> = [];

          for (const cell of columnCells) {
            const value = parseMoney(cell.text);
            if (value !== null) {
              candidates.push({
                cell,
                value,
                score: (cell.confidence ?? 100),
              });
            }
          }

          // Some PDF text layers split one printed amount across adjacent
          // text cells. Merge neighbouring cells before selecting the value.
          for (let start = 0; start < columnCells.length; start++) {
            let merged = columnCells[start].text.replace(/\s+/g, '');
            const group = [columnCells[start]];
            for (let end = start + 1; end < Math.min(columnCells.length, start + 3); end++) {
              const previous = columnCells[end - 1];
              const current = columnCells[end];
              if (current.x - previous.x > 26) break;
              const nextText = current.text.replace(/\s+/g, '');
              if (/^[\d,]+$/.test(merged) && /^\d{1,2}$/.test(nextText)) {
                merged += '.' + nextText;
              } else {
                merged += nextText;
              }
              group.push(current);
              const value = parseMoney(merged);
              if (value !== null && group.length > 1) {
                const confidence = Math.min(...group.map(item => item.confidence ?? 100));
                candidates.push({
                  cell: {
                    text: merged,
                    x: group[0].x,
                    y: group[0].y,
                    confidence,
                  },
                  value,
                  score: confidence + 100,
                });
              }
            }
          }

          return candidates.sort((a, b) => b.score - a.score)[0];
        };
        const debitCandidate = amountInColumn(0.64, 0.75);
        const creditCandidate = amountInColumn(0.75, 0.885);
        const balanceCandidate = amountInColumn(0.885, 1.02);
        const debit = debitCandidate?.value;
        const credit = creditCandidate?.value;
        const balance = balanceCandidate?.value;

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
    closingBalance = transactions[transactions.length - 1]?.balanceAfter ?? closingBalance;
    const text = allTextLines.join('\n');
    const leftText = leftTextLines.join('\n');
    const rightText = rightTextLines.join('\n');
    // In the BOB bilingual layout, the account number is printed on the
    // line below its label. Read the complete labelled field instead of only
    // accepting a number on the same line.
    const accountNumberField = fieldFromText(leftText, ['Account Number', 'Account No', 'A/c Number']);
    const accountNumber = accountNumberField.match(/\b\d{6,20}\b/)?.[0] ||
      leftText.match(/(?:Account\s*(?:Number|No\.?|#)|A\/c\s*(?:No\.?|Number))[\s\S]{0,60}?(\d{6,20})/i)?.[1] ||
      '';
    if (!accountNumber) {
      throw new Error('Transactions were found, but the account number could not be verified. Add it in Settings. No existing account or transaction data was changed.');
    }

    const period = parseStatementPeriod(text);
    const customerAddress = fieldFromText(leftText, ['Customer Address', 'Mailing Address', 'Communication Address']);
    const branchAddress = fieldFromText(rightText, ['Branch Address']);
    const branchName = fieldFromText(rightText, ['Branch Name']);
    const customerPin = fieldFromText(leftText, ['Customer PIN', 'PIN Code', 'Pincode']) ||
      customerAddress.match(/\b\d{6}\b/)?.[0] || '';
    const branchPin = fieldFromText(rightText, ['Branch PIN', 'PIN Code', 'Pincode']) ||
      branchAddress.match(/\b\d{6}\b/)?.[0] || '';
    // Resolve account type only from the explicitly labelled Account Type field.
    // Searching the entire statement text can match generic footer/help wording
    // and incorrectly override a savings account as current.
    const accountTypeName = fieldFromText(leftText, ['Account Type', 'Account Category']) || undefined;
    const accountType = accountTypeName && /\bcurrent\b/i.test(accountTypeName) ? 'Current' :
      accountTypeName && (/\bsaving(?:s)?\b|\bSBA\b/i.test(accountTypeName)) ? 'Saving' : undefined;

    const accountDetails: Partial<AccountDetailsType> = {
      name: fieldFromText(leftText, ['Account Name', 'Account Holder Name', 'Customer Name']),
      accountNumber,
      ifscCode: (() => { const code = fieldFromText(rightText, ['IFSC Code', 'IFSC']).replace(/\s/g, '').toUpperCase(); return /^[A-Z]{4}O[A-Z0-9]{6}$/.test(code) ? code.replace(/^(.{4})O/, (_, prefix: string) => prefix + '0') : code; })(),
      branchName,
      branchAddress,
      customerAddress,
      customerCity: fieldFromText(leftText, ['Customer City']),
      customerPin,
      branchCity: fieldFromText(rightText, ['Branch City']) || branchName,
      branchPin,
      micrCode: fieldFromText(rightText, ['MICR Code', 'MICR']),
      nominee: fieldFromText(leftText, ['Nominee Name', 'Nominee']),
      ckycNumber: fieldFromText(leftText, ['CKYC Number', 'CKYC No']),
      customerId: fieldFromText(leftText, ['Customer ID', 'Customer Id', 'CIF ID', 'CIF Number']),
      accountType,
      accountTypeName,
      statementOpeningBalance: openingBalance,
      statementPeriodFrom: period.from,
      statementPeriodTo: period.to,
    };
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Selectable-text statements must reconcile exactly before Settings is
    // allowed to replace the saved transaction list and balance. This catches
    // a missed row, a split amount, or a malformed date/amount column.
    if (openingBalance !== undefined) {
      let runningBalance = Math.round(openingBalance * 100) / 100;
      const failures: string[] = [];
      for (const transaction of transactions) {
        const observed = transaction.balanceAfter;
        if (observed === undefined || !Number.isFinite(observed)) {
          failures.push(transaction.date.slice(0, 10) + ' (missing printed balance)');
          continue;
        }
        const movement = transaction.type === 'credit' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);
        const expected = Math.round((runningBalance + movement) * 100) / 100;
        const actual = Math.round(observed * 100) / 100;
        if (Math.abs(expected - actual) > 0.01) {
          failures.push(transaction.date.slice(0, 10) + ' (expected ' + expected.toFixed(2) + ', read ' + actual.toFixed(2) + ')');
        }
        runningBalance = actual;
      }
      if (failures.length) {
        throw new Error(
          'The statement transaction rows did not reconcile with the printed running balances: ' +
          failures.slice(0, 5).join('; ') +
          (failures.length > 5 ? '; +' + (failures.length - 5) + ' more' : '') +
          '. Existing account and transaction data were not changed.',
        );
      }
    }

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
    await pdf.destroy();
  }
}
