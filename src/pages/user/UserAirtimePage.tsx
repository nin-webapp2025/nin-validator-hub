import { Wallet } from "lucide-react";
import { AirtimePurchase } from "@/components/dashboard/AirtimePurchase";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserAirtimePage() {
  return (
    <UserJourneyPage
      eyebrow="Payments Flow"
      title="Airtime"
      description="This page is ready for a fintech-style airtime purchase journey and is already laid out as a dedicated route for the upcoming provider integration."
      steps={[
        {
          id: "prepare",
          label: "Prepare purchase",
          title: "Choose network and amount",
          description: "The current page shell is ready to hold the live airtime purchase form as soon as the VTU provider is wired in.",
          content: <AirtimePurchase />,
        },
        {
          id: "wallet",
          label: "Wallet readiness",
          title: "Keep the balance funded for airtime flows",
          description: "The future live airtime purchase experience should use the wallet like every other fintech flow in the app.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Wallet-first design
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                Airtime is still in a pre-live state, but this dedicated route is already structured so the real provider integration can drop into a full page journey instead of a crowded dashboard tab.
              </CardContent>
            </Card>
          ),
        },
      ]}
    />
  );
}
