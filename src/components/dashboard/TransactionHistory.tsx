/**
 * TransactionHistory — shows wallet top-ups and deductions.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/wallet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Clock, ChevronLeft, ChevronRight, Receipt } from "lucide-react";

interface Transaction {
  id: string;
  type: "top_up" | "deduction";
  amount: number;
  description: string;
  reference: string | null;
  operation: string | null;
  status: string;
  created_at: string;
}

const PAGE_SIZE = 10;

export function TransactionHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await (supabase as any)
      .from("wallet_transactions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    setTransactions((data || []) as Transaction[]);
    setTotal(count || 0);
    setLoading(false);
  }, [user?.id, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Refresh on wallet-updated
  useEffect(() => {
    const handler = () => fetchTransactions();
    window.addEventListener("wallet-updated", handler);
    return () => window.removeEventListener("wallet-updated", handler);
  }, [fetchTransactions]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-purple-600" />
          Transaction History
        </CardTitle>
        <CardDescription>
          {total > 0 ? `${total} transaction${total !== 1 ? "s" : ""}` : "Your wallet transactions will appear here."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="h-5 w-5 animate-pulse text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Fund your wallet to get started.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200/80 dark:border-slate-700/80 p-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  {/* Icon */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      tx.type === "top_up"
                        ? "bg-green-100 dark:bg-green-900/40"
                        : "bg-red-100 dark:bg-red-900/40"
                    }`}
                  >
                    {tx.type === "top_up" ? (
                      <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {tx.description || (tx.type === "top_up" ? "Wallet Top-up" : "Deduction")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(tx.created_at)}
                      {tx.reference && <span className="ml-2 opacity-60">Ref: {tx.reference}</span>}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        tx.type === "top_up"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {tx.type === "top_up" ? "+" : "−"}{formatNaira(tx.amount)}
                    </p>
                    <Badge
                      variant={tx.status === "success" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3 w-3" />
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
