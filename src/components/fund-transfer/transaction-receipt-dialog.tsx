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
import { cn } from "@/lib/utils";
import { FileDown } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { STATEMENT_LOGO_KEY } from '@/lib/constants';

interface TransactionReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionType | null;
  payee: PayeeType | null;
  remitterAccountDetails: AccountDetailsType | null;
}

const DetailRow: React.FC<{ label: string; value: string | React.ReactNode; labelCols?: string; valueCols?: string }> = ({ label, value, labelCols = "col-span-5", valueCols = "col-span-7" }) => (
  <div className="grid grid-cols-12 py-1.5 text-sm">
    <p className={cn("text-muted-foreground text-left", labelCols)}>{label}</p>
    <div className={cn("text-foreground font-medium text-left break-words", valueCols)}>{value}</div>
  </div>
);

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

function toPdfImageType(dataUri: string): 'PNG' | 'JPEG' | null {
  const prefix = dataUri.slice(0, 80).toLowerCase();
  if (prefix.includes('image/png')) return 'PNG';
  if (prefix.includes('image/jpeg') || prefix.includes('image/jpg')) return 'JPEG';
  return null;
}

const readBlobAsDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not prepare the receipt PDF for saving.'));
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not encode the receipt PDF.'));
  reader.readAsDataURL(blob);
});

const bankIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96"><path fill="#5f6874" d="M12 2 2 7v2h20V7L12 2Zm-7 9h2v7H5v-7Zm6 0h2v7h-2v-7Zm6 0h2v7h-2v-7ZM3 20h18v2H3v-2Z"/></svg>';
const rupeeIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" width="320" height="512"><path fill="#23282e" d="M32 32h256c17.7 0 32 14.3 32 32s-14.3 32-32 32h-56c13.4 13.8 22.8 31.9 26.5 52H288c17.7 0 32 14.3 32 32s-14.3 32-32 32h-29.5c-13.1 58.7-62.5 103-122.7 108.4l145.1 104.8c14.4 10.4 17.7 30.4 7.3 44.7-10.4 14.4-30.4 17.7-44.7 7.3l-224-162c-11.4-8.2-16.2-22.8-11.9-36.2C12 265.6 24.6 256 39 256h73c33.4 0 62.2-18.6 77.1-46H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h157.1c-14.9-27.4-43.7-46-77.1-46H32C14.3 100 0 85.7 0 68s14.3-36 32-36Z"/></svg>';

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
  if (!transaction || !payee || !remitterAccountDetails) return null;

  const parsedDate = parseISO(transaction.date);
  const formattedDateTime = Number.isFinite(parsedDate.getTime())
    ? format(parsedDate, "yyyy-MM-dd HH:mm:ss")
    : transaction.date;
  const formattedAmount = Math.abs(transaction.amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleDownloadPdf = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 18;
      const right = pageWidth - margin;
      const contentWidth = pageWidth - margin * 2;
      let y = 14;

      const logo = localStorage.getItem(STATEMENT_LOGO_KEY);
      if (logo) {
        try {
          const type = toPdfImageType(logo);
          if (type) {
            const info = doc.getImageProperties(logo);
            const scale = Math.min(42 / info.width, 17 / info.height);
            const width = info.width * scale;
            const height = info.height * scale;
            doc.addImage(logo, type, (pageWidth - width) / 2, y, width, height, undefined, 'FAST');
            y += height + 6;
          }
        } catch (error) {
          console.warn('BOB World logo could not be embedded in receipt:', error);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(32, 55, 83);
      doc.text('Transaction Receipt', pageWidth / 2, y + 4, { align: 'center' });
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
      const senderNumber = String(remitterAccountDetails.accountNumber || '-');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(35, 40, 46);
      const senderWidth = doc.getTextWidth(senderNumber);
      if (logo) {
        try {
          const type = toPdfImageType(logo);
          if (type) {
            const info = doc.getImageProperties(logo);
            const iconHeight = 4;
            const iconWidth = Math.min(9, iconHeight * info.width / info.height);
            doc.addImage(logo, type, right - senderWidth - iconWidth - 2, y - 3.1, iconWidth, iconHeight, undefined, 'FAST');
          }
        } catch (error) {
          console.warn('Could not place BOB World logo before remitter number:', error);
        }
      }
      doc.text(senderNumber, right, y, { align: 'right' });
      y += 8;

      y += 1;
      section('TO PAYEE');
      row('Payee name', payee.name || '-', true);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 106, 114);
      doc.text('Payee account number', margin, y);
      const payeeNumber = String(payee.accountNumber || '-');
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

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 124, 130);
      doc.text('This is a computer-generated transaction receipt.', pageWidth / 2, 280, { align: 'center' });

      const ref = String(transaction.referenceNumber || transaction.id || 'BOB-TRANSACTION').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const fileName = 'BOB-World-Receipt-' + ref + '.pdf';
      const blob = doc.output('blob');
      if (Capacitor.isNativePlatform()) {
        const dataUrl = await readBlobAsDataUrl(blob);
        await Filesystem.writeFile({
          path: fileName,
          data: dataUrl.split(',')[1],
          directory: Directory.Documents,
          recursive: true,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (error) {
      console.error('Receipt PDF generation failed:', error);
      setDownloadError(error instanceof Error ? error.message : 'Could not generate the receipt PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[90vw] max-w-[400px] p-0 flex flex-col max-h-[95vh] overflow-hidden rounded-lg shadow-2xl bg-background">
        <DialogHeader className="sr-only"><DialogTitle>Transaction Receipt</DialogTitle></DialogHeader>
        <div className="flex items-center justify-center border-b p-4">
          <img
            src={typeof window !== 'undefined' ? (localStorage.getItem(STATEMENT_LOGO_KEY) || '') : ''}
            alt="BOB World logo"
            className="max-h-12 max-w-[150px] object-contain"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        </div>
        <div className="p-6 pt-4 text-center border-b">
          <h2 className="text-lg font-semibold text-foreground tracking-wider">RECEIPT</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-1">
            <DetailRow label="Reference number - UTR/RRN number/Tran ID" value={transaction.referenceNumber || transaction.id || "N/A"} labelCols="col-span-full" valueCols="col-span-full font-normal pt-0.5 pb-2" />
            <div className="grid grid-cols-2 gap-x-4 pt-1">
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Date and time of transaction</p>
                <p className="text-sm text-foreground font-medium">{formattedDateTime}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 pt-2">
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Account number of remitter</p>
                <p className="text-sm text-foreground font-medium">{remitterAccountDetails.accountNumber || "N/A"}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Name of remitter account</p>
                <p className="text-sm text-foreground font-medium">{remitterAccountDetails.name || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 pt-2">
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm text-foreground font-medium">₹{formattedAmount}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Beneficiary Name</p>
                <p className="text-sm text-foreground font-medium">{payee.name || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 pt-2">
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Account number of beneficiary</p>
                <p className="text-sm text-foreground font-medium">{payee.accountNumber || "N/A"}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">IFSC code of beneficiary bank</p>
                <p className="text-sm text-foreground font-medium">{payee.ifscCode || "N/A"}</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground text-left">Remarks</p>
              <p className="text-sm text-foreground font-medium text-left">{transaction.comments || "ok"}</p>
            </div>
            {downloadError && <p role="alert" className="text-xs text-destructive pt-2">{downloadError}</p>}
          </div>
        </div>
        <DialogFooter className="p-4 border-t bg-muted/50 mt-auto gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={isDownloading} className="w-full sm:w-auto">
            <FileDown className="mr-2 h-4 w-4" /> {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </Button>
          <DialogClose asChild>
            <Button type="button" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
