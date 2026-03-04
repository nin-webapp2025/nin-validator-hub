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
}

export function WalletBalance({ onClick }: WalletBalanceProps) {
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

  if (balance === null) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
      title="Wallet Balance — Click to top up"
    >
      <Wallet className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      <span>{formatNaira(balance)}</span>
    </button>
  );
}
