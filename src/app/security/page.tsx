// src/app/security/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SecurityPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Manage your security preferences here. Content coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
