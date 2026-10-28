
"use client";

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TransactionType, PayeeType, AccountDetailsType } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { IndianRupee, UserCircle2, Repeat } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
// TransactionReceiptDialog import removed
import { ACCOUNT_DETAILS_STORAGE_KEY, INITIAL_ACCOUNT_DETAILS } from '@/lib/constants';
// useToast import removed
import { cn } from '@/lib/utils';

interface PayeeDetailSheetProps {
  payee: PayeeType | null;
  transactions: TransactionType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailRow: React.FC<{ label: string; value: string | number | undefined; icon?: React.ElementType, isCurrency?: boolean, customClass?: string }> = ({ label, value, icon: Icon, isCurrency, customClass }) => (
  <div className="flex items-start space-x-3 py-2.5 border-b border-border/50 last:border-b-0">
    {Icon && <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />}
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      {isCurrency && typeof value === 'number' ? (
        <p className={`font-semibold text-foreground flex items-center text-sm ${customClass || ''}`}>
          <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
          {value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      ) : (
        <p className={`font-semibold text-foreground text-sm break-words ${customClass || ''}`}>{value || "N/A"}</p>
      )}
    </div>
  </div>
);


export function PayeeDetailSheet({ payee, transactions, open, onOpenChange }: PayeeDetailSheetProps) {
  // State for receipt dialog removed
  // const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  // const [selectedTransactionForReceipt, setSelectedTransactionForReceipt] = useState<TransactionType | null>(null);
  
  const [accountHolderDetails, setAccountHolderDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  // const { toast } = useToast(); // toast was for receipt

  useEffect(() => {
    if (open) {
      const storedDetailsString = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      if (storedDetailsString) {
        try {
          setAccountHolderDetails(JSON.parse(storedDetailsString));
        } catch (e) {
          console.error("Failed to parse account details from localStorage", e);
          setAccountHolderDetails(INITIAL_ACCOUNT_DETAILS);
        }
      } else {
        setAccountHolderDetails(INITIAL_ACCOUNT_DETAILS);
      }
    }
  }, [open]);

  if (!payee) return null;

  const lastTransaction = transactions
    .filter(tx => tx.payeeId === payee.id && tx.type === 'debit')
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    [0];

  // handleDownloadReceipt function removed

  const maskAccountNumber = (accountNumber: string | undefined, ifscCode?: string) => {
    if (!accountNumber) return "N/A";
    const lastFour = accountNumber.slice(-4);
    if (ifscCode && ifscCode.length >= 4) {
      return `${ifscCode.substring(0, 4)} - XX ${lastFour}`;
    }
    return `XX ${lastFour}`;
  };


  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] flex flex-col p-0 bg-muted/30">
          <SheetHeader className="p-4 pb-2 text-center sticky top-0 bg-background z-10 border-b shadow-sm">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-2" />
            <SheetTitle className="text-lg font-semibold">{payee.name}</SheetTitle>
            <SheetDescription>{maskAccountNumber(payee.accountNumber, payee.ifscCode)} &bull; {payee.ifscCode}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                  <Card className="shadow-md">
                      <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-base text-primary flex items-center"><UserCircle2 className="mr-2 h-5 w-5"/>Payee Details</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                          <DetailRow label="Full Name" value={payee.name} />
                          <DetailRow label="Account Number" value={payee.accountNumber} />
                          <DetailRow label="IFSC Code" value={payee.ifscCode} />
                          {payee.nickname && <DetailRow label="Nickname" value={payee.nickname} />}
                      </CardContent>
                  </Card>

                  <Card className="shadow-md">
                      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                          <CardTitle className="text-base text-primary flex items-center"><Repeat className="mr-2 h-5 w-5"/>Last Transaction</CardTitle>
                          {/* Download Receipt Button Removed */}
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                          {lastTransaction ? (
                          <div className="space-y-1">
                              <DetailRow label="Date" value={format(parseISO(lastTransaction.date), 'dd MMM yyyy, hh:mm a')} />
                              <DetailRow label="Description" value={lastTransaction.description} />
                              <DetailRow label="Amount Debited" value={lastTransaction.amount} isCurrency customClass="text-destructive" />
                              {lastTransaction.transactionMainType && <DetailRow label="Transaction Type" value={lastTransaction.transactionMainType} />}
                          </div>
                          ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No recent debit transactions found for this payee.</p>
                          )}
                      </CardContent>
                  </Card>
              </div>
          </ScrollArea>

          <SheetFooter className="p-4 border-t sticky bottom-0 bg-background z-10 shadow-inner grid grid-cols-2 gap-3">
            <SheetClose asChild>
              <Button variant="outline" className="w-full py-3 text-base">Close</Button>
            </SheetClose>
            <Button className="w-full py-3 text-base bg-primary hover:bg-primary/90 text-primary-foreground">
               <Repeat className="mr-2 h-4 w-4"/> Transfer Again
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* TransactionReceiptDialog rendering removed */}
    </>
  );
}
