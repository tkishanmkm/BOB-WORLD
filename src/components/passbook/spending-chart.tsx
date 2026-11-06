
"use client";

import type { TransactionType } from '@/lib/types';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee } from 'lucide-react';

interface SpendingChartProps {
  transactions: TransactionType[];
}

interface ChartDataPoint {
  name: string; // Formatted date e.g., "08 Jan"
  spending: number;
  fullDate: string; // YYYY-MM-DD for sorting
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm p-3 rounded-lg border border-border shadow-lg">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-primary flex items-center">
          Spending: <IndianRupee className="h-3 w-3 mx-0.5" />
          {payload[0].value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export function SpendingChart({ transactions }: SpendingChartProps) {
  const chartData = useMemo(() => {
    const dailySpending: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.type === 'debit') {
        const dateKey = format(parseISO(tx.date), 'yyyy-MM-dd');
        dailySpending[dateKey] = (dailySpending[dateKey] || 0) + tx.amount;
      }
    });

    const dataPoints: ChartDataPoint[] = Object.entries(dailySpending)
      .map(([date, total]) => ({
        fullDate: date,
        name: format(parseISO(date), 'dd MMM'),
        spending: total,
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()); // Sort by date

    return dataPoints;
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Your spending</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No spending data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Determine Y-axis domain
  const maxSpending = Math.max(...chartData.map(d => d.spending), 0);
  const yAxisDomainMax = maxSpending > 0 ? Math.ceil(maxSpending / 50000) * 50000 : 50000; // Round up to nearest 50k, default 50k

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Your spending</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{
              top: 5,
              right: 20,
              left: 10, // Adjusted for potentially larger Y-axis labels
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tickFormatter={(value) => (typeof value === 'number' ? value.toLocaleString('en-IN') : value)}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              domain={[0, yAxisDomainMax]}
              allowDataOverflow={true}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area
              type="monotone"
              dataKey="spending"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              strokeWidth={2}
              fill="url(#colorSpending)"
              dot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
