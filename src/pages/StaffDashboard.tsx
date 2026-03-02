import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Footer } from "@/components/dashboard/Footer";
import { ValidationForm } from "@/components/dashboard/ValidationForm";
import NinSearch from "@/components/dashboard/NinSearch";
import { Personalization } from "@/components/dashboard/Personalization";
import ClearanceForm from "@/components/dashboard/ClearanceForm";
import { BvnVerification } from "@/components/dashboard/BvnVerification";
import { BatchValidation } from "@/components/dashboard/BatchValidation";
import { Profile } from "@/components/dashboard/Profile";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { StaffTasks } from "@/components/dashboard/StaffTasks";
import { Briefcase } from "lucide-react";

/**
 * Staff Dashboard - Full access to all NIN/BVN services
 * Can process assigned modification requests from admin
 * No API stats
 */
export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("tasks");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <DashboardHeader 
        onNavigateToProfile={() => setActiveTab("profile")} 
        onNavigateToSettings={() => setActiveTab("settings")} 
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Staff Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto gap-1 p-1 no-scrollbar">
            <TabsTrigger value="tasks" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">My Tasks</TabsTrigger>
            <TabsTrigger value="validation" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Validate NIN</TabsTrigger>
            <TabsTrigger value="search" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">NIN Search</TabsTrigger>
            <TabsTrigger value="personalization" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Personalization</TabsTrigger>
            <TabsTrigger value="clearance" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Clearance</TabsTrigger>
            <TabsTrigger value="bvn" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">BVN Verify</TabsTrigger>
            <TabsTrigger value="batch" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Batch</TabsTrigger>
            <TabsTrigger value="profile" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            <StaffTasks />
          </TabsContent>

          <TabsContent value="validation" className="space-y-6">
            <ValidationForm />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <NinSearch />
          </TabsContent>

          <TabsContent value="personalization" className="space-y-6">
            <Personalization />
          </TabsContent>

          <TabsContent value="clearance" className="space-y-6">
            <ClearanceForm />
          </TabsContent>

          <TabsContent value="bvn" className="space-y-6">
            <BvnVerification />
          </TabsContent>

          <TabsContent value="batch" className="space-y-6">
            <BatchValidation />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Profile onNavigateToSettings={() => setActiveTab("settings")} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ProfileSettings />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
