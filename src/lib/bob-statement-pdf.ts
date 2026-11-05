import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { AccountDetailsType, TransactionType } from '@/lib/types';

export interface BobStatementPdfOptions {
  account: AccountDetailsType;
  transactions: TransactionType[];
  currentBalance: number;
  from: Date;
  to: Date;
  bobWorldLogo?: string | null;
  bankLogo?: string | null;
}

const money = (value: number) => new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Math.abs(value));

const dateText = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? format(date, 'dd-MM-yyyy') : '';
};

const imageType = (data: string): 'PNG' | 'JPEG' | null => {
  const mime = data.slice(0, 64).toLowerCase();
  if (mime.includes('image/png')) return 'PNG';
  if (mime.includes('image/jpeg') || mime.includes('image/jpg')) return 'JPEG';
  return null;
};

function addBrandImage(doc: jsPDF, data: string | null | undefined, x: number, y: number, maxW: number, maxH: number) {
  if (!data) return;
  const type = imageType(data);
  if (!type) return;
  try {
    const info = doc.getImageProperties(data);
    const scale = Math.min(maxW / info.width, maxH / info.height);
    const width = info.width * scale;
    const height = info.height * scale;
    doc.addImage(data, type, x, y, width, height, undefined, 'FAST');
  } catch (error) {
    console.warn('Statement logo could not be embedded:', error);
  }
}

/**
 * Builds a fresh statement using saved BOB account fields and the app's
 * transaction records. It never overlays the user's old statement PDF.
 */
