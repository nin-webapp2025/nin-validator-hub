import { Zap } from "lucide-react";
import { ElectricityPurchase } from "@/components/dashboard/ElectricityPurchase";
import { VtuPurchaseHistory } from "@/components/dashboard/VtuPurchaseHistory";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserElectricityPage() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Payments</p>
          <CardTitle className="mt-2 flex items-center gap-2 text-2xl">
            <Zap className="h-6 w-6 text-primary" /> Electricity
          </CardTitle>
          <CardDescription>Verify meters and pay electricity bills from your wallet.</CardDescription>
        </CardHeader>
      </Card>
      <ElectricityPurchase />
      <VtuPurchaseHistory category="electricity" />
    </div>
  );
}
