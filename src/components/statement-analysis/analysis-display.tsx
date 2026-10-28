"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

interface AnalysisDisplayProps {
  summary: string | null;
  isLoading: boolean;
  error: string | null;
}

export function AnalysisDisplay({ summary, isLoading, error }: AnalysisDisplayProps) {
  if (isLoading) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Analyzing your statement...</p>
          <p className="text-sm text-muted-foreground">This may take a few moments.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Analysis Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return null; // Or a message like "Enter statement text above to get analysis"
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader className="flex flex-row items-center space-x-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <CardTitle className="text-xl font-semibold">Statement Summary & Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap rounded-md bg-muted/50 p-4">
          {summary}
        </div>
      </CardContent>
    </Card>
  );
}
