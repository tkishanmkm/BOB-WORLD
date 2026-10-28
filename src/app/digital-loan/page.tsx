// src/app/digital-loan/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DigitalLoanPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Digital Loan</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Apply for digital loans. Content coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
