import type {
  ProviderAdapter,
  ProviderHelpers,
  ProviderRequestBody,
  ProviderResult,
} from "./types.ts";

const PREMBLY_API_URL = "https://api.prembly.com/verification";

const endpointMap: Record<string, string> = {
  nin_search: "/vnin",
  nin_basic: "/vnin-basic",
  nin_advance: "/vnin",
  bvn_basic: "/bvn_validation",
  bvn_advance: "/bvn",
};

const requestBuilders: Record<string, (body: ProviderRequestBody) => Record<string, unknown>> = {
  nin_search: (body) => ({ number_nin: body.nin || body.number_nin || body.number }),
  nin_basic: (body) => ({ number: body.nin || body.number_nin || body.number }),
  nin_advance: (body) => ({ number_nin: body.nin || body.number_nin || body.number }),
  bvn_basic: (body) => ({ number: body.bvn || body.number }),
  bvn_advance: (body) => ({ number: body.bvn || body.number }),
};

function premblyHeaders(apiKey: string, appId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "accept": "application/json",
    "X-Api-Key": apiKey,
    "api-key": apiKey,
  };

  if (appId) {
    headers["app-id"] = appId;
    headers["app_id"] = appId;
  }

  return headers;
}

export const premblyAdapter: ProviderAdapter = {
  name: "prembly",
  supports: (action) => action in endpointMap,
  execute: async (action, body, helpers): Promise<ProviderResult> => {
    const upstreamKey = Deno.env.get("PREMBLY_API_KEY");
    const appId = Deno.env.get("PREMBLY_APP_ID")?.trim() ||
      Deno.env.get("PREMBLY_APPID")?.trim();
    if (!upstreamKey) {
      return {
        status: 503,
        ok: false,
        body: { success: false, error: "Upstream API not configured" },
        provider: "prembly",
      };
    }

    const upstream = await helpers.callUpstream(
      `${PREMBLY_API_URL}${endpointMap[action]}`,
      premblyHeaders(upstreamKey, appId),
      requestBuilders[action](body),
    );

    return {
      status: upstream.response.status,
      ok: upstream.response.ok,
      body: upstream.data,
      provider: "prembly",
    };
  },
};
