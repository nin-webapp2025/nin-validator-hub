import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppFooter } from "@/components/dashboard/AppFooter";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  USER_NAV_GROUPS,
  USER_SECONDARY_LINK,
} from "@/components/dashboard/userAppNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function UserAppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fef3c7_0%,#f8fafc_32%,#fffbeb_100%)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a_0%,#020617_40%,#020617_100%)]">
      <DashboardHeader
        onNavigateToProfile={() => navigate("/dashboard/user/profile")}
        onNavigateToWallet={() => navigate("/dashboard/user/wallet")}
      />

      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <Card className="sticky top-24 overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_14px_44px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="border-b border-slate-200/80 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-950/50">
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">
                  Sparklabid
                </CardTitle>
                <CardDescription>
                  Identity services and account tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-4">
                {USER_NAV_GROUPS.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          item.path === "/dashboard/user"
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);

                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={cn(
                              "flex items-start gap-3 rounded-2xl px-3 py-3 transition-all",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                            )}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{item.label}</p>
                              <p className={cn("text-xs", isActive ? "text-primary-foreground/80" : "text-slate-500 dark:text-slate-400")}>
                                {item.description}
                              </p>
                            </div>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <NavLink
                    to={USER_SECONDARY_LINK.path}
                    className="flex items-start gap-3 rounded-xl text-slate-700 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                  >
                    <USER_SECONDARY_LINK.icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{USER_SECONDARY_LINK.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {USER_SECONDARY_LINK.description}
                      </p>
                    </div>
                  </NavLink>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="min-w-0 space-y-6">
            <Outlet />
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
