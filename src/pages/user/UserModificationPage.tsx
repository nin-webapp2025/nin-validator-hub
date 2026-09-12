import { useState } from "react";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { NinModificationWizard } from "@/components/dashboard/NinModificationWizard";
import { MyModificationRequests } from "@/components/dashboard/MyModificationRequests";

export default function UserModificationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <UserJourneyPage
      eyebrow="Request Workflow"
      title="NIN Modification"
      description="Verify your NIN, review what's on record, then pay to submit a modification request and track it through to completion."
      steps={[
        {
          id: "submit",
          label: "Verify & submit",
          title: "Verify your NIN and submit a modification request",
          description:
            "We verify your NIN first so you can confirm your real record before deciding what to change. The modification fee is charged from your wallet only after you submit — your request is sent to the admin team right after payment succeeds.",
          content: <NinModificationWizard onSubmitted={() => setRefreshKey((current) => current + 1)} />,
        },
        {
          id: "track",
          label: "Track progress",
          title: "Monitor review and processing updates",
          description: "See the latest request status, timestamps, and notes from the admin or processing team.",
          content: <MyModificationRequests refreshKey={refreshKey} />,
        },
      ]}
    />
  );
}
