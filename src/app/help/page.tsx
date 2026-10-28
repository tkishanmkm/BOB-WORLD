// src/app/help/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Help & Support</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Find answers to your questions or contact support. Content coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
