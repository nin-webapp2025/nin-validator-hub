import { executeProviderRequest } from "./providers/registry.ts";

const API_ACTION_PRICES = {
  validate: 5000,
  validation_status: 0,
  personalization: 1500,
  personalization_status: 0,
  clearance: 3000,
  clearance_status: 0,
  nin_search: 800,
  nin_phone: 800,
  nin_demo: 800,
  nin_basic: 800,
  nin_advance: 800,
  bvn_basic: 800,
  bvn_advance: 800,
  print_nin_slip_premium: 600,
  print_nin_slip_long: 400,
  vtu_airtime: 0,
  vtu_data: 0,
  vtu_query: 0,
} as const;

const NIN_RE = /^\d{11}$/;
const BVN_RE = /^\d{11}$/;
const PHONE_RE = /^0[7-9][01]\d{8}$/;

export type SupportedAction = keyof typeof API_ACTION_PRICES;

export interface ExecutionRequestBody extends Record<string, unknown> {
  action?: string;
  request_id?: string;
  idempotency_key?: string;
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

export interface ExecutionOutcome {
  status: number;
  body: unknown;
  charged: boolean;
  isTestMode: boolean;
  walletOperation?: string;
}

interface WalletRpcClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: any; error: { message?: string } | null }>;
}

type NormalizedPhase = "submit" | "status" | "lookup" | "verify";
type NormalizedState =
  | "succeeded"
  | "submitted"
  | "pending"
  | "reversed"
  | "failed"
  | "unknown";

export const VALID_ACTIONS = new Set<SupportedAction>(
  Object.keys(API_ACTION_PRICES) as SupportedAction[],
);

export const ACTION_TO_WALLET_OPERATION: Partial<Record<SupportedAction, string>> = {
  validate: "nin_validation",
  personalization: "personalization",
  clearance: "clearance",
  nin_search: "nin_verification",
  nin_phone: "nin_verification",
  nin_demo: "nin_verification",
  nin_basic: "nin_verification",
  nin_advance: "nin_verification",
  bvn_basic: "bvn_verification",
  bvn_advance: "bvn_verification",
  print_nin_slip_premium: "print_nin_slip_premium",
  print_nin_slip_long: "print_nin_slip_long",
  vtu_airtime: "airtime_purchase",
  vtu_data: "data_purchase",
};

