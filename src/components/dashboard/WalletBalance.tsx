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
        <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-[0_16px_44px_rgba(2,6,23,0.4)] sm:p-5">
          <div className="animate-pulse space-y-2.5">
            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-8 w-40 rounded bg-slate-200 dark:bg-slate-700" />
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
        className="w-full rounded-[24px] border border-blue-200/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#2563eb_100%)] p-4 text-left text-white shadow-[0_18px_56px_rgba(37,99,235,0.2)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_22px_68px_rgba(37,99,235,0.26)] dark:border-blue-500/20 sm:p-5"
        title="Wallet Balance — Click to open wallet"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-100/90">
              <Wallet className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em]">{title}</span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight tabular-nums sm:text-4xl">
              {formatNaira(balance)}
            </p>
            <p className="mt-1.5 max-w-xl text-xs text-blue-50/85 sm:text-sm">
              {subtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/95 backdrop-blur sm:self-auto sm:text-sm">
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
