import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NinSearch from "@/components/dashboard/NinSearch";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNaira, OPERATION_PRICES } from "@/lib/wallet";

export default function UserNinSearchPage() {
  const navigate = useNavigate();

  return (
    <UserJourneyPage
      eyebrow="Search Flow"
      title="NIN Search"
      description="Search by NIN, phone number, or demographic data in a dedicated page flow that feels more focused than the old embedded tab experience."
      steps={[
        {
          id: "search",
          label: "Search request",
          title: "Choose the lookup method and run the search",
          description: "All three supported NIN search methods are available here without leaving the page.",
          content: <NinSearch />,
        },
        {
          id: "review",
          label: "Review charges",
          title: "Prepare the wallet for the selected lookup",
          description: "Use the wallet shortcut to top up before switching back into the search flow.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Search pricing and readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Dashboard search operations use your wallet balance, including demographic lookups at{" "}
                  <strong>{formatNaira(OPERATION_PRICES.nin_verification)}</strong>.
                </p>
                <p>
                  Keep the wallet funded and use the correct identifier for the search mode you choose so the experience stays fast and predictable.
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
          title: "Move to the next service without losing context",
          description: "After a search, it is common to continue into validation, printing, or another wallet-powered workflow.",
          content: (
            <div className="grid gap-3 md:grid-cols-3">
              <NextActionCard
                label="NIN Validation"
                description="Run a dedicated validation workflow after a successful lookup."
                onClick={() => navigate("/dashboard/user/nin-validation")}
              />
              <NextActionCard
                label="Print NIN"
                description="Continue to print a slip after confirming the identity details."
                onClick={() => navigate("/dashboard/user/print-nin")}
              />
              <NextActionCard
                label="Wallet"
                description="Review deductions and top up again without leaving the user workspace."
                onClick={() => navigate("/dashboard/user/wallet")}
              />
            </div>
          ),
        },
      ]}
    />
  );
}

function NextActionCard({
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
