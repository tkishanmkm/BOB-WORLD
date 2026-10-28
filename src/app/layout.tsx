
"use client"; // Required for usePathname and useEffect/useState

import { usePathname } from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SplashScreen } from '@/components/layout/splash-screen'; // Import SplashScreen
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(pathname === '/');
  // showAppShell should be true if not on splash screen AND not on the login page ('/')
  const showAppShell = !showSplash && pathname !== '/';

  useEffect(() => {
    const isLoginPage = pathname === '/';
    if (isLoginPage) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 4000); // Show splash for 4 seconds
      return () => clearTimeout(timer); // Cleanup timer
    } else {
      setShowSplash(false);
    }
  }, [pathname]);

  useEffect(() => {
    document.title = 'BOB World - Your Financial Hub';
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute('content', 'Manage your accounts, payments, and investments with BOB World.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Manage your accounts, payments, and investments with BOB World.';
      document.head.appendChild(meta);
    }

    let faviconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = '/favicon.ico';
  }, []);

  if (showSplash) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-background`}>
          <SplashScreen />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-background`}>
        {showAppShell && <AppHeader />}
        <main className={cn(
          "flex-1 overflow-y-auto",
          showAppShell ? "app-background-gradient pt-28 pb-16" : ""
        )}>
          {showAppShell ? (
            <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-6">
              {children}
            </div>
          ) : (
            children // This is for the login page, which takes full screen
          )}
        </main>
        {showAppShell && <BottomNav />}
        <Toaster />
      </body>
    </html>
  );
}
