import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Footer } from "@/components/dashboard/Footer";
import { ValidationForm } from "@/components/dashboard/ValidationForm";
import { ValidationHistory } from "@/components/dashboard/ValidationHistory";
import { ValidationStatus } from "@/components/dashboard/ValidationStatus";
import { Personalization } from "@/components/dashboard/Personalization";
import { PersonalizationHistory } from "@/components/dashboard/PersonalizationHistory";
import { PersonalizationStatus } from "@/components/dashboard/PersonalizationStatus";
import ClearanceForm from "@/components/dashboard/ClearanceForm";
import ClearanceStatus from "@/components/dashboard/ClearanceStatus";
import { ClearanceHistory } from "@/components/dashboard/ClearanceHistory";
import { BvnVerification } from "@/components/dashboard/BvnVerification";
import { BvnHistory } from "@/components/dashboard/BvnHistory";
import NinSearch from "@/components/dashboard/NinSearch";
import { Profile } from "@/components/dashboard/Profile";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { CreditBalance } from "@/components/dashboard/CreditBalance";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { ApiKeyManagement } from "@/components/dashboard/ApiKeyManagement";
import { WebhookManagement } from "@/components/dashboard/WebhookManagement";
import { User } from "lucide-react";

/**
 * User Dashboard - Full access to all NIN/BVN verification services
 * No API stats, no modification requests
 */
export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("validate");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <OnboardingWizard />
      <DashboardHeader 
        onNavigateToProfile={() => setActiveTab("profile")} 
        onNavigateToSettings={() => setActiveTab("settings")} 
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto gap-1 p-1 no-scrollbar">
            <TabsTrigger value="validate" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Validate NIN</TabsTrigger>
            <TabsTrigger value="bvn" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">BVN Verify</TabsTrigger>
            <TabsTrigger value="clearance" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Clearance</TabsTrigger>
            <TabsTrigger value="search" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">NIN Search</TabsTrigger>
            <TabsTrigger value="personalization" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Personalization</TabsTrigger>
            <TabsTrigger value="profile" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Settings</TabsTrigger>
            <TabsTrigger value="integrations" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="validate" className="space-y-6">
            <CreditBalance />
            <div className="grid gap-6 lg:grid-cols-2">
              <ValidationForm />
              <ValidationStatus />
            </div>
            <ValidationHistory />
          </TabsContent>

          <TabsContent value="bvn" className="space-y-6">
            <BvnVerification />
            <BvnHistory />
          </TabsContent>

          <TabsContent value="clearance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ClearanceForm />
              <ClearanceStatus />
            </div>
            <ClearanceHistory />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <NinSearch />
          </TabsContent>

          <TabsContent value="personalization" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Personalization />
              <PersonalizationStatus />
            </div>
            <PersonalizationHistory />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Profile onNavigateToSettings={() => setActiveTab("settings")} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <ApiKeyManagement />
            <WebhookManagement />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
