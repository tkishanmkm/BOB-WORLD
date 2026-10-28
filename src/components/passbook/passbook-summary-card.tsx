
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { IndianRupee, CheckCircle2, ArrowUpCircle } from "lucide-react"; // Using ArrowUpCircle for 'Total out'

interface PassbookSummaryCardProps {
  totalIn: number;
  totalOut: number;
  closingBalance: number;
}

export function PassbookSummaryCard({ totalIn, totalOut, closingBalance }: PassbookSummaryCardProps) {
  return (
    <Card className="shadow-md">
      <CardContent className="p-0">
        <div className="flex">
          {/* Total In Section */}
          <div className="flex-1 p-3 bg-[hsl(var(--total-in-bg))] text-[hsl(var(--total-in-fg))] rounded-l-lg min-h-[4rem] flex flex-col justify-center">
            <p className="text-xs leading-tight">Total in</p>
            <div className="flex items-center font-semibold text-sm mt-0.5">
              <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
              {totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <CheckCircle2 className="h-4 w-4 ml-1 text-green-600" />
            </div>
          </div>
          {/* Total Out Section */}
          <div className="flex-1 p-3 bg-[hsl(var(--total-out-bg))] text-[hsl(var(--total-out-fg))] rounded-r-lg min-h-[4rem] flex flex-col justify-center">
            <p className="text-xs leading-tight">Total out</p>
            <div className="flex items-center font-semibold text-sm mt-0.5">
              <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
              {totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <ArrowUpCircle className="h-4 w-4 ml-1 text-red-600" />
            </div>
          </div>
        </div>
        {/* Closing Balance Section */}
        <div className="p-3 bg-[hsl(var(--closing-balance-bg))] text-[hsl(var(--closing-balance-fg))] rounded-b-lg">
          <div className="flex justify-between items-center">
            <p className="text-sm">Closing balance</p>
            <div className="flex items-center font-semibold">
              <IndianRupee className="h-4 w-4 mr-0.5" />
              {closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
