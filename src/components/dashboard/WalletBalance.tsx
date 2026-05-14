/**
 * WalletBalance — small inline display of wallet balance.
 * Shown in the DashboardHeader next to the notification bell.
 */
import { useState, useEffect, useCallback } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getWalletBalance, formatNaira } from "@/lib/wallet";

interface WalletBalanceProps {
  onClick?: () => void;
  variant?: "inline" | "hero";
  title?: string;
  subtitle?: string;
}

export function WalletBalance({
  onClick,
  variant = "inline",
  title = "Available Balance",
  subtitle = "Ready for identity verification, fulfillment, and API usage.",
}: WalletBalanceProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!user?.id) return;
    const b = await getWalletBalance(user.id);
    setBalance(b);
  }, [user?.id]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Listen for wallet-updated events
  useEffect(() => {
    const handler = () => fetchBalance();
    window.addEventListener("wallet-updated", handler);
    return () => window.removeEventListener("wallet-updated", handler);
  }, [fetchBalance]);

  if (balance === null) {
    if (variant === "hero") {
      return (
        <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)] sm:p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-48 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-64 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      );
    }

    return null;
  }

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-[28px] border border-emerald-200/70 bg-[linear-gradient(135deg,#082f49_0%,#0f766e_42%,#10b981_100%)] p-5 text-left text-white shadow-[0_24px_80px_rgba(5,150,105,0.28)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_28px_90px_rgba(5,150,105,0.34)] dark:border-emerald-500/20 sm:p-6"
        title="Wallet Balance — Click to open wallet"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-100/90">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em]">{title}</span>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight tabular-nums sm:text-5xl">
              {formatNaira(balance)}
            </p>
            <p className="mt-2 max-w-xl text-sm text-emerald-50/85 sm:text-base">
              {subtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white/95 backdrop-blur sm:self-auto">
            <span>Open wallet</span>
            <span aria-hidden="true">→</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[7rem] shrink-0"
      title="Wallet Balance — Click to top up"
    >
      <Wallet className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
      <span className="truncate tabular-nums">{formatNaira(balance)}</span>
    </button>
  );
}
