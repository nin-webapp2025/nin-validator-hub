import { supabase } from "@/integrations/supabase/client";

type PollAction = "validation_status" | "clearance_status" | "personalization_status";

interface ProviderStatusPollJob {
  user_id: string;
  action: PollAction;
  history_table: "validation_history" | "clearance_history" | "personalization_history";
  history_id?: string;
  tracking_id?: string;
  nin?: string;
}

export async function enqueueProviderStatusPoll(
  payload: ProviderStatusPollJob,
  uniqueKey: string,
  runAt?: string,
) {
  try {
    await (supabase as any).rpc("enqueue_background_job", {
      p_type: "provider_status_poll",
      p_payload: payload,
      p_run_at: runAt ?? new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      p_unique_key: uniqueKey,
      p_max_attempts: 12,
    });
  } catch (error) {
    console.error("Failed to enqueue background job:", error);
  }
}
