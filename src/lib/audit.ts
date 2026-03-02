import { supabase } from "@/integrations/supabase/client";

interface AuditEntry {
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert an audit log entry. Fire-and-forget — does not throw.
 */
export async function logAuditEvent(entry: AuditEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from("audit_log").insert({
      actor_id: user.id,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    console.error("Audit log insert failed:", err);
  }
}
