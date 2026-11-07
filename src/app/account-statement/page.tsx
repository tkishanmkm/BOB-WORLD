"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Home, ChevronDown, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import type { AccountDetailsType, TransactionType } from '@/lib/types';
import {
  INITIAL_ACCOUNT_DETAILS,
  ACCOUNT_DETAILS_STORAGE_KEY,
  BALANCE_STORAGE_KEY,
  TRANSACTIONS_STORAGE_KEY,
  STATEMENT_LOGO_KEY,
  STATEMENT_BANK_LOGO_KEY,
} from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { ensureStatementBrandAssets, saveStatementPdf } from '@/lib/statement-download';
import { generateBobStatementPdf } from '@/lib/bob-statement-pdf';
import { BOB_WORLD_STATE_KEYS, migrateLegacyStorage } from '@/lib/indexed-db';

export default function AccountStatementPage() {
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [bobWorldLogo, setBobWorldLogo] = useState<string | null>(null);
  const [bankLogo, setBankLogo] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(() => {
    if (cancelled) return;
    try {
      const storedDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      const details = storedDetails
        ? { ...INITIAL_ACCOUNT_DETAILS, ...JSON.parse(storedDetails) as Partial<AccountDetailsType> }
        : INITIAL_ACCOUNT_DETAILS;
      setAccountDetails(details);

      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      const parsedTransactions = storedTransactions ? JSON.parse(storedTransactions) : [];
      const validTransactions = Array.isArray(parsedTransactions)
        ? parsedTransactions.filter((tx): tx is TransactionType =>
            Boolean(tx && typeof tx.date === 'string' && typeof tx.description === 'string' &&
              Number.isFinite(Number(tx.amount)) && (tx.type === 'credit' || tx.type === 'debit')))
        : [];
      setTransactions(validTransactions);

      const balance = Number(localStorage.getItem(BALANCE_STORAGE_KEY));
      setCurrentBalance(Number.isFinite(balance) ? balance : 0);
      setBobWorldLogo(localStorage.getItem(STATEMENT_LOGO_KEY));
      setBankLogo(localStorage.getItem(STATEMENT_BANK_LOGO_KEY));
      ensureStatementBrandAssets().then(defaults => {
        setBobWorldLogo(current => current || defaults.bobWorldLogo || null);
        setBankLogo(current => current || defaults.bankLogo || null);
      }).catch(error => console.warn('Statement branding could not be loaded:', error));

      const dates = validTransactions
        .map(tx => new Date(tx.date))
        .filter(date => Number.isFinite(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      const fallbackTo = dates.at(-1) || new Date();
      const fallbackFrom = dates[0] || new Date(fallbackTo.getTime() - 7 * 24 * 60 * 60 * 1000);
      const parsedFrom = details.statementPeriodFrom ? new Date(details.statementPeriodFrom) : fallbackFrom;
      const parsedTo = details.statementPeriodTo ? new Date(details.statementPeriodTo) : fallbackTo;
      setFromDate(Number.isFinite(parsedFrom.getTime()) ? parsedFrom : fallbackFrom);
      setToDate(Number.isFinite(parsedTo.getTime()) ? parsedTo : fallbackTo);
    } catch (error) {
      console.error('Could not load saved statement data:', error);
      toast({ title: 'Statement data unavailable', description: 'Check the saved account and transaction data in Settings.', variant: 'destructive' });
    }
    }).catch(error => console.error('Could not restore statement data from IndexedDB:', error));
    return () => { cancelled = true; };
  }, [toast]);

  const visibleCount = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
    const to = new Date(toDate); to.setHours(23, 59, 59, 999);
    return transactions.filter(tx => {
      const date = new Date(tx.date).getTime();
      return Number.isFinite(date) && date >= from.getTime() && date <= to.getTime();
    }).length;
  }, [transactions, fromDate, toDate]);

  const visibleTransactions = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
    const to = new Date(toDate); to.setHours(23, 59, 59, 999);
    return transactions
      .filter(tx => {
        const time = new Date(tx.date).getTime();
        return Number.isFinite(time) && time >= from.getTime() && time <= to.getTime();
      })
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, fromDate, toDate]);

  const { periodTotalIn, periodTotalOut } = useMemo(() => transactions.reduce((totals, tx) => {
    const amount = Math.abs(Number(tx.amount) || 0);
    if (tx.type === 'credit') totals.periodTotalIn += amount;
    else if (tx.type === 'debit') totals.periodTotalOut += amount;
    return totals;
  }, { periodTotalIn: 0, periodTotalOut: 0 }), [transactions]);


  const handleDownload = async () => {
    if (!fromDate || !toDate) {
      toast({ title: 'Choose a date range', description: 'Select both the beginning and ending date before generating the statement.', variant: 'destructive' });
      return;
    }
    if (fromDate > toDate) {
      toast({ title: 'Invalid date range', description: 'The From date must not be after the To date.', variant: 'destructive' });
      return;
    }
    if (!accountDetails.accountNumber?.trim()) {
      toast({ title: 'Account number missing', description: 'Add the account number in Settings before generating a statement.', variant: 'destructive' });
      return;
    }

    setIsDownloading(true);
    try {
      const pdfBlob = await generateBobStatementPdf({
        account: accountDetails,
        transactions,
        currentBalance,
        from: fromDate,
        to: toDate,
        bobWorldLogo,
        bankLogo,
      });
      const statementAccountDigits = String(accountDetails.accountNumber || '').replace(/\D/g, '');
      if (!statementAccountDigits) throw new Error('Add a valid account number in Settings before downloading the statement.');
      const fileName = statementAccountDigits + '.pdf';

      const savedLocation = await saveStatementPdf(pdfBlob, fileName);
      const shareSheetOpened = savedLocation.includes('share sheet');
      const shareSheetCancelled = savedLocation === 'Share sheet closed without saving';
      toast({
        title: shareSheetCancelled ? 'Statement not saved' : shareSheetOpened ? 'Save statement to Files' : 'Statement PDF downloaded',
        description: shareSheetOpened ? fileName + ' is ready in the share sheet. Choose Save to Files.' : shareSheetCancelled ? 'The share sheet was closed before saving.' : fileName + ' saved to ' + savedLocation + '. Only the PDF file was exported.',
      });
    } catch (error) {
      console.error('Statement PDF generation failed:', error);
      toast({
        title: 'Statement generation failed',
        description: error instanceof Error ? error.message : 'The statement could not be generated.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background p-4 flex items-center justify-between border-b sticky top-0 z-20">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" aria-label="Back to dashboard">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Account statement</h1>
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" aria-label="Home">
            <Home className="h-6 w-6" />
          </Button>
        </Link>
      </header>

      <main className="flex-1 p-4 space-y-5">
        <Card className="shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center text-sm font-semibold">
              <div className="bg-orange-500 p-1 rounded-sm mr-2.5 self-start">
                <Lightbulb className="h-4 w-4 text-white" />
              </div>
              Account statement
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Account number</Label>
              <div className="flex items-center justify-between p-2.5 mt-1 border rounded-md bg-background">
                <p className="font-medium">{accountDetails.accountNumber || 'Add account number in Settings'}</p>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Label htmlFor="from-date" className="text-xs text-muted-foreground">From</Label>
                <input id="from-date" type="date" value={fromDate ? format(fromDate, 'yyyy-MM-dd') : ''} max={toDate ? format(toDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')} onChange={event => setFromDate(event.target.value ? new Date(event.target.value + 'T00:00:00') : undefined)} className="mt-1 h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
              <div className="min-w-0">
                <Label htmlFor="to-date" className="text-xs text-muted-foreground">To</Label>
                <input id="to-date" type="date" value={toDate ? format(toDate, 'yyyy-MM-dd') : ''} min={fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined} max={format(new Date(), 'yyyy-MM-dd')} onChange={event => setToDate(event.target.value ? new Date(event.target.value + 'T00:00:00') : undefined)} className="mt-1 h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{visibleCount} saved transaction{visibleCount === 1 ? '' : 's'} in the selected period.</p>
            {!bobWorldLogo && (
              <p className="text-xs text-amber-700">BOB World logo is not set. Upload it in Settings to include it in the PDF.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-0">
            <div className="border-b p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">All account transactions</h2>
                <span className="text-xs text-muted-foreground">{transactions.length} entries in account history</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-800">Total In</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900">₹{periodTotalIn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-lg bg-rose-50 p-3">
                  <p className="text-xs text-rose-800">Total Out</p>
                  <p className="mt-1 text-sm font-semibold text-rose-900">₹{periodTotalOut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y">
              {visibleTransactions.length ? visibleTransactions.map(tx => (
                <div key={tx.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-words">{tx.description || 'Transaction'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{Number.isFinite(new Date(tx.date).getTime()) ? format(new Date(tx.date), 'dd-MM-yyyy, hh:mm a') : tx.date}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold tabular-nums ${tx.type === 'credit' ? 'text-emerald-700' : 'text-foreground'}`}>
                    {tx.type === 'credit' ? '+' : '−'}₹{Math.abs(Number(tx.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )) : (
                <p className="p-6 text-center text-sm text-muted-foreground">No saved transactions in this date range.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="p-4 bg-background border-t">
        <Button className="w-full h-12 text-lg font-semibold" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? 'Generating statement...' : 'Download statement PDF'}
        </Button>
      </footer>
    </div>
  );
}