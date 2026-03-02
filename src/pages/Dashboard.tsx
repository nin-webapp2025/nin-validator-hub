import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CommandMenu } from "@/components/CommandMenu";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Footer } from "@/components/dashboard/Footer";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ValidationForm } from "@/components/dashboard/ValidationForm";
import { ValidationHistory } from "@/components/dashboard/ValidationHistory";
import { ValidationStatus } from "@/components/dashboard/ValidationStatus";
import { Personalization } from "@/components/dashboard/Personalization";
import { PersonalizationStatus } from "@/components/dashboard/PersonalizationStatus";
import { PersonalizationHistory } from "@/components/dashboard/PersonalizationHistory";
import ClearanceForm from "@/components/dashboard/ClearanceForm";
import ClearanceStatus from "@/components/dashboard/ClearanceStatus";
import { ClearanceHistory } from "@/components/dashboard/ClearanceHistory";
import NinSearch from "@/components/dashboard/NinSearch";
import { Profile } from "@/components/dashboard/Profile";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { BatchValidation } from "@/components/dashboard/BatchValidation";
import { Analytics } from "@/components/dashboard/Analytics";
import { RateLimitIndicator } from "@/components/dashboard/RateLimitIndicator";
import { SessionTimeout } from "@/components/dashboard/SessionTimeout";
import { BvnVerification } from "@/components/dashboard/BvnVerification";
import { BvnHistory } from "@/components/dashboard/BvnHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Clock, UserCheck, User, ShieldCheck, FileSearch, Activity, CreditCard } from "lucide-react";
import { StatCardSkeleton } from "@/components/ui/skeleton-loader";
import { useState } from "react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("validate");

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: validationHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["validation-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("validation_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: personalizationHistory, refetch: refetchPersonalizationHistory } = useQuery({
    queryKey: ["personalization-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("personalization_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clearanceHistory, refetch: refetchClearanceHistory } = useQuery({
    queryKey: ["clearance-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clearance_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: bvnHistory, refetch: refetchBvnHistory } = useQuery({
    queryKey: ["bvn-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bvn_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </motion.div>
      </div>
    );
  }

  const totalValidations = validationHistory?.length || 0;
  const successfulValidations = validationHistory?.filter(v => v.status === "success").length || 0;
  const totalPersonalizations = personalizationHistory?.length || 0;
  const totalClearances = clearanceHistory?.length || 0;

  return (
    <>
      <CommandMenu onTabChange={setActiveTab} />
      <SessionTimeout />
      <ErrorBoundary>
        <div className="min-h-screen bg-[#fafbfc] dark:bg-slate-950">
          <DashboardHeader 
            onNavigateToProfile={() => setActiveTab("profile")}
            onNavigateToSettings={() => setActiveTab("settings")}
          />
      
      {/* Compact Professional Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1 sm:mb-1.5">
                Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                Manage validation requests and identity verification
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">System Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <StatsCards
          totalValidations={totalValidations}
          successfulValidations={successfulValidations}
          totalPersonalizations={totalPersonalizations}
          totalClearances={totalClearances}
        />
      </motion.div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Rate Limit Indicator */}
        <div className="mb-6">
          <RateLimitIndicator />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Premium Tab Navigation */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] p-1.5 sm:p-2 mb-6 sm:mb-8">
            <TabsList className="w-full flex overflow-x-auto gap-0.5 sm:gap-1 bg-transparent p-0 h-auto no-scrollbar">
              <TabsTrigger 
                value="validate" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
              >
                <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Validate</span>
                <span className="inline sm:hidden">Val</span>
              </TabsTrigger>

              <TabsTrigger 
                value="bvn" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
              >
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>BVN</span>
              </TabsTrigger>

              <TabsTrigger 
                value="clearance" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
              >
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">IPE Clearance</span>
                <span className="inline sm:hidden">IPE</span>
              </TabsTrigger>
              <TabsTrigger 
                value="nin-search" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
              >
                <FileSearch className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">NIN Verification</span>
                <span className="inline md:hidden">NIN</span>
              </TabsTrigger>
              <TabsTrigger 
                value="personalization" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
              >
                <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">Personalization</span>
                <span className="inline md:hidden">Person</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
              >
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="inline sm:hidden">Stats</span>
              </TabsTrigger>

            </TabsList>
          </div>

          <TabsContent value="validate" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
                <ValidationForm onSuccess={refetchHistory} />
                <ValidationStatus />
              </div>
              <BatchValidation />
              <ValidationHistory history={validationHistory || []} />
            </motion.div>
          </TabsContent>

          <TabsContent value="bvn" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <BvnVerification onSuccess={refetchBvnHistory} />
              <BvnHistory history={bvnHistory || []} />
            </motion.div>
          </TabsContent>

          <TabsContent value="clearance" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div className="grid gap-8 lg:grid-cols-2">
                  <ClearanceForm onSuccess={refetchClearanceHistory} />
                  <ClearanceStatus />
                </div>
                <ClearanceHistory history={clearanceHistory || []} />
              </motion.div>
            </TabsContent>

            <TabsContent value="nin-search" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-4xl mx-auto"
              >
                <NinSearch />
              </motion.div>
            </TabsContent>

            <TabsContent value="personalization" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div className="grid gap-8 lg:grid-cols-2">
                  <Personalization onSuccess={refetchPersonalizationHistory} />
                  <PersonalizationStatus />
                </div>
                <PersonalizationHistory history={personalizationHistory || []} />
              </motion.div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Analytics />
              </motion.div>
            </TabsContent>

            <TabsContent value="profile" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Profile />
              </motion.div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ProfileSettings />
              </motion.div>
            </TabsContent>

          </Tabs>
        </main>
        
        <Footer />
      </div>
      </ErrorBoundary>
    </>
  );
}