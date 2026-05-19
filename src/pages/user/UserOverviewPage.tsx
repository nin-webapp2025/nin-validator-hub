import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, CreditCard, Key, Search, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { WalletBalance } from "@/components/dashboard/WalletBalance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, getWalletBalance } from "@/lib/wallet";
import { USER_NAV_GROUPS } from "@/components/dashboard/userAppNavigation";

interface OverviewState {
  balance: number;
  transactionCount: number;
  validationCount: number;
  bvnCount: number;
  recentTransactions: Array<{
    id: string;
    type: "top_up" | "deduction";
    amount: number;
    description: string;
    created_at: string;
    status: string;
  }>;
  recentVerifications: Array<{
    id: string;
    kind: string;
    status: string;
    created_at: string;
    reference: string;
  }>;
  lastWorkflow: {
    label: string;
    path: string;
    createdAt: string;
    status: string;
  } | null;
}

const QUICK_ACTION_PATHS = [
  "/dashboard/user/nin-validation",
  "/dashboard/user/nin-search",
  "/dashboard/user/bvn",
  "/dashboard/user/wallet",
  "/dashboard/user/api-keys",
];

const workflowRoutes: Record<string, { label: string; path: string }> = {
  validation: { label: "NIN Validation", path: "/dashboard/user/nin-validation" },
  bvn: { label: "BVN Verification", path: "/dashboard/user/bvn" },
  clearance: { label: "Clearance", path: "/dashboard/user/clearance" },
  personalization: { label: "Personalization", path: "/dashboard/user/personalization" },
};

