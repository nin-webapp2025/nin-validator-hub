import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ClipboardList } from "lucide-react";
import type { NinModificationRequest, Priority, RequestStatus } from "@/types/modification";

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: "bg-slate-400",
  under_review: "bg-amber-400",
  assigned: "bg-amber-500",
  in_progress: "bg-amber-600",
  completed: "bg-emerald-500",
  rejected: "bg-red-500",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-amber-600",
  urgent: "bg-red-500",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending Review",
  under_review: "Under Review",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

interface MyModificationRequestsProps {
  refreshKey?: number;
}

export function MyModificationRequests({ refreshKey = 0 }: MyModificationRequestsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<NinModificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchRequests();
  }, [refreshKey, user?.id]);

  const fetchRequests = async () => {
    if (!user) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("nin_modification_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching modification requests:", error);
      toast({
        title: "Unable to load your modification requests",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-slate-900 dark:text-slate-100">
              My Modification Requests
            </CardTitle>
          </div>
          <CardDescription>
            Track the full progress of your modification requests from submission to completion.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void fetchRequests()}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            You have not submitted any modification requests yet.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_COLORS[request.status]}>{STATUS_LABELS[request.status]}</Badge>
                      <Badge className={PRIORITY_COLORS[request.priority]}>
                        {request.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {request.modification_type.replace("_", " ").toUpperCase()}
                    </p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">NIN: {request.nin}</p>
                    <div className="mt-3 space-y-1">
                      {request.current_value && (
                        <p>
                          <span className="font-medium text-slate-500 dark:text-slate-400">Current Value:</span> {request.current_value}
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-slate-500 dark:text-slate-400">Requested Value:</span> {request.requested_value}
                      </p>
                      {request.reason && (
                        <p>
                          <span className="font-medium text-slate-500 dark:text-slate-400">Reason:</span> {request.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 sm:text-right">
                    <p>Submitted</p>
                    <p>{new Date(request.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                  {request.reviewed_at && (
                    <p>
                      <span className="font-medium text-slate-500 dark:text-slate-400">Reviewed:</span>{" "}
                      {new Date(request.reviewed_at).toLocaleString()}
                    </p>
                  )}
                  {request.assigned_at && (
                    <p>
                      <span className="font-medium text-slate-500 dark:text-slate-400">Assigned:</span>{" "}
                      {new Date(request.assigned_at).toLocaleString()}
                    </p>
                  )}
                  {request.completed_at && (
                    <p>
                      <span className="font-medium text-slate-500 dark:text-slate-400">Completed:</span>{" "}
                      {new Date(request.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {(request.admin_notes || request.staff_notes || request.rejection_reason) && (
                  <div className="mt-4 space-y-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                    {request.admin_notes && (
                      <p>
                        <span className="font-medium text-slate-500 dark:text-slate-400">Admin Notes:</span> {request.admin_notes}
                      </p>
                    )}
                    {request.staff_notes && (
                      <p>
                        <span className="font-medium text-slate-500 dark:text-slate-400">Processing Notes:</span> {request.staff_notes}
                      </p>
                    )}
                    {request.rejection_reason && (
                      <p className="text-red-600 dark:text-red-400">
                        <span className="font-medium text-red-700 dark:text-red-300">Rejection Reason:</span> {request.rejection_reason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
