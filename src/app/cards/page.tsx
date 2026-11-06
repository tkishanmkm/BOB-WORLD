// src/app/cards/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function CardsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>My Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is the Cards page. Content coming soon for Debit and Credit Cards!</p>
        </CardContent>
      </Card>
    </div>
  );
}
