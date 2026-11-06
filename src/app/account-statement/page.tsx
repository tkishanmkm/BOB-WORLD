"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Home, Lightbulb, CheckCircle2, ChevronDown, CalendarDays, ArrowRightLeft } from 'lucide-react';
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
import { ensureStatementBrandAssets, savePdfToDownloads } from '@/lib/statement-download';
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

  const formatDateForDisplay = (date?: Date) => date ? format(date, 'dd-MM-yyyy') : 'Select Date';
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

  const periodTotalIn = useMemo(() => visibleTransactions
    .filter(tx => tx.type === 'credit')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0), [visibleTransactions]);
  const periodTotalOut = useMemo(() => visibleTransactions
    .filter(tx => tx.type === 'debit')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0), [visibleTransactions]);


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

      const savedLocation = await savePdfToDownloads(pdfBlob, fileName);
      toast({
        title: 'Statement PDF downloaded',
        description: fileName + ' saved to ' + savedLocation + '. Only the PDF file was exported.',
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
            <div className="flex items-start text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary mr-2.5 mt-0.5 shrink-0" />
              <p>Your statement PDF is generated from the account details and transactions saved in this app.</p>
            </div>
            <div className="flex items-start text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary mr-2.5 mt-0.5 shrink-0" />
              <p>Statement logos and account fields are managed in Settings. The uploaded source PDF is not reused as the output.</p>
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

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor="from-date" className="text-xs text-muted-foreground">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" id="from-date" className="w-full justify-between mt-1 h-11 font-normal">
                      <span>{formatDateForDisplay(fromDate)}</span>
                      <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={fromDate} onSelect={setFromDate}
                      disabled={(date) => date > new Date() || (toDate ? date > toDate : false)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="self-end pb-2.5"><ArrowRightLeft className="h-5 w-5 text-muted-foreground" /></div>
              <div className="flex-1">
                <Label htmlFor="to-date" className="text-xs text-muted-foreground">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" id="to-date" className="w-full justify-between mt-1 h-11 font-normal">
                      <span>{formatDateForDisplay(toDate)}</span>
                      <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={toDate} onSelect={setToDate}
                      disabled={(date) => date > new Date() || (fromDate ? date < fromDate : false)} initialFocus />
                  </PopoverContent>
                </Popover>
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
                <h2 className="font-semibold">Transactions in selected period</h2>
                <span className="text-xs text-muted-foreground">{visibleTransactions.length} entries</span>
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