export function generateBobStatementPdf(options: BobStatementPdfOptions): Blob {
  const { account, transactions, currentBalance, from, to, bobWorldLogo, bankLogo } = options;
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
    throw new Error('Choose a valid statement date range.');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;

  const periodStart = new Date(from);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(to);
  periodEnd.setHours(23, 59, 59, 999);

  const allTransactions = [...transactions]
    .filter(tx => Number.isFinite(new Date(tx.date).getTime()) && Number.isFinite(tx.amount))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const netMovement = allTransactions.reduce((total, tx) =>
    total + (tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount)), 0);
  const configuredOpening = account.statementOpeningBalance;
  let runningBalance = typeof configuredOpening === 'number' && Number.isFinite(configuredOpening)
    ? configuredOpening
    : currentBalance - netMovement;

  for (const tx of allTransactions) {
    const txTime = new Date(tx.date).getTime();
    if (txTime < periodStart.getTime()) {
      if (typeof tx.balanceAfter === 'number' && Number.isFinite(tx.balanceAfter)) {
        runningBalance = tx.balanceAfter;
      } else {
        runningBalance += tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
      }
    }
  }
  const periodOpeningBalance = runningBalance;

  const visibleTransactions = allTransactions.filter(tx => {
    const time = new Date(tx.date).getTime();
    return time >= periodStart.getTime() && time <= periodEnd.getTime();
  });

  const rows: (string | number)[][] = [[
    '', '', '', 'Opening Balance', '', '', '', money(periodOpeningBalance),
  ]];
  for (const tx of visibleTransactions) {
    if (typeof tx.balanceAfter === 'number' && Number.isFinite(tx.balanceAfter)) {
      runningBalance = tx.balanceAfter;
    } else {
      runningBalance += tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
    }
    rows.push([
      String(rows.length),
      dateText(tx.date),
      tx.valueDate ? dateText(tx.valueDate) : dateText(tx.date),
      tx.description || '',
      tx.chequeNumber || tx.instrumentNumber || tx.referenceNumber || '',
      tx.type === 'debit' ? money(tx.amount) : '',
      tx.type === 'credit' ? money(tx.amount) : '',
      money(runningBalance),
    ]);
  }

  const headerLogoY = 6;
  addBrandImage(doc, bobWorldLogo, margin, headerLogoY, 39, 18);
  addBrandImage(doc, bankLogo, pageWidth - margin - 43, headerLogoY, 43, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(33, 55, 84);
  doc.text('ACCOUNT STATEMENT', pageWidth / 2, 30, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(85, 91, 98);
  doc.text('Statement period: ' + dateText(from) + ' to ' + dateText(to), pageWidth / 2, 35, { align: 'center' });

  doc.setFillColor(246, 247, 249);
  doc.roundedRect(margin, 40, contentWidth, 42, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(35, 43, 54);
  doc.text('ACCOUNT DETAILS', margin + 3, 45);

  const leftX = margin + 3;
  const rightX = margin + contentWidth / 2 + 2;
  const valueLeftX = margin + 32;
  const valueRightX = rightX + 31;
  const detailRows: Array<[string, string, string, string]> = [
    ['Account Holder', account.name || '', 'Account Number', account.accountNumber || ''],
    ['Account Type', account.accountTypeName || account.accountType || '', 'IFSC Code', account.ifscCode || ''],
    ['Branch Name', account.branchName || '', 'MICR Code', account.micrCode || ''],
    ['Customer ID', account.customerId || '', 'CKYC Number', account.ckycNumber || ''],
    ['Nominee', account.nominee || '', 'Customer City', account.customerCity || ''],
    ['Branch City', account.branchCity || '', 'Branch PIN', account.branchPin || ''],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 96, 103);
  detailRows.forEach((item, index) => {
    const y = 51 + index * 5;
    doc.text(item[0] + ':', leftX, y);
    doc.setTextColor(34, 40, 48);
    doc.text(doc.splitTextToSize(item[1] || '-', 41), valueLeftX, y);
    doc.setTextColor(90, 96, 103);
    doc.text(item[2] + ':', rightX, y);
    doc.setTextColor(34, 40, 48);
    doc.text(doc.splitTextToSize(item[3] || '-', 35), valueRightX, y);
    doc.setTextColor(90, 96, 103);
  });

  let tableStartY = 86;
  const addressLines: string[] = [];
  if (account.customerAddress) addressLines.push('Customer Address: ' + account.customerAddress + (account.customerPin ? ' - ' + account.customerPin : ''));
  if (account.branchAddress) addressLines.push('Branch Address: ' + account.branchAddress + (account.branchCity ? ', ' + account.branchCity : '') + (account.branchPin ? ' - ' + account.branchPin : ''));
  if (addressLines.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(70, 76, 84);
    const lines = addressLines.flatMap(value => doc.splitTextToSize(value, contentWidth));
    doc.text(lines, margin + 2, tableStartY);
    tableStartY += Math.max(5, lines.length * 3.4) + 2;
  }

  const footerNote = account.statementNote || 'This is a computer-generated account statement.';
  autoTable(doc, {
    head: [['S.No.', 'Transaction Date', 'Value Date', 'Description', 'Cheque / Ref.', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)']],
    body: rows,
    startY: tableStartY,
    margin: { left: margin, right: margin, top: 10, bottom: 18 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.2,
      cellPadding: 1.35,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [35, 40, 48],
      lineColor: [205, 210, 216],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [235, 103, 36],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.1,
      halign: 'center',
    },
    bodyStyles: { minCellHeight: 5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 58 },
      4: { cellWidth: 20 },
      5: { cellWidth: 19, halign: 'right' },
      6: { cellWidth: 19, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
    },
    rowPageBreak: 'avoid',
    didDrawPage: () => {
      doc.setDrawColor(218, 222, 227);
      doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(105, 110, 116);
      doc.text(doc.splitTextToSize(footerNote, contentWidth - 35)[0] || '', margin, pageHeight - 8);
      doc.text('Generated ' + format(new Date(), 'dd-MM-yyyy HH:mm'), pageWidth - margin, pageHeight - 8, { align: 'right' });
    },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(105, 110, 116);
    doc.text('Page ' + page + ' of ' + totalPages, pageWidth - margin, pageHeight - 3.5, { align: 'right' });
  }

  return doc.output('blob');
}
