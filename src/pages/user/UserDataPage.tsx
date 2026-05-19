import { Wallet } from "lucide-react";
import { DataPurchase } from "@/components/dashboard/DataPurchase";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserDataPage() {
  return (
    <UserJourneyPage
      eyebrow="Payments Flow"
      title="Mobile Data"
      description="This page gives mobile data its own route and journey so the eventual provider integration lands inside a proper fintech experience."
      steps={[
        {
          id: "prepare",
          label: "Prepare purchase",
          title: "Select bundle and phone number",
          description: "The current page shell is ready for the live data purchase flow once the VTU provider is connected.",
          content: <DataPurchase />,
        },
        {
          id: "wallet",
          label: "Wallet readiness",
          title: "Design the future purchase around wallet funding",
          description: "This page already keeps the app structure ready for wallet-backed data purchases.",
          content: (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Provider-ready page flow
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                Mobile data still uses a non-live placeholder flow today, but the route, layout, and page journey are now ready for a real fintech implementation later.
              </CardContent>
            </Card>
          ),
        },
      ]}
    />
  );
}