export const MOCK_RESPONSES: Record<SupportedAction, unknown> = {
  validate: {
    message: "Validation Submission Successfull",
    approved: true,
    category: "new",
    success: true,
    nin: "00000000000",
    tracking_id: "TST_MOCK_0001",
    _test_mode: true,
  },
  validation_status: {
    message: "Uploaded",
    status: "sent",
    success: false,
    "in-progress": true,
    nin: "00000000000",
    _test_mode: true,
  },
  clearance: {
    message: "Clearance Submission Successfull",
    approved: true,
    success: true,
    tracking_id: "TST_MOCK_CLR001",
    _test_mode: true,
  },
  clearance_status: {
    message: "Clearance Status Successfull",
    status: "completed",
    success: true,
    _test_mode: true,
  },
  personalization: {
    message: "Personalization Submission Successfull",
    approved: true,
    category: "to_get_slip",
    success: true,
    tracking_id: "TST_MOCK_0001",
    _test_mode: true,
  },
  personalization_status: {
    message: "Personalization Successfull",
    personalized: true,
    success: true,
    status: "completed",
    _test_mode: true,
  },
  nin_search: {
    message: "NIN Search Successfull",
    success: true,
    data: {
      nin: "00000000000",
      firstName: "TEST",
      lastName: "USER",
      middleName: "MODE",
      dateOfBirth: "01-01-1990",
      gender: "Male",
      phone: "08000000000",
    },
    _test_mode: true,
  },
  nin_phone: {
    message: "NIN Phone Lookup Successfull",
    success: true,
    nin: "00000000000",
    _test_mode: true,
  },
  nin_demo: {
    message: "NIN Demo Successfull",
    success: true,
    data: {
      nin: "00000000000",
      firstname: "TEST",
      surname: "USER",
      gender: "Male",
      birthdate: "01-01-1990",
    },
    _test_mode: true,
  },
  nin_basic: {
    status: true,
    success: true,
    verification: {
      status: "VERIFIED",
      type: "NIN_BASIC",
    },
    data: {
      nin: "00000000000",
      firstname: "TEST",
      surname: "USER",
      middlename: "MODE",
      birthdate: "01-01-1990",
      gender: "Male",
      telephoneno: "08000000000",
      photo: "",
    },
    _test_mode: true,
  },
  nin_advance: {
    status: true,
    success: true,
    verification: {
      status: "VERIFIED",
      type: "NIN_ADVANCE",
    },
    data: {
      nin: "00000000000",
      firstname: "TEST",
      surname: "USER",
      middlename: "MODE",
      birthdate: "01-01-1990",
      gender: "Male",
      telephoneno: "08000000000",
      photo: "",
    },
    _test_mode: true,
  },
  bvn_basic: {
    status: true,
    success: true,
    verification: {
      status: "VERIFIED",
      type: "BVN_BASIC",
    },
    data: {
      bvn: "00000000000",
      first_name: "TEST",
      last_name: "USER",
      dob: "01-Jan-90",
      phone: "08000000000",
    },
    _test_mode: true,
  },
  bvn_advance: {
    status: true,
    success: true,
    verification: {
      status: "VERIFIED",
      type: "BVN_ADVANCE",
    },
    data: {
      bvn: "00000000000",
      first_name: "TEST",
      last_name: "USER",
      dob: "01-Jan-90",
      phone: "08000000000",
    },
    _test_mode: true,
  },
  print_nin_slip_premium: {
    status: true,
    success: true,
    verification: { status: "VERIFIED", type: "NIN_ADVANCE" },
    data: {
      nin: "00000000000",
      firstname: "TEST",
      surname: "USER",
      middlename: "MODE",
      birthdate: "01-01-1990",
      gender: "Male",
      telephoneno: "08000000000",
      photo: "",
    },
    _test_mode: true,
  },
  print_nin_slip_long: {
    status: true,
    success: true,
    verification: { status: "VERIFIED", type: "NIN_ADVANCE" },
    data: {
      nin: "00000000000",
      firstname: "TEST",
      surname: "USER",
      middlename: "MODE",
      birthdate: "01-01-1990",
      gender: "Male",
      telephoneno: "08000000000",
      photo: "",
    },
    _test_mode: true,
  },
  vtu_airtime: {
    code: "400",
    status: "pending",
    success: true,
    product: "Test Airtime",
    response: "Test purchase queued.",
    reference: "TST_VTU_AIRTIME_001",
    provider_state: "pending",
    _test_mode: true,
  },
  vtu_data: {
    code: "400",
    status: "pending",
    success: true,
    product: "Test Data Bundle",
    response: "Test purchase queued.",
    reference: "TST_VTU_DATA_001",
    provider_state: "pending",
    _test_mode: true,
  },
  vtu_query: {
    code: "200",
    status: "success",
    success: true,
    response: "Test transaction completed.",
    reference: "TST_VTU_QUERY_001",
    provider_state: "succeeded",
    _test_mode: true,
  },
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function validationErrorFor(action: SupportedAction, body: ExecutionRequestBody): string | null {
  switch (action) {
    case "validate":
    case "validation_status":
    case "nin_search":
      if (!body.nin || !NIN_RE.test(String(body.nin))) {
        return "Field 'nin' must be an 11-digit number.";
      }
      break;
    case "nin_demo": {
      const firstname = String(body.firstname ?? "").trim();
      const lastname = String(body.lastname ?? "").trim();
      const gender = String(body.gender ?? "").trim().toLowerCase();
      const dateOfBirth = String(body.dateOfBirth ?? "").trim();

      if (!firstname) return "Field 'firstname' is required.";
      if (!lastname) return "Field 'lastname' is required.";
      if (!["male", "female"].includes(gender)) {
        return "Field 'gender' must be either 'male' or 'female'.";
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
        return "Field 'dateOfBirth' must be in YYYY-MM-DD format.";
      }
      break;
    }
    case "nin_basic":
    case "nin_advance":
      if (!body.nin && !body.number) {
        return "Field 'nin' or 'number' (11-digit) is required.";
      }
      if (
        (body.nin && !NIN_RE.test(String(body.nin))) ||
        (body.number && !NIN_RE.test(String(body.number)))
      ) {
        return "Field 'nin'/'number' must be an 11-digit number.";
      }
      break;
    case "print_nin_slip_premium":
    case "print_nin_slip_long":
      if (!body.phone && !body.nin && !body.number) {
        return "Provide either 'phone' or 'nin'/'number' for the print request.";
      }
      if (body.phone && !PHONE_RE.test(String(body.phone))) {
        return "Field 'phone' must be a valid Nigerian mobile number (e.g. 08012345678).";
      }
      if (
        (body.nin && !NIN_RE.test(String(body.nin))) ||
        (body.number && !NIN_RE.test(String(body.number)))
      ) {
        return "Field 'nin'/'number' must be an 11-digit number.";
      }
      break;
    case "nin_phone":
      if (!body.phone || !PHONE_RE.test(String(body.phone))) {
        return "Field 'phone' must be a valid Nigerian mobile number (e.g. 08012345678).";
      }
      break;
    case "bvn_basic":
    case "bvn_advance":
      if (!body.bvn && !body.number) {
        return "Field 'bvn' or 'number' (11-digit) is required.";
      }
      if (
        (body.bvn && !BVN_RE.test(String(body.bvn))) ||
        (body.number && !BVN_RE.test(String(body.number)))
      ) {
        return "Field 'bvn'/'number' must be an 11-digit number.";
      }
      break;
    case "personalization":
    case "personalization_status":
    case "clearance":
    case "clearance_status":
      if (!body.tracking_id && !body.trackingId) {
        return "Field 'tracking_id' is required.";
      }
      break;
    case "vtu_airtime":
    case "vtu_data":
      if (!body.product_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(body.product_id))) {
        return "Field 'product_id' must be a valid product identifier.";
      }
      if (!body.phone || !PHONE_RE.test(String(body.phone))) {
        return "Field 'phone' must be a valid Nigerian mobile number (e.g. 08012345678).";
      }
      if (action === "vtu_airtime") {
        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return "Field 'amount' must be greater than zero.";
        }
      }
      break;
    case "vtu_query":
      if (!String(body.provider_reference ?? body.request_id ?? "").trim()) {
        return "Field 'provider_reference' is required.";
      }
      break;
  }

  return null;
}

