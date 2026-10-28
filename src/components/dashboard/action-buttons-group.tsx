
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";

export function ActionButtonsGroup() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <Button variant="outline" className="bg-background hover:bg-muted border-primary/50 text-primary font-semibold py-3 h-auto text-sm sm:text-base" asChild>
        <Link href="/all-accounts">View all accounts</Link>
      </Button>
      <Button variant="outline" className="bg-background hover:bg-muted border-primary/50 text-primary font-semibold py-3 h-auto text-sm sm:text-base" asChild>
        <Link href="/passbook">Transaction history</Link>
      </Button>
    </div>
  );
}

