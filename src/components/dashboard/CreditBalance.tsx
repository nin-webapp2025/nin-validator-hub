import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingDown, Loader2, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CreditData {
  balance: number;
  total_used: number;
}

/**
 * Displays the current user's credit balance.
 * Also exports a helper to check + deduct credits from other components.
 */
export function CreditBalance() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_credits")
      .select("balance, total_used")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setCredits(data as CreditData);
    } else {
      // Provision on-the-fly if missing
      await (supabase as any)
        .from("user_credits")
        .insert({ user_id: user.id, balance: 10, total_used: 0 });
      setCredits({ balance: 10, total_used: 0 });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Listen for custom event from ValidationForm/BvnVerification to refresh
  useEffect(() => {
    const handler = () => fetchCredits();
    window.addEventListener("credits-updated", handler);
    return () => window.removeEventListener("credits-updated", handler);
  }, [fetchCredits]);

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const balance = credits?.balance ?? 0;
  const isLow = balance <= 3;

  return (
    <Card className={`shadow-card ${isLow ? "border-amber-300 dark:border-amber-700" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-5 w-5 text-amber-500" />
          API Credits
        </CardTitle>
        <CardDescription>Each verification uses 1 credit</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div>
            <p className={`text-3xl font-bold ${isLow ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
              {balance}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">credits remaining</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <TrendingDown className="h-4 w-4" />
            <span>{credits?.total_used ?? 0} used total</span>
          </div>
        </div>
        {isLow && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Low credit balance. Contact an admin to add more credits.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


