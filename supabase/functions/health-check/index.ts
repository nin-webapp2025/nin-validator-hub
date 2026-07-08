import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-health-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type CheckResult = {
  ok: boolean;
  detail?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const healthToken = Deno.env.get("HEALTH_CHECK_TOKEN");
  if (healthToken) {
    const incomingToken = req.headers.get("x-health-token")?.trim();
    if (!incomingToken || incomingToken !== healthToken) {
      return json({ ok: false, error: "Unauthorized health check request." }, 401);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const robosttechKey = Deno.env.get("ROBOSTTECH_API_KEY");
  const premblyKey = Deno.env.get("PREMBLY_API_KEY");
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  const smartApiKey = Deno.env.get("SMARTAPI_API_KEY");
  const smartApiPin = Deno.env.get("SMARTAPI_PIN");
  const smartApiWebhookToken = Deno.env.get("SMARTAPI_WEBHOOK_TOKEN");
  const jobWorkerToken = Deno.env.get("JOB_WORKER_TOKEN");

  const envChecks = {
    SUPABASE_URL: !!supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
    ROBOSTTECH_API_KEY: !!robosttechKey,
    PREMBLY_API_KEY: !!premblyKey,
    PAYSTACK_SECRET_KEY: !!paystackKey,
    SMARTAPI_API_KEY: !!smartApiKey,
    SMARTAPI_PIN: !!smartApiPin,
    SMARTAPI_WEBHOOK_TOKEN: !!smartApiWebhookToken,
    JOB_WORKER_TOKEN: !!jobWorkerToken,
  };

  if (!supabaseUrl || !serviceRoleKey) {
    return json({
      ok: false,
      status: "degraded",
      function: "health-check",
      timestamp: new Date().toISOString(),
      checks: {
        env: envChecks,
      },
      error: "Supabase environment is not configured correctly.",
    }, 500);
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);

  const tableChecks: Record<string, CheckResult> = {};
  let dbOk = true;

  const runTableCheck = async (table: string) => {
    const { error } = await sb.from(table).select("id", { count: "exact", head: true });
    if (error) {
      dbOk = false;
      tableChecks[table] = { ok: false, detail: error.message };
      return;
    }
    tableChecks[table] = { ok: true };
  };

  await Promise.all([
    runTableCheck("profiles"),
    runTableCheck("api_keys"),
    runTableCheck("background_jobs"),
    runTableCheck("operational_events"),
    runTableCheck("operational_alerts"),
    runTableCheck("wallet_transactions"),
    runTableCheck("vtu_products"),
    runTableCheck("vtu_transactions"),
  ]);

  const missingEnvCount = Object.values(envChecks).filter((value) => !value).length;
  const overallOk = dbOk && missingEnvCount === 0;

  return json({
    ok: overallOk,
    status: overallOk ? "ok" : "degraded",
    function: "health-check",
    timestamp: new Date().toISOString(),
    checks: {
      env: envChecks,
      database: {
        ok: dbOk,
      },
      tables: tableChecks,
    },
  }, overallOk ? 200 : 500);
});
