
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, MoreHorizontal, IndianRupee, ChevronRight, FileText, ShieldCheck, BookMarked, UserPlus, Gift } from 'lucide-react';
import { 
  INITIAL_BALANCE, 
  INITIAL_ACCOUNT_DETAILS, 
  BALANCE_STORAGE_KEY, 
  ACCOUNT_DETAILS_STORAGE_KEY,
  DEBIT_CARD_ILLUSTRATION_KEY
} from '@/lib/constants';
import type { AccountDetailsType } from '@/lib/types';
import { cn } from '@/lib/utils';


const ActionItem: React.FC<{ href: string; icon: React.ElementType; label: string }> = ({ href, icon: Icon, label }) => (
  <Link href={href} className="flex flex-col items-center text-center group">
    <div className="p-3 mb-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-tight">{label}</p>
  </Link>
);

export default function AccountActionsPage() {
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [debitCardIllustrationSrc, setDebitCardIllustrationSrc] = useState('https://placehold.co/200x120.png');

  useEffect(() => {
    const storedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (storedBalance) {
      const numBalance = parseFloat(storedBalance);
      if (!isNaN(numBalance)) setBalance(numBalance);
    }
    const storedAccountDetailsString = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedAccountDetailsString) {
      try {
        const storedDetails = JSON.parse(storedAccountDetailsString);
        setAccountDetails(prev => ({...prev, ...storedDetails}));
      } catch (e) {
        console.error("Failed to parse account details from localStorage", e);
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
      }
    } else {
      setAccountDetails(INITIAL_ACCOUNT_DETAILS);
    }

    const storedDebitCardIllustration = localStorage.getItem(DEBIT_CARD_ILLUSTRATION_KEY);
    if (storedDebitCardIllustration && storedDebitCardIllustration.startsWith('data:image')) {
        setDebitCardIllustrationSrc(storedDebitCardIllustration);
    } else {
        setDebitCardIllustrationSrc('https://placehold.co/200x120.png');
        if (storedDebitCardIllustration) localStorage.removeItem(DEBIT_CARD_ILLUSTRATION_KEY);
    }

  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background p-4 flex items-center justify-between border-b sticky top-0 z-20">
        <Link href="/current-account-details" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Account details</h1>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </header>

      <main className="p-4 space-y-5 pb-8">
        <Card className="shadow-md overflow-hidden rounded-xl">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Get your debit card details</h2>
              <p className="text-sm text-muted-foreground">Fetch your card details by clicking on show cards.</p>
              <Link href="/cards" passHref className="inline-block pt-2">
                <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-6 h-10 text-sm font-semibold">Show Cards</Button>
              </Link>
            </div>
            <div className="w-full sm:w-1/3 max-w-[150px] sm:max-w-none">
              <Image
                src={debitCardIllustrationSrc}
                alt="Debit card illustration"
                width={200}
                height={120}
                className="object-contain rounded-md"
                data-ai-hint="debit card illustration"
                key={debitCardIllustrationSrc}
              />
            </div>
          </CardContent>
        </Card>

        <div className="border border-border rounded-lg p-3 text-center font-medium text-sm text-foreground shadow-sm">
          <span className="text-primary font-semibold">{accountDetails.accountTypeName || 'bob LITE CURRENT ACCOUNT'}</span>
        </div>

        <Link href="/personal-details" passHref>
          <Card className="shadow-md rounded-xl cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-base font-semibold text-foreground">{accountDetails.name}</p>
                  <p className="text-sm text-muted-foreground">{accountDetails.accountNumber}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Available balance</p>
                <div className="flex items-center text-base font-semibold text-foreground">
                  <IndianRupee className="h-4 w-4 mr-0.5" />
                  {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <div className="grid grid-cols-4 gap-3 pt-2 pb-2">
          <ActionItem href="/statement-analysis" icon={FileText} label="Download statement" />
          <ActionItem href="/positive-pay" icon={ShieldCheck} label="Positive pay confirmation" />
          <ActionItem href="/cheque-book-request" icon={BookMarked} label="Cheque book request" />
          <ActionItem href="/nominee-registration" icon={UserPlus} label="Nominee registration" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-md rounded-xl bg-card">
            <CardContent className="p-4">
              <div className="flex items-center mb-2">
                <Gift className="h-6 w-6 text-primary mr-2" />
                <h3 className="text-md font-semibold text-foreground">Personal loan</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Now you can take a personal loan from bob world. Please click below to know more
              </p>
              <Link href="/personal-loan-info" className="text-sm font-medium text-primary hover:underline">
                Know more
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-xl bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-700">
            <CardContent className="p-4">
               <h3 className="text-md font-semibold text-pink-800 dark:text-pink-200 mb-1">Credit card offer</h3>
              <p className="text-sm text-pink-700 dark:text-pink-300 mb-3">
                Congratulations! You are eligible for a credit card limit of up to 2 lakhs.
              </p>
              <Link href="/credit-card-apply" className="text-sm font-medium text-pink-600 dark:text-pink-400 hover:underline">
                Apply now
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
