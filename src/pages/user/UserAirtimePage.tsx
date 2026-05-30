import { Wallet } from "lucide-react";
import { AirtimePurchase } from "@/components/dashboard/AirtimePurchase";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserAirtimePage() {
  return (
    <UserJourneyPage
      eyebrow="Payments Flow"
      title="Airtime"
      description="Buy airtime for major Nigerian mobile networks from one dedicated page."
      steps={[
        {
          id: "prepare",
          label: "Prepare purchase",
          title: "Choose network and amount",
          description: "Select the mobile network, phone number, and amount for the airtime purchase.",
          content: <AirtimePurchase />,
        },
        {
          id: "wallet",
          label: "Wallet",
          title: "Use your wallet for payments",
          description: "Wallet funding stays central to airtime purchases and other account activity.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Wallet payments
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                Keep your wallet funded so purchases and service charges can be managed from one place.
              </CardContent>
            </Card>
          ),
        },
      ]}
    />
  );
}
