
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Send, QrCode, CreditCard, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home }, // Updated from /
  { href: '/upi', label: 'UPI', icon: Send }, 
  { href: '/scan', label: 'Scan QR', icon: QrCode, isCentral: true },
  { href: '/cards', label: 'Cards', icon: CreditCard },
  { href: '/more', label: 'More', icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-top">
      <div className="container mx-auto px-2 sm:px-4">
        <ul className="flex justify-around items-end h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.label} className={cn("flex-1", item.isCentral && "-mt-4")}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg transition-colors group",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  {item.isCentral ? (
                    <div className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg -translate-y-1 group-hover:scale-105 transform transition-transform">
                      <item.icon className="h-7 w-7" />
                    </div>
                  ) : (
                     <item.icon className={cn("h-6 w-6 mb-0.5", isActive && "text-primary")} />
                  )}
                  <span className={cn(
                    "text-xs font-medium", 
                    item.isCentral ? "mt-1" : "",
                    isActive && !item.isCentral ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
