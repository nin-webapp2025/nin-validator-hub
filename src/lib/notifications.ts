import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link: string | null;
  created_at: string;
}

/**
 * Create a notification for the current user. Fire-and-forget.
 */
export async function createNotification(opts: {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from("notifications").insert({
      user_id: user.id,
      title: opts.title,
      message: opts.message,
      type: opts.type ?? "info",
      link: opts.link ?? null,
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(id: string) {
  await (supabase as any)
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase as any)
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
}
