import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Personalization } from "@/components/dashboard/Personalization";
import { PersonalizationHistory } from "@/components/dashboard/PersonalizationHistory";
import { PersonalizationStatus } from "@/components/dashboard/PersonalizationStatus";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNaira, OPERATION_PRICES } from "@/lib/wallet";

export default function UserPersonalizationPage() {
  const navigate = useNavigate();

  return (
    <UserJourneyPage
      eyebrow="Fulfillment Flow"
      title="Personalization"
      description="Submit personalization requests, check their status, and review recent activity from one page."
      steps={[
        {
          id: "request",
          label: "Submit request",
          title: "Start a personalization request",
          description: "Enter the required details for the personalization request.",
          content: <Personalization />,
        },
        {
          id: "status",
          label: "Track status",
          title: "Monitor personalization progress",
          description: "Check the current status of the request.",
          content: <PersonalizationStatus />,
        },
        {
          id: "review",
          label: "Review charge",
          title: "Confirm pricing and wallet readiness",
          description: "Wallet funding remains part of the same experience so the workflow feels coherent and fintech-like.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Personalization pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Each personalization request currently uses <strong>{formatNaira(OPERATION_PRICES.personalization)}</strong> from the wallet.
                </p>
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard/user/wallet")}>
                  Open wallet
                </Button>
              </CardContent>
            </Card>
          ),
        },
        {
          id: "history",
          label: "Recent activity",
          title: "Review recent personalization requests",
          description: "Review submitted requests and export records when needed.",
          content: <PersonalizationHistory />,
        },
      ]}
    />
  );
}
