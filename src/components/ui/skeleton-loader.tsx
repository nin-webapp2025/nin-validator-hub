import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-200/80 dark:border-slate-800">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FormSkeleton() {
  return (
    <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-200/80 dark:border-slate-800">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}
