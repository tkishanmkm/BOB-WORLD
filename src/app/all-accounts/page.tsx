
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, MoreHorizontal, RefreshCw, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { INITIAL_BALANCE, BALANCE_STORAGE_KEY, FD_BANNER_KEY, RD_BANNER_KEY, INITIAL_ACCOUNT_DETAILS, ACCOUNT_DETAILS_STORAGE_KEY } from '@/lib/constants';
import type { AccountDetailsType } from '@/lib/types';
import { getAccountTypeLabel } from '@/lib/account-type';

export default function AllAccountsPage() {
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [fdBannerSrc, setFdBannerSrc] = useState('https://placehold.co/600x250.png');
  const [rdBannerSrc, setRdBannerSrc] = useState('https://placehold.co/600x250.png');


  useEffect(() => {
    const storedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (storedBalance) {
      const numBalance = parseFloat(storedBalance);
      if (!isNaN(numBalance)) {
        setBalance(numBalance);
      }
    }
    setLastUpdated(format(new Date(), "MMM dd, yyyy, hh:mm a"));
    const storedAccountDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedAccountDetails) {
      try {
        setAccountDetails({ ...INITIAL_ACCOUNT_DETAILS, ...JSON.parse(storedAccountDetails) as Partial<AccountDetailsType> });
      } catch (error) {
        console.error('Failed to parse saved account details:', error);
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
      }
    }

    const storedFdBanner = localStorage.getItem(FD_BANNER_KEY);
    if (storedFdBanner && storedFdBanner.startsWith('data:image')) {
      setFdBannerSrc(storedFdBanner);
    } else {
      setFdBannerSrc('https://placehold.co/600x250.png');
      if (storedFdBanner) localStorage.removeItem(FD_BANNER_KEY);
    }

    const storedRdBanner = localStorage.getItem(RD_BANNER_KEY);
    if (storedRdBanner && storedRdBanner.startsWith('data:image')) {
      setRdBannerSrc(storedRdBanner);
    } else {
      setRdBannerSrc('https://placehold.co/600x250.png');
      if (storedRdBanner) localStorage.removeItem(RD_BANNER_KEY);
    }

  }, []);

  const handleRefresh = () => {
    setLastUpdated(format(new Date(), "MMM dd, yyyy, hh:mm a"));
  };

  return (
    <div className="flex flex-col">
      <Tabs defaultValue="save" className="flex flex-col">
        <header className="bg-primary text-primary-foreground p-4 shadow-md rounded-t-lg">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" passHref>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">My accounts</h1>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20">
              <MoreHorizontal className="h-6 w-6" />
            </Button>
          </div>
          <TabsList className="grid w-full grid-cols-3 bg-primary/90 mt-3">
            <TabsTrigger value="save" className="text-primary-foreground/80 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Save</TabsTrigger>
            <TabsTrigger value="invest" className="text-primary-foreground/80 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Invest</TabsTrigger>
            <TabsTrigger value="borrow" className="text-primary-foreground/80 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Borrow</TabsTrigger>
          </TabsList>
        </header>

        <div className="bg-background pt-5 p-4 space-y-6 rounded-b-lg shadow-md">
          <TabsContent value="save" className="mt-0 space-y-6">
            <Card className="shadow-lg border-border/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">My total savings</p>
                <div className="flex items-center text-3xl font-bold text-foreground mt-1">
                  <IndianRupee className="h-7 w-7 mr-1" />
                  {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                  <span>Last updated: {lastUpdated}</span>
                  <Button variant="ghost" size="sm" onClick={handleRefresh} className="p-1 h-auto text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Link href="/current-account-details" passHref>
              <Card className="shadow-lg bg-secondary/70 border-secondary hover:shadow-xl transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-md font-semibold text-secondary-foreground">1 {getAccountTypeLabel(accountDetails)}</h3>
                    <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                       <span className="text-sm font-bold text-primary leading-none">bob</span>
                    </div>
                  </div>
                  <div className="bg-background p-3 rounded-md shadow-inner flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total balance</span>
                    <div className="flex items-center text-md font-semibold text-foreground">
                      <IndianRupee className="h-4 w-4 mr-0.5" />
                      {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="shadow-lg overflow-hidden border-blue-100 bg-blue-50/70">
              <CardContent className="p-0 relative">
                <Image
                  src={fdBannerSrc}
                  alt="Fixed Deposit Promotion"
                  width={600}
                  height={250}
                  className="w-full h-auto object-cover"
                  data-ai-hint="family saving"
                  key={fdBannerSrc}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-white/70 dark:via-black/10 dark:to-black/30 p-4 sm:p-6 flex flex-col items-end justify-center text-right">
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-200">Open fixed</h3>
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-200 -mt-1 sm:-mt-2">deposit account</h3>
                  <p className="text-sm sm:text-md text-blue-800 dark:text-blue-300 mt-1">at attractive interest</p>
                  <Link href="/fixed-deposit" passHref className="mt-3">
                    <Button size="lg" className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg font-semibold">Open now</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg overflow-hidden border-blue-200 bg-blue-50/70">
               <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-lg text-blue-800">Recurring deposit</CardTitle>
              </CardHeader>
              <CardContent className="p-0 relative">
                <Image
                  src={rdBannerSrc}
                  alt="Recurring Deposit Promotion"
                  width={600}
                  height={250}
                  className="w-full h-auto object-cover"
                  data-ai-hint="coins jar"
                  key={rdBannerSrc}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent p-4 flex flex-col justify-end">
                  <p className="text-white text-md font-semibold leading-tight">Flexible Recurring Deposit Scheme</p>
                  <p className="text-white text-xs">Get multiple benefits.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="invest">
               <p className="text-center text-muted-foreground py-8">Investments coming soon.</p>
          </TabsContent>
           <TabsContent value="borrow">
               <p className="text-center text-muted-foreground py-8">Borrowing options coming soon.</p>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
