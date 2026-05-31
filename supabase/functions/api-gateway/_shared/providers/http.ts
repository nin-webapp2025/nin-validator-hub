import type { ProviderHttpResult } from "./types.ts";

async function parseUpstreamResponse(response: Response) {
  const raw = await response.text();
  let data: unknown = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { success: false, error: "Upstream returned invalid JSON", raw };
  }

  return { raw, data };
}

export async function callUpstream(
  url: string,
  headers: Record<string, string>,
  requestBody: Record<string, unknown>,
): Promise<ProviderHttpResult> {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  const { raw, data } = await parseUpstreamResponse(response);
  return { response, raw, data };
}
