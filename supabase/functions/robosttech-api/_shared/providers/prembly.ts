import type {
  ProviderAdapter,
  ProviderHelpers,
  ProviderRequestBody,
  ProviderResult,
} from "./types.ts";

const PREMBLY_API_URL = "https://api.prembly.com/verification";

const endpointMap: Record<string, string> = {
  nin_basic: "/vnin-basic",
  nin_advance: "/nin_advance",
  bvn_basic: "/bvn_validation",
  bvn_advance: "/bvn",
};

const requestBuilders: Record<string, (body: ProviderRequestBody) => Record<string, unknown>> = {
  nin_basic: (body) => ({ number: body.nin || body.number }),
  nin_advance: (body) => ({ number: body.nin || body.number }),
  bvn_basic: (body) => ({ number: body.bvn || body.number }),
  bvn_advance: (body) => ({ number: body.bvn || body.number }),
};

export const premblyAdapter: ProviderAdapter = {
  name: "prembly",
  supports: (action) => action in endpointMap,
  execute: async (action, body, helpers): Promise<ProviderResult> => {
    const upstreamKey = Deno.env.get("PREMBLY_API_KEY");
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
      {
        "Content-Type": "application/json",
        "X-Api-Key": upstreamKey,
        "accept": "application/json",
      },
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