function inferPhase(action: SupportedAction): NormalizedPhase {
  if (action === "vtu_query") return "status";
  if (action.endsWith("_status")) return "status";
  if (
    action === "nin_search" ||
    action === "nin_phone" ||
    action === "nin_demo" ||
    action === "print_nin_slip_premium" ||
    action === "print_nin_slip_long"
  ) {
    return "lookup";
  }
  if (action === "nin_basic" || action === "nin_advance" || action === "bvn_basic" || action === "bvn_advance") {
    return "verify";
  }
  return "submit";
}

function extractPrimaryRecord(payload: Record<string, unknown>) {
  const candidates = [
    payload.data,
    payload.nin_data,
    payload.result,
    asObject(payload.verification)?.data,
  ];

  for (const candidate of candidates) {
    const record = asObject(candidate);
    if (record) return record;
  }

  return null;
}

function firstString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function extractTrackingId(payload: Record<string, unknown>, fallbackBody: ExecutionRequestBody) {
  const record = extractPrimaryRecord(payload);
  return firstString(payload, ["tracking_id", "trackingId"]) ||
    firstString(record ?? {}, ["tracking_id", "trackingId"]) ||
    (typeof fallbackBody.tracking_id === "string" ? fallbackBody.tracking_id.trim() : undefined) ||
    (typeof fallbackBody.trackingId === "string" ? fallbackBody.trackingId.trim() : undefined);
}

