import { useState } from "react";
import { UserJourneyPage } from "@/components/dashboard/UserJourneyPage";
import { VipModificationForm } from "@/components/dashboard/VipModificationForm";
import { MyModificationRequests } from "@/components/dashboard/MyModificationRequests";

export default function UserModificationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <UserJourneyPage
      eyebrow="Request Workflow"
      title="NIN Modification"
      description="Submit a modification request, then track every update from review through completion in one place."
      steps={[
        {
          id: "submit",
          label: "Submit request",
          title: "Start a new modification request",
          description: "Provide your NIN details, the requested change, and the reason for the update.",
          content: <VipModificationForm onSubmitted={() => setRefreshKey((current) => current + 1)} />,
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
