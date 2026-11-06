
// src/app/credit-card-apply/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreditCardApplyPage() {
  return (
    <div className="container mx-auto py-8">
      <header className="bg-background p-4 flex items-center justify-between border-b sticky top-0 z-20 mb-6">
        <Link href="/account-actions" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Apply for Credit Card</h1>
        <div className="w-10"></div> {/* Spacer to balance header */}
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Apply for Credit Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Information and application form for credit cards will be here soon.</p>
           <Link href="/account-actions" passHref className="mt-4 inline-block">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account Actions
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
