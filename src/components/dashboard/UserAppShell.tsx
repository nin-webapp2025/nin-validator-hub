import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppFooter } from "@/components/dashboard/AppFooter";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  USER_NAV_GROUPS,
  USER_QUICK_ACTIONS,
  USER_SECONDARY_LINK,
} from "@/components/dashboard/userAppNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UserAppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fafc_32%,#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a_0%,#020617_40%,#020617_100%)]">
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
                  SparkID Workspace
                </CardTitle>
                <CardDescription>
                  Move through services like a modern fintech app, one page at a time.
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
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                            )}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{item.label}</p>
                              <p className={cn("text-xs", isActive ? "text-blue-100/90" : "text-slate-500 dark:text-slate-400")}>
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
            <Card className="border-slate-200/80 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
              <CardContent className="space-y-4 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Quick Navigation
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Jump between your main fintech workflows without going back to a single dashboard tab wall.
                  </p>
                </div>
                <div className="overflow-x-auto -mx-1 px-1 no-scrollbar">
                  <div className="flex w-max gap-2">
                    {USER_NAV_GROUPS.flatMap((group) => group.items)
                      .filter((item) => USER_QUICK_ACTIONS.includes(item.path) || item.path === "/dashboard/user")
                      .map((item) => {
                        const isActive =
                          item.path === "/dashboard/user"
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        const Icon = item.icon;

                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold whitespace-nowrap transition",
                              isActive
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </NavLink>
                        );
                      })}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => navigate(USER_SECONDARY_LINK.path)}
                >
                  <USER_SECONDARY_LINK.icon className="h-4 w-4" />
                  {USER_SECONDARY_LINK.label}
                </Button>
              </CardContent>
            </Card>

            <Outlet />
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
