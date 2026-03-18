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
import { StaffTasks } from "@/components/dashboard/StaffTasks";
import { PrintNinSlip } from "@/components/dashboard/PrintNinSlip";
import { WalletTopUp } from "@/components/dashboard/WalletTopUp";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { Briefcase, Wallet } from "lucide-react";

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
        onNavigateToWallet={() => setActiveTab("wallet")}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Staff Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-5 lg:flex lg:flex-row gap-1 p-1.5 h-auto">
              <TabsTrigger value="tasks" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">My Tasks</TabsTrigger>
              <TabsTrigger value="validation" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">NIN Validation</TabsTrigger>
              <TabsTrigger value="search" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">NIN Verify</TabsTrigger>
              <TabsTrigger value="personalization" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Personalize</TabsTrigger>
              <TabsTrigger value="clearance" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Clearance</TabsTrigger>
              <TabsTrigger value="bvn" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">BVN Verify</TabsTrigger>
              <TabsTrigger value="batch" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Batch</TabsTrigger>
              <TabsTrigger value="print-nin" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap">Print NIN</TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />Wallet</TabsTrigger>
            </TabsList>
          </div>

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
