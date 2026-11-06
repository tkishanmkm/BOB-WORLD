
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Facebook, Twitter, Youtube, Instagram, Globe } from "lucide-react";

interface ContactNumber {
  id: string;
  number: string;
  label: string;
  href: string;
}

const customerCareNumbers: ContactNumber[] = [
  { id: "india1", number: "1800 5700", label: "(from India)", href: "tel:18005700" },
  { id: "india2", number: "1800 5000", label: "(from India)", href: "tel:18005000" },
  { id: "overseas", number: "079 66296629", label: "(from overseas)", href: "tel:+917966296629" }, // Assuming +91 for overseas direct dial
];

interface SocialLink {
  id: string;
  name: string;
  icon: React.ElementType;
  href: string;
}

const socialLinks: SocialLink[] = [
  { id: "facebook", name: "Facebook", icon: Facebook, href: "https://facebook.com/bankofbaroda" },
  { id: "twitter", name: "Twitter", icon: Twitter, href: "https://twitter.com/bankofbaroda" },
  { id: "youtube", name: "YouTube", icon: Youtube, href: "https://youtube.com/bankofbaroda" },
  { id: "instagram", name: "Instagram", icon: Instagram, href: "https://instagram.com/bankofbaroda" },
];

export default function ContactUsHelpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card p-4 flex items-center border-b sticky top-0 z-20">
        <Link href="/need-help" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground ml-4">Contact us</h1>
      </header>

      <main className="flex-1 p-4 space-y-6">
        <Card className="shadow-md bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-blue-800 dark:text-blue-200">24x7 Customer care</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerCareNumbers.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="flex items-center justify-between group hover:bg-blue-200/50 dark:hover:bg-blue-800/50 p-2 rounded-md transition-colors"
              >
                <div>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{item.number}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">{item.label}</p>
                </div>
                <div className="p-2 bg-white dark:bg-blue-700 rounded-full shadow">
                  <Phone className="h-5 w-5 text-blue-600 dark:text-blue-100" />
                </div>
              </a>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-md bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-orange-800 dark:text-orange-200">Website</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="https://www.bankofbaroda.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group hover:bg-orange-200/50 dark:hover:bg-orange-800/50 p-3 rounded-md transition-colors"
            >
              <p className="text-lg font-semibold text-orange-900 dark:text-orange-100 underline">
                www.bankofbaroda.com
              </p>
              <div className="p-2 bg-white dark:bg-orange-700 rounded-full shadow">
                <Globe className="h-5 w-5 text-orange-600 dark:text-orange-100" />
              </div>
            </a>
          </CardContent>
        </Card>

        <div className="pt-4">
          <h2 className="text-center text-base font-semibold text-foreground mb-4">Connect with us</h2>
          <div className="grid grid-cols-4 gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.id}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center text-center group"
              >
                <div className="p-3 mb-1.5 bg-card rounded-full shadow-md border border-border/50 group-hover:border-primary transition-colors">
                  <social.icon className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{social.name}</p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
