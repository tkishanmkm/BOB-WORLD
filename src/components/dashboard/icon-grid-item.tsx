"use client";

import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface IconGridItemProps {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  newBadge?: boolean;
}

export function IconGridItem({ label, icon: Icon, href, newBadge = false }: IconGridItemProps) {
  return (
    <Link href={href} className="block group">
      <Card className="bg-background hover:shadow-lg transition-shadow aspect-square flex flex-col items-center justify-center text-center p-2 sm:p-3 relative overflow-hidden border-border/70">
        {newBadge && (
          <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-0.5 rounded-bl-md">
            New
          </div>
        )}
        <CardContent className="p-0 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-full text-primary group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-foreground leading-tight">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
