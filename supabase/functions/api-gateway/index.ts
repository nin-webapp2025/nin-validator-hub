import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ─── CORS ─────────────────────────────────────────────────── */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ─── Upstream API base URLs ───────────────────────────────── */
const ROBOSTTECH_API_URL = "https://robosttech.com/api";
const PREMBLY_API_URL = "https://api.prembly.com/verification";

/* ─── Pricing per action (Naira) ──────────────────────────── */
const ACTION_PRICES: Record<string, number> = {
  validate: 2000,
  validation_status: 0,            // status checks are free
  personalization: 200,
  personalization_status: 0,
  clearance: 1500,
  clearance_status: 0,
  nin_search: 200,
  nin_phone: 200,
  nin_demo: 200,
  nin_basic: 200,
  nin_advance: 200,
  bvn_basic: 250,
  bvn_advance: 250,
  print_nin_slip_premium: 600,
  print_nin_slip_long: 400,
};

/* ─── Allowed actions ──────────────────────────────────────── */
type Action = keyof typeof ACTION_PRICES;
const VALID_ACTIONS = new Set(Object.keys(ACTION_PRICES));

/* ─── Mock responses for test keys (sk_test_ prefix) ──────── */
const MOCK_RESPONSES: Record<string, unknown> = {
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
    nin: "00000000000",
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
};

