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

/* ─── Pricing per action (Naira) — mirrors frontend wallet.ts  */
const ACTION_PRICES: Record<string, number> = {
  validate: 5000,
  validation_status: 0, // status checks are free
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
};

/* ─── Allowed actions ──────────────────────────────────────── */
type Action = keyof typeof ACTION_PRICES;
const VALID_ACTIONS = new Set(Object.keys(ACTION_PRICES));

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
    const body = await req.json();
    const action = body.action as string;

    if (!action || !VALID_ACTIONS.has(action)) {
      return json(
        { error: "Invalid action", valid_actions: [...VALID_ACTIONS] },
        400
      );
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
    const isPrembly = ["nin_basic", "nin_advance", "bvn_basic", "bvn_advance"].includes(action);
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
