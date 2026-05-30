import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BvnVerification } from "@/components/dashboard/BvnVerification";
import { BvnHistory } from "@/components/dashboard/BvnHistory";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNaira, OPERATION_PRICES } from "@/lib/wallet";

export default function UserBvnPage() {
  const navigate = useNavigate();

  return (
    <UserJourneyPage
      eyebrow="Verification Flow"
      title="BVN Verification"
      description="Submit BVN verification requests, review pricing, and track recent activity from one page."
      steps={[
        {
          id: "verify",
          label: "Verification",
          title: "Submit the BVN verification request",
          description: "Use the live BVN verification form on a focused page instead of inside a crowded dashboard tab.",
          content: <BvnVerification />,
        },
        {
          id: "review",
          label: "Review charge",
          title: "Confirm wallet readiness for BVN checks",
          description: "Use the wallet as the single funding source for this identity workflow.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  BVN pricing and workflow notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Each BVN verification deducts <strong>{formatNaira(OPERATION_PRICES.bvn_verification)}</strong> from the wallet.
                </p>
                <p>Use the wallet as the payment source for each verification request.</p>
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard/user/wallet")}>
                  Open wallet
                </Button>
              </CardContent>
            </Card>
          ),
        },
        {
          id: "history",
          label: "History",
          title: "Review recent BVN verification activity",
          description: "Track what has been submitted and export records when you need them.",
          content: <BvnHistory />,
        },
      ]}
    />
  );
}
