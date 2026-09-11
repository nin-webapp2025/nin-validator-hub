import { useNavigate } from "react-router-dom";

import { WalletBalance } from "@/components/dashboard/WalletBalance";
import { RecentActivityPreview } from "@/components/dashboard/RecentActivityPreview";
import { USER_NAV_GROUPS } from "@/components/dashboard/userAppNavigation";
import { cn } from "@/lib/utils";

const quickActions = USER_NAV_GROUPS.flatMap((group) => group.items).filter(
  (item) => item.quickAction,
);
const allServices = USER_NAV_GROUPS.flatMap((group) => group.items).filter(
  (item) => item.path !== "/dashboard/user",
);

export default function UserOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <WalletBalance
        variant="hero"
        title="Wallet Balance"
        subtitle="Use your wallet across verification, printing, fulfillment, and account activity."
        onClick={() => navigate("/dashboard/user/wallet")}
      />

      {/* Quick actions — the 3 things most people come here to do, not the full 13-item menu */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Quick actions
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-all",
                  "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-spark",
                  "dark:border-slate-800 dark:bg-slate-900",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.label}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <RecentActivityPreview />

      {/* Everything else — present, but visually quieter than the actions above */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          All services
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {allServices.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="truncate font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
