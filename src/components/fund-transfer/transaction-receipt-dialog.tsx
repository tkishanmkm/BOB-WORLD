"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TransactionType, PayeeType, AccountDetailsType } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { Share2, Download, Check } from 'lucide-react';
import { savePdfToDownloads } from '@/lib/statement-download';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

interface TransactionReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionType | null;
  payee: PayeeType | null;
  remitterAccountDetails: AccountDetailsType | null;
}



function belowThousand(value: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  let result = '';
  if (value >= 100) {
    result += ones[Math.floor(value / 100)] + ' Hundred';
    value %= 100;
    if (value) result += ' ';
  }
  if (value >= 20) {
    result += tens[Math.floor(value / 10)];
    if (value % 10) result += ' ' + ones[value % 10];
  } else if (value > 0) {
    result += ones[value];
  }
  return result;
}

function indianNumberWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) return 'Amount unavailable';
  let amount = Math.floor(value);
  if (amount === 0) return 'Zero';
  const groups: Array<[number, string]> = [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand'],
    [1, ''],
  ];
  const parts: string[] = [];
  for (const [unit, label] of groups) {
    const part = Math.floor(amount / unit);
    if (part > 0) {
      parts.push(belowThousand(part) + (label ? ' ' + label : ''));
      amount %= unit;
    }
  }
  return parts.join(' ');
}

function amountInWords(value: number): string {
  const paise = Math.round((Math.abs(value) - Math.floor(Math.abs(value))) * 100);
  return indianNumberWords(Math.floor(Math.abs(value))) + ' Rupees' +
    (paise ? ' and ' + belowThousand(paise) + ' Paise' : '') + ' Only';
}


function maskReceiptAccount(value: string | undefined): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'N/A';
  return 'XXXX' + digits.slice(-4);
}

const bankIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96"><path fill="#5f6874" d="M12 2 2 7v2h20V7L12 2Zm-7 9h2v7H5v-7Zm6 0h2v7h-2v-7Zm6 0h2v7h-2v-7ZM3 20h18v2H3v-2Z"/></svg>';
const rupeeIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" width="320" height="512"><path fill="#23282e" d="M32 32h256c17.7 0 32 14.3 32 32s-14.3 32-32 32h-56c13.4 13.8 22.8 31.9 26.5 52H288c17.7 0 32 14.3 32 32s-14.3 32-32 32h-29.5c-13.1 58.7-62.5 103-122.7 108.4l145.1 104.8c14.4 10.4 17.7 30.4 7.3 44.7-10.4 14.4-30.4 17.7-44.7 7.3l-224-162c-11.4-8.2-16.2-22.8-11.9-36.2C12 265.6 24.6 256 39 256h73c33.4 0 62.2-18.6 77.1-46H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h157.1c-14.9-27.4-43.7-46-77.1-46H32C14.3 100 0 85.7 0 68s14.3-36 32-36Z"/></svg>';

async function loadPublicPngDataUri(path: string): Promise<string> {
  const response = await fetch(path, { cache: 'force-cache' });
  if (!response.ok) throw new Error('Could not load receipt artwork: ' + path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not prepare receipt artwork.'));
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read receipt artwork.'));
    reader.readAsDataURL(blob);
  });
}

async function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  const image = new window.Image();
  const source = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not render a receipt icon.'));
    image.src = source;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable for receipt icon rendering.');
  context.drawImage(image, 0, 0, width, height);
  const result = canvas.toDataURL('image/png');
  canvas.width = 0;
  canvas.height = 0;
  return result;
}

