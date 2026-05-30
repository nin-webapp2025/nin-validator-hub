import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ACTION_TO_WALLET_OPERATION,
  executeUnifiedAction,
  type ExecutionRequestBody,
  type SupportedAction,
  VALID_ACTIONS,
} from "./_shared/unified-executor.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const body: ExecutionRequestBody = await req.json();
    const idempotencyKey = req.headers.get("x-idempotency-key")?.trim();
    if (idempotencyKey && !body.request_id && !body.idempotency_key) {
      body.request_id = idempotencyKey;
    }
    const action = String(body.action ?? "") as SupportedAction;

    if (!VALID_ACTIONS.has(action)) {
      return json({ error: "Invalid action", success: false }, 400);
    }

    let authenticatedUserId: string | null = null;
    const walletOperation = ACTION_TO_WALLET_OPERATION[action];

    if (walletOperation) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
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

    if (outcome.status >= 400) {
      return json(addStatusMetadata(outcome.body, outcome.status), 200);
    }

    return json(outcome.body, outcome.status);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    console.error("Edge function error:", errorMessage);

    return json({
      error: "Internal server error",
      message: errorMessage,
      success: false,
    });
  }
});
