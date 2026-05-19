import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Wallet } from "lucide-react";
import { WalletBalance } from "@/components/dashboard/WalletBalance";
import { WalletTopUp } from "@/components/dashboard/WalletTopUp";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UserWalletPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <WalletBalance
        variant="hero"
        onClick={() => undefined}
        title="Wallet Center"
        subtitle="Top up once, track every deduction, and keep your identity workflows funded from one place."
      />

      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Wallet Journey
            </p>
            <CardTitle className="mt-2 text-2xl text-slate-900 dark:text-slate-100">
              Fund, review, and keep moving
            </CardTitle>
            <CardDescription>
              This page is your money hub for funding, pricing awareness, and transaction review.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate("/dashboard/user/nin-validation")}>
            Back to services
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <WalletTopUp />
        <TransactionHistory />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <WalletShortcut
          icon={Wallet}
          title="Fund and go"
          description="Top up from Paystack and continue straight back into the active service page."
        />
        <WalletShortcut
          icon={ArrowUpRight}
          title="See deductions"
          description="Every wallet-powered service charge is tracked here for easy reconciliation."
        />
        <WalletShortcut
          icon={ArrowUpRight}
          title="Power the app"
          description="The same wallet supports verification, fulfillment, printing, and future fintech purchases."
        />
      </div>
    </div>
  );
}

function WalletShortcut({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Wallet;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
