import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Calendar, ChevronLeft, ChevronRight, Search, User } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 15;

interface AuditRecord {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const actionColors: Record<string, string> = {
  role_change: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  modification_approved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  modification_rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  account_deleted: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  password_changed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  profile_updated: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

function getActionLabel(action: string) {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = (supabase as any)
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (actionFilter !== "all") {
      query = query.eq("action", actionFilter);
    }
    if (searchQuery.trim()) {
      query = query.or(
        `action.ilike.%${searchQuery.trim()}%,target_type.ilike.%${searchQuery.trim()}%,target_id.ilike.%${searchQuery.trim()}%`
      );
    }

    query.range(from, to).then(({ data, count }: { data: AuditRecord[] | null; count: number | null }) => {
      if (data) setLogs(data);
      if (count !== null) setTotalCount(count);
    });
  }, [user, page, searchQuery, actionFilter]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          Audit Log
        </CardTitle>
        <CardDescription>Track admin actions and system events</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="role_change">Role Change</SelectItem>
              <SelectItem value="modification_approved">Modification Approved</SelectItem>
              <SelectItem value="modification_rejected">Modification Rejected</SelectItem>
              <SelectItem value="account_deleted">Account Deleted</SelectItem>
              <SelectItem value="password_changed">Password Changed</SelectItem>
              <SelectItem value="profile_updated">Profile Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No audit log entries yet</p>
            <p className="text-sm mt-1">Admin actions will be recorded here</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={actionColors[log.action] || "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"}
                      >
                        {getActionLabel(log.action)}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        on {log.target_type}
                      </span>
                    </div>
                    {log.target_id && (
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                        Target: {log.target_id}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {JSON.stringify(log.metadata).slice(0, 120)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(log.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Page {page + 1} of {totalPages} ({totalCount} entries)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
