"use client";

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, IndianRupee } from "lucide-react";
import type { TransactionType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RecentTransactionsCardProps {
  transactions: TransactionType[];
}

export function RecentTransactionsCard({ transactions }: RecentTransactionsCardProps) {
  const displayedTransactions = transactions.slice(0, 3); // Show latest 3

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {displayedTransactions.length > 0 ? (
          <ul className="space-y-3">
            {displayedTransactions.map((transaction) => (
              <li key={transaction.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  {transaction.type === 'debit' ? (
                    <ArrowUpCircle className="h-6 w-6 text-destructive" />
                  ) : (
                    <ArrowDownCircle className="h-6 w-6 text-green-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "text-sm font-semibold flex items-center",
                  transaction.type === 'debit' ? 'text-destructive' : 'text-green-600'
                )}>
                  <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                  {transaction.amount.toLocaleString('en-IN')}
                </div>
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
    </Card>
  );
}