/* ─── Helper: JSON response ────────────────────────────────── */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ─── Helper: SHA-256 hex hash ─────────────────────────────── */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─── Main handler ─────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startMs = Date.now();

  try {
    /* 1. Extract API key ---------------------------------------------- */
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return json({ error: "Missing x-api-key header" }, 401);
    }

    /* 2. Build Supabase service-role client for DB access ------------- */
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    /* 3. Look up key by hash ------------------------------------------ */
    const keyHash = await sha256(apiKey);
    const { data: keyRow, error: keyErr } = await sb
      .from("api_keys")
      .select("id, user_id, is_active, rate_limit, total_requests")
      .eq("key_hash", keyHash)
      .single();

    if (keyErr || !keyRow) {
      return json({ error: "Invalid API key" }, 401);
    }
    if (!keyRow.is_active) {
      return json({ error: "API key is deactivated" }, 403);
    }

    /* 4. Rate limiting ------------------------------------------------ */
    const { data: recentCount } = await sb.rpc("count_recent_requests", {
      p_api_key_id: keyRow.id,
      p_window_seconds: 60,
    });

    if (Number(recentCount ?? 0) >= keyRow.rate_limit) {
      return json(
        { error: "Rate limit exceeded", limit: keyRow.rate_limit, window: "60s" },
        429
      );
    }

    /* 5. Parse body --------------------------------------------------- */
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const action = (body.action as string) ?? "";

    if (!action || !VALID_ACTIONS.has(action)) {
      return json(
        { error: "Invalid action", valid_actions: [...VALID_ACTIONS] },
        400
      );
    }

    /* 5a. Per-action input validation --------------------------------- */
    const NIN_RE = /^\d{11}$/;
    const BVN_RE = /^\d{11}$/;
    const PHONE_RE = /^0[7-9][01]\d{8}$/; // Nigerian mobile

    const validationError = (() => {
      switch (action) {
        case "validate":
        case "validation_status":
        case "nin_search":
        case "nin_demo":
          if (!body.nin || !NIN_RE.test(String(body.nin)))
            return "Field 'nin' must be an 11-digit number.";
          break;
        case "nin_basic":
        case "nin_advance":
        case "print_nin_slip_premium":
        case "print_nin_slip_long":
          if (!body.nin && !body.number)
            return "Field 'nin' or 'number' (11-digit) is required.";
          if ((body.nin && !NIN_RE.test(String(body.nin))) || (body.number && !NIN_RE.test(String(body.number))))
            return "Field 'nin'/'number' must be an 11-digit number.";
          break;
        case "nin_phone":
          if (!body.phone || !PHONE_RE.test(String(body.phone)))
            return "Field 'phone' must be a valid Nigerian mobile number (e.g. 08012345678).";
          break;
        case "bvn_basic":
        case "bvn_advance":
          if (!body.bvn && !body.number)
            return "Field 'bvn' or 'number' (11-digit) is required.";
          if ((body.bvn && !BVN_RE.test(String(body.bvn))) || (body.number && !BVN_RE.test(String(body.number))))
            return "Field 'bvn'/'number' must be an 11-digit number.";
          break;
        case "personalization":
        case "personalization_status":
        case "clearance":
        case "clearance_status":
          if (!body.tracking_id && !body.trackingId)
            return "Field 'tracking_id' is required.";
          break;
      }
      return null;
    })();

    if (validationError) {
      return json({ error: validationError }, 400);
    }

    /* 5b. Test mode short-circuit ------------------------------------ */
    const isTestMode = apiKey.startsWith("sk_test_");
    if (isTestMode) {
      const elapsedMs = Date.now() - startMs;
      // Log the test request (no wallet deduction)
      await sb.from("api_gateway_logs").insert({
        api_key_id: keyRow.id,
        user_id: keyRow.user_id,
        action,
        status_code: 200,
        response_time_ms: elapsedMs,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      });
      await sb
        .from("api_keys")
        .update({ total_requests: (keyRow.total_requests ?? 0) + 1, last_used_at: new Date().toISOString() })
        .eq("id", keyRow.id);
      const mock = MOCK_RESPONSES[action] ?? { success: true, _test_mode: true };
      return json(mock, 200);
    }

    /* 6. Wallet deduction --------------------------------------------- */
    const price = ACTION_PRICES[action];
    if (price > 0) {
      // Get current balance
      const { data: wallet } = await sb
        .from("wallet_balances")
        .select("balance")
        .eq("user_id", keyRow.user_id)
        .single();

      const balance = Number(wallet?.balance ?? 0);
      if (balance < price) {
        return json(
          {
            error: "Insufficient wallet balance",
            required: price,
            balance,
            message: `This action costs ₦${price.toLocaleString()}. Your balance is ₦${balance.toLocaleString()}. Please top up at https://sparkid.ng/dashboard`,
          },
          402
        );
      }

      // Deduct
      const newBalance = balance - price;
      await sb
        .from("wallet_balances")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", keyRow.user_id);

      // Record transaction
      await sb.from("wallet_transactions").insert({
        user_id: keyRow.user_id,
        type: "deduction",
        amount: price,
        description: `API Gateway — ${action}`,
        operation: action,
        status: "success",
      });
    }

    /* 7. Determine upstream endpoint ---------------------------------- */
    const isPrembly = ["nin_basic", "nin_advance", "bvn_basic", "bvn_advance", "print_nin_slip_premium", "print_nin_slip_long"].includes(action);
    const upstreamKey = isPrembly
      ? Deno.env.get("PREMBLY_API_KEY")
      : Deno.env.get("ROBOSTTECH_API_KEY");

    if (!upstreamKey) {
      // Refund if applicable
      if (price > 0) await refund(sb, keyRow.user_id, price, action);
      return json({ error: "Upstream API not configured" }, 503);
    }

    let endpoint = "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let requestBody: Record<string, unknown> = {};

    switch (action) {
      case "validate":
        endpoint = "/validation";
        requestBody = { nin: body.nin };
        headers["api-key"] = upstreamKey;
        break;
      case "validation_status":
        endpoint = "/validation_status";
        requestBody = { nin: body.nin };
        headers["api-key"] = upstreamKey;
        break;
      case "personalization":
        endpoint = "/personalization";
        requestBody = { tracking_id: body.tracking_id };
        headers["api-key"] = upstreamKey;
        break;
      case "personalization_status":
        endpoint = "/personalization_status";
        requestBody = { tracking_id: body.tracking_id };
        headers["api-key"] = upstreamKey;
        break;
      case "clearance":
        endpoint = "/clearance";
        requestBody = { trackingId: body.tracking_id || body.trackingId };
        headers["api-key"] = upstreamKey;
        break;
      case "clearance_status":
        endpoint = "/clearance_status";
        requestBody = { trackingId: body.tracking_id || body.trackingId };
        headers["api-key"] = upstreamKey;
        break;
      case "nin_search":
        endpoint = "/nin_search";
        requestBody = { nin: body.nin };
        headers["api-key"] = upstreamKey;
        break;
      case "nin_phone":
        endpoint = "/nin_phone";
        requestBody = { phone: body.phone };
        headers["api-key"] = upstreamKey;
        break;
      case "nin_demo":
        endpoint = "/nin_demo";
        requestBody = { nin: body.nin };
        headers["api-key"] = upstreamKey;
        break;
      case "nin_basic":
        endpoint = "/vnin-basic";
        requestBody = { number: body.nin || body.number };
        headers["X-Api-Key"] = upstreamKey;
        headers["accept"] = "application/json";
        break;
      case "nin_advance":
        endpoint = "/nin_advance";
        requestBody = { number: body.nin || body.number };
        headers["X-Api-Key"] = upstreamKey;
        headers["accept"] = "application/json";
        break;
      case "bvn_basic":
        endpoint = "/bvn_validation";
        requestBody = { number: body.bvn || body.number };
        headers["X-Api-Key"] = upstreamKey;
        headers["accept"] = "application/json";
        break;
      case "bvn_advance":
        endpoint = "/bvn";
        requestBody = { number: body.bvn || body.number };
        headers["X-Api-Key"] = upstreamKey;
        headers["accept"] = "application/json";
        break;
      case "print_nin_slip_premium":
      case "print_nin_slip_long":
        // Uses nin_advance under the hood — returns full biographical data + photo for slip rendering
        endpoint = "/nin_advance";
        requestBody = { number: body.nin || body.number };
        headers["X-Api-Key"] = upstreamKey;
        headers["accept"] = "application/json";
        break;
    }

    const baseUrl = isPrembly ? PREMBLY_API_URL : ROBOSTTECH_API_URL;

    /* 8. Forward request upstream ------------------------------------- */
    const upstreamRes = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const raw = await upstreamRes.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { raw };
    }

    const elapsedMs = Date.now() - startMs;

    /* 9. If upstream failed, refund wallet ----------------------------- */
    if (!upstreamRes.ok && price > 0) {
      await refund(sb, keyRow.user_id, price, action);
    }

    /* 10. Log request -------------------------------------------------- */
    await sb.from("api_gateway_logs").insert({
      api_key_id: keyRow.id,
      user_id: keyRow.user_id,
      action,
      status_code: upstreamRes.status,
      response_time_ms: elapsedMs,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
    });

    // Increment total_requests
    await sb
      .from("api_keys")
      .update({
        total_requests: (keyRow.total_requests ?? 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", keyRow.id);

    /* 11. Return upstream response ------------------------------------ */
    return json(data, upstreamRes.ok ? 200 : upstreamRes.status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("API Gateway error:", msg);
    return json({ error: msg }, 500);
  }
});

/* ─── Refund helper ────────────────────────────────────────── */
async function refund(
  sb: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  action: string
) {
  const { data: wallet } = await sb
    .from("wallet_balances")
    .select("balance")
    .eq("user_id", userId)
    .single();

  const current = Number(wallet?.balance ?? 0);
  await sb
    .from("wallet_balances")
    .update({ balance: current + amount, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  await sb.from("wallet_transactions").insert({
    user_id: userId,
    type: "top_up",
    amount,
    description: `Refund — API Gateway ${action} failed`,
    operation: action,
    status: "success",
  });
}