function extractNin(payload: Record<string, unknown>, fallbackBody: ExecutionRequestBody) {
  const record = extractPrimaryRecord(payload);
  return firstString(payload, ["nin", "NIN"]) ||
    firstString(record ?? {}, ["nin", "NIN", "vnin", "idNumber"]) ||
    (typeof fallbackBody.nin === "string" ? fallbackBody.nin.trim() : undefined) ||
    (typeof fallbackBody.number === "string" ? fallbackBody.number.trim() : undefined);
}

function extractBvn(payload: Record<string, unknown>, fallbackBody: ExecutionRequestBody) {
  const record = extractPrimaryRecord(payload);
  return firstString(payload, ["bvn"]) ||
    firstString(record ?? {}, ["bvn"]) ||
    (typeof fallbackBody.bvn === "string" ? fallbackBody.bvn.trim() : undefined) ||
    (typeof fallbackBody.number === "string" ? fallbackBody.number.trim() : undefined);
}

function deriveNormalizedState(
  action: SupportedAction,
  statusCode: number,
  payload: Record<string, unknown>,
): NormalizedState {
  const success = payload.success;
  const approved = payload.approved;
  const personalized = payload.personalized;
  const statusValue = String(
    payload.provider_state ??
      payload.status ??
      asObject(payload.verification)?.status ??
      "",
  ).trim().toLowerCase();

  if (statusValue === "reversed") return "reversed";
  if (statusValue === "failed") return "failed";
  if (statusValue === "unknown" && payload.provider_state) return "unknown";
  if (statusCode >= 400) return "failed";

  if (success === false || approved === false || personalized === false) {
    return "failed";
  }

  if (["pending", "processing", "sent", "uploaded", "in-progress", "in_progress"].includes(statusValue)) {
    return "pending";
  }

  if (action === "validation_status" && (payload["in-progress"] === true || statusValue === "sent")) {
    return "pending";
  }

  if (action === "clearance" && statusValue === "submitted") return "submitted";
  if (action === "clearance_status" && statusValue === "unknown") return "unknown";

  if (
    success === true ||
    approved === true ||
    personalized === true ||
    payload.status === true ||
    ["success", "completed", "verified"].includes(statusValue)
  ) {
    return "succeeded";
  }

  return statusCode >= 200 && statusCode < 300 ? "unknown" : "failed";
}

function normalizeProviderResponse(
  action: SupportedAction,
  body: ExecutionRequestBody,
  statusCode: number,
  payload: unknown,
  options?: { charged?: boolean; requestKey?: string; provider?: string },
) {
  const payloadObject = asObject(payload) ?? {};
  const phase = inferPhase(action);
  const state = deriveNormalizedState(action, statusCode, payloadObject);
  const record = extractPrimaryRecord(payloadObject);
  const providerStatus = String(
    payloadObject.status ??
      asObject(payloadObject.verification)?.status ??
      "",
  ).trim() || undefined;
  const trackingId = extractTrackingId(payloadObject, body);
  const providerReference = firstString(payloadObject, ["provider_reference", "reference"]) ||
    (typeof body.provider_reference === "string" ? body.provider_reference.trim() : undefined) ||
    (typeof body.request_id === "string" ? body.request_id.trim() : undefined);
  const nin = extractNin(payloadObject, body);
  const bvn = extractBvn(payloadObject, body);
  const message = firstString(payloadObject, ["message", "error"]) ||
    (state === "submitted"
      ? "Request submitted successfully."
      : state === "pending"
      ? "Request is being processed."
      : state === "succeeded"
      ? "Request completed successfully."
      : state === "failed"
      ? "Request failed."
      : "Request completed.");

  return {
    ...payloadObject,
    success: !["failed", "reversed"].includes(state),
    normalized: {
      action,
      phase,
      state,
      provider_status: providerStatus,
      message,
      tracking_id: trackingId,
      nin,
      bvn,
      provider_reference: providerReference,
      charged: !!options?.charged,
      request_id: options?.requestKey,
      provider: options?.provider ?? "internal",
      http_status: statusCode,
      has_data: !!record,
      is_terminal: ["succeeded", "failed", "reversed"].includes(state),
    },
  };
}

