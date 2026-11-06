
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TransactionType } from "@/lib/types"; 
import { format, parseISO } from 'date-fns';
import { IndianRupee } from "lucide-react"; 

interface TransactionDetailSheetProps {
  transaction: TransactionType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailRow: React.FC<{ label: string; value: string | number | undefined; isCurrency?: boolean }> = ({ label, value, isCurrency }) => (
  <div className="py-3 border-b border-border/50">
    <p className="text-xs text-muted-foreground">{label}</p>
    {isCurrency && typeof value === 'number' ? (
      <p className="font-semibold text-foreground flex items-center">
        <IndianRupee className="h-4 w-4 mr-1" />
        {value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    ) : (
      <p className="font-semibold text-foreground">{value || "NA"}</p>
    )}
  </div>
);

export function TransactionDetailSheet({ 
  transaction, 
  open, 
  onOpenChange 
}: TransactionDetailSheetProps) {

  if (!transaction) return null;

  const formattedDate = transaction.date ? format(parseISO(transaction.date), 'dd MMM yyyy, hh:mm a') : 'NA';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col">
          <SheetHeader className="pb-4 pt-2 text-center sticky top-0 bg-background z-10">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-2" />
            <SheetTitle className="text-lg font-semibold">Transaction details</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            <DetailRow label="Transfer amount" value={transaction.amount} isCurrency />
            <DetailRow label="Transfer date & Time" value={formattedDate} /> 
            <DetailRow label="Instrument number" value={transaction.instrumentNumber} />
            <DetailRow label="Transaction type" value={transaction.transactionMainType} />
            <DetailRow label="Transaction sub type" value={transaction.transactionSubType} />
            <DetailRow label="Transaction description" value={transaction.description} />
            
            <div className="py-3">
              <Label htmlFor="comments-display" className="text-xs text-muted-foreground">Comments</Label>
              <Textarea
                id="comments-display"
                value={transaction.comments || "No comments added."}
                readOnly
                className="mt-1 bg-muted/50 border-none text-sm min-h-[60px]"
                rows={transaction.comments ? Math.max(2, transaction.comments.split('\n').length) : 2}
              />
            </div>
          </div>

          <SheetFooter className="p-4 border-t sticky bottom-0 bg-background z-10">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full py-3 text-base">
              Close
            </Button>
            {/* Download Receipt button removed from here */}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
