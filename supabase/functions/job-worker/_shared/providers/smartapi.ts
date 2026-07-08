import type {
  ProviderAdapter,
  ProviderHelpers,
  ProviderRequestBody,
  ProviderResult,
} from "./types.ts";

const SMART_API_BASE_URL = "https://sabuss.com/vtu/api";
const SUPPORTED_ACTIONS = new Set(["vtu_airtime", "vtu_data", "vtu_query"]);

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeResponse(payload: unknown) {
  const source = asObject(payload);
  const code = String(source.code ?? "").trim();
  const status = String(source.status ?? "").trim().toLowerCase();
  const state = code === "200" || status === "success"
    ? "succeeded"
    : code === "400" || status === "pending"
    ? "pending"
    : code === "900" || status === "reversed"
    ? "reversed"
    : code === "800" || status === "failed"
    ? "failed"
    : "unknown";

  return {
    ...source,
    success: state === "succeeded" || state === "pending",
    message: String(source.response ?? source.message ?? "Smart API request completed."),
    provider_reference: String(source.reference ?? "").trim() || undefined,
    provider_state: state,
  };
}

function resultStatus(httpOk: boolean, state: string) {
  if (!httpOk) return 502;
  if (state === "succeeded") return 200;
  if (state === "pending") return 202;
  if (state === "reversed") return 409;
  if (state === "failed") return 422;
  return 502;
}

async function execute(
  action: string,
  body: ProviderRequestBody,
  helpers: ProviderHelpers,
): Promise<ProviderResult> {
  const apiKey = Deno.env.get("SMARTAPI_API_KEY")?.trim();
  const pin = Deno.env.get("SMARTAPI_PIN")?.trim();

  if (!apiKey || !pin) {
    return {
      status: 503,
      ok: false,
      body: { success: false, error: "Smart API provider is not configured.", provider_state: "failed" },
      provider: "smartapi",
    };
  }

  const reference = String(body.provider_reference ?? body.request_id ?? "").trim();
  const path = action === "vtu_query" ? "query" : "buy";
  const fields: Record<string, string> = { pin };

  if (action === "vtu_query") {
    fields.reference = reference;
  } else {
    fields.plan_id = String(body.provider_plan_id ?? "").trim();
    fields.phone = String(body.phone ?? "").trim();
    fields.reference = reference;

    if (action === "vtu_airtime") {
      fields.amount = String(body.provider_amount ?? body.amount ?? "").trim();
    }
  }

  const upstream = await helpers.callFormUpstream(
    `${SMART_API_BASE_URL}/${path}/${encodeURIComponent(apiKey)}`,
    fields,
  );
  const normalized = normalizeResponse(upstream.data);
  const state = String(normalized.provider_state);
  const status = resultStatus(upstream.response.ok, state);

  return {
    status,
    ok: upstream.response.ok && (state === "succeeded" || state === "pending"),
    body: normalized,
    provider: "smartapi",
  };
}

export const smartApiAdapter: ProviderAdapter = {
  name: "smartapi",
  supports: (action) => SUPPORTED_ACTIONS.has(action),
  execute,
};
