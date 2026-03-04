/**
 * Wallet utility — check balance, deduct per-operation cost, credit on top-up.
 * All amounts are in Naira (₦).
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Pricing per operation (Naira) ───────────────────────────
export const OPERATION_PRICES: Record<string, number> = {
  nin_validation: 5000,
  bvn_verification: 800,
  nin_verification: 800,
  print_nin_slip: 800,
  clearance: 3000,
  personalization: 1500,
};

export const OPERATION_LABELS: Record<string, string> = {
  nin_validation: "NIN Validation",
  bvn_verification: "BVN Verification",
  nin_verification: "NIN Verification",
  print_nin_slip: "Print NIN Slip",
  clearance: "Clearance",
  personalization: "Personalization",
};

// ─── Get wallet balance ──────────────────────────────────────
export async function getWalletBalance(userId: string): Promise<number> {
  const { data } = await (supabase as any)
    .from("wallet_balances")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (!data) {
    // Auto-provision wallet row if missing
    await (supabase as any)
      .from("wallet_balances")
      .insert({ user_id: userId, balance: 0, total_deposited: 0, total_spent: 0 });
    return 0;
  }

  return Number(data.balance);
}

// ─── Deduct from wallet ──────────────────────────────────────
export async function deductWallet(
  userId: string,
  operation: string
): Promise<{ success: boolean; balance: number; message?: string }> {
  const price = OPERATION_PRICES[operation];
  if (!price) return { success: false, balance: 0, message: "Unknown operation." };

  const currentBalance = await getWalletBalance(userId);
  if (currentBalance < price) {
    return {
      success: false,
      balance: currentBalance,
      message: `Insufficient balance. This operation costs ₦${price.toLocaleString()} but your wallet has ₦${currentBalance.toLocaleString()}.`,
    };
  }

  // Deduct
  const newBalance = currentBalance - price;
  const { error } = await (supabase as any)
    .from("wallet_balances")
    .update({
      balance: newBalance,
      total_spent: currentBalance - newBalance + (await getTotalSpent(userId)),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Wallet deduction error:", error);
    return { success: false, balance: currentBalance, message: "Failed to deduct from wallet." };
  }

  // Record transaction
  await (supabase as any).from("wallet_transactions").insert({
    user_id: userId,
    type: "deduction",
    amount: price,
    description: `${OPERATION_LABELS[operation] || operation} — ₦${price.toLocaleString()}`,
    operation,
    status: "success",
  });

  // Emit event so UI components update
  window.dispatchEvent(new Event("wallet-updated"));

  return { success: true, balance: newBalance };
}

// ─── Credit wallet (after Paystack payment verified) ─────────
export async function creditWallet(
  userId: string,
  amount: number,
  reference: string
): Promise<{ success: boolean; balance: number }> {
  // Check if this reference was already processed
  const { data: existing } = await (supabase as any)
    .from("wallet_transactions")
    .select("id")
    .eq("reference", reference)
    .single();

  if (existing) {
    // Already credited — idempotent
    const balance = await getWalletBalance(userId);
    return { success: true, balance };
  }

  const currentBalance = await getWalletBalance(userId);
  const newBalance = currentBalance + amount;

  const { error } = await (supabase as any)
    .from("wallet_balances")
    .update({
      balance: newBalance,
      total_deposited: (await getTotalDeposited(userId)) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Wallet credit error:", error);
    return { success: false, balance: currentBalance };
  }

  // Record transaction
  await (supabase as any).from("wallet_transactions").insert({
    user_id: userId,
    type: "top_up",
    amount,
    description: `Wallet top-up — ₦${amount.toLocaleString()}`,
    reference,
    status: "success",
  });

  window.dispatchEvent(new Event("wallet-updated"));

  return { success: true, balance: newBalance };
}

// ─── Helpers ─────────────────────────────────────────────────
async function getTotalSpent(userId: string): Promise<number> {
  const { data } = await (supabase as any)
    .from("wallet_balances")
    .select("total_spent")
    .eq("user_id", userId)
    .single();
  return Number(data?.total_spent ?? 0);
}

async function getTotalDeposited(userId: string): Promise<number> {
  const { data } = await (supabase as any)
    .from("wallet_balances")
    .select("total_deposited")
    .eq("user_id", userId)
    .single();
  return Number(data?.total_deposited ?? 0);
}

// ─── Format currency ─────────────────────────────────────────
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
