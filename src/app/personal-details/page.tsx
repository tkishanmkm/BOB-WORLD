
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera, UserCircle2, CreditCard, CalendarDays, User, Building, Mail, Phone, Shield } from 'lucide-react';
import { INITIAL_ACCOUNT_DETAILS } from '@/lib/constants';
import type { AccountDetailsType } from '@/lib/types';
import { cn } from '@/lib/utils';

const ACCOUNT_DETAILS_STORAGE_KEY = 'bobworld_account_details';

const DetailItem: React.FC<{ label: string; value?: string; masked?: boolean }> = ({ label, value, masked }) => {
  let displayValue = value || "N/A";
  if (masked && value) {
    if (label.toLowerCase().includes("pan")) {
      displayValue = value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : '****';
    } else if (label.toLowerCase().includes("email")) {
      const parts = value.split('@');
      if (parts.length === 2) {
        displayValue = parts[0].length > 2 ? `${parts[0][0]}${'*'.repeat(parts[0].length - 2)}${parts[0].slice(-1)}@${parts[1]}` : `${parts[0]}@${parts[1]}`;
      }
    } else if (label.toLowerCase().includes("phone")) {
       displayValue = value.length > 4 ? `${value.slice(0, value.length - 8)}${'*'.repeat(4)}${value.slice(-4)}` : '****';
    }
  }

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{displayValue}</p>
    </div>
  );
};

export default function PersonalDetailsPage() {
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);

  useEffect(() => {
    const storedDetailsString = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedDetailsString) {
      try {
        const storedDetails = JSON.parse(storedDetailsString);
        setAccountDetails(prev => ({...prev, ...storedDetails}));
      } catch (e) {
        console.error("Failed to parse account details from localStorage", e);
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
      }
    } else {
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
    }
  }, []);

  const initials = accountDetails.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0,2);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 flex items-center sticky top-0 z-10">
        <Link href="/account-actions" passHref>
          <Button variant="ghost" size="icon" className="hover:bg-white/20">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold ml-4">Personal Details</h1>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex flex-col items-center pt-2 pb-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background shadow-md">
              <AvatarImage src={accountDetails.profileImageUrl} alt={accountDetails.name} data-ai-hint="profile picture" />
              <AvatarFallback className="text-3xl bg-muted text-muted-foreground">{initials}</AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background border-2 border-muted shadow"
            >
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Change photo</span>
            </Button>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <DetailItem label="Name" value={accountDetails.name} />
            <DetailItem label="Customer ID" value={accountDetails.customerId} />
            <DetailItem label="Account Number" value={accountDetails.accountNumber} />
            <DetailItem label="DOB" value={accountDetails.dob} />
            <DetailItem label="PAN number" value={accountDetails.panNumber} masked />
            <DetailItem label="IFSC code" value={accountDetails.ifscCode} />
            <DetailItem label="Branch name" value={accountDetails.branchName} />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <DetailItem label="Email ID" value={accountDetails.email} masked />
            <DetailItem label="Phone number" value={accountDetails.phoneNumber} masked />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
