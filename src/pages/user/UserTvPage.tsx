import { Tv } from "lucide-react";
import { TvSubscriptionPurchase } from "@/components/dashboard/TvSubscriptionPurchase";
import { VtuPurchaseHistory } from "@/components/dashboard/VtuPurchaseHistory";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserTvPage() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Payments</p>
          <CardTitle className="mt-2 flex items-center gap-2 text-2xl">
            <Tv className="h-6 w-6 text-primary" /> TV Subscription
          </CardTitle>
          <CardDescription>Verify a smartcard and pay for TV subscriptions.</CardDescription>
        </CardHeader>
      </Card>
      <TvSubscriptionPurchase />
      <VtuPurchaseHistory category="tv" />
    </div>
  );
}