export default function UserOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<OverviewState>({
    balance: 0,
    transactionCount: 0,
    validationCount: 0,
    bvnCount: 0,
    recentTransactions: [],
    recentVerifications: [],
    lastWorkflow: null,
  });

  const quickActions = useMemo(
    () =>
      USER_NAV_GROUPS.flatMap((group) => group.items).filter((item) =>
        QUICK_ACTION_PATHS.includes(item.path),
      ),
    [],
  );

  useEffect(() => {
    async function loadOverview() {
      if (!user?.id) return;

      setLoading(true);

      const balance = await getWalletBalance(user.id);

      const [
        transactionsResult,
        validationCountResult,
        bvnCountResult,
        validationHistoryResult,
        bvnHistoryResult,
        clearanceHistoryResult,
        personalizationHistoryResult,
      ] = await Promise.all([
        (supabase as any)
          .from("wallet_transactions")
          .select("id,type,amount,description,created_at,status", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4),
        (supabase as any)
          .from("validation_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        (supabase as any)
          .from("bvn_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        (supabase as any)
          .from("validation_history")
          .select("id,status,created_at,nin")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
        (supabase as any)
          .from("bvn_history")
          .select("id,status,created_at,bvn")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
        (supabase as any)
          .from("clearance_history")
          .select("id,created_at,response")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        (supabase as any)
          .from("personalization_history")
          .select("id,created_at,status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const recentVerifications = [
        ...((validationHistoryResult.data || []) as any[]).map((item) => ({
          id: item.id,
          kind: "NIN Validation",
          status: item.status,
          created_at: item.created_at,
          reference: item.nin,
        })),
        ...((bvnHistoryResult.data || []) as any[]).map((item) => ({
          id: item.id,
          kind: "BVN Verification",
          status: item.status,
          created_at: item.created_at,
          reference: item.bvn,
        })),
      ]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 4);

      const latestWorkflowCandidates = [
        ...((validationHistoryResult.data || []) as any[]).slice(0, 1).map((item) => ({
          kind: "validation",
          createdAt: item.created_at,
          status: item.status,
        })),
        ...((bvnHistoryResult.data || []) as any[]).slice(0, 1).map((item) => ({
          kind: "bvn",
          createdAt: item.created_at,
          status: item.status,
        })),
        ...((clearanceHistoryResult.data || []) as any[]).map((item) => ({
          kind: "clearance",
          createdAt: item.created_at,
          status: item.response?.status || item.response?.message || "submitted",
        })),
        ...((personalizationHistoryResult.data || []) as any[]).map((item) => ({
          kind: "personalization",
          createdAt: item.created_at,
          status: item.status,
        })),
      ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

      const latest = latestWorkflowCandidates[0];

      setState({
        balance,
        transactionCount: transactionsResult.count || 0,
        validationCount: validationCountResult.count || 0,
        bvnCount: bvnCountResult.count || 0,
        recentTransactions: (transactionsResult.data || []) as OverviewState["recentTransactions"],
        recentVerifications,
        lastWorkflow: latest
          ? {
              label: workflowRoutes[latest.kind].label,
              path: workflowRoutes[latest.kind].path,
              createdAt: latest.createdAt,
              status: latest.status,
            }
          : null,
      });

      setLoading(false);
    }

    loadOverview();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <WalletBalance
        variant="hero"
        onClick={() => navigate("/dashboard/user/wallet")}
        title="Wallet Balance"
        subtitle="Your funded wallet powers verification, fulfillment, printing, and upcoming fintech purchases from one clean workspace."
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Overview
            </p>
            <CardTitle className="text-2xl text-slate-900 dark:text-slate-100">
              Your fintech-style command center
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              This home screen keeps your money, services, and recent identity activity in one place so you can move through the app like a real financial workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewMetric
              icon={Wallet}
              label="Available Balance"
              value={formatNaira(state.balance)}
              accent="text-blue-600 dark:text-blue-400"
            />
            <OverviewMetric
              icon={CreditCard}
              label="Wallet Transactions"
              value={String(state.transactionCount)}
              accent="text-emerald-600 dark:text-emerald-400"
            />
            <OverviewMetric
              icon={Search}
              label="NIN Validations"
              value={String(state.validationCount)}
              accent="text-violet-600 dark:text-violet-400"
            />
            <OverviewMetric
              icon={ShieldCheck}
              label="BVN Checks"
              value={String(state.bvnCount)}
              accent="text-amber-600 dark:text-amber-400"
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Continue
            </p>
            <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
              Pick up your latest workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.lastWorkflow ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                <Badge className="bg-blue-600">{state.lastWorkflow.status}</Badge>
                <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {state.lastWorkflow.label}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Last touched {new Date(state.lastWorkflow.createdAt).toLocaleString("en-NG", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <Button
                  type="button"
                  className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate(state.lastWorkflow.path)}
                >
                  Continue journey
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                No recent workflow yet. Start with a NIN search, a verification request, or a wallet top-up.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                Quick actions
              </CardTitle>
              <CardDescription>
                Jump straight into the pages users reach for most.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard/user/wallet")}>
              Fund wallet
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-blue-500/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {action.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
              Account shortcuts
            </CardTitle>
            <CardDescription>
              Access money, integrations, and profile settings fast.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ShortcutButton
              icon={Wallet}
              label="Wallet top-up"
              description="Move to funding and transaction history."
              onClick={() => navigate("/dashboard/user/wallet")}
            />
            <ShortcutButton
              icon={Key}
              label="API keys"
              description="Manage developer access and usage."
              onClick={() => navigate("/dashboard/user/api-keys")}
            />
            <ShortcutButton
              icon={Sparkles}
              label="Profile and activity"
              description="Review account information and totals."
              onClick={() => navigate("/dashboard/user/profile")}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
              Recent transactions
            </CardTitle>
            <CardDescription>
              Your latest wallet movement across funding and deductions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading recent transactions...</p>
            ) : state.recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No wallet activity yet. Fund your wallet to start using services.
              </p>
            ) : (
              <div className="space-y-3">
                {state.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(transaction.created_at).toLocaleString("en-NG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {transaction.type === "top_up" ? "+" : "-"}
                        {formatNaira(transaction.amount)}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
              Verification snapshot
            </CardTitle>
            <CardDescription>
              Your most recent NIN and BVN verification activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading verification summary...</p>
            ) : state.recentVerifications.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No verification history yet. Start with a NIN validation or BVN check.
              </p>
            ) : (
              <div className="space-y-3">
                {state.recentVerifications.map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.kind}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Ref: {item.reference}
                        </p>
                      </div>
                      <Badge variant={item.status === "success" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleString("en-NG", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
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

function OverviewMetric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function ShortcutButton({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: typeof Wallet;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70"
    >
      <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </button>
  );
}
