import type { UserRole } from "@/hooks/useRole";

const DEV_ROLE_KEY = "sparkid_dev_role";
const VALID_ROLES: UserRole[] = ["admin", "user", "staff"];

interface StoredOverride {
  userId: string;
  role: UserRole;
}

function readStored(): StoredOverride | null {
  const raw = localStorage.getItem(DEV_ROLE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.userId === "string" &&
      VALID_ROLES.includes(parsed.role)
    ) {
      return parsed as StoredOverride;
    }
  } catch {
    // Malformed value (e.g. left over from an older format) — ignore it.
  }
  return null;
}

/**
 * Read the dev-mode role override for a specific user.
 *
 * Scoped per user id so an override set while testing one account can never
 * leak onto a different account signed into the same browser — the bug that
 * previously made every user look like an admin once anyone had used the
 * switcher. Returns null in production builds, when there's no signed-in
 * user, or when the stored override belongs to a different user.
 */
export function getDevRoleOverride(userId: string | null | undefined): UserRole | null {
  if (import.meta.env.PROD || !userId) return null;
  const stored = readStored();
  return stored && stored.userId === userId ? stored.role : null;
}

/** Set or clear the dev-mode role override for a specific user. */
export function setDevRoleOverride(role: UserRole | null, userId: string | null | undefined) {
  if (role && userId) {
    localStorage.setItem(DEV_ROLE_KEY, JSON.stringify({ userId, role }));
  } else {
    localStorage.removeItem(DEV_ROLE_KEY);
  }
  // Dispatch so other hooks/components (e.g. useRole) react immediately.
  window.dispatchEvent(new Event("dev-role-changed"));
}

/** Unconditionally clear any stored override — used on sign-out. */
export function clearDevRoleOverride() {
  localStorage.removeItem(DEV_ROLE_KEY);
  window.dispatchEvent(new Event("dev-role-changed"));
}
