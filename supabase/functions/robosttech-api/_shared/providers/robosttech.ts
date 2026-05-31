import type {
  ProviderAdapter,
  ProviderHelpers,
  ProviderRequestBody,
  ProviderResult,
} from "./types.ts";

const ROBOSTTECH_API_URL = "https://robosttech.com/api";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeClearanceResponse(
  action: "clearance" | "clearance_status",
  trackingId: string,
  statusCode: number,
  raw: string,
  parsed: unknown,
) {
  const trimmed = raw.trim();
  if (trimmed || statusCode < 200 || statusCode >= 300) {
    return parsed;
  }

  if (action === "clearance") {
    return {
      success: true,
      approved: true,
      status: "submitted",
      tracking_id: trackingId,
      provider_response_empty: true,
      provider_status_code: statusCode,
      message:
        "Clearance request submitted successfully. The provider returned no response body.",
    };
  }

  return {
    success: true,
    status: "unknown",
    tracking_id: trackingId,
    provider_response_empty: true,
    provider_status_code: statusCode,
    message:
      "Clearance status request completed. The provider returned no response body.",
  };
}

function extractNinFromLookup(payload: unknown) {
  const obj = asObject(payload);
  if (!obj) return "";

  const direct = obj.nin;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const nested = asObject(obj.data);
  if (nested?.nin && typeof nested.nin === "string" && nested.nin.trim()) {
    return nested.nin.trim();
  }

  const upper = obj.NIN;
  if (typeof upper === "string" && upper.trim()) return upper.trim();

  return "";
}

function isBusinessFailure(payload: unknown): boolean {
  const obj = asObject(payload);
  if (!obj) return false;

  return obj.success === false ||
    obj.status === false ||
    obj.approved === false ||
    obj.personalized === false;
}

const requestBuilders: Record<string, (body: ProviderRequestBody) => Record<string, unknown>> = {
  validate: (body) => ({ nin: body.nin }),
  validation_status: (body) => ({ nin: body.nin }),
  personalization: (body) => ({ tracking_id: body.tracking_id || body.trackingId }),
  personalization_status: (body) => ({ tracking_id: body.tracking_id || body.trackingId }),
  clearance: (body) => ({ tracking_id: body.tracking_id || body.trackingId }),
  clearance_status: (body) => ({ tracking_id: body.tracking_id || body.trackingId }),
  nin_search: (body) => ({ nin: body.nin }),
  nin_phone: (body) => ({ phone: body.phone }),
  nin_demo: (body) => ({
    firstname: String(body.firstname ?? "").trim().toUpperCase(),
    lastname: String(body.lastname ?? "").trim().toUpperCase(),
    middlename: String(body.middlename ?? "").trim().toUpperCase(),
    gender: String(body.gender ?? "").trim().toLowerCase(),
    dateOfBirth: String(body.dateOfBirth ?? "").trim(),
  }),
};

const endpointMap: Record<string, string> = {
  validate: "/validation",
  validation_status: "/validation_status",
  personalization: "/personalization",
  personalization_status: "/personalization_status",
  clearance: "/clearance",
  clearance_status: "/clearance_status",
  nin_search: "/nin_search",
  nin_phone: "/nin_phone",
  nin_demo: "/nin_demo",
};

async function executeDirectAction(
  action: string,
  body: ProviderRequestBody,
  helpers: ProviderHelpers,
): Promise<ProviderResult> {
  const upstreamKey = Deno.env.get("ROBOSTTECH_API_KEY");
  if (!upstreamKey) {
    return {
      status: 503,
      ok: false,
      body: { success: false, error: "Upstream API not configured" },
      provider: "robosttech",
    };
  }

  const upstream = await helpers.callUpstream(
    `${ROBOSTTECH_API_URL}${endpointMap[action]}`,
    {
      "Content-Type": "application/json",
      "api-key": upstreamKey,
    },
    requestBuilders[action](body),
  );

  let responseBody = upstream.data;
  if (action === "clearance" || action === "clearance_status") {
    responseBody = normalizeClearanceResponse(
      action,
      String(body.tracking_id || body.trackingId || ""),
      upstream.response.status,
      upstream.raw,
      upstream.data,
    );
  }

  return {
    status: upstream.response.status,
    ok: upstream.response.ok,
    body: responseBody,
    provider: "robosttech",
  };
}

async function executePrintSlip(
  body: ProviderRequestBody,
  helpers: ProviderHelpers,
): Promise<ProviderResult> {
  const robosttechKey = Deno.env.get("ROBOSTTECH_API_KEY");
  const premblyKey = Deno.env.get("PREMBLY_API_KEY");

  if (!robosttechKey || !premblyKey) {
    return {
      status: 503,
      ok: false,
      body: { success: false, error: "Upstream API not configured" },
      provider: "print_orchestrator",
    };
  }

  let ninToLookup = String(body.nin || body.number || "").trim();

  if (!ninToLookup && body.phone) {
    const lookup = await helpers.callUpstream(
      `${ROBOSTTECH_API_URL}/nin_phone`,
      {
        "Content-Type": "application/json",
        "api-key": robosttechKey,
      },
      { phone: body.phone },
    );

    if (!lookup.response.ok || isBusinessFailure(lookup.data)) {
      return {
        status: lookup.response.status,
        ok: lookup.response.ok && !isBusinessFailure(lookup.data),
        body: lookup.data,
        provider: "robosttech",
      };
    }

    ninToLookup = extractNinFromLookup(lookup.data);
    if (!ninToLookup) {
      return {
        status: 422,
        ok: false,
        body: {
          success: false,
          error: "Could not retrieve a NIN from the supplied phone number.",
          message: "The phone lookup completed but did not return a usable NIN.",
        },
        provider: "print_orchestrator",
      };
    }
  }

  const slipLookup = await helpers.callUpstream(
    "https://api.prembly.com/verification/nin_advance",
    {
      "Content-Type": "application/json",
      "X-Api-Key": premblyKey,
      "accept": "application/json",
    },
    { number: ninToLookup },
  );

  return {
    status: slipLookup.response.status,
    ok: slipLookup.response.ok,
    body: slipLookup.data,
    provider: "prembly",
  };
}

export const robosttechAdapter: ProviderAdapter = {
  name: "robosttech",
  supports: (action) => action in endpointMap || action.startsWith("print_nin_slip_"),
  execute: async (action, body, helpers) => {
    if (action.startsWith("print_nin_slip_")) {
      return executePrintSlip(body, helpers);
    }
    return executeDirectAction(action, body, helpers);
  },
};
