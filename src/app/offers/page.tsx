// src/app/offers/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function OffersPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Offers</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Check out the latest offers here. Content coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
