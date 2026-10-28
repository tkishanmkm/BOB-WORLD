
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Home, Lightbulb, CheckCircle2, ChevronDown, CalendarDays, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { AccountDetailsType } from '@/lib/types';
import { 
  INITIAL_ACCOUNT_DETAILS, 
  ACCOUNT_DETAILS_STORAGE_KEY,
  STATEMENT_PDF_KEY
} from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';


export default function AccountStatementPage() {
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set initial dates only on the client-side to avoid hydration errors
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    setFromDate(oneWeekAgo);
    setToDate(today);

    const storedAccountDetails = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedAccountDetails) {
      try {
        setAccountDetails(JSON.parse(storedAccountDetails));
      } catch (e) {
        setAccountDetails(INITIAL_ACCOUNT_DETAILS);
      }
    } else {
      setAccountDetails(INITIAL_ACCOUNT_DETAILS);
    }
  }, []);

  const formatDateForDisplay = (date?: Date) => {
    if (!date) return "Select Date";
    return format(date, 'dd-MM-yyyy');
  };

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const statementPdfDataUri = localStorage.getItem(STATEMENT_PDF_KEY);
      if (!statementPdfDataUri || !statementPdfDataUri.startsWith('data:application/pdf;base64,')) {
         toast({
          title: "Download Failed",
          description: "No statement PDF found. Please upload one in the Settings page.",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }
      
      const dateStr = format(new Date(), 'yyyyMMdd');
      const fileName = `XXXXXXXXXX${accountDetails.accountNumber.slice(-4)}_${dateStr}.pdf`;

      if (Capacitor.getPlatform() === 'android') {
        const base64Data = statementPdfDataUri.split(',')[1];
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Downloads,
        });
        toast({
          title: "Download Complete",
          description: `${fileName} saved to Downloads folder.`,
        });

      } else {
        // Web fallback
        const byteString = atob(statementPdfDataUri.split(',')[1]);
        const mimeString = statementPdfDataUri.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
         toast({
          title: "Download Successful",
          description: "Statement has been downloaded.",
        });
      }

    } catch (error: any) {
      console.error("Error during download:", error);
       toast({
        title: "Download Error",
        description: error.message || "An unexpected error occurred. Ensure Filesystem plugin is synced.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background p-4 flex items-center justify-between border-b sticky top-0 z-20">
        <Link href="/dashboard" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Account statement</h1>
        <Button variant="ghost" size="icon">
          <Home className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-4 space-y-5">
        <Card className="shadow-md">
          <CardContent className="p-4 space-y-3">
             <div className="flex items-center text-sm font-semibold">
                <div className="bg-orange-400 p-1 rounded-sm mr-2.5 self-start">
                    <Lightbulb className="h-4 w-4 text-white" />
                </div>
                Account statement
             </div>
            <div className="flex items-start text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary mr-2.5 mt-0.5 shrink-0" />
                <p>You can request statement up to 3 months using mobile banking.</p>
            </div>
             <div className="flex items-start text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary mr-2.5 mt-0.5 shrink-0" />
                <p>There will be a limit of 5 times on statement request up to 3 months transaction period</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardContent className="p-4 space-y-4">
                <div>
                    <Label className="text-xs text-muted-foreground">Account number</Label>
                    <div className="flex items-center justify-between p-2.5 mt-1 border rounded-md">
                        <p className="font-medium">{accountDetails.accountNumber}</p>
                        <ChevronDown className="h-5 w-5 text-muted-foreground"/>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                   <div className="flex-1">
                        <Label htmlFor="from-date" className="text-xs text-muted-foreground">From</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" id="from-date" className="w-full justify-between mt-1 h-11 font-normal">
                                    <span>{formatDateForDisplay(fromDate)}</span>
                                    <CalendarDays className="h-5 w-5 text-muted-foreground"/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar 
                                    mode="single" 
                                    selected={fromDate} 
                                    onSelect={setFromDate} 
                                    disabled={(date) => date > new Date() || (toDate ? date > toDate : false)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                   </div>
                   <div className="self-end pb-2.5">
                        <ArrowRightLeft className="h-5 w-5 text-muted-foreground"/>
                   </div>
                   <div className="flex-1">
                        <Label htmlFor="to-date" className="text-xs text-muted-foreground">To</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" id="to-date" className="w-full justify-between mt-1 h-11 font-normal">
                                     <span>{formatDateForDisplay(toDate)}</span>
                                     <CalendarDays className="h-5 w-5 text-muted-foreground"/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar 
                                    mode="single" 
                                    selected={toDate} 
                                    onSelect={setToDate} 
                                    disabled={(date) => date > new Date() || (fromDate ? date < fromDate : false)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                   </div>
                </div>
            </CardContent>
        </Card>
      </main>

      <footer className="p-4 bg-background border-t">
        <Button 
          className="w-full h-12 text-lg font-semibold" 
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Download statement'}
        </Button>
      </footer>
    </div>
  );
}
