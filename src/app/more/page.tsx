
"use client"; // Make this a client component

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from 'next/navigation'; // Import useRouter
import { Settings, ShieldCheck, LogOut, HelpCircle, Info } from "lucide-react";

const moreOptions = [
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  { id: 'security', label: 'Security', icon: ShieldCheck, href: '/security' },
  { id: 'help', label: 'Help & Support', icon: HelpCircle, href: '/help' },
  { id: 'about', label: 'About BOB World', icon: Info, href: '/about' },
  { id: 'logout', label: 'Logout', icon: LogOut, href: '#', isDestructive: true, isLogout: true }, // Added isLogout flag
];

export default function MorePage() {
  const router = useRouter(); // Initialize router

  const handleOptionClick = (href: string, isLogout?: boolean) => {
    if (isLogout) {
      router.push('/'); // Navigate to login page
    } else if (href && href !== '#') {
      router.push(href);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>More Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {moreOptions.map(option => (
            <Button
              key={option.id}
              variant={option.isDestructive ? "destructive" : "outline"}
              className="w-full justify-start gap-3 text-base py-6"
              onClick={() => handleOptionClick(option.href, option.isLogout)}
            >
              <option.icon className="h-5 w-5" />
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