function isBusinessFailure(payload: unknown): boolean {
  const obj = asObject(payload);
  if (!obj) return false;

  return obj.success === false ||
    obj.status === false ||
    obj.approved === false ||
    obj.personalized === false ||
    ["failed", "reversed"].includes(String(obj.provider_state ?? "").toLowerCase());
}

async function refundIfNeeded(
  serviceClient: WalletRpcClient,
  userId: string | null | undefined,
  walletOperation: string | undefined,
  charged: boolean,
  requestKey: string | undefined,
  reason: string,
) {
  if (!charged || !userId || !walletOperation) return;

  const variablePrice = walletOperation === "airtime_purchase" || walletOperation === "data_purchase";
  const { error } = await serviceClient.rpc(
    variablePrice ? "wallet_refund_variable_operation" : "wallet_refund_operation",
    variablePrice
      ? {
        p_user_id: userId,
        p_operation: walletOperation,
        p_request_key: requestKey,
        p_reason: reason,
      }
      : {
        p_user_id: userId,
        p_operation: walletOperation,
        p_reason: reason,
        p_request_key: requestKey ?? null,
      },
  );

  if (error) {
    console.error("Wallet refund failed:", error.message ?? error);
  }
}

function isVtuPurchase(action: SupportedAction) {
  return action === "vtu_airtime" || action === "vtu_data";
}

async function enqueueVtuStatusPoll(
  serviceClient: WalletRpcClient,
  userId: string,
  requestKey: string,
  providerReference: string,
) {
  const { error } = await serviceClient.rpc("enqueue_background_job", {
    p_type: "vtu_status_poll",
    p_payload: {
      user_id: userId,
      request_key: requestKey,
      provider_reference: providerReference,
    },
    p_run_at: new Date(Date.now() + 60_000).toISOString(),
    p_unique_key: `vtu-status:${requestKey}`,
    p_max_attempts: 20,
  });

  if (error) console.error("Unable to enqueue VTU status poll:", error.message ?? error);
}

async function settleVtuResult(
  serviceClient: WalletRpcClient,
  requestKey: string,
  state: string,
  providerReference: string,
  response: unknown,
) {
  const { error } = await serviceClient.rpc("settle_vtu_transaction", {
    p_request_key: requestKey,
    p_state: state,
    p_provider_response: asObject(response) ?? { data: response },
    p_provider_reference: providerReference,
  });

  if (error) {
    console.error("Unable to settle VTU transaction:", error.message ?? error);
    return false;
  }
  return true;
}

