
// src/app/switch-to-classic/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SwitchToClassicPage() {
  return (
    <div className="container mx-auto py-8">
      <Link href="/profile" passHref className="mb-4 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Switch to Classic View</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Functionality to switch to classic view coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
