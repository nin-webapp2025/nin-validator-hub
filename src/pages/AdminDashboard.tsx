import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AppFooter } from "@/components/dashboard/AppFooter";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ValidationHistory } from "@/components/dashboard/ValidationHistory";
import { PersonalizationHistory } from "@/components/dashboard/PersonalizationHistory";
import { ClearanceHistory } from "@/components/dashboard/ClearanceHistory";
import { BvnHistory } from "@/components/dashboard/BvnHistory";
import { Profile } from "@/components/dashboard/Profile";
import { AdminModificationRequests } from "@/components/dashboard/AdminModificationRequests";
import { UserRoleManagement } from "@/components/dashboard/UserRoleManagement";
import { AdminCreditGrant } from "@/components/dashboard/AdminCreditGrant";
import { AuditLog } from "@/components/dashboard/AuditLog";
import { OperationalMonitoring } from "@/components/dashboard/OperationalMonitoring";
import { ReconciliationOps } from "@/components/dashboard/ReconciliationOps";
import { PrintNinSlip } from "@/components/dashboard/PrintNinSlip";
import { WalletTopUp } from "@/components/dashboard/WalletTopUp";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { ApiDocsAccessManagement } from "@/components/dashboard/ApiDocsAccessManagement";
import { ApiKeyManagement } from "@/components/dashboard/ApiKeyManagement";
import {
  Shield,
  ClipboardList,
  Users,
  ScrollText,
  Activity,
  Scale,
  Search,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Printer,
  Wallet,
  Gift,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminTab {
  value: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_TABS: AdminTab[] = [
  { value: "modifications", label: "Modifications", icon: ClipboardList },
  { value: "users", label: "User Roles", icon: Users },
  { value: "audit", label: "Audit Log", icon: ScrollText },
  { value: "monitoring", label: "Monitoring", icon: Activity },
  { value: "reconciliation", label: "Reconciliation", icon: Scale },
  { value: "validation", label: "Validation", icon: Search },
  { value: "personalization", label: "Personalize", icon: Sparkles },
  { value: "clearance", label: "Clearance", icon: ShieldCheck },
  { value: "bvn", label: "BVN", icon: CreditCard },
  { value: "print-nin", label: "Print NIN", icon: Printer },
  { value: "wallet", label: "Wallet", icon: Wallet },
  { value: "credits", label: "Grant Credit", icon: Gift },
  { value: "api-docs", label: "API Docs", icon: BookOpen },
];

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fef3c7_0%,#f8fafc_32%,#fffbeb_100%)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a_0%,#020617_40%,#020617_100%)] overflow-x-hidden">
      <DashboardHeader
        onNavigateToProfile={() => setActiveTab("profile")}
        onNavigateToWallet={() => setActiveTab("wallet")}
      />

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="mb-6 flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard</h1>
        </div>

        {/* Stats Overview - Admin Only */}
        <StatsCards
          totalValidations={stats?.totalValidations}
          successfulValidations={stats?.successfulValidations}
          totalPersonalizations={stats?.totalPersonalizations}
          totalClearances={stats?.totalClearances}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto grid-cols-3 gap-2 bg-transparent p-0 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center shadow-none transition-all",
                    "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-spark",
                    "dark:border-slate-800 dark:bg-slate-900",
                    "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md",
                    "dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors",
                      "group-data-[state=active]:bg-white/20 group-data-[state=active]:text-primary-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="font-display text-xs font-semibold leading-tight">{tab.label}</p>
                </TabsTrigger>
              );
            })}
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

          <TabsContent value="monitoring" className="space-y-6">
            <OperationalMonitoring />
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-6">
            <ReconciliationOps />
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

          <TabsContent value="credits" className="space-y-6">
            <AdminCreditGrant />
          </TabsContent>

          <TabsContent value="api-docs" className="space-y-6">
            <ApiDocsAccessManagement />
            <ApiKeyManagement />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Profile />
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
}
