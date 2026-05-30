import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, Siren, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface OperationalAlert {
  id: string;
  created_at: string;
  updated_at: string;
  first_seen_at: string;
  last_seen_at: string;
  status: string;
  severity: string;
  source: string;
  component: string;
  alert_type: string;
  title: string;
  message: string;
  occurrence_count: number;
}

interface OperationalEvent {
  id: string;
  created_at: string;
  source: string;
  component: string;
  event_type: string;
  severity: string;
  message: string | null;
  action: string | null;
  status_code: number | null;
  duration_ms: number | null;
  provider: string | null;
  state: string | null;
}

const severityBadge: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const statusBadge: Record<string, string> = {
  open: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  acknowledged: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OperationalMonitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);

  const alertsQuery = useQuery({
    queryKey: ["operational-alerts", showResolved],
    queryFn: async () => {
      let query = (supabase as any)
        .from("operational_alerts")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(12);

      if (!showResolved) {
        query = query.in("status", ["open", "acknowledged"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as OperationalAlert[];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["operational-events"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("operational_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as OperationalEvent[];
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ alertId, status }: { alertId: string; status: "acknowledged" | "resolved" }) => {
      const { error } = await (supabase as any).rpc("update_operational_alert_status", {
        p_alert_id: alertId,
        p_status: status,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["operational-alerts"] });
      toast({
        title: variables.status === "resolved" ? "Alert resolved" : "Alert acknowledged",
        description: "Monitoring state updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to update alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const summary = useMemo(() => {
    const alerts = alertsQuery.data ?? [];
    const events = eventsQuery.data ?? [];
    return {
      openAlerts: alerts.filter((alert) => alert.status === "open").length,
      criticalAlerts: alerts.filter((alert) => alert.severity === "critical" && alert.status !== "resolved").length,
      errorEvents: events.filter((event) => event.severity === "error" || event.severity === "critical").length,
      slowEvents: events.filter((event) => (event.duration_ms ?? 0) >= 8000).length,
    };
  }, [alertsQuery.data, eventsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Open alerts</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Siren className="h-5 w-5 text-rose-500" />
              {summary.openAlerts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Critical alerts</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              {summary.criticalAlerts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Recent error events</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {summary.errorEvents}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Slow operations</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock3 className="h-5 w-5 text-blue-500" />
              {summary.slowEvents}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Siren className="h-5 w-5 text-primary" />
                Operational Alerts
              </CardTitle>
              <CardDescription>Deduplicated backend incidents that need admin attention</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResolved((current) => !current)}
              >
                {showResolved ? "Hide Resolved" : "Show Resolved"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["operational-alerts"] });
                  queryClient.invalidateQueries({ queryKey: ["operational-events"] });
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {alertsQuery.isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading alerts...</p>
            ) : (alertsQuery.data?.length ?? 0) === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 opacity-60" />
                <p>No active alerts right now</p>
                <p className="mt-1 text-sm">The backend is quiet at the moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertsQuery.data?.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{alert.title}</h3>
                          <Badge className={severityBadge[alert.severity] ?? severityBadge.info}>
                            {titleCase(alert.severity)}
                          </Badge>
                          <Badge className={statusBadge[alert.status] ?? statusBadge.open}>
                            {titleCase(alert.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{alert.message}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{titleCase(alert.component)}</span>
                          <span>{titleCase(alert.alert_type)}</span>
                          <span>Seen {alert.occurrence_count} time{alert.occurrence_count === 1 ? "" : "s"}</span>
                          <span>Last seen {format(new Date(alert.last_seen_at), "MMM d, HH:mm")}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {alert.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAlertMutation.mutate({ alertId: alert.id, status: "acknowledged" })}
                            disabled={updateAlertMutation.isPending}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.status !== "resolved" && (
                          <Button
                            size="sm"
                            onClick={() => updateAlertMutation.mutate({ alertId: alert.id, status: "resolved" })}
                            disabled={updateAlertMutation.isPending}
                          >
                            Resolve
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

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Events
            </CardTitle>
            <CardDescription>Latest backend execution and worker events</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading events...</p>
            ) : (eventsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No events captured yet.</p>
            ) : (
              <div className="space-y-3">
                {eventsQuery.data?.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={severityBadge[event.severity] ?? severityBadge.info}>
                            {titleCase(event.severity)}
                          </Badge>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {titleCase(event.event_type)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {event.message || "No message provided."}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{titleCase(event.component)}</span>
                          {event.action && <span>Action: {event.action}</span>}
                          {event.status_code !== null && <span>HTTP {event.status_code}</span>}
                          {event.duration_ms !== null && <span>{event.duration_ms}ms</span>}
                          {event.provider && <span>{titleCase(event.provider)}</span>}
                          {event.state && <span>{titleCase(event.state)}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {format(new Date(event.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
