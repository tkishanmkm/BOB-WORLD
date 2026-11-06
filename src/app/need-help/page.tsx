
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, PlaySquare, HelpCircle, MessageCircleMore, PhoneCall, AlertCircle, MessagesSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface HelpOption {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const helpOptions: HelpOption[] = [
  { id: "watch-demo", label: "Watch demo", icon: PlaySquare, href: "/watch-demo" },
  { id: "faqs", label: "FAQs", icon: HelpCircle, href: "/faqs" },
  { id: "ai-assistant", label: "AI Assistant Chat", icon: MessageCircleMore, href: "/ai-assistant-chat" },
  { id: "contact-us", label: "Contact us", icon: PhoneCall, href: "/contact-us-help" },
  { id: "complaints", label: "Complaints", icon: AlertCircle, href: "/complaints" },
  // { id: "video-call", label: "Video Call", icon: Video, href: "/video-call" }, // Removed
  { id: "agent-chat", label: "Agent Live Chat", icon: MessagesSquare, href: "/agent-live-chat" },
];

const ActionItem: React.FC<HelpOption> = ({ href, icon: Icon, label }) => (
  <Link href={href} className="flex flex-col items-center text-center group">
    <div className="p-4 mb-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors shadow-sm border border-primary/20">
      <Icon className="h-8 w-8 text-primary" />
    </div>
    <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-tight">{label}</p>
  </Link>
);

export default function NeedHelpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card p-4 flex items-center border-b sticky top-0 z-20">
        <Link href="/profile" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground ml-4">Need help</h1>
      </header>

      <main className="flex-1 p-4 pt-6 md:p-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-6">
          {helpOptions.map((option) => (
            <ActionItem key={option.id} {...option} />
          ))}
        </div>
      </main>
    </div>
  );
}
