import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  executeUnifiedAction,
  type ExecutionRequestBody,
  type SupportedAction,
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
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BackgroundJob = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
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

function normalizedState(body: unknown) {
  const normalized = asObject(asObject(body)?.normalized);
  return String(normalized?.state ?? "unknown");
}

function normalizedMessage(body: unknown) {
  const normalized = asObject(asObject(body)?.normalized);
  return String(normalized?.message ?? asObject(body)?.message ?? "Background job processed.");
}

function mapHistoryStatus(state: string, body: unknown) {
  const normalized = asObject(asObject(body)?.normalized);
  const providerStatus = String(normalized?.provider_status ?? "").trim();

  if (state === "succeeded") return providerStatus || "success";
  if (state === "failed") return providerStatus || "failed";
  if (state === "pending") return providerStatus || "pending";
  if (state === "submitted") return providerStatus || "submitted";
  return providerStatus || state || "unknown";
}

async function updateHistory(
  sb: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  body: unknown,
) {
  const table = String(payload.history_table ?? "");
  const historyId = String(payload.history_id ?? "");
  const state = normalizedState(body);
  const status = mapHistoryStatus(state, body);
  const update: Record<string, unknown> = { status };

  if (table === "clearance_history") {
    update.response = body;
  } else {
    update.result = body;
  }

  if (historyId) {
    await sb.from(table).update(update).eq("id", historyId);
    return;
  }

  if (table === "validation_history" && payload.nin) {
    await sb.from(table)
      .update(update)
      .eq("user_id", payload.user_id)
      .eq("nin", payload.nin)
      .order("created_at", { ascending: false })
      .limit(1);
    return;
  }

  if (table === "personalization_history" && payload.tracking_id) {
    await sb.from(table)
      .update(update)
      .eq("user_id", payload.user_id)
      .eq("tracking_id", payload.tracking_id)
      .order("created_at", { ascending: false })
      .limit(1);
    return;
  }

  if (table === "clearance_history" && payload.tracking_id) {
    await sb.from(table)
      .update(update)
      .eq("user_id", payload.user_id)
      .eq("nin", payload.tracking_id)
      .order("created_at", { ascending: false })
      .limit(1);
  }
}

async function notifyUser(
  sb: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  body: unknown,
) {
  const userId = String(payload.user_id ?? "").trim();
  if (!userId) return;

  const action = String(payload.action ?? "");
  const state = normalizedState(body);
  const message = normalizedMessage(body);
  const title = state === "succeeded"
    ? `${action.replaceAll("_", " ")} completed`
    : state === "failed"
    ? `${action.replaceAll("_", " ")} failed`
    : `${action.replaceAll("_", " ")} updated`;

  await sb.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type: state === "failed" ? "error" : state === "succeeded" ? "success" : "info",
    link: "/dashboard/user",
  });
}

function pollDelaySeconds(attemptCount: number) {
  return Math.min(300 * Math.max(attemptCount, 1), 3600);
}

