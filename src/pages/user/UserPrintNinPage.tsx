import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PrintNinSlip } from "@/components/dashboard/PrintNinSlip";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNaira, OPERATION_PRICES } from "@/lib/wallet";

export default function UserPrintNinPage() {
  const navigate = useNavigate();

  return (
    <UserJourneyPage
      eyebrow="Fulfillment Flow"
      title="Print NIN"
      description="Handle NIN slip printing inside a dedicated service page so the journey feels closer to a modern fintech task flow."
      steps={[
        {
          id: "request",
          label: "Print request",
          title: "Prepare and submit the print request",
          description: "Use the full print tool without sharing space with unrelated dashboard content.",
          content: <PrintNinSlip />,
        },
        {
          id: "review",
          label: "Review charge",
          title: "Confirm print pricing and wallet readiness",
          description: "The wallet remains the core payment rail for printing flows.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Print NIN pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Printing currently uses either <strong>{formatNaira(OPERATION_PRICES.print_nin_slip_premium)}</strong> for premium slips or{" "}
                  <strong>{formatNaira(OPERATION_PRICES.print_nin_slip_long)}</strong> for long slips.
                </p>
                <p>
                  If you need to add funds before printing, jump to the wallet and come right back into this routed page.
                </p>
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard/user/wallet")}>
                  Open wallet
                </Button>
              </CardContent>
            </Card>
          ),
        },
        {
          id: "next-actions",
          label: "Next actions",
          title: "Continue into other fulfillment workflows",
          description: "Printing often follows validation or search, so keep those follow-up routes close at hand.",
          content: (
            <div className="grid gap-3 md:grid-cols-3">
              <ActionLink
                label="NIN Search"
                description="Return to search before printing another slip."
                onClick={() => navigate("/dashboard/user/nin-search")}
              />
              <ActionLink
                label="NIN Validation"
                description="Validate another identity before generating the next document."
                onClick={() => navigate("/dashboard/user/nin-validation")}
              />
              <ActionLink
                label="Wallet"
                description="Review wallet deductions and top up again."
                onClick={() => navigate("/dashboard/user/wallet")}
              />
            </div>
          ),
        },
      ]}
    />
  );
}

function ActionLink({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70"
    >
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </button>
  );
}
