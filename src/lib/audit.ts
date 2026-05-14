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

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) return;

    await (supabase as any).rpc("insert_audit_log", {
      p_action: entry.action,
      p_target_type: entry.target_type,
      p_target_id: entry.target_id ?? null,
      p_metadata: entry.metadata ?? {},
    });
  } catch (err) {
    console.error("Audit log insert failed:", err);
  }
}