async function processProviderStatusPoll(
  sb: ReturnType<typeof createClient>,
  job: BackgroundJob,
) {
  const startedAt = Date.now();
  const payload = job.payload ?? {};
  const action = String(payload.action ?? "") as SupportedAction;
  const requestBody: ExecutionRequestBody = { action };

  if (payload.nin) requestBody.nin = String(payload.nin);
  if (payload.tracking_id) requestBody.tracking_id = String(payload.tracking_id);

  const outcome = await executeUnifiedAction({
    action,
    body: requestBody,
    serviceClient: sb,
  });

  await updateHistory(sb, payload, outcome.body);

  const state = normalizedState(outcome.body);
  const durationMs = Date.now() - startedAt;
  const normalized = asObject(asObject(outcome.body)?.normalized);
  const requestId = typeof normalized?.request_id === "string"
    ? normalized.request_id
    : undefined;

  await recordOperationalEvent(sb, {
    source: "background_job",
    component: "job-worker",
    eventType: outcome.status >= 500 ? "job_request_failed" : "job_request_processed",
    severity: severityForStatus(outcome.status),
    message: normalizedMessage(outcome.body),
    action,
    statusCode: outcome.status,
    durationMs,
    requestId,
    userId: typeof payload.user_id === "string" ? payload.user_id : undefined,
    jobId: job.id,
    provider: typeof normalized?.provider === "string" ? normalized.provider : undefined,
    state,
    createAlert: shouldAlertForStatus(outcome.status),
    alertType: "background_job_failure",
    alertTitle: "Background job request failure",
    alertDedupeKey: shouldAlertForStatus(outcome.status)
      ? `job-worker:${job.type}:${action}:${outcome.status}`
      : undefined,
    metadata: {
      attempt_count: job.attempt_count,
      max_attempts: job.max_attempts,
    },
  });

  if (durationMs >= 8000) {
    await recordOperationalEvent(sb, {
      source: "background_job",
      component: "job-worker",
      eventType: "slow_job_request",
      severity: slowRequestSeverity(durationMs),
      message: `${job.type} took ${durationMs}ms for ${action}.`,
      action,
      statusCode: outcome.status,
      durationMs,
      requestId,
      userId: typeof payload.user_id === "string" ? payload.user_id : undefined,
      jobId: job.id,
      provider: typeof normalized?.provider === "string" ? normalized.provider : undefined,
      state,
      createAlert: durationMs >= 15000,
      alertType: "slow_background_job",
      alertTitle: "Slow background job",
      alertDedupeKey: durationMs >= 15000 ? `job-worker:slow:${job.type}:${action}` : undefined,
    });
  }

  if (state === "pending" || state === "submitted") {
    await sb.rpc("reschedule_background_job", {
      p_job_id: job.id,
      p_delay_seconds: pollDelaySeconds(job.attempt_count),
      p_result: outcome.body,
    });
    return { rescheduled: true, state };
  }

  if (state === "failed" && outcome.status >= 500 && job.attempt_count < job.max_attempts) {
    await sb.rpc("fail_background_job", {
      p_job_id: job.id,
      p_error: normalizedMessage(outcome.body),
      p_result: outcome.body,
      p_retry_delay_seconds: pollDelaySeconds(job.attempt_count),
      p_force_terminal: false,
    });
    return { retried: true, state };
  }

  await sb.rpc("complete_background_job", {
    p_job_id: job.id,
    p_result: outcome.body,
  });

  await notifyUser(sb, payload, outcome.body);
  return { completed: true, state };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ success: false, error: "Supabase environment is not configured." }, 500);
    }

    const sb = createClient(supabaseUrl, serviceRoleKey);

    let body: { limit?: number; worker?: string; types?: string[] } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const workerName = body.worker?.trim() || "job-worker";
    const { data: jobs, error: claimError } = await sb.rpc("claim_background_jobs", {
      p_worker: workerName,
      p_limit: Math.max(1, Math.min(body.limit ?? 10, 50)),
      p_types: body.types ?? null,
    });

    if (claimError) {
      await recordOperationalEvent(sb, {
        source: "background_job",
        component: "job-worker",
        eventType: "claim_failed",
        severity: "error",
        message: claimError.message,
        statusCode: 500,
        createAlert: true,
        alertType: "background_job_claim_failure",
        alertTitle: "Background job claim failed",
        alertDedupeKey: "job-worker:claim-failed",
      });
      return json({ success: false, error: claimError.message }, 500);
    }

    const claimedJobs = (jobs ?? []) as BackgroundJob[];
    const results: Array<Record<string, unknown>> = [];

    for (const job of claimedJobs) {
      try {
        if (job.type === "provider_status_poll") {
          const result = await processProviderStatusPoll(sb, job);
          results.push({ job_id: job.id, type: job.type, ...result });
          continue;
        }

        await sb.rpc("fail_background_job", {
          p_job_id: job.id,
          p_error: `Unknown job type: ${job.type}`,
          p_result: { type: job.type },
          p_retry_delay_seconds: 0,
          p_force_terminal: true,
        });
        await recordOperationalEvent(sb, {
          source: "background_job",
          component: "job-worker",
          eventType: "unknown_job_type",
          severity: "error",
          message: `Unknown job type: ${job.type}`,
          statusCode: 500,
          jobId: job.id,
          createAlert: true,
          alertType: "unknown_background_job_type",
          alertTitle: "Unknown background job type",
          alertDedupeKey: `job-worker:unknown:${job.type}`,
        });
        results.push({ job_id: job.id, type: job.type, failed: true, reason: "unknown job type" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown job error";
        await sb.rpc("fail_background_job", {
          p_job_id: job.id,
          p_error: message,
          p_result: { error: message },
          p_retry_delay_seconds: pollDelaySeconds(job.attempt_count),
          p_force_terminal: false,
        });
        await recordOperationalEvent(sb, {
          source: "background_job",
          component: "job-worker",
          eventType: "job_iteration_failed",
          severity: "error",
          message,
          statusCode: 500,
          jobId: job.id,
          createAlert: true,
          alertType: "background_job_iteration_failure",
          alertTitle: "Background job processing failed",
          alertDedupeKey: `job-worker:job-failure:${job.type}`,
          metadata: {
            attempt_count: job.attempt_count,
            max_attempts: job.max_attempts,
          },
        });
        results.push({ job_id: job.id, type: job.type, failed: true, reason: message });
      }
    }

    await recordOperationalEvent(sb, {
      source: "background_job",
      component: "job-worker",
      eventType: "worker_run_completed",
      severity: "info",
      message: `Worker claimed ${claimedJobs.length} jobs.`,
      statusCode: 200,
      metadata: {
        worker: workerName,
        claimed: claimedJobs.length,
        requested_limit: Math.max(1, Math.min(body.limit ?? 10, 50)),
      },
    });

    return json({
      success: true,
      claimed: claimedJobs.length,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Job worker error:", message);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        const sb = createClient(supabaseUrl, serviceRoleKey);
        await recordOperationalEvent(sb, {
          source: "background_job",
          component: "job-worker",
          eventType: "uncaught_exception",
          severity: "critical",
          message,
          statusCode: 500,
          createAlert: true,
          alertType: "job_worker_exception",
          alertTitle: "Job worker exception",
          alertDedupeKey: "job-worker:uncaught-exception",
        });
      }
    } catch {
      // Best effort only.
    }
    return json({ success: false, error: message }, 500);
  }
});
