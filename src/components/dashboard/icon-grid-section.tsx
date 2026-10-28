"use client";

import { ChevronUp } from 'lucide-react';
import { IconGridItem, type IconGridItemProps } from './icon-grid-item';
import Link from 'next/link';

interface IconGridSectionProps {
  title: string;
  actions: IconGridItemProps[];
  showPersonalizeLink?: boolean;
}

export function IconGridSection({ title, actions, showPersonalizeLink = false }: IconGridSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          {showPersonalizeLink && (
            <Link href="#" className="text-sm text-primary hover:underline font-medium">
              Personalize
            </Link>
          )}
          <button className="p-1 rounded-full hover:bg-muted">
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Toggle section</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {actions.map((action) => (
          <IconGridItem key={action.id} {...action} />
        ))}
      </div>
    </section>
  );
}
