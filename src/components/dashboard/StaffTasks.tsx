import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, PlayCircle, CheckCircle2, Loader2 } from "lucide-react";
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
 * Staff Tasks Component
 * Shows modification requests assigned to the logged-in staff member
 * Allows staff to mark tasks as in-progress or completed
 */
export function StaffTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<NinModificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<NinModificationRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"start" | "complete" | null>(null);
  const [staffNotes, setStaffNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("nin_modification_requests")
        .select("*")
        .eq("assigned_to", user.id)
        .in("status", ["assigned", "in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load assigned tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (task: NinModificationRequest, action: "start" | "complete") => {
    setSelectedTask(task);
    setActionType(action);
    setStaffNotes(task.staff_notes || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;

    setIsSubmitting(true);

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
        staff_notes: staffNotes || null,
      };

      if (actionType === "start") {
        updateData.status = "in_progress";
      } else if (actionType === "complete") {
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("nin_modification_requests")
        .update(updateData)
        .eq("id", selectedTask.id);

      if (error) throw error;

      toast({
        title: actionType === "start" ? "✅ Task Started" : "🎉 Task Completed",
        description: actionType === "start" 
          ? "Task status updated to In Progress"
          : "Task has been marked as completed",
      });

      setIsDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update task",
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
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-green-600" />
            <CardTitle>Assigned Modification Tasks</CardTitle>
          </div>
          <CardDescription>
            NIN modification requests assigned to you by admins
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tasks assigned to you</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={STATUS_COLORS[task.status]}>
                          {task.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className={PRIORITY_COLORS[task.priority]}>
                          {task.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      <p className="font-semibold text-lg">
                        {task.modification_type.replace("_", " ").toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">NIN: {task.nin}</p>
                      <div className="mt-2 text-sm space-y-1">
                        <p>
                          <span className="font-medium">Requested Value:</span> {task.requested_value}
                        </p>
                        {task.current_value && (
                          <p>
                            <span className="font-medium">Current Value:</span> {task.current_value}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Reason:</span> {task.reason}
                        </p>
                        {task.admin_notes && (
                          <p className="mt-2 p-2 bg-blue-50 rounded text-blue-900">
                            <span className="font-medium">Admin Notes:</span> {task.admin_notes}
                          </p>
                        )}
                        {task.staff_notes && (
                          <p className="mt-2 p-2 bg-green-50 rounded text-green-900">
                            <span className="font-medium">My Notes:</span> {task.staff_notes}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Assigned: {new Date(task.assigned_at!).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-row sm:flex-col gap-2">
                      {task.status === "assigned" && (
                        <Button
                          size="sm"
                          onClick={() => openDialog(task, "start")}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Start Task
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => openDialog(task, "complete")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Complete
                        </Button>
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
              {actionType === "start" ? "Start Task" : "Complete Task"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "start" 
                ? "Add notes and mark this task as in progress" 
                : "Add completion notes and mark this task as done"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff Notes</label>
              <Textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Add your notes about this task..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : actionType === "start" ? (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Task
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
