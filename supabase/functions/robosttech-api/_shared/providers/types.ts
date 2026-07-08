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
  product_id?: string;
  amount?: number | string;
  provider_plan_id?: string;
  provider_amount?: number | string;
  provider_reference?: string;
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
  callFormUpstream: (
    url: string,
    fields: Record<string, string>,
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
