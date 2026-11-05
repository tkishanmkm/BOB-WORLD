import { jsPDF } from 'jspdf';
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
  const mime = data.slice(0, 80).toLowerCase();
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
    doc.addImage(data, type, x, y, info.width * scale, info.height * scale, undefined, 'FAST');
  } catch (error) {
    console.warn('Statement logo could not be embedded:', error);
  }
}

/**
 * Recreates the BOB statement structure from saved app data: account card,
 * transaction table, the two BOB brand marks, date strip and footer note.
 * It does not paste or reuse the uploaded statement as a page background.
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
  let runningBalance = typeof account.statementOpeningBalance === 'number' &&
    Number.isFinite(account.statementOpeningBalance)
    ? account.statementOpeningBalance
    : currentBalance - netMovement;

  for (const tx of allTransactions) {
    if (new Date(tx.date).getTime() >= periodStart.getTime()) continue;
    if (typeof tx.balanceAfter === 'number' && Number.isFinite(tx.balanceAfter)) {
      runningBalance = tx.balanceAfter;
    } else {
      runningBalance += tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
    }
  }
  const periodOpeningBalance = runningBalance;

  const visibleTransactions = allTransactions.filter(tx => {
    const time = new Date(tx.date).getTime();
    return time >= periodStart.getTime() && time <= periodEnd.getTime();
  });

  const rows: (string | number)[][] = [[
    '1', dateText(from), dateText(from), 'Opening Balance', '', '', '', money(periodOpeningBalance),
  ]];
  for (const tx of visibleTransactions) {
    if (typeof tx.balanceAfter === 'number' && Number.isFinite(tx.balanceAfter)) {
      runningBalance = tx.balanceAfter;
    } else {
      runningBalance += tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
    }
    rows.push([
      String(rows.length + 1),
      dateText(tx.date),
      tx.valueDate ? dateText(tx.valueDate) : dateText(tx.date),
      tx.description || '',
      tx.chequeNumber || tx.instrumentNumber || tx.referenceNumber || '',
      tx.type === 'debit' ? money(tx.amount) : '',
      tx.type === 'credit' ? money(tx.amount) : '',
      money(runningBalance),
    ]);
  }

  // Account details panel follows the BOB statement's two-column layout.
  doc.setFillColor(255, 246, 242);
  doc.setDrawColor(235, 190, 180);
  doc.roundedRect(margin, 5, contentWidth, 84, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('Account Details', margin + 3, 13);

  const leftLabelX = margin + 3;
  const leftValueX = margin + 27;
  const rightLabelX = margin + 98;
  const rightValueX = margin + 128;
  const detail = (label: string, value: string, labelX: number, valueX: number, y: number, width: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(70, 70, 70);
    doc.text(label, labelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(doc.splitTextToSize(value || '-', width), valueX, y);
  };

  detail('Account Name', account.name || '', leftLabelX, leftValueX, 21, 63);
  detail('Branch Name', account.branchName || '', rightLabelX, rightValueX, 21, 62);
  detail('Account Number', account.accountNumber || '', leftLabelX, leftValueX, 31, 63);
  detail('IFSC Code', account.ifscCode || '', rightLabelX, rightValueX, 31, 62);
  detail('Account Type', account.accountTypeName || account.accountType || '', leftLabelX, leftValueX, 41, 63);
  detail('MICR Code', account.micrCode || '', rightLabelX, rightValueX, 41, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text('Customer Address', leftLabelX, 52);
  doc.text('Branch Address', rightLabelX, 52);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 30, 30);
  const customerAddress = [
    account.customerAddress,
    account.customerCity,
    account.customerPin,
  ].filter(Boolean).join(', ');
  const branchAddress = [
    account.branchAddress,
    account.branchCity,
    account.branchPin,
  ].filter(Boolean).join(', ');
  doc.text(doc.splitTextToSize(customerAddress || '-', 67).slice(0, 3), leftValueX, 57);
  doc.text(doc.splitTextToSize(branchAddress || '-', 62).slice(0, 3), rightValueX, 57);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(65, 65, 65);
  const extraLeft = [
    account.customerId ? 'Customer ID: ' + account.customerId : '',
    account.nominee ? 'Nominee: ' + account.nominee : '',
  ].filter(Boolean).join('   ');
  const extraRight = account.ckycNumber ? 'CKYC Number: ' + account.ckycNumber : '';
  if (extraLeft) doc.text(doc.splitTextToSize(extraLeft, 88), leftLabelX, 79);
  if (extraRight) doc.text(doc.splitTextToSize(extraRight, 82), rightLabelX, 79);

  const footerNote = account.statementNote ||
    'This is a computer-generated statement and does not require a signature.';

  autoTable(doc, {
    head: [['Serial No.', 'Transaction Date', 'Value Date', 'Description', 'Cheque Number', 'Debit', 'Credit', 'Balance']],
    body: rows,
    startY: 93,
    margin: { left: 2, right: 2, top: 8, bottom: 43 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.3,
      cellPadding: 0.3,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [35, 40, 48],
      lineColor: [195, 198, 202],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [32, 32, 32],
      fontStyle: 'bold',
      fontSize: 6.1,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [246, 246, 246] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 62 },
      4: { cellWidth: 16 },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
    },
    rowPageBreak: 'avoid',
    didDrawPage: () => {
      const footerTop = pageHeight - 42;

      // The original BOB statement places its two logos below the table.
      addBrandImage(doc, bobWorldLogo, margin, footerTop, 37, 14);
      addBrandImage(doc, bankLogo, pageWidth - margin - 43, footerTop, 43, 14);
      if (!bobWorldLogo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(235, 104, 54);
        doc.text('bob', margin + 2, footerTop + 7);
        doc.setFontSize(8);
        doc.text('World', margin + 3, footerTop + 12);
      }
      if (!bankLogo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(210, 100, 48);
        doc.text('Bank of Baroda', pageWidth - margin - 2, footerTop + 8, { align: 'right' });
      }

      doc.setFillColor(235, 99, 42);
      doc.rect(margin, footerTop + 15, contentWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(255, 255, 255);
      doc.text(
        'Account Statement from ' + dateText(from) + ' to ' + dateText(to),
        pageWidth / 2,
        footerTop + 20.2,
        { align: 'center' },
      );

      doc.setFillColor(236, 236, 236);
      doc.roundedRect(margin, footerTop + 25, contentWidth, 7, 1.2, 1.2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.3);
      doc.setTextColor(65, 65, 65);
      doc.text(doc.splitTextToSize(footerNote, contentWidth - 6).slice(0, 1), margin + 3, footerTop + 29.5);

      doc.setFontSize(6.2);
      doc.setTextColor(70, 70, 70);
      doc.text(
        'This is a computer-generated statement. Generated ' + format(new Date(), 'dd-MM-yyyy HH:mm'),
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' },
      );
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.setTextColor(65, 65, 65);
    doc.text('Page ' + page + ' of ' + totalPages, pageWidth / 2, pageHeight - 1.5, { align: 'center' });
  }

  return doc.output('blob');
}
