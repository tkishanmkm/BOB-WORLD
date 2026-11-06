"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AnalysisDisplay } from '@/components/statement-analysis/analysis-display';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function StatementAnalysisPage() {
  const [statementText, setStatementText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!statementText.trim()) {
      toast({
        title: "Input Required",
        description: "Please paste your statement text before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      // Local-only text review keeps pasted account data on this device.
      const lines = statementText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const dateMatches = statementText.match(/\b\d{2}[/-]\d{2}[/-]\d{4}\b/g) || [];
      const amounts = Array.from(statementText.matchAll(/(?:₹|INR\s*)\s*([0-9,]+(?:\.\d{1,2})?)/gi))
        .map(match => Number(match[1].replace(/,/g, '')))
        .filter(value => Number.isFinite(value));
      const references = (statementText.match(/\b(?:UPI|IMPS|NEFT|RTGS)\b/gi) || []).length;
      const largest = amounts.length ? Math.max(...amounts) : null;
      const smallest = amounts.length ? Math.min(...amounts) : null;
      setSummary([
        'Local text review completed.',
        'Non-empty lines: ' + lines.length,
        'Date strings found: ' + dateMatches.length,
        'Rupee amounts found: ' + amounts.length,
        'Payment-channel keywords found: ' + references,
        'Largest amount string: ' + (largest === null ? 'Not detected' : '₹' + largest.toLocaleString('en-IN', { maximumFractionDigits: 2 })),
        'Smallest amount string: ' + (smallest === null ? 'Not detected' : '₹' + smallest.toLocaleString('en-IN', { maximumFractionDigits: 2 })),
        'This text scan does not verify account balances or certify transaction accuracy.',
      ].join('\n'));
    } catch (e: any) {
      console.error("Statement analysis failed:", e);
      setError("Failed to analyze the statement. Please check the console for details or try again later.");
      toast({
        title: "Analysis Failed",
        description: e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <header className="bg-background p-4 flex items-center justify-between border-b sticky top-0 z-20 mb-6 -mx-4 -mt-6">
        <Link href="/account-actions" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Statement Analysis</h1>
        <div className="w-10"></div>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Analyze Your Statement</CardTitle>
          <CardDescription>
            Paste statement text for a local review. The text stays in this browser and is not uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid w-full gap-2">
            <Label htmlFor="statement-text">Statement Content</Label>
            <Textarea
              id="statement-text"
              placeholder="Paste your full statement text here..."
              value={statementText}
              onChange={(e) => setStatementText(e.target.value)}
              className="min-h-[200px] text-sm"
              disabled={isLoading}
            />
          </div>
        </CardContent>
         <CardFooter>
          <Button onClick={handleAnalyze} disabled={isLoading || !statementText.trim()} className="w-full sm:w-auto">
            {isLoading ? "Analyzing..." : "Review Text"}
          </Button>
        </CardFooter>
      </Card>

      <AnalysisDisplay summary={summary} isLoading={isLoading} error={error} />
    </div>
  );
}
