/**
 * RecentActivityPreview — the last few wallet transactions, glanceable
 * straight from the dashboard home instead of buried on the wallet page.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/wallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "top_up" | "deduction";
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

const PREVIEW_SIZE = 4;

export function RecentActivityPreview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);

  const fetchRecent = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any)
      .from("wallet_transactions")
      .select("id, type, amount, description, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PREVIEW_SIZE);
    setTransactions((data || []) as Transaction[]);
  }, [user?.id]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  useEffect(() => {
    const handler = () => fetchRecent();
    window.addEventListener("wallet-updated", handler);
    return () => window.removeEventListener("wallet-updated", handler);
  }, [fetchRecent]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
          <Receipt className="h-4 w-4 text-primary" />
          Recent activity
        </CardTitle>
        <button
          type="button"
          onClick={() => navigate("/dashboard/user/wallet")}
          className="text-xs font-semibold text-primary hover:underline"
        >
          View all
        </button>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {transactions === null ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            No activity yet. Fund your wallet to get started.
          </p>
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.type === "top_up";
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isCredit
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                  )}
                >
                  {isCredit ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {tx.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(tx.created_at)}</p>
                </div>
                <p
                  className={cn(
                    "shrink-0 font-mono text-sm font-semibold tabular-nums",
                    isCredit ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300",
                  )}
                >
                  {isCredit ? "+" : "-"}
                  {formatNaira(tx.amount)}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
