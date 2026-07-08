import { callFormUpstream, callUpstream } from "./http.ts";
import { premblyAdapter } from "./prembly.ts";
import { robosttechAdapter } from "./robosttech.ts";
import { smartApiAdapter } from "./smartapi.ts";
import type { ProviderHelpers, ProviderRequestBody, ProviderResult } from "./types.ts";

const adapters = [smartApiAdapter, premblyAdapter, robosttechAdapter];

const helpers: ProviderHelpers = {
  callUpstream,
  callFormUpstream,
};

export async function executeProviderRequest(
  action: string,
  body: ProviderRequestBody,
): Promise<ProviderResult> {
  const adapter = adapters.find((candidate) => candidate.supports(action));

  if (!adapter) {
    return {
      status: 400,
      ok: false,
      body: { success: false, error: "Invalid action" },
      provider: "internal",
    };
  }

  return adapter.execute(action, body, helpers);
}
