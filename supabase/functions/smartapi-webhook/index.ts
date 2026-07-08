import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stringOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedToken = Deno.env.get("SMARTAPI_WEBHOOK_TOKEN")?.trim();
  const suppliedToken = new URL(req.url).searchParams.get("token")?.trim() ||
    req.headers.get("x-webhook-token")?.trim();

  if (!expectedToken || !suppliedToken || await hash(expectedToken) !== await hash(suppliedToken)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    const value = await req.json();
    payload = value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const reference = String(payload.reference ?? "").trim();
  if (!reference) return json({ error: "Missing transaction reference" }, 400);
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(reference)) {
    return json({ error: "Invalid transaction reference" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration is incomplete" }, 500);
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const byProviderReference = await sb
    .from("vtu_transactions")
    .select("user_id, request_key")
    .eq("provider_reference", reference)
    .maybeSingle();

  const byRequestKey = byProviderReference.data
    ? byProviderReference
    : await sb
      .from("vtu_transactions")
      .select("user_id, request_key")
      .eq("request_key", reference)
      .maybeSingle();
  const transaction = byRequestKey.data;
  const error = byProviderReference.error || byRequestKey.error;

  if (error) return json({ error: "Unable to match transaction" }, 500);
  if (!transaction) return json({ received: true, matched: false }, 202);

  const webhook = {
    code: stringOrNull(payload.code),
    status: stringOrNull(payload.status),
    response: stringOrNull(payload.response),
    reference,
    product: stringOrNull(payload.product),
    recipient: stringOrNull(payload.recipient),
    amount: stringOrNull(payload.amount),
    date: stringOrNull(payload.date),
    raw: payload,
  };

  const { error: enqueueError } = await sb.rpc("enqueue_background_job", {
    p_type: "vtu_status_poll",
    p_payload: {
      user_id: transaction.user_id,
      request_key: transaction.request_key,
      provider_reference: reference,
      webhook_status: webhook.status,
      webhook_code: webhook.code,
      webhook,
    },
    p_run_at: new Date().toISOString(),
    p_unique_key: `vtu-status:${transaction.request_key}`,
    p_max_attempts: 20,
  });

  if (enqueueError) return json({ error: "Unable to queue verification" }, 500);
  return json({ received: true, matched: true });
});
