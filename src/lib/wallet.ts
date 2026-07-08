/**
 * Wallet utilities.
 * Browser code may read wallet state and request a server-side deduction,
 * but credits and refunds are restricted to trusted server flows.
 */
import { rpcClient } from "@/lib/rpc-client";
import {
  DASHBOARD_OPERATION_LABELS,
  DASHBOARD_OPERATION_PRICES,
} from "../../shared/pricing";

export const OPERATION_PRICES = DASHBOARD_OPERATION_PRICES;
export const OPERATION_LABELS = DASHBOARD_OPERATION_LABELS;

export async function getWalletBalance(userId: string): Promise<number> {
  const { data, error } = await rpcClient.rpc<number>("wallet_get_balance", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Wallet balance fetch error:", error);
    return 0;
  }

  return Number(data ?? 0);
}
export async function deductWallet(
  userId: string,
  operation: string,
  requestKey: string,
): Promise<{ success: boolean; balance: number; message?: string }> {
  const { data, error } = await rpcClient.rpc<{ success?: boolean; balance?: number; message?: string }>("wallet_charge_operation", {
    p_user_id: userId,
    p_operation: operation,
    p_request_key: requestKey,
  });

  if (error) {
    console.error("Wallet deduction error:", error);
    return {
      success: false,
      balance: 0,
      message: "Failed to deduct from wallet.",
    };
  }

  if (data?.success) {
    window.dispatchEvent(new Event("wallet-updated"));
  }

  return {
    success: !!data?.success,
    balance: Number(data?.balance ?? 0),
    message: data?.message,
  };
}

export async function creditWallet(
  _userId: string,
  _amount: number,
  _reference: string,
): Promise<{ success: boolean; balance: number; message?: string }> {
  return {
    success: false,
    balance: 0,
    message: "Client-side wallet credit is disabled. Use the verified payment flow.",
  };
}

export async function refundWallet(
  userId: string,
  operation: string,
  requestKey?: string,
): Promise<void> {
  const { data, error } = await rpcClient.rpc<{ success?: boolean }>("wallet_refund_operation", {
    p_user_id: userId,
    p_operation: operation,
    p_reason: "manual client refund",
    p_request_key: requestKey ?? null,
  });

  if (error) {
    console.error("Wallet refund error:", error);
    return;
  }

  if (data?.success) {
    window.dispatchEvent(new Event("wallet-updated"));
  }
}

export function formatNaira(amount: number): string {
  return `NGN ${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
