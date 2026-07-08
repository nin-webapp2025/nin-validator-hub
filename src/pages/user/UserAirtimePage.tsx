import { Smartphone } from "lucide-react";
import { AirtimePurchase } from "@/components/dashboard/AirtimePurchase";
import { VtuPurchaseHistory } from "@/components/dashboard/VtuPurchaseHistory";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserAirtimePage() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Payments</p>
          <CardTitle className="mt-2 flex items-center gap-2 text-2xl">
            <Smartphone className="h-6 w-6 text-blue-600" /> Airtime
          </CardTitle>
          <CardDescription>Buy airtime and track provider confirmation from one page.</CardDescription>
        </CardHeader>
      </Card>
      <AirtimePurchase />
      <VtuPurchaseHistory category="airtime" />
    </div>
  );
}
