// src/app/about/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>About BOB World</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Version 3.9.0</p>
          <p>Package Name: com.bankofbaroda.mconnect</p>
          <p className="mt-4">BOB World - Your trusted financial partner.</p>
        </CardContent>
      </Card>
    </div>
  );
}
