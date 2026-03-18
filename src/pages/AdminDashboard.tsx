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
import { AdminModificationRequests } from "@/components/dashboard/AdminModificationRequests";
import { UserRoleManagement } from "@/components/dashboard/UserRoleManagement";
import { AuditLog } from "@/components/dashboard/AuditLog";
import { PrintNinSlip } from "@/components/dashboard/PrintNinSlip";
import { WalletTopUp } from "@/components/dashboard/WalletTopUp";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { Shield, Wallet } from "lucide-react";
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
        onNavigateToWallet={() => setActiveTab("wallet")}
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
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-5 lg:flex lg:flex-row gap-1 p-1.5 h-auto">
              <TabsTrigger value="modifications" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Modifications</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">User Roles</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Audit Log</TabsTrigger>
              <TabsTrigger value="validation" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Validation</TabsTrigger>
              <TabsTrigger value="personalization" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Personalize</TabsTrigger>
              <TabsTrigger value="clearance" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Clearance</TabsTrigger>
              <TabsTrigger value="bvn" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">BVN</TabsTrigger>
              <TabsTrigger value="print-nin" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Print NIN</TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />Wallet</TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="print-nin" className="space-y-6">
            <PrintNinSlip />
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <WalletTopUp />
              <TransactionHistory />
            </div>
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
