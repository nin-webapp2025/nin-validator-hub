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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 gap-2">
            <TabsTrigger value="modifications">Modification Requests</TabsTrigger>
            <TabsTrigger value="users">User Roles</TabsTrigger>
            <TabsTrigger value="validation">Validation History</TabsTrigger>
            <TabsTrigger value="personalization">Personalization</TabsTrigger>
            <TabsTrigger value="clearance">Clearance</TabsTrigger>
            <TabsTrigger value="bvn">BVN History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
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
