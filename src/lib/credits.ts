import { supabase } from "@/integrations/supabase/client";

/**
 * Utility: check if user has credits, deduct 1 if so.
 * Returns { success, balance } indicating whether deduction succeeded.
 */
export async function deductCredit(userId: string): Promise<{ success: boolean; balance: number }> {
  // Fetch current
  const { data } = await (supabase as any)
    .from("user_credits")
    .select("balance, total_used")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data || data.balance <= 0) {
    return { success: false, balance: data?.balance ?? 0 };
  }

  const newBalance = data.balance - 1;
  const newUsed = (data.total_used ?? 0) + 1;

  await (supabase as any)
    .from("user_credits")
    .update({ balance: newBalance, total_used: newUsed, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  // Notify UI to refresh
  window.dispatchEvent(new Event("credits-updated"));

  return { success: true, balance: newBalance };
}
