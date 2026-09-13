import type {
  ProviderAdapter,
  ProviderHelpers,
  ProviderRequestBody,
  ProviderResult,
} from "./types.ts";

const IKONECT_API_URL = "https://ikonect.com.ng/api/v1";
const DATA_MARKUP_MULTIPLIER = 1.04;
const SUPPORTED_ACTIONS = new Set([
  "vtu_airtime",
  "vtu_data",
  "vtu_data_catalog",
  "vtu_tv",
  "vtu_tv_verify",
  "vtu_electricity",
  "vtu_electricity_verify",
]);

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstStringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function extractElectricityToken(source: Record<string, unknown>) {
  const nested = asObject(source.data);
  return firstStringValue(
    source.token,
    source.electricity_token,
    source.meter_token,
    source.recharge_token,
    source.token_value,
    nested.token,
    nested.electricity_token,
    nested.meter_token,
    nested.recharge_token,
    nested.token_value,
  );
}

function normalizeToken(value: unknown) {
  return firstStringValue(value).toLowerCase().replace(/\s+/g, "");
}

function normalizeNetwork(value: unknown) {
  const raw = normalizeToken(value);
  if (raw === "9mobile" || raw === "etisalat") return "9mobile";
  return raw;
}

function displayNetwork(value: unknown) {
  const normalized = normalizeNetwork(value);
  if (normalized === "mtn") return "MTN";
  if (normalized === "airtel") return "Airtel";
  if (normalized === "glo") return "Glo";
  if (normalized === "9mobile") return "9mobile";
  return firstStringValue(value) || normalized;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function providerHeaders(apiKey: string, apiSecret?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
    "Token": apiKey,
  };

  if (apiSecret) {
    headers["X-API-Secret"] = apiSecret;
    headers["API-Secret"] = apiSecret;
  }

  return headers;
}

function catalogUrl(body: ProviderRequestBody) {
  const url = new URL(`${IKONECT_API_URL}/dataplans/`);
  const network = normalizeNetwork(body.provider_network || body.network);
  const category = firstStringValue(body.category, body.data_type);

  if (network) url.searchParams.set("network", network);
  if (category) url.searchParams.set("category", category);

  return url.toString();
}

function requestFor(action: string, body: ProviderRequestBody) {
  const network = normalizeNetwork(body.provider_network || body.network);
  const amount = Number(body.provider_amount ?? body.amount);

  switch (action) {
    case "vtu_airtime":
      return {
        path: "/airtime/",
        payload: {
          network,
          phone: firstStringValue(body.phone),
          amount,
          airtime_type: firstStringValue(body.airtime_type) || "VTU",
        },
      };
    case "vtu_data":
      return {
        path: "/data/",
        payload: {
          network,
          phone: firstStringValue(body.phone),
          data_plan: firstStringValue(body.provider_plan_id),
        },
      };
    case "vtu_tv":
      return {
        path: "/tv/",
        payload: {
          provider: normalizeNetwork(body.provider_network || body.provider_code || body.provider),
          smartcard_number: firstStringValue(body.smartcard_number),
          plan_id: Number(firstStringValue(body.provider_plan_id)),
          phone: firstStringValue(body.phone),
        },
      };
    case "vtu_tv_verify":
      return {
        path: "/tv/verify",
        payload: {
          provider: normalizeNetwork(body.provider_code || body.provider || body.network),
          smartcard_number: firstStringValue(body.smartcard_number),
        },
      };
    case "vtu_electricity":
      return {
        path: "/electricity/",
        payload: {
          disco: normalizeNetwork(body.provider_network || body.disco || body.network),
          meter_number: firstStringValue(body.meter_number),
          amount,
          phone: firstStringValue(body.phone),
          meter_type: normalizeToken(body.meter_type),
        },
      };
    case "vtu_electricity_verify":
      return {
        path: "/electricity/verify",
        payload: {
          disco: normalizeNetwork(body.disco || body.network),
          meter_number: firstStringValue(body.meter_number),
          meter_type: normalizeToken(body.meter_type),
        },
      };
    default:
      return { path: "/", payload: {} };
  }
}

