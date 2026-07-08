import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, CheckCircle, XCircle, UserCog, Loader2 } from "lucide-react";
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

type AdminAction = "review" | "assign" | "start" | "complete" | "reject";

export function AdminModificationRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<NinModificationRequest[]>([]);
  const [staffUsers, setStaffUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<NinModificationRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<AdminAction | null>(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extractErrorMessage = (error: unknown) => {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;

    if (error instanceof Error) {
      const anyError = error as Error & {
        code?: string;
        details?: string;
        hint?: string;
      };

      return [
        anyError.message,
        anyError.code ? `Code: ${anyError.code}` : null,
        anyError.details ? `Details: ${anyError.details}` : null,
        anyError.hint ? `Hint: ${anyError.hint}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
    }

    if (typeof error === "object") {
      const anyError = error as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
        error_description?: string;
      };

      return [
        anyError.message || anyError.error_description || "Unknown error",
        anyError.code ? `Code: ${anyError.code}` : null,
        anyError.details ? `Details: ${anyError.details}` : null,
        anyError.hint ? `Hint: ${anyError.hint}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
    }

    return "Unknown error";
  };

  const getActionContent = (action: AdminAction | null) => {
    switch (action) {
      case "review":
        return {
          title: "Start Review",
          description: "Move this request into review and capture any admin notes.",
          buttonLabel: "Start Review",
        };
      case "assign":
        return {
          title: "Assign to Staff",
          description: "Assign this request to a staff member for processing, or reassign it if needed.",
          buttonLabel: "Assign Request",
        };
      case "start":
        return {
          title: "Start Processing",
          description: "Handle this request directly and mark it as in progress.",
          buttonLabel: "Start Processing",
        };
      case "complete":
        return {
          title: "Complete Request",
          description: "Mark this request as completed and include any final notes.",
          buttonLabel: "Mark Completed",
        };
      case "reject":
        return {
          title: "Reject Request",
          description: "Provide a reason for rejecting this modification request.",
          buttonLabel: "Reject Request",
        };
      default:
        return {
          title: "Update Request",
          description: "Update the selected request.",
          buttonLabel: "Save",
        };
    }
  };

  useEffect(() => {
    void fetchRequests();
    void fetchStaffUsers();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoadError(null);
      const { data, error } = await (supabase as any)
        .from("nin_modification_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      const message = extractErrorMessage(error);
      setLoadError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const { data: staffRoles, error: rolesError } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");

      if (rolesError) throw rolesError;

      if (staffRoles && staffRoles.length > 0) {
        const staffIds = staffRoles.map((role: { user_id: string }) => role.user_id);
        const { data: profiles, error: profilesError } = await (supabase as any)
          .from("profiles")
          .select("id, email")
          .in("id", staffIds);

        if (profilesError) throw profilesError;

        setStaffUsers(
          (profiles || []).map((profile: { id: string; email: string | null }) => ({
            id: profile.id,
            email: profile.email || "Unknown",
          }))
        );
      } else {
        setStaffUsers([]);
      }
    } catch (error) {
      console.error("Error fetching staff users:", error);
      toast({
        title: "Staff list error",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const openDialog = (request: NinModificationRequest, action: AdminAction) => {
    setSelectedRequest(request);
    setActionType(action);
    setSelectedStaff(request.assigned_to || "");
    setSelectedPriority(request.priority || "medium");
    setAdminNotes(request.admin_notes || "");
    setRejectionReason(request.rejection_reason || "");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedRequest(null);
    setActionType(null);
    setSelectedStaff("");
    setSelectedPriority("medium");
    setAdminNotes("");
    setRejectionReason("");
  };

  const handleSubmit = async () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === "assign" && !selectedStaff) {
      toast({
        title: "Staff Assignment Required",
        description: "Please select a staff member to assign this request to.",
        variant: "destructive",
      });
      return;
    }

    if (actionType === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this request.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await (supabase as any).rpc("admin_process_modification_request", {
        p_request_id: selectedRequest.id,
        p_action: actionType,
        p_priority: selectedPriority,
        p_assigned_to: actionType === "assign" ? selectedStaff : null,
        p_admin_notes: adminNotes.trim() || null,
        p_rejection_reason: actionType === "reject" ? rejectionReason.trim() : null,
      });

      if (error) throw error;
      if (!data) throw new Error("The modification request was updated but no record was returned.");

      const successMessages: Record<AdminAction, { title: string; description: string }> = {
        review: {
          title: "Review started",
          description: "The request is now under review.",
        },
        assign: {
          title: "Request assigned",
          description: "The request has been assigned to a staff member.",
        },
        start: {
          title: "Processing started",
          description: "The admin is now handling this request directly.",
        },
        complete: {
          title: "Request completed",
          description: "The modification request has been marked as completed.",
        },
        reject: {
          title: "Request rejected",
          description: "The request has been rejected and the user has been notified.",
        },
      };

      toast({
        title: successMessages[actionType].title,
        description: successMessages[actionType].description,
      });

      closeDialog();
      await fetchRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast({
        title: "Update Failed",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const dialogContent = getActionContent(actionType);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>NIN Modification Requests</CardTitle>
          </div>
          <CardDescription>
            Review, assign, process, and complete modification requests from account users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <p className="font-semibold">Unable to load modification requests</p>
              <p className="mt-2">{loadError}</p>
              <p className="mt-3 text-xs text-red-800/80 dark:text-red-200/80">
                This usually means the production database is missing the `nin_modification_requests` table or the
                admin SELECT policy for it.
              </p>
            </div>
          ) : requests.length === 0 ? (
            <p className="py-8 text-center text-gray-500 dark:text-slate-400">No modification requests found</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge className={STATUS_COLORS[request.status]}>
                          {request.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className={PRIORITY_COLORS[request.priority]}>
                          {request.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold">
                        {request.modification_type.replace("_", " ").toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">NIN: {request.nin}</p>
                      <div className="mt-2 text-sm">
                        <p>
                          <span className="font-medium">Requested Value:</span> {request.requested_value}
                        </p>
                        {request.current_value && (
                          <p>
                            <span className="font-medium">Current Value:</span> {request.current_value}
                          </p>
                        )}
                        <p className="mt-1">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        Submitted: {new Date(request.created_at).toLocaleString()}
                      </p>
                      {request.admin_notes && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                          <span className="font-medium">Admin Notes:</span> {request.admin_notes}
                        </p>
                      )}
                      {request.staff_notes && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                          <span className="font-medium">Staff Notes:</span> {request.staff_notes}
                        </p>
                      )}
                      {request.rejection_reason && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                          <span className="font-medium">Rejection Reason:</span> {request.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row gap-2 sm:flex-col">
                      {request.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openDialog(request, "review")}>
                            Start Review
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openDialog(request, "assign")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve & Assign
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openDialog(request, "start")}>
                            Handle Directly
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openDialog(request, "reject")}>
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}

                      {request.status === "under_review" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openDialog(request, "assign")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Assign Staff
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openDialog(request, "start")}>
                            Start Processing
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openDialog(request, "reject")}>
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}

                      {request.status === "assigned" && (
                        <>
                          <Badge variant="outline" className="bg-purple-100 dark:bg-purple-950/30 dark:text-purple-300">
                            <UserCog className="mr-1 h-3 w-3" />
                            Assigned to Staff
                          </Badge>
                          <Button size="sm" variant="secondary" onClick={() => openDialog(request, "start")}>
                            Take Over
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openDialog(request, "assign")}>
                            Reassign
                          </Button>
                        </>
                      )}

                      {request.status === "in_progress" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openDialog(request, "complete")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Mark Complete
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openDialog(request, "assign")}>
                            Assign Staff
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setIsDialogOpen(true))}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>{dialogContent.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === "assign" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Staff</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionType === "reject" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={selectedPriority} onValueChange={(value) => setSelectedPriority(value as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {actionType === "assign" ? "Admin Notes for Staff (Optional)" : "Admin Notes (Optional)"}
              </label>
              <Textarea
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                placeholder={
                  actionType === "complete"
                    ? "Add any final notes for the completed request..."
                    : "Add any notes relevant to this request..."
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                dialogContent.buttonLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
