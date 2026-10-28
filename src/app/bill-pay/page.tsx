// src/app/bill-pay/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function BillPayPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Recharge & Bill Pay</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Pay your bills and recharge here. Functionality coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
