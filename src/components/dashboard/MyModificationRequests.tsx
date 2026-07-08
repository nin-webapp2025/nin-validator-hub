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
  pending: "bg-yellow-500",
  under_review: "bg-blue-500",
  assigned: "bg-purple-500",
  in_progress: "bg-indigo-500",
  completed: "bg-green-500",
  rejected: "bg-red-500",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
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
    <Card className="bg-purple-900/30 backdrop-blur-lg border-amber-500/20">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-400" />
            <CardTitle className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
              My Modification Requests
            </CardTitle>
          </div>
          <CardDescription className="text-purple-200">
            Track the full progress of your modification requests from submission to completion.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void fetchRequests()}
          disabled={isLoading}
          className="border-amber-500/30 bg-purple-950/40 text-amber-100 hover:bg-purple-900/60 hover:text-white"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-amber-500/30 bg-purple-950/30 px-4 py-8 text-center text-sm text-purple-200">
            You have not submitted any modification requests yet.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-amber-500/20 bg-purple-950/35 p-4 text-sm text-purple-100"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_COLORS[request.status]}>{STATUS_LABELS[request.status]}</Badge>
                      <Badge className={PRIORITY_COLORS[request.priority]}>
                        {request.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-base font-semibold text-white">
                      {request.modification_type.replace("_", " ").toUpperCase()}
                    </p>
                    <p className="mt-1 text-purple-200">NIN: {request.nin}</p>
                    <div className="mt-3 space-y-1">
                      {request.current_value && (
                        <p>
                          <span className="font-medium text-amber-100">Current Value:</span> {request.current_value}
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-amber-100">Requested Value:</span> {request.requested_value}
                      </p>
                      {request.reason && (
                        <p>
                          <span className="font-medium text-amber-100">Reason:</span> {request.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-purple-300 sm:text-right">
                    <p>Submitted</p>
                    <p>{new Date(request.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-purple-200 sm:grid-cols-2">
                  {request.reviewed_at && (
                    <p>
                      <span className="font-medium text-amber-100">Reviewed:</span>{" "}
                      {new Date(request.reviewed_at).toLocaleString()}
                    </p>
                  )}
                  {request.assigned_at && (
                    <p>
                      <span className="font-medium text-amber-100">Assigned:</span>{" "}
                      {new Date(request.assigned_at).toLocaleString()}
                    </p>
                  )}
                  {request.completed_at && (
                    <p>
                      <span className="font-medium text-amber-100">Completed:</span>{" "}
                      {new Date(request.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {(request.admin_notes || request.staff_notes || request.rejection_reason) && (
                  <div className="mt-4 space-y-2 rounded-md border border-amber-500/20 bg-purple-900/25 p-3 text-xs text-purple-100">
                    {request.admin_notes && (
                      <p>
                        <span className="font-medium text-amber-100">Admin Notes:</span> {request.admin_notes}
                      </p>
                    )}
                    {request.staff_notes && (
                      <p>
                        <span className="font-medium text-amber-100">Processing Notes:</span> {request.staff_notes}
                      </p>
                    )}
                    {request.rejection_reason && (
                      <p className="text-red-200">
                        <span className="font-medium text-red-100">Rejection Reason:</span> {request.rejection_reason}
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