export function TransactionReceiptDialog({
  open,
  onOpenChange,
  transaction,
  payee,
  remitterAccountDetails,
}: TransactionReceiptDialogProps) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const parsedDate = transaction ? parseISO(transaction.date) : new Date(Number.NaN);
  const formattedDateTime = transaction
    ? Number.isFinite(parsedDate.getTime()) ? format(parsedDate, "yyyy-MM-dd HH:mm:ss") : transaction.date
    : '';
  const formattedAmount = transaction ? Math.abs(transaction.amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : '0.00';

  const handleDownloadPdf = async () => {
    if (!transaction || !payee || !remitterAccountDetails) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 18;
      const right = pageWidth - margin;
      const contentWidth = pageWidth - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFillColor(247, 248, 250);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setFillColor(255, 96, 72);
      doc.rect(0, 0, pageWidth, 78, 'F');
      const ticketX = 12;
      const ticketY = 43;
      const ticketWidth = pageWidth - 24;
      const ticketHeight = 207;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(ticketX, ticketY, ticketWidth, ticketHeight, 2.5, 2.5, 'F');
      doc.setFillColor(255, 96, 72);
      for (let x = ticketX + 4; x < ticketX + ticketWidth - 2; x += 8) doc.circle(x, ticketY, 2.25, 'F');
      doc.setFillColor(247, 248, 250);
      for (let x = ticketX + 4; x < ticketX + ticketWidth - 2; x += 8) doc.circle(x, ticketY + ticketHeight, 2.25, 'F');
      let y = 14;

      const [bankOfBarodaLogo, bobWorldLogo] = await Promise.all([
        loadPublicPngDataUri('/assets/branding/bank-of-baroda-monochrome.png'),
        loadPublicPngDataUri('/assets/branding/bob-world-logo.png'),
      ]);
      const bankInfo = doc.getImageProperties(bankOfBarodaLogo);
      const bankScale = Math.min(62 / bankInfo.width, 18 / bankInfo.height);
      const bankWidth = bankInfo.width * bankScale;
      const bankHeight = bankInfo.height * bankScale;
      doc.addImage(bankOfBarodaLogo, 'PNG', (pageWidth - bankWidth) / 2, y, bankWidth, bankHeight, undefined, 'FAST');
      y += bankHeight + 5;

      doc.setFillColor(32, 178, 145);
      doc.circle(pageWidth / 2, y + 3.5, 5.5, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.1);
      doc.line(pageWidth / 2 - 2.2, y + 3.5, pageWidth / 2 - 0.5, y + 5.2);
      doc.line(pageWidth / 2 - 0.5, y + 5.2, pageWidth / 2 + 2.7, y + 1.8);
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(32, 55, 83);
      doc.text('Transaction successful', pageWidth / 2, y + 4, { align: 'center' });
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(92, 99, 107);
      doc.text('Reference Number: ' + (transaction.referenceNumber || transaction.id || '-'), pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.setDrawColor(200, 205, 211);
      doc.setLineDashPattern([1.3, 1.3], 0);
      doc.line(margin, y, right, y);
      doc.setLineDashPattern([], 0);
      y += 8;

      const section = (title: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(28, 67, 105);
        doc.text(title, margin, y);
        y += 6;
      };
      const row = (label: string, value: string, bold = false) => {
        const labelWidth = 37;
        const valueWidth = contentWidth - labelWidth;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 106, 114);
        doc.text(label, margin, y);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(35, 40, 46);
        const lines = doc.splitTextToSize(value || '-', valueWidth);
        doc.text(lines, right, y, { align: 'right' });
        y += Math.max(6, lines.length * 4.5) + 1.5;
      };

      section('FROM');
      row('Account holder', remitterAccountDetails.name || '-', true);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 106, 114);
      doc.text('Account number', margin, y);
      const senderNumber = maskReceiptAccount(remitterAccountDetails.accountNumber);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(35, 40, 46);
      const senderWidth = doc.getTextWidth(senderNumber);
      try {
        const info = doc.getImageProperties(bobWorldLogo);
        const iconHeight = 4.2;
        const iconWidth = Math.min(9, iconHeight * info.width / info.height);
        doc.addImage(bobWorldLogo, 'PNG', right - senderWidth - iconWidth - 2, y - 3.1, iconWidth, iconHeight, undefined, 'FAST');
      } catch (error) {
        console.warn('Could not place BOB World logo before remitter number:', error);
      }      doc.text(senderNumber, right, y, { align: 'right' });
      y += 8;

      y += 1;
      section('TO PAYEE');
      row('Payee name', payee.name || '-', true);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 106, 114);
      doc.text('Payee account number', margin, y);
      const payeeNumber = maskReceiptAccount(payee.accountNumber);
      const payeeWidth = doc.getTextWidth(payeeNumber);
      try {
        const iconData = await svgToPngDataUrl(bankIconSvg, 96, 96);
        doc.addImage(iconData, 'PNG', right - payeeWidth - 7, y - 3.1, 4.2, 4.2, undefined, 'FAST');
      } catch (iconError) {
        console.warn('Beneficiary bank icon could not be embedded:', iconError);
      }
      doc.setTextColor(35, 40, 46);
      doc.text(payeeNumber, right, y, { align: 'right' });
      y += 8;
      row('IFSC code', String(payee.ifscCode || '-').toUpperCase());

      y += 2;
      doc.setDrawColor(215, 220, 226);
      doc.line(margin, y, right, y);
      y += 8;
      section('TRANSFER DETAILS');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 106, 114);
      doc.text('AMOUNT', margin, y);
      const amountText = formattedAmount;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(35, 40, 46);
      const amountWidth = doc.getTextWidth(amountText);
      try {
        const rupeeData = await svgToPngDataUrl(rupeeIconSvg, 320, 512);
        doc.addImage(rupeeData, 'PNG', right - amountWidth - 6, y - 3.4, 3.5, 5, undefined, 'FAST');
      } catch (iconError) {
        console.warn('Rupee amount icon could not be embedded:', iconError);
      }
      doc.text(amountText, right, y, { align: 'right' });
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(83, 90, 98);
      const words = doc.splitTextToSize(amountInWords(Math.abs(transaction.amount)), contentWidth - 40);
      doc.text(words, right, y, { align: 'right' });
      y += words.length * 4.2 + 4;

      row('Remarks', transaction.comments || '-');
      row('Transfer date', formattedDateTime, true);
      row('Reference ID', transaction.referenceNumber || transaction.id || '-');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(80, 83, 88);
      doc.text('PERSONAL RECORD - NOT ISSUED BY THE BANK', pageWidth / 2, 275.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Generated locally from information saved in this app.', pageWidth / 2, 280, { align: 'center' });

      const ref = String(transaction.referenceNumber || transaction.id || 'BOB-TRANSACTION').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const fileName = 'BOB-World-Receipt-' + ref + '.pdf';
      const blob = doc.output('blob');
      const savedLocation = await savePdfToDownloads(blob, fileName);
      setDownloadError(null);
      toast({ title: 'Receipt PDF downloaded', description: fileName + ' saved to ' + savedLocation + '.' });
    } catch (error) {
      console.error('Receipt PDF generation failed:', error);
      setDownloadError(error instanceof Error ? error.message : 'Could not generate the receipt PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareRecord = async () => {
    if (!transaction || !payee || !remitterAccountDetails) return;
    const details = [
      'Transaction successful',
      'Amount: INR ' + formattedAmount,
      'Paying to: ' + payee.name,
      'From account: ' + maskReceiptAccount(remitterAccountDetails.accountNumber),
      'Transfer type: ' + (transaction.transactionSubType || 'IMPS'),
      'Date: ' + formattedDateTime,
      'Reference number: ' + (transaction.referenceNumber || transaction.id || '-'),
      'Remarks: ' + (transaction.comments || '-'),
      'Personal record · Not issued by the bank',
    ].join('\n');
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: 'BOB World transaction record', text: details });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(details);
        toast({ title: 'Transaction details copied', description: 'The record details are ready to share.' });
      } else {
        setDownloadError('Sharing is not available in this browser.');
      }
    } catch (shareError) {
      if (!(shareError instanceof Error && shareError.name === 'AbortError')) setDownloadError(shareError instanceof Error ? shareError.message : 'Could not share transaction details.');
    }
  };

  if (!transaction || !payee || !remitterAccountDetails) return null;
  const displayDate = Number.isFinite(parsedDate.getTime()) ? format(parsedDate, 'dd/MM/yyyy') : transaction.date;
  const transferType = transaction.transactionSubType || 'IMPS';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-screen max-w-[430px] h-[100dvh] max-h-[100dvh] p-0 gap-0 overflow-hidden rounded-none border-0 bg-[#f4f5f7] flex flex-col'>
        <DialogHeader className='sr-only'><DialogTitle>Transaction receipt</DialogTitle></DialogHeader>
        <div className='relative flex-1 min-h-0 overflow-y-auto'>
          <div className='h-[178px] bg-gradient-to-br from-[#ff624a] to-[#f34b32]' />
          <div className='relative -mt-[126px] mx-5 mb-5 bg-white shadow-md'>
            <div className='pointer-events-none absolute -top-2 left-0 right-0 h-4' style={{ backgroundImage: 'radial-gradient(circle at 8px 8px, #ffffff 8px, transparent 8.5px)', backgroundSize: '24px 16px', backgroundRepeat: 'repeat-x' }} />
            <div className='px-5 pt-7 pb-6'>
              <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#22b58f] shadow-sm'><Check className='h-8 w-8 text-white' strokeWidth={3} /></div>
              <h2 className='mt-3 text-center text-xl font-bold text-[#17191d]'>Transfer successful</h2>
              <div className='mt-2 text-center'><p className='text-xs font-semibold text-[#333840]'>Amount</p><p className='mt-1 text-xl font-bold text-[#17191d]'><span className='mr-1'>₹</span>{formattedAmount}</p></div>
              <div className='mt-4 border-t border-dashed border-[#b8bbc0]' />
              <div className='mt-4 space-y-4 text-sm'>
                <div className='flex items-start justify-between gap-4'><span className='shrink-0 text-[#61666d]'>Paying to</span><strong className='text-right text-[#17191d]'>{payee.name}</strong></div>
                <div className='flex items-start justify-between gap-4'><span className='shrink-0 text-[#61666d]'>From account</span><strong className='text-right text-[#17191d]'>{maskReceiptAccount(remitterAccountDetails.accountNumber)}</strong></div>
                <div className='flex items-start justify-between gap-4'><span className='shrink-0 text-[#61666d]'>Transfer type</span><strong className='text-right text-[#17191d]'>{transferType}</strong></div>
                <div className='flex items-start justify-between gap-4'><span className='shrink-0 text-[#61666d]'>Date</span><strong className='text-right text-[#17191d]'>{displayDate}</strong></div>
                <div className='flex items-start justify-between gap-4'><span className='shrink-0 text-[#61666d]'>Reference number</span><strong className='max-w-[62%] break-all text-right text-[#17191d]'>{transaction.referenceNumber || transaction.id}</strong></div>
                {transaction.comments && <div className='flex items-start justify-between gap-4'><span className='shrink-0 text-[#61666d]'>Remarks</span><strong className='max-w-[62%] break-words text-right text-[#17191d]'>{transaction.comments}</strong></div>}
              </div>
              <div className='mt-5 border-t border-dashed border-[#b8bbc0] pt-3 text-center'>
                <p className='text-[10px] font-semibold tracking-wide text-[#5c626b]'>PERSONAL RECORD · NOT ISSUED BY THE BANK</p>
                <p className='mt-1 text-[10px] text-[#777d85]'>Generated locally from information saved in this app.</p>
              </div>
            </div>
            <div className='pointer-events-none absolute -bottom-2 left-0 right-0 h-4' style={{ backgroundImage: 'radial-gradient(circle at 8px 0, #f4f5f7 8px, transparent 8.5px)', backgroundSize: '24px 16px', backgroundRepeat: 'repeat-x' }} />
          </div>
          {downloadError && <p role='alert' className='mx-6 mb-3 text-xs text-destructive'>{downloadError}</p>}
        </div>
        <DialogFooter className='mt-auto border-t border-[#e2e4e8] bg-white p-3'>
          <div className='grid w-full grid-cols-3 gap-2'>
            <Button type='button' variant='outline' onClick={handleShareRecord} className='h-11 gap-1 px-2'><Share2 className='h-4 w-4' />Share</Button>
            <Button type='button' onClick={handleDownloadPdf} disabled={isDownloading} className='h-11 gap-1 px-2 bg-[#1d3b63] text-white hover:bg-[#173151]'><Download className='h-4 w-4' />{isDownloading ? 'Saving…' : 'Download'}</Button>
            <DialogClose asChild><Button type='button' variant='outline' className='h-11 px-2'>Done</Button></DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}