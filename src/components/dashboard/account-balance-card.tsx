"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { IndianRupee } from "lucide-react";

interface AccountBalanceCardProps {
  balance: number;
}

export function AccountBalanceCard({ balance }: AccountBalanceCardProps) {
  return (
    <Card className="shadow-lg bg-secondary text-secondary-foreground">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Account Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <IndianRupee className="h-8 w-8 text-primary" />
          <p className="text-3xl font-bold">
            {balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Available Balance</p>
      </CardContent>
    </Card>
  );
}
