// src/app/bus-tickets/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function BusTicketsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Bus Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Book bus tickets here. Functionality coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
