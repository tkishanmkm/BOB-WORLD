// src/app/scan/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { QrCode } from "lucide-react";

export default function ScanPage() {
  return (
    <div className="container mx-auto py-8 text-center">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-6 w-6" /> Scan QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
            <QrCode className="h-32 w-32 text-primary mb-4" />
            <p className="text-lg font-medium">QR Code Scanner</p>
            <p className="text-muted-foreground">Point your camera at a QR code to scan.</p>
            <p className="mt-4 text-sm text-destructive">Camera access not implemented in this prototype.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
