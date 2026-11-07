
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { IndianRupee, CheckCircle2, ArrowUpCircle } from "lucide-react";
import type { TransactionType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TransactionListItemProps {
  transaction: TransactionType;
  onTransactionSelect: (transaction: TransactionType) => void;
  // onTransactionLongPress prop removed
}

const BobLogoPlaceholder = () => (
  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
    bob
  </div>
);

const MiscIconPlaceholder = () => (
    <div className="h-10 w-10 rounded-full bg-yellow-400 flex items-center justify-center text-yellow-900">
        <IndianRupee className="h-5 w-5" />
    </div>
);


export function TransactionListItem({ transaction, onTransactionSelect }: TransactionListItemProps) {
  const isDebit = transaction.type === 'debit';
  const IconComponent = transaction.description.toLowerCase().includes("neft") || transaction.description.toLowerCase().includes("imps") || transaction.description.toLowerCase().includes("bob")
    ? BobLogoPlaceholder
    : MiscIconPlaceholder;

  const transactionDate = Number.isFinite(new Date(transaction.date).getTime())
    ? new Date(transaction.date).toLocaleDateString('en-GB').replaceAll('/', '-')
    : transaction.date;

  let transactionDisplaySubType = "";
  if (transaction.transactionMainType?.toLowerCase().includes("neft")) transactionDisplaySubType = "NEFT";
  else if (transaction.transactionMainType?.toLowerCase().includes("imps")) transactionDisplaySubType = "IMPS";
  else if (transaction.transactionMainType?.toLowerCase().includes("upi")) transactionDisplaySubType = "UPI";
  else if (transaction.transactionSubType) transactionDisplaySubType = transaction.transactionSubType;

  const handleClick = () => {
    onTransactionSelect(transaction);
  };

  return (
    <Card 
        className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick} // Simplified to onClick
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <IconComponent />
            <div>
              <p className="text-sm font-semibold text-foreground truncate max-w-[150px] sm:max-w-xs">
                {transaction.description}
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-muted-foreground">{transactionDate}</p>
                {transactionDisplaySubType && (
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm">
                    {transactionDisplaySubType}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <div className={cn(
                "text-sm font-bold flex items-center",
                isDebit ? 'text-red-600' : 'text-green-600'
              )}>
                <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                {transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {isDebit ? 
                    <ArrowUpCircle className="h-4 w-4 ml-1" /> : 
                    <CheckCircle2 className="h-4 w-4 ml-1" />
                }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
