import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type MonitoringClient = ReturnType<typeof createClient>;

export interface OperationalEventInput {
  source: string;
  component: string;
  eventType: string;
  severity?: "info" | "warning" | "error" | "critical";
  message?: string;
  action?: string;
  statusCode?: number;
  durationMs?: number;
  requestId?: string;
  userId?: string | null;
  apiKeyId?: string | null;
  jobId?: string | null;
  provider?: string;
  state?: string;
  metadata?: Record<string, unknown>;
  createAlert?: boolean;
  alertType?: string;
  alertTitle?: string;
  alertDedupeKey?: string;
}

export async function recordOperationalEvent(
  serviceClient: MonitoringClient,
  input: OperationalEventInput,
) {
  try {
    await serviceClient.rpc("record_operational_event", {
      p_source: input.source,
      p_component: input.component,
      p_event_type: input.eventType,
      p_severity: input.severity ?? "info",
      p_message: input.message ?? null,
      p_action: input.action ?? null,
      p_status_code: input.statusCode ?? null,
      p_duration_ms: input.durationMs ?? null,
      p_request_id: input.requestId ?? null,
      p_user_id: input.userId ?? null,
      p_api_key_id: input.apiKeyId ?? null,
      p_job_id: input.jobId ?? null,
      p_provider: input.provider ?? null,
      p_state: input.state ?? null,
      p_metadata: input.metadata ?? {},
      p_create_alert: input.createAlert ?? false,
      p_alert_type: input.alertType ?? null,
      p_alert_title: input.alertTitle ?? null,
      p_alert_dedupe_key: input.alertDedupeKey ?? null,
    });
  } catch (error) {
    console.error("Operational event logging failed:", error);
  }
}

export function severityForStatus(statusCode: number) {
  if (statusCode >= 500) return "error" as const;
  if (statusCode >= 429) return "warning" as const;
  if (statusCode >= 400) return "warning" as const;
  return "info" as const;
}

export function shouldAlertForStatus(statusCode: number) {
  return statusCode >= 500;
}

export function slowRequestSeverity(durationMs: number) {
  if (durationMs >= 15000) return "error" as const;
  if (durationMs >= 8000) return "warning" as const;
  return "info" as const;
}
