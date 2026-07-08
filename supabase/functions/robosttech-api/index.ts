import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ACTION_TO_WALLET_OPERATION,
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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, x-idempotency-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function addStatusMetadata(body: unknown, status: number) {
  if (status < 400) return body;

  if (body && typeof body === "object" && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>), __upstream_status: status };
  }

  return { data: body, __upstream_status: status };
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startMs = Date.now();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({
        error: "Supabase environment is not configured.",
        success: false,
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    let body: ExecutionRequestBody;
    try {
      body = await req.json();
    } catch {
      await recordOperationalEvent(serviceClient, {
        source: "edge_function",
        component: "robosttech-api",
        eventType: "invalid_json",
        severity: "warning",
        message: "RobostTech edge function received an invalid JSON body.",
        statusCode: 400,
      });
      return json({ error: "Invalid JSON body", success: false }, 400);
    }
    const idempotencyKey = req.headers.get("x-idempotency-key")?.trim();
    if (idempotencyKey && !body.request_id && !body.idempotency_key) {
      body.request_id = idempotencyKey;
    }
    const action = String(body.action ?? "") as SupportedAction;

    if (!VALID_ACTIONS.has(action)) {
      await recordOperationalEvent(serviceClient, {
        source: "edge_function",
        component: "robosttech-api",
        eventType: "invalid_action",
        severity: "warning",
        message: "RobostTech edge function rejected a request with an invalid action.",
        action,
        statusCode: 400,
      });
      return json({ error: "Invalid action", success: false }, 400);
    }

    let authenticatedUserId: string | null = null;
    const walletOperation = ACTION_TO_WALLET_OPERATION[action];
    const requiresAuthentication = !!walletOperation || action === "vtu_query";

    if (requiresAuthentication) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        await recordOperationalEvent(serviceClient, {
          source: "edge_function",
          component: "robosttech-api",
          eventType: "missing_auth",
          severity: "warning",
          message: "Billable RobostTech request was rejected because no auth header was supplied.",
          action,
          statusCode: 401,
          requestId: typeof body.request_id === "string" ? body.request_id : undefined,
        });
        return json(
          {
            success: false,
            error: "Authentication required. Please sign in and try again.",
          },
          401,
        );
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authError,
      } = await userClient.auth.getUser();

      if (authError || !user) {
        await recordOperationalEvent(serviceClient, {
          source: "edge_function",
          component: "robosttech-api",
          eventType: "invalid_session",
          severity: "warning",
          message: "Billable RobostTech request failed user session verification.",
          action,
          statusCode: 401,
          requestId: typeof body.request_id === "string" ? body.request_id : undefined,
        });
        return json(
          {
            success: false,
            error: "Unable to verify your session. Please sign in again.",
          },
          401,
        );
      }

      authenticatedUserId = user.id;
    }

    const outcome = await executeUnifiedAction({
      action,
      body,
      serviceClient,
      billingUserId: authenticatedUserId,
    });
    const elapsedMs = Date.now() - startMs;
    const outcomeObject = asObject(outcome.body);
    const normalized = asObject(outcomeObject?.normalized);
    const state = typeof normalized?.state === "string" ? normalized.state : undefined;
    const provider = typeof normalized?.provider === "string" ? normalized.provider : undefined;
    const requestId = typeof normalized?.request_id === "string"
      ? normalized.request_id
      : typeof body.request_id === "string"
      ? body.request_id
      : undefined;

    await recordOperationalEvent(serviceClient, {
      source: "edge_function",
      component: "robosttech-api",
      eventType: outcome.status >= 500 ? "request_failed" : "request_processed",
      severity: severityForStatus(outcome.status),
      message: typeof normalized?.message === "string"
        ? normalized.message
        : `RobostTech ${action} request completed with status ${outcome.status}.`,
      action,
      statusCode: outcome.status,
      durationMs: elapsedMs,
      requestId,
      userId: authenticatedUserId,
      provider,
      state,
      createAlert: shouldAlertForStatus(outcome.status),
      alertType: "robosttech_request_failure",
      alertTitle: "RobostTech request failure",
      alertDedupeKey: shouldAlertForStatus(outcome.status)
        ? `robosttech-api:${action}:${outcome.status}`
        : undefined,
      metadata: {
        charged: outcome.charged,
        wallet_operation: outcome.walletOperation ?? null,
      },
    });

    if (elapsedMs >= 8000) {
      await recordOperationalEvent(serviceClient, {
        source: "edge_function",
        component: "robosttech-api",
        eventType: "slow_request",
        severity: slowRequestSeverity(elapsedMs),
        message: `RobostTech ${action} request took ${elapsedMs}ms.`,
        action,
        statusCode: outcome.status,
        durationMs: elapsedMs,
        requestId,
        userId: authenticatedUserId,
        provider,
        state,
        createAlert: elapsedMs >= 15000,
        alertType: "slow_robosttech_request",
        alertTitle: "Slow RobostTech request",
        alertDedupeKey: elapsedMs >= 15000 ? `robosttech-api:slow:${action}` : undefined,
      });
    }

    if (outcome.status >= 400) {
      return json(addStatusMetadata(outcome.body, outcome.status), 200);
    }

    return json(outcome.body, outcome.status);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    console.error("Edge function error:", errorMessage);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        const serviceClient = createClient(supabaseUrl, serviceRoleKey);
        await recordOperationalEvent(serviceClient, {
          source: "edge_function",
          component: "robosttech-api",
          eventType: "uncaught_exception",
          severity: "critical",
          message: errorMessage,
          statusCode: 500,
          createAlert: true,
          alertType: "robosttech_exception",
          alertTitle: "RobostTech edge exception",
          alertDedupeKey: "robosttech-api:uncaught-exception",
        });
      }
    } catch {
      // Best effort only.
    }

    return json({
      error: "Internal server error",
      message: errorMessage,
      success: false,
    });
  }
});
