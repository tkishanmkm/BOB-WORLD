
"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { IndianRupee, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

interface HeroCardProps {
  accountType: string;
  accountNumberSuffix: string;
  balance: number;
}

export function HeroCard({ accountType, accountNumberSuffix, balance }: HeroCardProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);

  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  const formattedBalance = balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hiddenBalancePlaceholderText = "X,XX,XXX"; 

  return (
    <Card className="bg-primary text-primary-foreground shadow-xl rounded-xl overflow-hidden">
      <CardContent className="p-6 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium opacity-90">
            {accountType} - {accountNumberSuffix}
          </p>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground hover:bg-white/20 h-8 w-8"
            onClick={toggleBalanceVisibility}
            aria-label={isBalanceVisible ? "Hide balance" : "Show balance"}
          >
            {isBalanceVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
        </div>
        
        <div className={cn("flex items-center space-x-2 transition-all duration-300")}>
          <IndianRupee className={cn("h-7 w-7 opacity-90", !isBalanceVisible && "opacity-70")} />
          <p className="text-4xl font-bold tracking-tight">
            {isBalanceVisible ? formattedBalance : hiddenBalancePlaceholderText} 
          </p>
        </div>
        <p className="text-xs opacity-80">Available balance</p>
      </CardContent>
    </Card>
  );
}
