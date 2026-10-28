
"use client";

import { useState, useEffect } from 'react';
import { HeroCard } from "@/components/dashboard/hero-card";
import { ActionButtonsGroup } from "@/components/dashboard/action-buttons-group";
import { IconGridSection } from "@/components/dashboard/icon-grid-section";
import { INITIAL_BALANCE, INITIAL_ACCOUNT_DETAILS } from "@/lib/constants";
import type { TransactionType, AccountDetailsType } from '@/lib/types';
import { User, Smartphone, Landmark, Percent, ShoppingCart, Bus, Lock, FileText, Send, BookOpenText, TrendingUp, ConciergeBell, Plane, LineChart, CreditCard, BookMarked, Gift, CircleDollarSign, Award } from 'lucide-react';


const BALANCE_STORAGE_KEY = 'bobworld_balance';
const ACCOUNT_DETAILS_STORAGE_KEY = 'bobworld_account_details';

// Define actions for "What's trending" and "My bob" sections
const trendingActions = [
  { id: 'profile', label: 'Customer profile updation', icon: User, href: '/settings' },
  { id: 'recharge', label: 'Mobile recharge', icon: Smartphone, href: '/recharge' },
  { id: 'link-bank', label: 'Link other Bank accounts', icon: Landmark, href: '/link-bank' },
  { id: 'offers', label: 'Offers', icon: Percent, href: '/offers' },
  { id: 'shop', label: 'Shop', icon: ShoppingCart, href: '/shop', newBadge: true },
  { id: 'bus', label: 'Bus', icon: Bus, href: '/bus-tickets' },
  { id: 'fd', label: 'FD (Fixed Deposit)', icon: Lock, href: '/fixed-deposit' },
  { id: 'statement', label: 'Account statement', icon: FileText, href: '/account-statement' },
];

const myBobActions = [
  { id: 'fund-transfer', label: 'Fund transfer', icon: Send, href: '/fund-transfer' },
  { id: 'passbook', label: 'Passbook', icon: BookOpenText, href: '/passbook' },
  { id: 'bill-pay', label: 'Recharge & bill pay', icon: Smartphone, href: '/bill-pay' },
  { id: 'digital-loan', label: 'Digital loan', icon: TrendingUp, href: '/digital-loan' },
  { id: 'request-services', label: 'Request services', icon: ConciergeBell, href: '#' },
  { id: 'flight', label: 'Flight', icon: Plane, href: '#' },
  { id: 'apply-ipo', label: 'Apply IPO', icon: LineChart, href: '#' },
  { id: 'debit-card-request', label: 'Debit card request', icon: CreditCard, href: '/cards' },
  { id: 'cheque-book-request', label: 'Cheque book request', icon: BookMarked, href: '/cheque-book-request' },
  { id: 'gift', label: 'Gift', icon: Gift, href: '#' },
  { id: 'cash-on-mobile', label: 'Cash on mobile', icon: CircleDollarSign, href: '#' },
  { id: 'bob-rewardz', label: 'bob Rewardz', icon: Award, href: '#' },
];


export default function DashboardPage() {
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  // Placeholder for transactions if needed for the HeroCard or other components
  // const [transactions, setTransactions] = useState<TransactionType[]>(INITIAL_TRANSACTIONS);

  useEffect(() => {
    const storedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (storedBalance) {
       const numBalance = parseFloat(storedBalance);
      if (!isNaN(numBalance)) {
        setBalance(numBalance);
      } else {
        console.error("Failed to parse stored balance from localStorage:", storedBalance);
        localStorage.removeItem(BALANCE_STORAGE_KEY); // Clear corrupted data
      }
    }

    const storedAccountDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedAccountDetails) {
      try {
        setAccountDetails(JSON.parse(storedAccountDetails));
      } catch (e) {
        console.error("Failed to parse account details from localStorage", e);
        setAccountDetails(INITIAL_ACCOUNT_DETAILS); // Fallback
      }
    } else {
      setAccountDetails(INITIAL_ACCOUNT_DETAILS); // Fallback if nothing in localStorage
    }
  }, []);

  const accountNumberSuffix = accountDetails.accountNumber.slice(-4);
  const accountType = accountDetails.accountType ? `${accountDetails.accountType} account` : 'Current account';

  return (
    <div className="space-y-6 pb-8">
      <HeroCard 
        accountType={accountType} 
        accountNumberSuffix={accountNumberSuffix} 
        balance={balance} 
      />
      
      <ActionButtonsGroup />

      <IconGridSection 
        title="What's trending"
        actions={trendingActions}
        showPersonalizeLink={false}
      />

      <IconGridSection
        title="My bob"
        actions={myBobActions}
        showPersonalizeLink={true}
      />

      {/* Removed AccountDetailsCard and RecentTransactionsCard as per new design */}
    </div>
  );
}
