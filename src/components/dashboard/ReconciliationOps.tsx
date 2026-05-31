import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNaira } from "@/lib/wallet";

type RequestStatus = "charged" | "refunded";

interface WalletOperationRequest {
  id: string;
  user_id: string;
  operation: string;
  request_key: string;
  amount: number;
  status: RequestStatus;
  charge_transaction_id: string | null;
  refund_transaction_id: string | null;
  balance_after_charge: number | null;
  balance_after_refund: number | null;
  created_at: string;
  updated_at: string;
}

interface WalletTransactionRow {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  operation: string | null;
  status: string;
  created_at: string;
}

interface BackgroundJobRow {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
  run_at: string;
  created_at: string;
  updated_at: string;
  last_error: string | null;
}

interface OperationalEventRow {
  id: string;
  created_at: string;
  event_type: string;
  severity: string;
  message: string | null;
  action: string | null;
  status_code: number | null;
  duration_ms: number | null;
  provider: string | null;
  state: string | null;
}

interface ProfileRow {
  id: string;
  email: string | null;
  full_name?: string | null;
  display_name?: string | null;
}

const PAGE_SIZE = 12;

const statusBadge: Record<string, string> = {
  charged: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  refunded: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  processing: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  error: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

function titleCase(value: string | null | undefined) {
  return String(value ?? "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function operationLabel(operation: string) {
  switch (operation) {
    case "validate":
      return "NIN Validation";
    case "nin_phone":
      return "NIN Search by Phone";
    case "nin_demo":
      return "NIN Search by Demographics";
    case "nin_advance":
      return "NIN Search by NIN";
    case "bvn_advance":
      return "BVN Verification";
    case "clearance":
      return "IPE Clearance";
    case "personalization":
      return "Personalization";
    case "print_nin_slip_premium":
      return "Print NIN Premium";
    case "print_nin_slip_long":
      return "Print NIN Long";
    default:
      return titleCase(operation);
  }
}

function mapStatusAction(operation: string) {
  switch (operation) {
    case "validate":
      return "validation_status";
    case "clearance":
      return "clearance_status";
    case "personalization":
      return "personalization_status";
    default:
      return null;
  }
}

function buildEmailMap(profiles: ProfileRow[]) {
  return new Map(
    profiles.map((profile) => [
      profile.id,
      {
        email: profile.email || "No email",
        name: profile.display_name || profile.full_name || profile.email || "Unknown user",
      },
    ]),
  );
}

export function ReconciliationOps() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [operationFilter, setOperationFilter] = useState("all");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ["reconciliation-requests", page, search, statusFilter, operationFilter],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = (supabase as any)
        .from("wallet_operation_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (operationFilter !== "all") {
        query = query.eq("operation", operationFilter);
      }

      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        query = query.ilike("request_key", `%${trimmedSearch}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const rows = (data ?? []) as WalletOperationRequest[];
      const userIds = [...new Set(rows.map((row) => row.user_id))];
      const profileMap = new Map<string, { email: string; name: string }>();

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await (supabase as any)
          .from("profiles")
          .select("id, email, full_name, display_name")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        buildEmailMap((profiles ?? []) as ProfileRow[]).forEach((value, key) => {
          profileMap.set(key, value);
        });
      }

      return {
        rows,
        count: count ?? 0,
        profileMap,
      };
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["reconciliation-summary"],
    queryFn: async () => {
      const [
        chargedRes,
        refundedRes,
        pendingJobsRes,
        failedJobsRes,
      ] = await Promise.all([
        (supabase as any).from("wallet_operation_requests").select("id", { count: "exact", head: true }).eq("status", "charged"),
        (supabase as any).from("wallet_operation_requests").select("id", { count: "exact", head: true }).eq("status", "refunded"),
        (supabase as any).from("background_jobs").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
        (supabase as any).from("background_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);

      return {
        charged: chargedRes.count ?? 0,
        refunded: refundedRes.count ?? 0,
        activeJobs: pendingJobsRes.count ?? 0,
        failedJobs: failedJobsRes.count ?? 0,
      };
    },
  });

  const selectedRequest = useMemo(
    () => requestsQuery.data?.rows.find((row) => row.id === selectedRequestId) ?? requestsQuery.data?.rows[0] ?? null,
    [requestsQuery.data?.rows, selectedRequestId],
  );

  useEffect(() => {
    if (!selectedRequestId && requestsQuery.data?.rows?.length) {
      setSelectedRequestId(requestsQuery.data.rows[0].id);
    }
  }, [requestsQuery.data?.rows, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequest) {
      setSelectedRequestId(null);
      return;
    }

    if (selectedRequestId !== selectedRequest.id) {
      setSelectedRequestId(selectedRequest.id);
    }
  }, [selectedRequest, selectedRequestId]);

  const detailQuery = useQuery({
    queryKey: ["reconciliation-detail", selectedRequest?.id],
    enabled: !!selectedRequest,
    queryFn: async () => {
      const request = selectedRequest!;
      const transactionIds = [request.charge_transaction_id, request.refund_transaction_id].filter(Boolean) as string[];
      const statusAction = mapStatusAction(request.operation);

      const [
        transactionsRes,
        eventsRes,
        jobsRes,
        profileRes,
      ] = await Promise.all([
        transactionIds.length > 0
          ? (supabase as any)
              .from("wallet_transactions")
              .select("*")
              .in("id", transactionIds)
          : Promise.resolve({ data: [], error: null }),
        (supabase as any)
          .from("operational_events")
          .select("id, created_at, event_type, severity, message, action, status_code, duration_ms, provider, state")
          .eq("request_id", request.request_key)
          .order("created_at", { ascending: false })
          .limit(8),
        statusAction
          ? (supabase as any)
              .from("background_jobs")
              .select("id, type, status, payload, attempt_count, max_attempts, run_at, created_at, updated_at, last_error")
              .eq("type", "provider_status_poll")
              .eq("payload->>user_id", request.user_id)
              .eq("payload->>action", statusAction)
              .order("created_at", { ascending: false })
              .limit(6)
          : Promise.resolve({ data: [], error: null }),
        (supabase as any)
          .from("profiles")
          .select("id, email, full_name, display_name")
          .eq("id", request.user_id)
          .maybeSingle(),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (jobsRes.error) throw jobsRes.error;
      if (profileRes.error) throw profileRes.error;

      const transactions = (transactionsRes.data ?? []) as WalletTransactionRow[];
      const chargeTx = transactions.find((tx) => tx.id === request.charge_transaction_id) ?? null;
      const refundTx = transactions.find((tx) => tx.id === request.refund_transaction_id) ?? null;

      return {
        chargeTx,
        refundTx,
        events: (eventsRes.data ?? []) as OperationalEventRow[],
        jobs: (jobsRes.data ?? []) as BackgroundJobRow[],
        profile: (profileRes.data as ProfileRow | null) ?? null,
      };
    },
  });

  const totalPages = Math.max(1, Math.ceil((requestsQuery.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Charged requests</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Wallet className="h-5 w-5 text-emerald-500" />
              {summaryQuery.data?.charged ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Refunded requests</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ArrowRightLeft className="h-5 w-5 text-amber-500" />
              {summaryQuery.data?.refunded ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Active polling jobs</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock3 className="h-5 w-5 text-blue-500" />
              {summaryQuery.data?.activeJobs ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Failed jobs</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              {summaryQuery.data?.failedJobs ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Reconciliation Queue</CardTitle>
                <CardDescription>
                  Inspect wallet-backed operations by request key, charge state, and operation type.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                requestsQuery.refetch();
                summaryQuery.refetch();
              }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1.3fr,0.7fr,0.9fr]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setPage(0);
                    setSearch(event.target.value);
                  }}
                  placeholder="Search by request key..."
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setPage(0);
                setStatusFilter(value);
              }}>
                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700">
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="charged">Charged</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={operationFilter} onValueChange={(value) => {
                setPage(0);
                setOperationFilter(value);
              }}>
                <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700">
                  <SelectValue placeholder="All operations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All operations</SelectItem>
                  <SelectItem value="validate">NIN Validation</SelectItem>
                  <SelectItem value="nin_advance">NIN Search by NIN</SelectItem>
                  <SelectItem value="nin_phone">NIN Search by Phone</SelectItem>
                  <SelectItem value="nin_demo">NIN Search by Demographics</SelectItem>
                  <SelectItem value="bvn_advance">BVN Verification</SelectItem>
                  <SelectItem value="clearance">IPE Clearance</SelectItem>
                  <SelectItem value="personalization">Personalization</SelectItem>
                  <SelectItem value="print_nin_slip_premium">Print NIN Premium</SelectItem>
                  <SelectItem value="print_nin_slip_long">Print NIN Long</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requestsQuery.isLoading ? (
              <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading request ledger...</p>
            ) : (requestsQuery.data?.rows.length ?? 0) === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                No wallet-backed requests matched this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {requestsQuery.data?.rows.map((request) => {
                  const profile = requestsQuery.data?.profileMap.get(request.user_id);
                  const isActive = selectedRequest?.id === request.id;

                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => setSelectedRequestId(request.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        isActive
                          ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {operationLabel(request.operation)}
                            </p>
                            <Badge className={statusBadge[request.status] ?? statusBadge.info}>
                              {titleCase(request.status)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {profile?.name ?? "Unknown user"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {profile?.email ?? request.user_id}
                          </p>
                          <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {request.request_key}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatNaira(request.amount)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Page {page + 1} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Request Drilldown</CardTitle>
            <CardDescription>
              Wallet, job, and backend signals for the selected request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedRequest ? (
              <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                Select a request on the left to inspect it.
              </div>
            ) : detailQuery.isLoading ? (
              <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading request detail...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {operationLabel(selectedRequest.operation)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {detailQuery.data?.profile?.display_name ||
                          detailQuery.data?.profile?.full_name ||
                          detailQuery.data?.profile?.email ||
                          selectedRequest.user_id}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {detailQuery.data?.profile?.email || selectedRequest.user_id}
                      </p>
                    </div>
                    <Badge className={statusBadge[selectedRequest.status] ?? statusBadge.info}>
                      {titleCase(selectedRequest.status)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Request ID</p>
                      <p className="mt-1 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
                        {selectedRequest.request_key}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</p>
                      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                        {format(new Date(selectedRequest.created_at), "PPP p")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount charged</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatNaira(selectedRequest.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Wallet position</p>
                      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                        After charge {selectedRequest.balance_after_charge !== null ? formatNaira(selectedRequest.balance_after_charge) : "N/A"}
                        {selectedRequest.balance_after_refund !== null ? ` • After refund ${formatNaira(selectedRequest.balance_after_refund)}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Wallet Transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {detailQuery.data?.chargeTx ? (
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-900 dark:text-slate-100">Charge</p>
                            <Badge className={statusBadge[detailQuery.data.chargeTx.status] ?? statusBadge.info}>
                              {titleCase(detailQuery.data.chargeTx.status)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {detailQuery.data.chargeTx.description || "Wallet deduction"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {format(new Date(detailQuery.data.chargeTx.created_at), "PPP p")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No charge transaction found.</p>
                      )}

                      {detailQuery.data?.refundTx && (
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-900 dark:text-slate-100">Refund</p>
                            <Badge className={statusBadge[detailQuery.data.refundTx.status] ?? statusBadge.info}>
                              {titleCase(detailQuery.data.refundTx.status)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {detailQuery.data.refundTx.description || "Wallet refund"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {format(new Date(detailQuery.data.refundTx.created_at), "PPP p")}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Status Polling Jobs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(detailQuery.data?.jobs.length ?? 0) === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No related background jobs were found for this request.
                        </p>
                      ) : (
                        detailQuery.data?.jobs.map((job) => (
                          <div key={job.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-slate-900 dark:text-slate-100">{titleCase(job.type)}</p>
                              <Badge className={statusBadge[job.status] ?? statusBadge.info}>
                                {titleCase(job.status)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Attempt {job.attempt_count} of {job.max_attempts} • next run {formatDistanceToNow(new Date(job.run_at), { addSuffix: true })}
                            </p>
                            {job.last_error && (
                              <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{job.last_error}</p>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Operational Events</CardTitle>
                    <CardDescription>
                      Events correlated by request ID from the edge functions and worker.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(detailQuery.data?.events.length ?? 0) === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No operational events were recorded for this request key yet.
                      </p>
                    ) : (
                      detailQuery.data?.events.map((event) => (
                        <div key={event.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={statusBadge[event.severity] ?? statusBadge.info}>
                              {titleCase(event.severity)}
                            </Badge>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {titleCase(event.event_type)}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {event.message || "No event message supplied."}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            {event.action && <span>Action: {titleCase(event.action)}</span>}
                            {event.provider && <span>Provider: {titleCase(event.provider)}</span>}
                            {event.state && <span>State: {titleCase(event.state)}</span>}
                            {event.status_code !== null && <span>HTTP {event.status_code}</span>}
                            {event.duration_ms !== null && <span>{event.duration_ms}ms</span>}
                            <span>{format(new Date(event.created_at), "MMM d, HH:mm:ss")}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {selectedRequest.status === "charged" && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
                    This request is still in a charged state. If the provider ultimately failed, check the event trail above for refund activity or missing retries.
                  </div>
                )}
                {selectedRequest.status === "refunded" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    This request has already been refunded. The wallet ledger and request state are now safe to retry with a new request ID if needed.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
