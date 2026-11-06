
"use client";

import type { TransactionType } from '@/lib/types';
import { TransactionListItem } from './transaction-list-item';
import { format, parseISO } from 'date-fns';

interface PassbookTransactionGroupProps {
  date: string; // YYYY-MM-DD format from grouping
  transactions: TransactionType[];
  onTransactionSelect: (transaction: TransactionType) => void;
  // onTransactionLongPress prop removed
}

export function PassbookTransactionGroup({ date, transactions, onTransactionSelect }: PassbookTransactionGroupProps) {
  const displayDate = format(parseISO(date), 'dd/MM/yyyy');

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted-foreground px-1 pt-2">{displayDate}</p>
      <div className="space-y-1">
        {transactions.map(tx => (
          <TransactionListItem 
            key={tx.id} 
            transaction={tx} 
            onTransactionSelect={onTransactionSelect}
            // onTransactionLongPress removed
          />
        ))}
      </div>
    </div>
  );
}
