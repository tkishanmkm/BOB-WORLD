"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateStatementSummary } from '@/ai/flows/statement-summary';
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
      const result = await generateStatementSummary({ statementText });
      if (result && result.summary) {
        setSummary(result.summary);
      } else {
        throw new Error("Received an empty summary from the AI.");
      }
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
        <h1 className="text-lg font-semibold text-foreground">AI Statement Analysis</h1>
        <div className="w-10"></div>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Analyze Your Statement</CardTitle>
          <CardDescription>
            Paste your bank statement text below to get an AI-powered summary, highlighting key transactions and insights.
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
            {isLoading ? "Analyzing..." : "Generate Summary"}
          </Button>
        </CardFooter>
      </Card>

      <AnalysisDisplay summary={summary} isLoading={isLoading} error={error} />
    </div>
  );
}