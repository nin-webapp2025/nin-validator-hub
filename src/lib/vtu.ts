import { supabase } from "@/integrations/supabase/client";
import { rpcClient } from "@/lib/rpc-client";

export type VtuCategory = "airtime" | "data";

export interface VtuProduct {
  id: string;
  category: VtuCategory;
  network: string;
  name: string;
  retail_price: number | null;
  fee_percent: number;
  fee_flat: number;
  min_amount: number | null;
  max_amount: number | null;
}

export interface VtuPurchaseResult {
  success: boolean;
  message?: string;
  response?: string;
  reference?: string;
  status?: string;
  normalized?: {
    state?: string;
    message?: string;
    provider_reference?: string;
    charged?: boolean;
  };
}

export function createVtuReference() {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replaceAll("-", "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `VTU${Date.now()}${random}`.toUpperCase();
}

export async function listVtuProducts(category: VtuCategory): Promise<VtuProduct[]> {
  const { data, error } = await rpcClient.rpc<VtuProduct[]>("list_vtu_products", {
    p_category: category,
  });
  if (error) throw new Error(error.message || "Unable to load available products.");

  return ((data ?? []) as VtuProduct[]).map((product) => ({
    ...product,
    retail_price: product.retail_price === null ? null : Number(product.retail_price),
    fee_percent: Number(product.fee_percent ?? 0),
    fee_flat: Number(product.fee_flat ?? 0),
    min_amount: product.min_amount === null ? null : Number(product.min_amount),
    max_amount: product.max_amount === null ? null : Number(product.max_amount),
  }));
}

export async function purchaseVtu(input: {
  category: VtuCategory;
  productId: string;
  phone: string;
  amount?: number;
}): Promise<VtuPurchaseResult> {
  const requestId = createVtuReference();
  const { data, error } = await supabase.functions.invoke("robosttech-api", {
    body: {
      action: input.category === "airtime" ? "vtu_airtime" : "vtu_data",
      request_id: requestId,
      product_id: input.productId,
      phone: input.phone,
      ...(input.category === "airtime" ? { amount: input.amount } : {}),
    },
  });

  if (error) throw new Error(error.message || "Unable to submit this purchase.");
  const result = (data ?? {}) as VtuPurchaseResult;
  const state = result.normalized?.state ?? result.status;
  window.dispatchEvent(new Event("wallet-updated"));

  if (result.success === false || state === "failed" || state === "reversed") {
    throw new Error(
      result.normalized?.message || result.message || result.response || "The provider declined this purchase.",
    );
  }

  return result;
}
