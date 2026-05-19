import { Wallet } from "lucide-react";
import { ValidationForm } from "@/components/dashboard/ValidationForm";
import { ValidationHistory } from "@/components/dashboard/ValidationHistory";
import { ValidationStatus } from "@/components/dashboard/ValidationStatus";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatNaira, OPERATION_PRICES } from "@/lib/wallet";

export default function UserNinValidationPage() {
  const navigate = useNavigate();

  return (
    <UserJourneyPage
      eyebrow="Verification Flow"
      title="NIN Validation"
      description="Run a focused NIN validation flow with clear steps for submitting details, confirming the charge, checking processing status, and reviewing your recent requests."
      steps={[
        {
          id: "request",
          label: "Request details",
          title: "Enter the NIN validation details",
          description: "Start the workflow by submitting the identity information for the validation request.",
          content: <ValidationForm />,
        },
        {
          id: "review",
          label: "Review charge",
          title: "Confirm the request setup before submission",
          description: "Keep your wallet funded and make sure the validation request matches the user journey you intend to run.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Validation charge and readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  This workflow currently deducts <strong>{formatNaira(OPERATION_PRICES.nin_validation)}</strong> from the wallet for each NIN validation request.
                </p>
                <ul className="space-y-2">
                  <li>Use a valid 11-digit NIN and make sure the wallet is funded before submission.</li>
                  <li>Status checks happen separately, so you can submit now and track the request in the next step.</li>
                  <li>Your recent validations remain accessible from this page without going back to a master dashboard.</li>
                </ul>
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard/user/wallet")}>
                  Open wallet
                </Button>
              </CardContent>
            </Card>
          ),
        },
        {
          id: "status",
          label: "Track status",
          title: "Check the validation processing state",
          description: "Use the same page journey to confirm whether the submitted validation has completed.",
          content: <ValidationStatus />,
        },
        {
          id: "history",
          label: "Recent history",
          title: "Review your latest validation requests",
          description: "See the most recent submissions and export records when needed.",
          content: <ValidationHistory />,
        },
      ]}
    />
  );
}
