import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "card" | "text" | "circular" | "rectangular";
}

export function LoadingSkeleton({ className, variant = "rectangular" }: LoadingSkeletonProps) {
  const baseStyles = "skeleton animate-pulse";
  
  const variants = {
    card: "h-32 w-full rounded-xl",
    text: "h-4 w-full rounded",
    circular: "h-12 w-12 rounded-full",
    rectangular: "h-24 w-full rounded-lg",
  };

  return <div className={cn(baseStyles, variants[variant], className)} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <LoadingSkeleton key={i} variant="card" className="h-28" />
        ))}
      </div>
      
      {/* Content Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LoadingSkeleton variant="card" className="h-96" />
        <LoadingSkeleton variant="card" className="h-96" />
      </div>
    </div>
  );
}
