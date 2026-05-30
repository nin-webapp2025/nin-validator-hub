import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ClearanceForm from "@/components/dashboard/ClearanceForm";
import ClearanceStatus from "@/components/dashboard/ClearanceStatus";
import { ClearanceHistory } from "@/components/dashboard/ClearanceHistory";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNaira, OPERATION_PRICES } from "@/lib/wallet";

export default function UserClearancePage() {
  const navigate = useNavigate();

  return (
    <UserJourneyPage
      eyebrow="Clearance Flow"
      title="Clearance"
      description="Run clearance checks, track the status, and review recent activity from one page."
      steps={[
        {
          id: "request",
          label: "Submit request",
          title: "Start the clearance request",
          description: "Provide the details needed to run the clearance workflow.",
          content: <ClearanceForm />,
        },
        {
          id: "monitor",
          label: "Monitor result",
          title: "Check the clearance status",
          description: "Use the built-in status view to keep an eye on the approval workflow from the same page.",
          content: <ClearanceStatus />,
        },
        {
          id: "review",
          label: "Review charge",
          title: "Keep the wallet ready for more requests",
          description: "Clearance requests remain wallet-funded, with pricing shown clearly before submission.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Clearance pricing and prep
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Each clearance request currently uses <strong>{formatNaira(OPERATION_PRICES.clearance)}</strong> from the wallet.
                </p>
                <p>Fund the wallet before repeated checks to avoid interruptions.</p>
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard/user/wallet")}>
                  Open wallet
                </Button>
              </CardContent>
            </Card>
          ),
        },
        {
          id: "history",
          label: "Recent requests",
          title: "Review your recent clearance activity",
          description: "Review what has already been submitted and export records when needed.",
          content: <ClearanceHistory />,
        },
      ]}
    />
  );
}
