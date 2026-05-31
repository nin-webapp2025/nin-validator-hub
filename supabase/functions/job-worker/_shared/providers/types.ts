export interface ProviderRequestBody extends Record<string, unknown> {
  nin?: string;
  tracking_id?: string;
  trackingId?: string;
  phone?: string;
  number?: string;
  bvn?: string;
  firstname?: string;
  lastname?: string;
  middlename?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface ProviderResult {
  status: number;
  ok: boolean;
  body: unknown;
  provider: string;
}

export interface ProviderHttpResult {
  response: Response;
  raw: string;
  data: unknown;
}

export interface ProviderHelpers {
  callUpstream: (
    url: string,
    headers: Record<string, string>,
    requestBody: Record<string, unknown>,
  ) => Promise<ProviderHttpResult>;
}

export interface ProviderAdapter {
  name: string;
  supports: (action: string) => boolean;
  execute: (
    action: string,
    body: ProviderRequestBody,
    helpers: ProviderHelpers,
  ) => Promise<ProviderResult>;
}
