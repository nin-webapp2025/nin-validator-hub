import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Footer } from "@/components/dashboard/Footer";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ApiUsage } from "@/components/dashboard/ApiUsage";
import { ValidationHistory } from "@/components/dashboard/ValidationHistory";
import { PersonalizationHistory } from "@/components/dashboard/PersonalizationHistory";
import { ClearanceHistory } from "@/components/dashboard/ClearanceHistory";
import { BvnHistory } from "@/components/dashboard/BvnHistory";
import { Profile } from "@/components/dashboard/Profile";
import { AdminModificationRequests } from "@/components/dashboard/AdminModificationRequests";
import { UserRoleManagement } from "@/components/dashboard/UserRoleManagement";
import { Shield } from "lucide-react";

/**
 * Admin Dashboard - Full access to all features + API usage stats
 * Can view all user activities, manage modification requests
 */
export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        {/* Stats Overview - Admin Only */}
        <StatsCards />

        {/* API Usage Analytics - Admin Only */}
        <div className="mb-8">
          <ApiUsage />
        </div>

        <Tabs defaultValue="modifications" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto gap-1 p-1 no-scrollbar">
            <TabsTrigger value="modifications" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Modifications</TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">User Roles</TabsTrigger>
            <TabsTrigger value="validation" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Validation</TabsTrigger>
            <TabsTrigger value="personalization" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Personalization</TabsTrigger>
            <TabsTrigger value="clearance" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Clearance</TabsTrigger>
            <TabsTrigger value="bvn" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">BVN</TabsTrigger>
            <TabsTrigger value="profile" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="modifications" className="space-y-6">
            <AdminModificationRequests />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserRoleManagement />
          </TabsContent>

          <TabsContent value="validation" className="space-y-6">
            <ValidationHistory />
          </TabsContent>

          <TabsContent value="personalization" className="space-y-6">
            <PersonalizationHistory />
          </TabsContent>

          <TabsContent value="clearance" className="space-y-6">
            <ClearanceHistory />
          </TabsContent>

          <TabsContent value="bvn" className="space-y-6">
            <BvnHistory />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Profile />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
