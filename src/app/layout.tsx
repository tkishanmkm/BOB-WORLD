
"use client"; // Required for usePathname and useEffect/useState

import { usePathname, useRouter } from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SplashScreen } from '@/components/layout/splash-screen'; // Import SplashScreen
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BOB_WORLD_STATE_KEYS, migrateLegacyStorage, readAppState } from '@/lib/indexed-db';
import { SUPER_LOGOUT_STORAGE_KEY } from '@/lib/constants';

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
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [logoutGuardReady, setLogoutGuardReady] = useState(false);
  const [superLogoutActive, setSuperLogoutActive] = useState(false);
  const showAppShell = logoutGuardReady && !superLogoutActive && !showSplash && pathname !== '/';

  useEffect(() => {
    let cancelled = false;
    let splashTimer: number | undefined;
    setLogoutGuardReady(false);
    setShowSplash(true);

    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(async () => {
      const lockActive = (await readAppState<boolean>(SUPER_LOGOUT_STORAGE_KEY)) === true;
      if (cancelled) return;
      setSuperLogoutActive(lockActive);
      setLogoutGuardReady(true);

      if (lockActive && pathname !== '/') {
        router.replace('/');
        return;
      }

      if (pathname === '/') {
        splashTimer = window.setTimeout(() => setShowSplash(false), 4000);
      } else {
        setShowSplash(false);
      }
    }).catch(error => {
      console.error('Could not initialise the local access lock:', error);
      if (cancelled) return;
      setSuperLogoutActive(true);
      setLogoutGuardReady(true);
      if (pathname !== '/') {
        router.replace('/');
      } else {
        splashTimer = window.setTimeout(() => setShowSplash(false), 4000);
      }
    });

    return () => {
      cancelled = true;
      if (splashTimer !== undefined) window.clearTimeout(splashTimer);
    };
  }, [pathname, router]);

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

    const setHeadLink = (rel: string, href: string, type?: string, sizes?: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
      if (type) link.type = type;
      if (sizes) link.setAttribute('sizes', sizes);
    };
    setHeadLink('icon', '/favicon.ico', 'image/x-icon');
    setHeadLink('icon', '/favicon-16x16.png', 'image/png', '16x16');
    setHeadLink('icon', '/favicon-32x32.png', 'image/png', '32x32');
    setHeadLink('apple-touch-icon', '/apple-touch-icon.png', 'image/png');
    setHeadLink('manifest', '/site.webmanifest');
  }, []);

  if (!logoutGuardReady || showSplash || (superLogoutActive && pathname !== '/')) {
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
      <body className={cn(geistSans.variable, geistMono.variable, 'antialiased min-h-screen bg-[#eef0f3]')}>
        <div className="ios-app-frame">
          {showAppShell && <AppHeader />}
          <main className={cn('min-h-dvh overflow-x-hidden overflow-y-auto', showAppShell ? 'app-background-gradient pt-28 pb-20' : '')}>
            {showAppShell ? <div className="mx-auto w-full px-0 py-0">{children}</div> : children}
          </main>
          {showAppShell && <BottomNav />}
          <Toaster />
        </div>
      </body>
    </html>
  );
}