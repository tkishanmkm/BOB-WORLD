"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, IndianRupee } from "lucide-react";
import type { TransactionType, PayeeType, AccountDetailsType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TransactionReceiptDialog } from '@/components/fund-transfer/transaction-receipt-dialog';
import { ACCOUNT_DETAILS_STORAGE_KEY, INITIAL_ACCOUNT_DETAILS, PAYEES_STORAGE_KEY } from '@/lib/constants';

interface RecentTransactionsCardProps {
  transactions: TransactionType[];
}

export function RecentTransactionsCard({ transactions }: RecentTransactionsCardProps) {
  const displayedTransactions = transactions.slice(0, 3);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | null>(null);
  const [selectedPayee, setSelectedPayee] = useState<PayeeType | null>(null);
  const [remitterAccount, setRemitterAccount] = useState<AccountDetailsType | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const openReceipt = (transaction: TransactionType) => {
    try {
      const storedAccount = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      const account = storedAccount ? { ...INITIAL_ACCOUNT_DETAILS, ...JSON.parse(storedAccount) } as AccountDetailsType : INITIAL_ACCOUNT_DETAILS;
      const storedPayees = localStorage.getItem(PAYEES_STORAGE_KEY);
      const payees = storedPayees ? JSON.parse(storedPayees) as PayeeType[] : [];
      const matched = payees.find(item => item.id === transaction.payeeId);
      const fallback: PayeeType = { id: transaction.payeeId || transaction.id, name: transaction.payeeId ? 'Recipient' : (transaction.description || 'Recipient'), accountNumber: '', ifscCode: '' };
      setRemitterAccount(account);
      setSelectedPayee(matched || fallback);
      setSelectedTransaction(transaction);
      setReceiptOpen(true);
    } catch (error) {
      console.error('Could not load the saved transaction receipt:', error);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {displayedTransactions.length > 0 ? (
          <ul className="space-y-3">
            {displayedTransactions.map((transaction) => (
              <li key={transaction.id}>
                <button type="button" onClick={() => openReceipt(transaction)} className="flex w-full items-center justify-between gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted/50">
                  <span className="flex min-w-0 items-center gap-3">
                    {transaction.type === 'debit' ? <ArrowUpCircle className='h-6 w-6 shrink-0 text-destructive' /> : <ArrowDownCircle className='h-6 w-6 shrink-0 text-green-500' />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{transaction.description}</span>
                      <span className='block text-xs text-muted-foreground'>{new Date(transaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="block text-[10px] font-semibold text-primary">Receipt</span>
                    </span>
                  </span>
                  <span className={cn("flex shrink-0 items-center text-sm font-semibold", transaction.type === 'debit' ? 'text-destructive' : 'text-green-600')}>
                    <IndianRupee className='mr-0.5 h-3.5 w-3.5' />{transaction.amount.toLocaleString('en-IN')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No recent transactions.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/passbook">View All Transactions</Link>
        </Button>
      </CardFooter>
      <TransactionReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} transaction={selectedTransaction} payee={selectedPayee} remitterAccountDetails={remitterAccount} />
    </Card>
  );
}