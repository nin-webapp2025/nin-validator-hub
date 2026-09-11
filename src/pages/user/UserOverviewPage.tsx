import { useNavigate } from "react-router-dom";

import { WalletBalance } from "@/components/dashboard/WalletBalance";
import { RecentActivityPreview } from "@/components/dashboard/RecentActivityPreview";
import { USER_NAV_GROUPS } from "@/components/dashboard/userAppNavigation";
import { cn } from "@/lib/utils";

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

      <RecentActivityPreview />

      {/* All services — one tile grid, icon + short label, matching the
          "services grid under the balance card" pattern most Nigerian
          fintech apps use. */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          All services
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {allServices.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                title={item.description}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center transition-all",
                  "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-spark",
                  "dark:border-slate-800 dark:bg-slate-900",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-display text-xs font-semibold leading-tight text-slate-900 dark:text-slate-100">
                  {item.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
