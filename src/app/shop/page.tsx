// src/app/shop/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ShopPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Shop</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Shopping features coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
