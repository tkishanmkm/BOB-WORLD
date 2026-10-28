
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
import type { TransactionType, PayeeType, AccountDetailsType } from "@/lib/types"; // Added AccountDetailsType
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";

interface TransactionReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionType | null;
  payee: PayeeType | null; 
  remitterAccountDetails: AccountDetailsType | null; // Added remitter details
}

const DetailRow: React.FC<{ label: string; value: string | React.ReactNode; labelCols?: string; valueCols?: string }> = ({ label, value, labelCols = "col-span-5", valueCols = "col-span-7" }) => (
  <div className="grid grid-cols-12 py-1.5 text-sm">
    <p className={cn("text-muted-foreground text-left", labelCols)}>{label}</p>
    <div className={cn("text-foreground font-medium text-left break-words", valueCols)}>
      {value}
    </div>
  </div>
);

const BankOfBarodaLogoHeader = () => (
  <div className="flex items-center space-x-2 p-4 border-b">
    {/* Simplified BOB Logo */}
    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl">
      B
    </div>
    <div>
      <p className="font-bold text-lg text-primary leading-tight">बैंक ऑफ़ बड़ौदा</p>
      <p className="font-bold text-lg text-primary leading-tight">Bank of Baroda</p>
      <div className="flex space-x-1 mt-0.5">
        <span className="text-xs bg-red-700 text-white px-1 py-0.5 rounded-sm">VIJAYA</span>
        <span className="text-xs bg-blue-700 text-white px-1 py-0.5 rounded-sm">DENA</span>
      </div>
    </div>
  </div>
);


export function TransactionReceiptDialog({
  open,
  onOpenChange,
  transaction,
  payee,
  remitterAccountDetails,
}: TransactionReceiptDialogProps) {
  if (!transaction || !payee || !remitterAccountDetails) {
    return null;
  }

  const formattedDateTime = format(parseISO(transaction.date), "yyyy-MM-dd HH:mm:ss.SSSSSS");
  const formattedAmount = transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[90vw] max-w-[400px] p-0 flex flex-col max-h-[95vh] overflow-hidden rounded-lg shadow-2xl bg-background">
        
        <DialogHeader className="sr-only">
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>

        <BankOfBarodaLogoHeader />
        
        <div className="p-6 pt-4 text-center border-b">
          <h2 className="text-lg font-semibold text-foreground tracking-wider">RECEIPT</h2>
        </div>
        
        <ScrollArea className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-1">
            <DetailRow label="Reference number - UTR/RRN number/Tran ID" value={transaction.referenceNumber || "N/A"} labelCols="col-span-full" valueCols="col-span-full font-normal pt-0.5 pb-2"/>
            
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
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-muted/50 mt-auto">
          <DialogClose asChild>
            <Button type="button" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// Helper component for ScrollArea, ensure it's defined or imported if used elsewhere.
// For this component, it's fine as an internal helper or use ShadCN's ScrollArea directly.
const ScrollArea: React.FC<{children: React.ReactNode, className?: string}> = ({children, className}) => <div className={cn("overflow-y-auto", className)}>{children}</div>;

