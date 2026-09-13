import { supabase } from "@/integrations/supabase/client";
import { rpcClient } from "@/lib/rpc-client";

export type VtuCategory = "airtime" | "data" | "tv" | "electricity";

export interface VtuProduct {
  id: string;
  category: VtuCategory;
  network: string;
  name: string;
  retail_price: number | null;
  provider?: string;
  provider_plan_id?: string;
  provider_cost?: number | null;
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
  token?: string;
  status?: string;
  normalized?: {
    state?: string;
    message?: string;
    provider_reference?: string;
    request_id?: string;
    charged?: boolean;
  };
}

export function calculateVariableVtuCharge(amount: number, product?: Pick<VtuProduct, "fee_percent" | "fee_flat"> | null) {
  const baseAmount = Number.isFinite(amount) ? amount : 0;
  const feePercent = Number(product?.fee_percent ?? 0);
  const feeFlat = Number(product?.fee_flat ?? 0);
  const feeAmount = Math.max(0, Math.round((feeFlat + (baseAmount * feePercent / 100)) * 100) / 100);
  return {
    faceValue: baseAmount,
    feeAmount,
    chargeAmount: Math.round((baseAmount + feeAmount) * 100) / 100,
  };
}

export function createVtuReference() {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `VTU${Date.now()}${random}`.toUpperCase();
}

export async function listVtuProducts(category: VtuCategory): Promise<VtuProduct[]> {
  if (category === "data") {
    return listLiveDataProducts();
  }

  const { data, error } = await rpcClient.rpc<VtuProduct[]>("list_vtu_products", {
    p_category: category,
  });
  if (error) throw new Error(error.message || "Unable to load available products.");

  return ((data ?? []) as VtuProduct[]).map((product) => ({
    ...product,
    retail_price: product.retail_price === null ? null : Number(product.retail_price),
    provider_cost: product.provider_cost === null || product.provider_cost === undefined ? null : Number(product.provider_cost),
    fee_percent: Number(product.fee_percent ?? 0),
    fee_flat: Number(product.fee_flat ?? 0),
    min_amount: product.min_amount === null ? null : Number(product.min_amount),
    max_amount: product.max_amount === null ? null : Number(product.max_amount),
  }));
}

export async function listLiveDataProducts(): Promise<VtuProduct[]> {
  const { data, error } = await supabase.functions.invoke("robosttech-api", {
    body: { action: "vtu_data_catalog" },
  });

  if (error) throw new Error(error.message || "Unable to load available data bundles.");

  const result = (data ?? {}) as { success?: boolean; message?: string; dataPlans?: VtuProduct[] };
  if (result.success === false) {
    throw new Error(result.message || "Unable to load available data bundles.");
  }

  return (result.dataPlans ?? []).map((product) => ({
    ...product,
    id: String(product.provider_plan_id || product.id),
    category: "data",
    retail_price: product.retail_price === null ? null : Number(product.retail_price),
    provider_cost: product.provider_cost === null || product.provider_cost === undefined ? null : Number(product.provider_cost),
    fee_percent: Number(product.fee_percent ?? 4),
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
  smartcardNumber?: string;
  meterNumber?: string;
  meterType?: "prepaid" | "postpaid";
}): Promise<VtuPurchaseResult> {
  const requestId = createVtuReference();
  const { data, error } = await supabase.functions.invoke("robosttech-api", {
    body: {
      action: input.category === "airtime"
        ? "vtu_airtime"
        : input.category === "data"
        ? "vtu_data"
        : input.category === "tv"
        ? "vtu_tv"
        : "vtu_electricity",
      request_id: requestId,
      ...(input.category === "data" ? { provider_plan_id: input.productId } : { product_id: input.productId }),
      phone: input.phone,
      ...(input.category === "airtime" || input.category === "electricity" ? { amount: input.amount } : {}),
      ...(input.category === "tv" ? { smartcard_number: input.smartcardNumber } : {}),
      ...(input.category === "electricity" ? { meter_number: input.meterNumber, meter_type: input.meterType } : {}),
    },
  });

  if (error) throw new Error(error.message || "Unable to submit this purchase.");
  const result = (data ?? {}) as VtuPurchaseResult;
  const state = result.normalized?.state ?? result.status;
  window.dispatchEvent(new Event("wallet-updated"));

  if (result.success === false || state === "failed" || state === "reversed") {
    const message = result.normalized?.message || result.message || result.response || "The provider declined this purchase.";
    const refundNote = result.normalized?.charged === false
      ? " Your SparklabID wallet was not charged, or it has already been refunded."
      : "";
    throw new Error(`${message}${refundNote}`);
  }

  return result;
}

export async function verifyTvSmartcard(input: {
  provider: string;
  smartcardNumber: string;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("robosttech-api", {
    body: {
      action: "vtu_tv_verify",
      provider: input.provider,
      smartcard_number: input.smartcardNumber,
    },
  });
  if (error) throw new Error(error.message || "Unable to verify this smartcard.");
  return (data ?? {}) as Record<string, unknown>;
}

export async function verifyElectricityMeter(input: {
  disco: string;
  meterNumber: string;
  meterType: "prepaid" | "postpaid";
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("robosttech-api", {
    body: {
      action: "vtu_electricity_verify",
      disco: input.disco,
      meter_number: input.meterNumber,
      meter_type: input.meterType,
    },
  });
  if (error) throw new Error(error.message || "Unable to verify this meter.");
  return (data ?? {}) as Record<string, unknown>;
}
