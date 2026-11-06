
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback , AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AccountDetailsType } from '@/lib/types';
import { INITIAL_ACCOUNT_DETAILS, ACCOUNT_DETAILS_STORAGE_KEY } from '@/lib/constants';

const navLinks = [
  { href: '/dashboard', label: 'Accounts' },
  { href: '/save', label: 'Save' },
  { href: '/invest', label: 'Invest' },
  { href: '/borrow', label: 'Borrow' },
  { href: '/shop-and-pay', label: 'Shop & pay' },
];

export function AppHeader() {
  const pathname = usePathname();
  const [initials, setInitials] = useState<string>('??'); 
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let nameFromStorage = INITIAL_ACCOUNT_DETAILS.name;
    let imageUrlFromStorage: string | undefined = INITIAL_ACCOUNT_DETAILS.profileImageUrl;

    try {
      const storedDetailsString = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      if (storedDetailsString) {
        const parsedDetails: AccountDetailsType = JSON.parse(storedDetailsString);
        
        if (parsedDetails.name && parsedDetails.name.trim()) {
          nameFromStorage = parsedDetails.name.trim();
        }
        
        if (parsedDetails.profileImageUrl && parsedDetails.profileImageUrl.trim()) {
          const trimmedUrl = parsedDetails.profileImageUrl.trim();
          if (trimmedUrl.startsWith('data:image') || trimmedUrl.startsWith('http')) {
            imageUrlFromStorage = trimmedUrl;
          } else {
            imageUrlFromStorage = undefined; 
          }
        } else {
          imageUrlFromStorage = undefined; 
        }
      }
    } catch (e) {
      console.error("Error processing account details from localStorage for header:", e);
    }

    setProfileImageUrl(imageUrlFromStorage);

    const nameParts = nameFromStorage.split(' ').filter(part => part.length > 0);
    let generatedInitials = '??';
    if (nameParts.length > 0) {
      if (nameParts.length === 1) {
        generatedInitials = nameParts[0].substring(0, 1).toUpperCase();
      } else {
        generatedInitials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
    }
    setInitials(generatedInitials);

  }, []); 

  const avatarKey = profileImageUrl || initials;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" aria-label="BOB World home" className="flex items-center gap-2">
            <img src="/assets/branding/bob-world-logo.png" alt="BOB World" className="h-10 w-[116px] object-contain object-left" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
            <Link href="/profile">
              <div className="relative">
                <Avatar key={avatarKey} className="h-10 w-10 border-2 border-primary/30 shadow-md">
                  <AvatarImage src={profileImageUrl} alt="User Profile" data-ai-hint="profile avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center w-full h-full">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  06
                </span>
              </div>
            </Link>
          </div>
        </div>
        <nav className="overflow-x-auto whitespace-nowrap no-scrollbar pb-2 -mt-1">
          <ul className="flex space-x-4 sm:space-x-6 border-b border-border">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "pb-2 text-sm font-medium transition-colors hover:text-primary",
                    pathname === link.href
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}