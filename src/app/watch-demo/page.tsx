
// src/app/watch-demo/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function WatchDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <header className="bg-card p-4 flex items-center border-b sticky top-0 z-20 mb-6">
        <Link href="/need-help" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground ml-4">Watch Demo</h1>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Watch Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is the Watch Demo page. Content coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