export async function executeUnifiedAction({
  action,
  body,
  serviceClient,
  billingUserId,
  isTestMode = false,
}: {
  action: SupportedAction;
  body: ExecutionRequestBody;
  serviceClient: WalletRpcClient;
  billingUserId?: string | null;
  isTestMode?: boolean;
}): Promise<ExecutionOutcome> {
  const validationError = validationErrorFor(action, body);
  const walletOperation = ACTION_TO_WALLET_OPERATION[action];
  const requestKey = String(body.request_id ?? body.idempotency_key ?? "").trim() || undefined;
  const vtuPurchase = isVtuPurchase(action);
  let charged = false;

  if (validationError) {
    return {
      status: 400,
      body: normalizeProviderResponse(action, body, 400, {
        success: false,
        error: validationError,
        message: validationError,
      }, {
        charged: false,
        requestKey,
        provider: "internal",
      }),
      charged: false,
      isTestMode,
      walletOperation,
    };
  }

  if (isTestMode) {
    return {
      status: 200,
      body: normalizeProviderResponse(action, body, 200, MOCK_RESPONSES[action], {
        charged: false,
        requestKey,
        provider: "internal",
      }),
      charged: false,
      isTestMode: true,
      walletOperation,
    };
  }

  if (action === "vtu_query" && billingUserId) {
    const reference = String(body.provider_reference ?? body.request_id ?? "").trim();
    const { data: authorized, error } = await serviceClient.rpc("authorize_vtu_reference", {
      p_user_id: billingUserId,
      p_reference: reference,
    });
    if (error || authorized !== true) {
      const message = error ? "Unable to authorize this transaction query." : "Transaction not found.";
      return {
        status: error ? 500 : 404,
        body: normalizeProviderResponse(action, body, error ? 500 : 404, {
          success: false,
          error: message,
          message,
        }, { charged: false, requestKey, provider: "internal" }),
        charged: false,
        isTestMode: false,
      };
    }
  }

  if (walletOperation) {
    if (!billingUserId) {
      return {
        status: 401,
        body: normalizeProviderResponse(action, body, 401, {
          success: false,
          error: "Authentication required for this request.",
          message: "Authentication required for this request.",
        }, {
          charged: false,
          requestKey,
          provider: "internal",
        }),
        charged: false,
        isTestMode: false,
        walletOperation,
      };
    }

    if (!requestKey) {
      return {
        status: 400,
        body: normalizeProviderResponse(action, body, 400, {
          success: false,
          error: "Field 'request_id' is required for billable operations.",
          message: "Field 'request_id' is required for billable operations.",
        }, {
          charged: false,
          requestKey,
          provider: "internal",
        }),
        charged: false,
        isTestMode: false,
        walletOperation,
      };
    }

    let chargeResult: any = null;
    let chargeError: { message?: string } | null = null;

    if (vtuPurchase) {
      const { data: quoteResult, error: quoteError } = await serviceClient.rpc(
        "quote_vtu_purchase",
        {
          p_product_id: body.product_id,
          p_amount: action === "vtu_airtime" ? Number(body.amount) : null,
        },
      );
      const quote = asObject(quoteResult);

      if (quoteError || !quote?.success) {
        const message = quoteError?.message || String(quote?.message ?? "Unable to price this purchase.");
        return {
          status: quoteError ? 500 : 400,
          body: normalizeProviderResponse(action, body, quoteError ? 500 : 400, {
            success: false,
            error: message,
            message,
          }, { charged: false, requestKey, provider: "internal" }),
          charged: false,
          isTestMode: false,
          walletOperation,
        };
      }

      body.provider_plan_id = String(quote.provider_plan_id ?? "");
      body.provider_amount = Number(quote.provider_amount);
      body.provider_reference = requestKey;

      const charge = await serviceClient.rpc("wallet_charge_variable_operation", {
        p_user_id: billingUserId,
        p_operation: walletOperation,
        p_amount: Number(quote.charge_amount),
        p_request_key: requestKey,
        p_description: `${String(quote.product_name ?? "VTU purchase")} - ${String(body.phone ?? "")}`,
      });
      chargeResult = charge.data;
      chargeError = charge.error;
    } else {
      const charge = await serviceClient.rpc("wallet_charge_operation", {
        p_user_id: billingUserId,
        p_operation: walletOperation,
        p_request_key: requestKey,
      });
      chargeResult = charge.data;
      chargeError = charge.error;
    }

    if (chargeError) {
      return {
        status: 500,
        body: normalizeProviderResponse(action, body, 500, {
          success: false,
          error: "Unable to charge wallet for this request.",
          message: "Unable to charge wallet for this request.",
        }, {
          charged: false,
          requestKey,
          provider: "internal",
        }),
        charged: false,
        isTestMode: false,
        walletOperation,
      };
    }

    if (!chargeResult?.success) {
      return {
        status: 402,
        body: normalizeProviderResponse(action, body, 402, {
          success: false,
          error: chargeResult?.message ||
            "Unable to charge wallet for this request.",
          balance: chargeResult?.balance,
          message: chargeResult?.message ||
            "Unable to charge wallet for this request.",
        }, {
          charged: false,
          requestKey,
          provider: "internal",
        }),
        charged: false,
        isTestMode: false,
        walletOperation,
      };
    }

    charged = true;

    if (vtuPurchase) {
      const { data: prepared, error: prepareError } = await serviceClient.rpc(
        "prepare_vtu_purchase",
        {
          p_user_id: billingUserId,
          p_product_id: body.product_id,
          p_request_key: requestKey,
          p_phone: body.phone,
          p_amount: action === "vtu_airtime" ? Number(body.amount) : null,
        },
      );

      if (prepareError || !prepared?.success) {
        await refundIfNeeded(serviceClient, billingUserId, walletOperation, true, requestKey, "purchase preparation failed");
        charged = false;
        const message = prepareError?.message || prepared?.message || "Unable to prepare this purchase.";
        return {
          status: 500,
          body: normalizeProviderResponse(action, body, 500, {
            success: false,
            error: message,
            message,
          }, { charged: false, requestKey, provider: "internal" }),
          charged: false,
          isTestMode: false,
          walletOperation,
        };
      }
    }
  }

  try {
    const upstream = await executeProviderRequest(action, body);
    const upstreamState = String(asObject(upstream.body)?.provider_state ?? "").toLowerCase();
    const needsRefund = charged && (vtuPurchase
      ? ["failed", "reversed"].includes(upstreamState)
      : (!upstream.ok || isBusinessFailure(upstream.body)));

    if (needsRefund) {
      await refundIfNeeded(
        serviceClient,
        billingUserId,
        walletOperation,
        charged,
        requestKey,
        upstream.ok ? "provider business failure" : `upstream ${upstream.status}`,
      );
      charged = false;
    }

    const normalizedBody = normalizeProviderResponse(
      action,
      body,
      upstream.status,
      upstream.body,
      {
        charged,
        requestKey,
        provider: upstream.provider,
      },
    );

    if (vtuPurchase && billingUserId && requestKey) {
      const normalized = asObject(asObject(normalizedBody)?.normalized);
      const state = String(normalized?.state ?? "unknown");
      const providerReference = String(normalized?.provider_reference ?? requestKey);
      const settled = await settleVtuResult(serviceClient, requestKey, state, providerReference, upstream.body);

      if (!settled || state === "pending" || state === "submitted" || state === "unknown") {
        await enqueueVtuStatusPoll(serviceClient, billingUserId, requestKey, providerReference);
      }
    }

    return {
      status: upstream.status,
      body: normalizedBody,
      charged,
      isTestMode: false,
      walletOperation,
    };
  } catch (error) {
    if (vtuPurchase && charged && billingUserId && requestKey) {
      const providerReference = String(body.provider_reference ?? requestKey);
      await settleVtuResult(serviceClient, requestKey, "unknown", providerReference, {
        message: "Provider confirmation is pending.",
      });
      await enqueueVtuStatusPoll(serviceClient, billingUserId, requestKey, providerReference);

      return {
        status: 202,
        body: normalizeProviderResponse(action, body, 202, {
          success: true,
          status: "pending",
          provider_state: "unknown",
          message: "Your purchase was submitted and is awaiting provider confirmation.",
          provider_reference: providerReference,
        }, { charged: true, requestKey, provider: "smartapi" }),
        charged: true,
        isTestMode: false,
        walletOperation,
      };
    }

    await refundIfNeeded(
      serviceClient,
      billingUserId,
      walletOperation,
      charged,
      requestKey,
      "internal execution failure",
    );

    const message = error instanceof Error
      ? error.message
      : "Unable to reach upstream provider";

    return {
      status: 502,
      body: {
        success: false,
        error: "Unable to complete the upstream request.",
        message,
        normalized: {
          action,
          phase: inferPhase(action),
          state: "failed",
          provider_status: undefined,
          message,
          tracking_id: typeof body.tracking_id === "string" ? body.tracking_id : typeof body.trackingId === "string" ? body.trackingId : undefined,
          nin: typeof body.nin === "string" ? body.nin : typeof body.number === "string" ? body.number : undefined,
          bvn: typeof body.bvn === "string" ? body.bvn : typeof body.number === "string" ? body.number : undefined,
          charged: false,
          request_id: requestKey,
          provider: "internal",
          http_status: 502,
          has_data: false,
          is_terminal: true,
        },
      },
      charged: false,
      isTestMode: false,
      walletOperation,
    };
  }
}
