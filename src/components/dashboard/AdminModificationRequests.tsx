import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, CheckCircle, XCircle, UserCog, AlertTriangle, Loader2 } from "lucide-react";
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

/**
 * Admin Modification Requests Management
 * Allows admins to review, assign, and manage NIN modification requests
 * Shows all requests from VIP users with ability to assign to staff
 */
export function AdminModificationRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<NinModificationRequest[]>([]);
  const [staffUsers, setStaffUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<NinModificationRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchStaffUsers();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("nin_modification_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load modification requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      // Join user_roles with profiles to get staff emails (no admin API needed)
      const { data: staffRoles, error: rolesError } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");

      if (rolesError) throw rolesError;

      if (staffRoles && staffRoles.length > 0) {
        const staffIds = staffRoles.map(r => r.user_id);
        
        const { data: profiles, error: profilesError } = await (supabase as any)
          .from("profiles")
          .select("id, email")
          .in("id", staffIds);

        if (profilesError) {
          console.error("Error fetching staff profiles:", profilesError);
          return;
        }

        const staffList = (profiles || []).map(p => ({
          id: p.id,
          email: p.email || "Unknown",
        }));

        setStaffUsers(staffList);
      }
    } catch (error) {
      console.error("Error fetching staff users:", error);
    }
  };

  const openDialog = (request: NinModificationRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes("");
    setRejectionReason("");
    setSelectedStaff("");
    setSelectedPriority(request.priority || "medium");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedRequest) return;

    if (actionType === "approve" && !selectedStaff) {
      toast({
        title: "Staff Assignment Required",
        description: "Please select a staff member to assign this request to",
        variant: "destructive",
      });
      return;
    }

    if (actionType === "reject" && !rejectionReason) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this request",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      };

      if (actionType === "approve") {
        updateData.status = "assigned";
        updateData.assigned_to = selectedStaff;
        updateData.assigned_at = new Date().toISOString();
        updateData.priority = selectedPriority;
      } else {
        updateData.status = "rejected";
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await (supabase as any)
        .from("nin_modification_requests")
        .update(updateData)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: actionType === "approve" ? "✅ Request Approved" : "❌ Request Rejected",
        description: actionType === "approve" 
          ? "Request has been assigned to staff member"
          : "Request has been rejected with reason provided",
      });

      setIsDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update request",
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>NIN Modification Requests</CardTitle>
          </div>
          <CardDescription>
            Review and manage modification requests from VIP users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-slate-400 py-8">No modification requests found</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={STATUS_COLORS[request.status]}>
                          {request.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className={PRIORITY_COLORS[request.priority]}>
                          {request.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-semibold text-lg">
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
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                        Submitted: {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-row sm:flex-col gap-2">
                      {request.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openDialog(request, "approve")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve & Assign
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDialog(request, "reject")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {request.status === "assigned" && (
                        <Badge variant="outline" className="bg-purple-100 dark:bg-purple-950/30 dark:text-purple-300">
                          <UserCog className="h-3 w-3 mr-1" />
                          Assigned to Staff
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve & Assign Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" 
                ? "Assign this request to a staff member for processing" 
                : "Provide a reason for rejecting this request"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === "approve" ? (
              <>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={selectedPriority} onValueChange={(val) => setSelectedPriority(val as Priority)}>
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
                  <label className="text-sm font-medium">Admin Notes (Optional)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes for the staff member..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                "Approve & Assign"
              ) : (
                "Reject Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
