import { useState } from "react";
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
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { AdminModificationRequests } from "@/components/dashboard/AdminModificationRequests";
import { UserRoleManagement } from "@/components/dashboard/UserRoleManagement";
import { AuditLog } from "@/components/dashboard/AuditLog";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin Dashboard - Full access to all features + API usage stats
 * Can view all user activities, manage modification requests
 */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("modifications");

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      // Admin sees platform-wide stats (RLS policies grant admin full SELECT)
      const [
        { count: totalValidations },
        { count: successfulValidations },
        { count: totalPersonalizations },
        { count: totalClearances },
      ] = await Promise.all([
        supabase.from("validation_history").select("*", { count: "exact", head: true }),
        supabase.from("validation_history").select("*", { count: "exact", head: true }).eq("status", "success"),
        supabase.from("personalization_history").select("*", { count: "exact", head: true }),
        supabase.from("clearance_history").select("*", { count: "exact", head: true }),
      ]);

      return {
        totalValidations: totalValidations || 0,
        successfulValidations: successfulValidations || 0,
        totalPersonalizations: totalPersonalizations || 0,
        totalClearances: totalClearances || 0,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <DashboardHeader 
        onNavigateToProfile={() => setActiveTab("profile")} 
        onNavigateToSettings={() => setActiveTab("settings")} 
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard</h1>
        </div>

        {/* Stats Overview - Admin Only */}
        <StatsCards 
          totalValidations={stats?.totalValidations}
          successfulValidations={stats?.successfulValidations}
          totalPersonalizations={stats?.totalPersonalizations}
          totalClearances={stats?.totalClearances}
        />

        {/* API Usage Analytics - Admin Only */}
        <div className="mb-8">
          <ApiUsage />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto gap-1 p-1 no-scrollbar">
            <TabsTrigger value="modifications" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Modifications</TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">User Roles</TabsTrigger>
            <TabsTrigger value="audit" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Audit Log</TabsTrigger>
            <TabsTrigger value="validation" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Validation</TabsTrigger>
            <TabsTrigger value="personalization" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Personalization</TabsTrigger>
            <TabsTrigger value="clearance" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Clearance</TabsTrigger>
            <TabsTrigger value="bvn" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">BVN</TabsTrigger>
            <TabsTrigger value="profile" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="modifications" className="space-y-6">
            <AdminModificationRequests />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserRoleManagement />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <AuditLog />
          </TabsContent>

          <TabsContent value="validation" className="space-y-6">
            <ValidationHistory isAdmin />
          </TabsContent>

          <TabsContent value="personalization" className="space-y-6">
            <PersonalizationHistory isAdmin />
          </TabsContent>

          <TabsContent value="clearance" className="space-y-6">
            <ClearanceHistory isAdmin />
          </TabsContent>

          <TabsContent value="bvn" className="space-y-6">
            <BvnHistory isAdmin />
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
