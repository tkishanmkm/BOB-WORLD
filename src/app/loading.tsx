import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.14)-theme(spacing.16))]"> {/* Adjust height based on header/footer if any */}
      <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
      <h2 className="text-2xl font-semibold text-foreground mb-2">Loading BOB World</h2>
      <p className="text-muted-foreground">Please wait while we fetch your details...</p>
      
      {/* Optional: Skeleton placeholders for common layouts */}
      <div className="mt-12 w-full max-w-2xl space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
