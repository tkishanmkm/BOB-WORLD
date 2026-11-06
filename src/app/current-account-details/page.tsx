
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MoreHorizontal, IndianRupee, Bell } from 'lucide-react';
import { 
  INITIAL_BALANCE, 
  INITIAL_ACCOUNT_DETAILS,
  BALANCE_STORAGE_KEY,
  ACCOUNT_DETAILS_STORAGE_KEY,
  LINK_BANK_ILLUSTRATION_KEY,
  PROMO_WOMAN_PAYMENT_KEY
} from '@/lib/constants';
import type { AccountDetailsType } from '@/lib/types';

export default function CurrentAccountDetailsPage() {
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const router = useRouter(); 

  const [linkBankIllustrationSrc, setLinkBankIllustrationSrc] = useState('https://placehold.co/120x100.png');
  const [promoWomanPaymentSrc, setPromoWomanPaymentSrc] = useState('https://placehold.co/150x100.png');


  useEffect(() => {
    const storedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (storedBalance) {
      const numBalance = parseFloat(storedBalance);
      if (!isNaN(numBalance)) {
        setBalance(numBalance);
      }
    }
    const storedAccountDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedAccountDetails) {
        try {
            setAccountDetails(JSON.parse(storedAccountDetails));
        } catch (e) {
            console.error("Failed to parse account details from localStorage", e);
            setAccountDetails(INITIAL_ACCOUNT_DETAILS);
        }
    } else {
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
    }

    const storedLinkBankIllustration = localStorage.getItem(LINK_BANK_ILLUSTRATION_KEY);
    if (storedLinkBankIllustration && storedLinkBankIllustration.startsWith('data:image')) {
        setLinkBankIllustrationSrc(storedLinkBankIllustration);
    } else {
        setLinkBankIllustrationSrc('https://placehold.co/120x100.png');
        if (storedLinkBankIllustration) localStorage.removeItem(LINK_BANK_ILLUSTRATION_KEY);
    }

    const storedPromoWomanPayment = localStorage.getItem(PROMO_WOMAN_PAYMENT_KEY);
    if (storedPromoWomanPayment && storedPromoWomanPayment.startsWith('data:image')) {
        setPromoWomanPaymentSrc(storedPromoWomanPayment);
    } else {
        setPromoWomanPaymentSrc('https://placehold.co/150x100.png');
        if (storedPromoWomanPayment) localStorage.removeItem(PROMO_WOMAN_PAYMENT_KEY);
    }
  }, []);

  const lastFourDigits = accountDetails.accountNumber.slice(-4);
  const accountType = accountDetails.accountType ? `${accountDetails.accountType} account` : 'Current account';

  return (
    <div className="min-h-screen bg-muted/20 pb-8">
      <header className="bg-background p-4 flex items-center justify-between border-b sticky top-0 z-10">
        <Link href="/all-accounts" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground capitalize">{accountType}</h1>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        <Link href="/account-actions" passHref>
          <Card className="shadow-lg overflow-hidden relative cursor-pointer hover:shadow-xl transition-shadow">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-md font-semibold text-foreground capitalize">{accountType} {lastFourDigits}</p>
                  <p className="text-xs text-muted-foreground">Available balance</p>
                </div>
                <div className="h-9 w-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-primary/20">
                  <span className="text-sm font-bold text-primary leading-none">bob</span>
                </div>
              </div>
              <div className="flex items-center text-3xl font-bold text-foreground">
                <IndianRupee className="h-7 w-7 mr-1" />
                {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex justify-between items-center pt-3">
                <Button
                  variant="link"
                  className="text-primary p-0 h-auto text-sm font-medium"
                  onClick={(e) => {
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    router.push('/passbook');
                  }}
                >
                  Mini statement
                </Button>
                <Button
                  variant="link"
                  className="text-primary p-0 h-auto text-sm font-medium"
                  onClick={(e) => {
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    router.push('/fund-transfer');
                  }}
                >
                  Start transfer
                </Button>
              </div>
            </CardContent>
            <div className="absolute bottom-0 right-0 opacity-10 dark:opacity-5 pointer-events-none">
              <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="150" r="100" stroke="currentColor" strokeWidth="2"/>
                <circle cx="150" cy="150" r="120" stroke="currentColor" strokeWidth="2"/>
                <circle cx="150" cy="150" r="140" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </Card>
        </Link>

        <Card className="shadow-lg">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-md font-semibold text-foreground">You can link other</p>
              <p className="text-md font-semibold text-foreground -mt-1">Bank accounts</p>
              <Link href="/link-bank" passHref className="mt-3 inline-block">
                <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6 text-sm h-9">Link now</Button>
              </Link>
            </div>
            <Image
              src={linkBankIllustrationSrc}
              alt="Link bank accounts illustration"
              width={120}
              height={100}
              className="object-contain"
              data-ai-hint="mobile banking app"
              key={linkBankIllustrationSrc}
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-primary text-primary-foreground overflow-hidden">
          <CardContent className="p-0 flex items-center">
            <div className="p-5 flex-1">
              <div className="flex items-start gap-2 mb-1">
                <Bell className="h-5 w-5 mt-0.5 shrink-0" />
                <p className="text-md font-semibold leading-tight">Make payments hassle-free, automatically!</p>
              </div>
              <Button variant="secondary" className="bg-background text-primary hover:bg-background/90 rounded-md px-4 h-8 text-sm font-semibold">Stay up to date</Button>
            </div>
            <div className="w-2/5">
                 <Image
                    src={promoWomanPaymentSrc}
                    alt="Woman using phone for payments"
                    width={150}
                    height={100}
                    className="w-full h-auto object-cover"
                    data-ai-hint="woman phone payment"
                    key={promoWomanPaymentSrc}
                />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
