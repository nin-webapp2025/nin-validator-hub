import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole, UserRole, getDevRoleOverride, setDevRoleOverride } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bug, Shield, User, Briefcase, Crown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_META: Record<UserRole, { label: string; icon: typeof Shield; color: string; path: string }> = {
  admin: { label: "Admin", icon: Shield, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400", path: "/dashboard/admin" },
  user: { label: "User", icon: User, color: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400", path: "/dashboard/user" },
  staff: { label: "Staff", icon: Briefcase, color: "text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400", path: "/dashboard/staff" },
  vip: { label: "VIP", icon: Crown, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400", path: "/dashboard/vip" },
};

/**
 * Dev-mode role switcher — only rendered in development builds.
 * Lets you instantly preview any role's dashboard without touching the DB.
 */
export function DevRoleSwitcher() {
  // Never render in production
  if (import.meta.env.PROD) return null;

  const { role } = useRole();
  const navigate = useNavigate();
  const [override, setOverride] = useState<UserRole | null>(getDevRoleOverride);

  // Keep local state in sync with external changes
  useEffect(() => {
    const sync = () => setOverride(getDevRoleOverride());
    window.addEventListener("dev-role-changed", sync);
    return () => window.removeEventListener("dev-role-changed", sync);
  }, []);

  const handleSelect = (newRole: UserRole) => {
    setDevRoleOverride(newRole);
    setOverride(newRole);
    // Navigate to the matching dashboard
    navigate(ROLE_META[newRole].path, { replace: true });
  };

  const handleClear = () => {
    setDevRoleOverride(null);
    setOverride(null);
    // Refresh to re-route based on real role
    navigate("/dashboard", { replace: true });
  };

  const activeRole = override ?? role ?? "user";
  const meta = ROLE_META[activeRole];
  const Icon = meta.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 gap-1.5 text-xs font-mono border-dashed",
            override ? "border-orange-400 dark:border-orange-600" : "border-slate-300 dark:border-slate-700"
          )}
        >
          <Bug className="h-3 w-3 text-orange-500" />
          <Icon className="h-3 w-3" />
          {meta.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 dark:bg-slate-900 dark:border-slate-700">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-orange-500 flex items-center gap-1">
          <Bug className="h-3 w-3" /> Dev Role Switcher
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(ROLE_META) as UserRole[]).map((r) => {
          const m = ROLE_META[r];
          const RIcon = m.icon;
          const isActive = r === activeRole;
          return (
            <DropdownMenuItem
              key={r}
              onClick={() => handleSelect(r)}
              className={cn(
                "cursor-pointer gap-2",
                isActive && "bg-slate-100 dark:bg-slate-800 font-semibold"
              )}
            >
              <RIcon className={cn("h-4 w-4", m.color.split(" ")[0])} />
              <span>{m.label}</span>
              {isActive && <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">Active</Badge>}
            </DropdownMenuItem>
          );
        })}
        {override && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClear} className="cursor-pointer gap-2 text-orange-600 dark:text-orange-400">
              <X className="h-4 w-4" />
              <span>Clear Override</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
