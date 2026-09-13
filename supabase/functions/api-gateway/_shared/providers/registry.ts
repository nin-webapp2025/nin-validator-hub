import { callGetUpstream, callUpstream } from "./http.ts";
import { ikonectAdapter } from "./ikonect.ts";
import { premblyAdapter } from "./prembly.ts";
import { robosttechAdapter } from "./robosttech.ts";
import type { ProviderHelpers, ProviderRequestBody, ProviderResult } from "./types.ts";

const adapters = [ikonectAdapter, premblyAdapter, robosttechAdapter];

const helpers: ProviderHelpers = {
  callUpstream,
  callGetUpstream,
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
