
// src/app/cheque-book-request/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ChequeBookRequestPage() {
  return (
    <div className="container mx-auto py-8">
      <header className="bg-background p-4 flex items-center justify-between border-b sticky top-0 z-20 mb-6">
        <Link href="/account-actions" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Cheque Book Request</h1>
        <div className="w-10"></div> {/* Spacer to balance header */}
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Cheque Book Request</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Cheque Book Request functionality coming soon!</p>
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
