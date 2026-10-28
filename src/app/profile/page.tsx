
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  UserCog,
  Contact,
  KeyRound,
  ShieldCheck,
  Repeat,
  CalendarDays,
  LogOut,
  Camera,
  MessageSquareDashed,
  Gauge,
  Bell,
  Settings,
  HelpCircle,
} from 'lucide-react';
import type { AccountDetailsType } from '@/lib/types';
import { INITIAL_ACCOUNT_DETAILS } from '@/lib/constants';

const ACCOUNT_DETAILS_STORAGE_KEY = 'bobworld_account_details';

const profileOptions = [
  { id: 'kyc', label: 'KYC/CKYC Details', icon: FileText, href: '/kyc-details' },
  { id: 'profile-update', label: 'Customer profile updation', icon: UserCog, href: '/settings' },
  { id: 'contact', label: 'Contact details', icon: Contact, href: '/contact-details' },
  { id: 'login-pin', label: 'Change login PIN', icon: KeyRound, href: '/change-login-pin' },
  { id: 'tx-pin', label: 'Change transaction PIN', icon: ShieldCheck, href: '/change-transaction-pin' },
  { id: 'classic', label: 'Switch to Classic', icon: Repeat, href: '/switch-to-classic' },
  { id: 'planner', label: 'Digital Planner', icon: CalendarDays, href: '/digital-planner' },
];

const ActionButton: React.FC<{ href: string; icon: React.ElementType; label: string; badge?: string }> = ({ href, icon: Icon, label, badge }) => (
  <Link href={href} className="flex flex-col items-center text-center group flex-1">
    <div className="relative">
      <div className="p-3 mb-1.5 bg-card rounded-full group-hover:bg-muted transition-colors shadow-sm border border-border/50">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      {badge && (
        <span className="absolute top-0 right-0 block h-5 w-5 transform translate-x-1/4 -translate-y-1/4 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center ring-2 ring-background">
          {badge}
        </span>
      )}
    </div>
    <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-tight mt-1">{label}</p>
  </Link>
);


export default function ProfilePage() {
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const router = useRouter(); // Initialize router

  useEffect(() => {
    let details: AccountDetailsType = INITIAL_ACCOUNT_DETAILS;
    const storedDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedDetails) {
      try {
        details = { ...INITIAL_ACCOUNT_DETAILS, ...JSON.parse(storedDetails) };
      } catch (e) {
        console.error("Failed to parse account details from localStorage:", e);
      }
    }
    // Always update lastLogin to the current time on profile view, formatted for IST.
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { // en-US gives MMM dd, yyyy format
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
    details.lastLogin = formatter.format(now);
    setAccountDetails(details);
  }, []);

  const initials = accountDetails.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    router.push('/'); // Navigate to login page
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header Section */}
      <header className="bg-primary text-primary-foreground p-4 pt-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard" passHref>
            <Button variant="ghost" size="icon" className="text-black hover:bg-white/20">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-black hover:bg-white/20">
            <MessageSquareDashed className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex items-end justify-between relative z-10 pb-8">
          <div>
            <h1 className="text-2xl font-semibold text-black">{accountDetails.name}</h1>
            {accountDetails.customerId && (
                <p className="text-sm opacity-90 text-black">Customer ID : {accountDetails.customerId}</p>
            )}
          </div>
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
              <AvatarImage src={accountDetails.profileImageUrl} alt={accountDetails.name} data-ai-hint="profile avatar" />
              <AvatarFallback className="text-2xl bg-secondary text-primary">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background text-primary border-2 border-primary/50 hover:bg-muted">
              <Camera className="h-4 w-4" />
              <span className="sr-only">Change photo</span>
            </Button>
          </div>
        </div>

        {accountDetails.lastLogin && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/10 backdrop-blur-sm px-4 py-1.5 text-center text-xs z-10 text-black">
                Last login: {accountDetails.lastLogin}
            </div>
        )}
        <div
            className="absolute -bottom-16 left-0 right-0 h-32 bg-muted/30 rounded-t-[50%] z-0"
            style={{ transform: 'scaleX(1.5)' }}
        ></div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6 -mt-6 relative z-20"> {/* Increased space-y from 4 to 6 */}
        <Card className="shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Credit score</p>
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Free</span>
              </div>
            </div>
            <Button size="sm">Get latest score</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {profileOptions.map((option) => (
                <li key={option.id}>
                  <Link href={option.href} passHref>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <option.icon className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* New Action Buttons Section */}
        <div className="flex justify-around items-start pt-4 pb-2 bg-background rounded-lg shadow-lg border border-border/30">
          <ActionButton href="/alerts" icon={Bell} label="Alerts &amp; notifications" badge="06" />
          <ActionButton href="/app-settings" icon={Settings} label="App settings" />
          <ActionButton href="/need-help" icon={HelpCircle} label="Need help ?" />
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-2">
            <Button variant="ghost" className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
