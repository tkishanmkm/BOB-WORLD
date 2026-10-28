"use client";

import type * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserCircle2, CreditCard, Code2 } from "lucide-react";
import type { AccountDetailsType } from '@/lib/types';

interface AccountDetailsCardProps {
  details: AccountDetailsType;
}

const DetailItem: React.FC<{icon: React.ElementType, label: string, value: string }> = 
  ({ icon: Icon, label, value }) => (
  <div className="flex items-start space-x-3 mb-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground break-all">{value || '-'}</p>
    </div>
  </div>
);

export function AccountDetailsCard({ details }: AccountDetailsCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Account Details</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailItem icon={UserCircle2} label="Account Holder" value={details.name} />
        <DetailItem icon={CreditCard} label="Account Number" value={details.accountNumber} />
        <DetailItem icon={Code2} label="IFSC Code" value={details.ifscCode} />
      </CardContent>
      {/* Edit/Save functionality removed, card is now display-only */}
    </Card>
  );
}