function normalizeDataCatalog(payload: unknown, httpOk: boolean) {
  const source = asObject(payload);
  const rawPlans = Array.isArray(source.dataPlans)
    ? source.dataPlans
    : Array.isArray(source.data)
    ? source.data
    : Array.isArray(source.plans)
    ? source.plans
    : [];

  const dataPlans = rawPlans
    .map((item) => {
      const plan = asObject(item);
      const providerPlanId = firstStringValue(plan.serviceID, plan.serviceId, plan.id, plan.plan_id);
      const providerCost = Number(plan.amount ?? plan.price ?? plan.cost);
      const name = firstStringValue(plan.dataPlan, plan.name, plan.plan);
      const validity = firstStringValue(plan.validity);
      const dataType = firstStringValue(plan.dataType, plan.type, plan.category);

      if (!providerPlanId || !Number.isFinite(providerCost) || providerCost <= 0 || !name) {
        return null;
      }

      const retailPrice = roundMoney(providerCost * DATA_MARKUP_MULTIPLIER);

      return {
        id: providerPlanId,
        category: "data",
        network: displayNetwork(plan.network),
        name: validity ? `${name} (${validity})` : name,
        retail_price: retailPrice,
        provider: "ikonect",
        provider_plan_id: providerPlanId,
        provider_cost: roundMoney(providerCost),
        fee_percent: 4,
        fee_flat: 0,
        min_amount: null,
        max_amount: null,
        data_type: dataType || undefined,
        validity: validity || undefined,
      };
    })
    .filter(Boolean);

  return {
    success: httpOk && source.success !== false,
    message: firstStringValue(source.message, `${dataPlans.length} data plans loaded.`),
    dataPlans,
    provider_state: httpOk && source.success !== false ? "succeeded" : "failed",
  };
}

function providerState(payload: unknown, httpOk: boolean) {
  const source = asObject(payload);
  const status = String(source.status ?? "").trim().toLowerCase();
  const success = source.success;
  const message = String(source.message ?? source.response ?? source.error ?? "").toLowerCase();

  if (!httpOk || success === false || status === "failed" || message.includes("failed")) {
    return "failed";
  }
  if (status === "pending" || message.includes("pending") || message.includes("processing")) {
    return "pending";
  }
  if (success === true || status === "success" || status === "successful" || source.verified === true) {
    return "succeeded";
  }
  return "unknown";
}

function normalizeResponse(payload: unknown, httpOk: boolean, fallbackReference: string) {
  const source = asObject(payload);
  const state = providerState(source, httpOk);
  const providerReference = firstStringValue(
    source.reference,
    source.ref,
    source.transaction_id,
    source.transactionId,
    source.order_id,
    source.request_id,
    fallbackReference,
  );

  return {
    ...source,
    success: state === "succeeded" || state === "pending",
    message: firstStringValue(source.message, source.response, source.error, "Ikonect request completed."),
    token: extractElectricityToken(source) || undefined,
    provider_reference: providerReference || undefined,
    provider_state: state,
  };
}

function resultStatus(httpOk: boolean, state: string) {
  if (!httpOk) return 502;
  if (state === "succeeded") return 200;
  if (state === "pending") return 202;
  if (state === "failed") return 422;
  return 202;
}

export const ikonectAdapter: ProviderAdapter = {
  name: "ikonect",
  supports: (action) => SUPPORTED_ACTIONS.has(action),
  execute: async (action, body, helpers: ProviderHelpers): Promise<ProviderResult> => {
    const apiKey = Deno.env.get("IKONECT_API_KEY")?.trim();
    const apiSecret = Deno.env.get("IKONECT_API_SECRET")?.trim();

    if (!apiKey) {
      return {
        status: 503,
        ok: false,
        body: { success: false, error: "Ikonect provider is not configured.", provider_state: "failed" },
        provider: "ikonect",
      };
    }

    const request = requestFor(action, body);
    if (action === "vtu_data_catalog") {
      const upstream = await helpers.callGetUpstream(
        catalogUrl(body),
        providerHeaders(apiKey, apiSecret),
      );
      const normalized = normalizeDataCatalog(upstream.data, upstream.response.ok);
      const state = String(normalized.provider_state);

      return {
        status: resultStatus(upstream.response.ok, state),
        ok: upstream.response.ok && state === "succeeded",
        body: normalized,
        provider: "ikonect",
      };
    }

    const upstream = await helpers.callUpstream(
      `${IKONECT_API_URL}${request.path}`,
      providerHeaders(apiKey, apiSecret),
      request.payload,
    );
    const normalized = normalizeResponse(
      upstream.data,
      upstream.response.ok,
      firstStringValue(body.provider_reference, body.request_id),
    );
    const state = String(normalized.provider_state);

    return {
      status: resultStatus(upstream.response.ok, state),
      ok: upstream.response.ok && (state === "succeeded" || state === "pending"),
      body: normalized,
      provider: "ikonect",
    };
  },
};
