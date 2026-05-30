import { Wallet } from "lucide-react";
import { DataPurchase } from "@/components/dashboard/DataPurchase";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserDataPage() {
  return (
    <UserJourneyPage
      eyebrow="Payments Flow"
      title="Mobile Data"
      description="Buy data bundles from a dedicated mobile data page."
      steps={[
        {
          id: "prepare",
          label: "Prepare purchase",
          title: "Select bundle and phone number",
          description: "Choose the network, plan, and phone number for the data purchase.",
          content: <DataPurchase />,
        },
        {
          id: "wallet",
          label: "Wallet",
          title: "Use your wallet for payments",
          description: "Wallet funding supports data purchases and other account activity.",
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
