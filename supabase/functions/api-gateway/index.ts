import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  executeUnifiedAction,
  type ExecutionRequestBody,
  type SupportedAction,
  VALID_ACTIONS,
} from "./_shared/unified-executor.ts";
import {
  recordOperationalEvent,
  severityForStatus,
  shouldAlertForStatus,
  slowRequestSeverity,
} from "./_shared/monitoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, x-idempotency-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startMs = Date.now();

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return json({ error: "Missing x-api-key header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Supabase environment is not configured." }, 500);
    }

    const sb = createClient(supabaseUrl, serviceRoleKey);

    const keyHash = await sha256(apiKey);
    const { data: keyRow, error: keyErr } = await sb
      .from("api_keys")
      .select("id, user_id, is_active, rate_limit, total_requests")
      .eq("key_hash", keyHash)
      .single();

    if (keyErr || !keyRow) {
      await recordOperationalEvent(sb, {
        source: "edge_function",
        component: "api-gateway",
        eventType: "invalid_api_key",
        severity: "warning",
        message: "API gateway request rejected because the supplied API key was invalid.",
        statusCode: 401,
        metadata: {
          ip_address: req.headers.get("x-forwarded-for") ||
            req.headers.get("cf-connecting-ip") || null,
        },
      });
      return json({ error: "Invalid API key" }, 401);
    }

    if (!keyRow.is_active) {
      await recordOperationalEvent(sb, {
        source: "edge_function",
        component: "api-gateway",
        eventType: "inactive_api_key",
        severity: "warning",
        message: "API gateway request rejected because the API key is deactivated.",
        statusCode: 403,
        apiKeyId: keyRow.id,
        userId: keyRow.user_id,
      });
      return json({ error: "API key is deactivated" }, 403);
    }

    const { data: recentCount } = await sb.rpc("count_recent_requests", {
      p_api_key_id: keyRow.id,
      p_window_seconds: 60,
    });

    if (Number(recentCount ?? 0) >= keyRow.rate_limit) {
      await recordOperationalEvent(sb, {
        source: "edge_function",
        component: "api-gateway",
        eventType: "rate_limit_exceeded",
        severity: "warning",
        message: "API gateway request exceeded the per-minute rate limit.",
        statusCode: 429,
        apiKeyId: keyRow.id,
        userId: keyRow.user_id,
        metadata: {
          limit: keyRow.rate_limit,
          window_seconds: 60,
        },
      });
      return json(
        {
          error: "Rate limit exceeded",
          limit: keyRow.rate_limit,
          window: "60s",
        },
        429,
      );
    }

    let body: ExecutionRequestBody;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const idempotencyKey = req.headers.get("x-idempotency-key")?.trim();
    if (idempotencyKey && !body.request_id && !body.idempotency_key) {
      body.request_id = idempotencyKey;
    }

    const action = String(body.action ?? "") as SupportedAction;
    if (!VALID_ACTIONS.has(action)) {
      return json(
        { error: "Invalid action", valid_actions: [...VALID_ACTIONS] },
        400,
      );
    }

    const isTestMode = apiKey.startsWith("sk_test_");
    const outcome = await executeUnifiedAction({
      action,
      body,
      serviceClient: sb,
      billingUserId: keyRow.user_id,
      isTestMode,
    });

    const elapsedMs = Date.now() - startMs;
    const outcomeObject = asObject(outcome.body);
    const normalized = asObject(outcomeObject?.normalized);
    const state = String(normalized?.state ?? "");
    const provider = typeof normalized?.provider === "string" ? normalized.provider : undefined;
    const requestId = typeof normalized?.request_id === "string"
      ? normalized.request_id
      : typeof body.request_id === "string"
      ? body.request_id
      : undefined;

    await sb.from("api_gateway_logs").insert({
      api_key_id: keyRow.id,
      user_id: keyRow.user_id,
      action,
      status_code: outcome.status,
      response_time_ms: elapsedMs,
      ip_address: req.headers.get("x-forwarded-for") ||
        req.headers.get("cf-connecting-ip") || null,
    });

    await recordOperationalEvent(sb, {
      source: "edge_function",
      component: "api-gateway",
      eventType: outcome.status >= 500 ? "request_failed" : "request_processed",
      severity: severityForStatus(outcome.status),
      message: typeof normalized?.message === "string"
        ? normalized.message
        : `API gateway ${action} request completed with status ${outcome.status}.`,
      action,
      statusCode: outcome.status,
      durationMs: elapsedMs,
      requestId,
      userId: keyRow.user_id,
      apiKeyId: keyRow.id,
      provider,
      state,
      createAlert: shouldAlertForStatus(outcome.status),
      alertType: "api_gateway_failure",
      alertTitle: "API gateway request failure",
      alertDedupeKey: shouldAlertForStatus(outcome.status)
        ? `api-gateway:${action}:${outcome.status}`
        : undefined,
      metadata: {
        charged: outcome.charged,
        test_mode: outcome.isTestMode,
      },
    });

    if (elapsedMs >= 8000) {
      await recordOperationalEvent(sb, {
        source: "edge_function",
        component: "api-gateway",
        eventType: "slow_request",
        severity: slowRequestSeverity(elapsedMs),
        message: `API gateway ${action} request took ${elapsedMs}ms.`,
        action,
        statusCode: outcome.status,
        durationMs: elapsedMs,
        requestId,
        userId: keyRow.user_id,
        apiKeyId: keyRow.id,
        provider,
        state,
        createAlert: elapsedMs >= 15000,
        alertType: "slow_api_request",
        alertTitle: "Slow API gateway request",
        alertDedupeKey: elapsedMs >= 15000 ? `api-gateway:slow:${action}` : undefined,
      });
    }

    await sb
      .from("api_keys")
      .update({
        total_requests: (keyRow.total_requests ?? 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", keyRow.id);

    return json(outcome.body, outcome.status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("API Gateway error:", msg);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        const sb = createClient(supabaseUrl, serviceRoleKey);
        await recordOperationalEvent(sb, {
          source: "edge_function",
          component: "api-gateway",
          eventType: "uncaught_exception",
          severity: "critical",
          message: msg,
          statusCode: 500,
          createAlert: true,
          alertType: "api_gateway_exception",
          alertTitle: "API gateway exception",
          alertDedupeKey: "api-gateway:uncaught-exception",
        });
      }
    } catch {
      // Best effort only.
    }
    return json({ error: msg }, 500);
  }
});
