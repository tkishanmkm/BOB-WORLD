
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PassbookTransactionGroup } from "@/components/passbook/passbook-transaction-group";
import { PassbookSummaryCard } from "@/components/passbook/passbook-summary-card";
import { TransactionDetailSheet } from "@/components/passbook/transaction-detail-sheet";
import { SpendingChart } from "@/components/passbook/spending-chart";
import { 
  INITIAL_TRANSACTIONS, 
  INITIAL_ACCOUNT_DETAILS, 
  INITIAL_BALANCE, 
  TRANSACTIONS_STORAGE_KEY, 
  ACCOUNT_DETAILS_STORAGE_KEY, 
  BALANCE_STORAGE_KEY,
  PAYEES_STORAGE_KEY,
  INITIAL_PAYEES,     
  PASSBOOK_TOTAL_IN_KEY,
  PASSBOOK_TOTAL_OUT_KEY,
  PASSBOOK_CLOSING_BALANCE_KEY,
  STATEMENT_PDF_KEY,
} from "@/lib/constants";
import type { TransactionType, AccountDetailsType, PayeeType } from '@/lib/types'; 
import { ArrowLeft, MoreHorizontal, CalendarDays, ChevronDown, RefreshCw, FileDown, SlidersHorizontal, IndianRupee, Loader2 } from "lucide-react";
import Link from 'next/link';
import { format, subDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';


export default function PassbookPage() {
  const [allTransactions, setAllTransactions] = useState<TransactionType[]>([]);
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [currentBalance, setCurrentBalance] = useState<number>(INITIAL_BALANCE);
  const [payees, setPayees] = useState<PayeeType[]>(INITIAL_PAYEES); 
  
  const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 7));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');

  const [overrideTotalIn, setOverrideTotalIn] = useState<number | null>(null);
  const [overrideTotalOut, setOverrideTotalOut] = useState<number | null>(null);
  const [overrideClosingBalance, setOverrideClosingBalance] = useState<number | null>(null);

  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<TransactionType | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (storedTransactions) {
      try {
        const parsedTxs = JSON.parse(storedTransactions).map((tx: any) => ({
          ...tx,
          id: tx.id || crypto.randomUUID(),
          date: tx.date 
        }));
        setAllTransactions(parsedTxs);
      } catch (e) {
        console.error("Failed to parse transactions from localStorage:", e);
        setAllTransactions(INITIAL_TRANSACTIONS.map(tx => ({...tx, id: tx.id || crypto.randomUUID() } as TransactionType)));
      }
    } else {
      setAllTransactions(INITIAL_TRANSACTIONS.map(tx => ({...tx, id: tx.id || crypto.randomUUID()} as TransactionType)));
    }

    const storedAccountDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedAccountDetails) {
        try {
            setAccountDetails(JSON.parse(storedAccountDetails));
        } catch (e) {
            console.error("Failed to parse account details from localStorage:", e);
            setAccountDetails(INITIAL_ACCOUNT_DETAILS);
        }
    } else {
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
    }

    const storedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (storedBalance) {
        const numBalance = parseFloat(storedBalance);
        if (!isNaN(numBalance)) {
            setCurrentBalance(numBalance);
        } else {
            setCurrentBalance(INITIAL_BALANCE);
        }
    } else {
        setCurrentBalance(INITIAL_BALANCE);
    }

    const storedPayees = localStorage.getItem(PAYEES_STORAGE_KEY);
    if (storedPayees) {
        try {
            setPayees(JSON.parse(storedPayees));
        } catch (e) {
            console.error("Failed to parse payees from localStorage:", e);
            setPayees(INITIAL_PAYEES);
        }
    } else {
        setPayees(INITIAL_PAYEES);
    }

    const storedOverrideTotalIn = localStorage.getItem(PASSBOOK_TOTAL_IN_KEY);
    if (storedOverrideTotalIn) setOverrideTotalIn(parseFloat(storedOverrideTotalIn));
    
    const storedOverrideTotalOut = localStorage.getItem(PASSBOOK_TOTAL_OUT_KEY);
    if (storedOverrideTotalOut) setOverrideTotalOut(parseFloat(storedOverrideTotalOut));

    const storedOverrideClosingBalance = localStorage.getItem(PASSBOOK_CLOSING_BALANCE_KEY);
    if (storedOverrideClosingBalance) setOverrideClosingBalance(parseFloat(storedOverrideClosingBalance));

  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const statementPdfDataUri = localStorage.getItem(STATEMENT_PDF_KEY);
      if (!statementPdfDataUri || !statementPdfDataUri.startsWith('data:application/pdf;base64,')) {
         toast({
          title: "Download Failed",
          description: "No statement PDF found. Please upload one in the Settings page.",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }
      
      const dateStr = format(new Date(), 'yyyyMMdd');
      const fileName = `XXXXXXXXXX${accountDetails.accountNumber.slice(-4)}_${dateStr}.pdf`;

      if (Capacitor.getPlatform() === 'android') {
        const base64Data = statementPdfDataUri.split(',')[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Downloads,
        });
        toast({
          title: "Download Complete",
          description: `${fileName} saved to Downloads folder.`,
        });

      } else {
        // Web fallback
        const byteString = atob(statementPdfDataUri.split(',')[1]);
        const mimeString = statementPdfDataUri.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
         toast({
          title: "Download Successful",
          description: "Statement has been downloaded.",
        });
      }

    } catch (error: any) {
      console.error("Error during download:", error);
       toast({
        title: "Download Error",
        description: error.message || "An unexpected error occurred. Ensure Filesystem plugin is synced.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const txDate = parseISO(tx.date);
      if (fromDate && txDate < fromDate) return false;
      if (toDate) {
        const toDateEndOfDay = new Date(toDate);
        toDateEndOfDay.setHours(23, 59, 59, 999);
        if (txDate > toDateEndOfDay) return false;
      }
      if (filterType !== 'all' && tx.type !== filterType) {
        return false;
      }
      return true;
    });
  }, [allTransactions, fromDate, toDate, filterType]);


  const { calculatedTotalIn, calculatedTotalOut } = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'credit') acc.calculatedTotalIn += t.amount;
        else acc.calculatedTotalOut += t.amount;
        return acc;
      },
      { calculatedTotalIn: 0, calculatedTotalOut: 0 }
    );
  }, [filteredTransactions]);

  const displayTotalIn = overrideTotalIn !== null ? overrideTotalIn : calculatedTotalIn;
  const displayTotalOut = overrideTotalOut !== null ? overrideTotalOut : calculatedTotalOut;
  const displayClosingBalance = overrideClosingBalance !== null ? overrideClosingBalance : currentBalance;


  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionType[]> = {};
    [...filteredTransactions] 
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .forEach(tx => {
        const dateKey = format(parseISO(tx.date), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(tx);
      });
    return Object.entries(groups).map(([date, txs]) => ({ date, transactions: txs }));
  }, [filteredTransactions]);

  const formatDateForDisplay = (date?: Date) => {
    if (!date) return "Select Date";
    return format(date, 'dd MMM yyyy');
  };

  const handleTransactionSelect = (transaction: TransactionType) => {
    setSelectedTransactionForDetail(transaction);
    setIsDetailSheetOpen(true);
  };

  return (
    <div className="flex flex-col">
      <header className="p-4 flex items-center justify-between border-b bg-background">
        <Link href="/dashboard" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div className="text-center">
            <h1 className="text-xl font-semibold">Passbook</h1>
            <p className="text-sm text-primary font-medium capitalize">{accountDetails.accountType || 'Current'}</p>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </header>

      <div className="p-4">
        <Card className="shadow-md">
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Account number</p>
                <p className="font-semibold">{accountDetails.accountNumber}</p>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="flex-grow flex flex-col">
         <TabsList className="mx-4 grid w-auto grid-cols-2">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="flex-grow flex flex-col space-y-4 p-4">
           <Card className="shadow-sm">
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground text-left">From Date</p>
                          <p className="text-sm font-medium text-left">
                            {fromDate ? formatDateForDisplay(fromDate) : "Pick a date"}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      disabled={(date) =>
                        (toDate && date > toDate) || date > new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                     <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground text-left">To Date</p>
                          <p className="text-sm font-medium text-left">
                            {toDate ? formatDateForDisplay(toDate) : "Pick a date"}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      disabled={(date) =>
                        (fromDate && date < fromDate) || date > new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <PassbookSummaryCard
            totalIn={displayTotalIn}
            totalOut={displayTotalOut}
            closingBalance={displayClosingBalance}
          />
          
          <div className="flex justify-between items-center pt-2">
            <p className="text-sm font-semibold">
                {fromDate ? formatDateForDisplay(fromDate) : 'Start'} to {toDate ? formatDateForDisplay(toDate) : 'Today'}
            </p>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon"><RefreshCw className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
              </Button>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Filter transactions">
                        <SlidersHorizontal className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'debit' | 'credit')}>
                        <DropdownMenuRadioItem value="all">All transaction</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="credit">Credit transaction</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="debit">Debit transaction</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {groupedTransactions.length > 0 ? (
            <div className="space-y-4">
              {groupedTransactions.map(group => (
                <PassbookTransactionGroup
                  key={group.date}
                  date={group.date} 
                  transactions={group.transactions}
                  onTransactionSelect={handleTransactionSelect}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">No transactions found for the selected period.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="analysis" className="flex-grow flex flex-col p-4 space-y-4">
          <SpendingChart transactions={filteredTransactions} />
           <Tabs defaultValue="inflow" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inflow">Inflow</TabsTrigger>
              <TabsTrigger value="outflow">Outflow</TabsTrigger>
            </TabsList>
            <TabsContent value="inflow" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-foreground">Total cash in</p>
                    <div className="flex items-center text-lg font-bold text-green-600">
                      <IndianRupee className="h-5 w-5 mr-1" />
                      {displayTotalIn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="outflow" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-foreground">Total cash out</p>
                     <div className="flex items-center text-lg font-bold text-red-600">
                      <IndianRupee className="h-5 w-5 mr-1" />
                      {displayTotalOut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      
      <TransactionDetailSheet 
        transaction={selectedTransactionForDetail}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
      />
    </div>
  );
}

    