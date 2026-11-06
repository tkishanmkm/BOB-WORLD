
// src/app/change-transaction-pin/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ChangeTransactionPinPage() {
  return (
    <div className="container mx-auto py-8">
       <Link href="/profile" passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Change Transaction PIN</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Functionality to change transaction PIN coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
