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
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { PrintNinSlip } from "@/components/dashboard/PrintNinSlip";
import { WalletTopUp } from "@/components/dashboard/WalletTopUp";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { User, Wallet } from "lucide-react";

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
        onNavigateToWallet={() => setActiveTab("wallet")}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-4 lg:flex lg:flex-row w-full gap-1 p-1.5 h-auto">
            <TabsTrigger value="validate" className="text-xs sm:text-sm py-2.5">NIN Validation</TabsTrigger>
            <TabsTrigger value="bvn" className="text-xs sm:text-sm py-2.5">BVN Verification</TabsTrigger>
            <TabsTrigger value="clearance" className="text-xs sm:text-sm py-2.5">Clearance</TabsTrigger>
            <TabsTrigger value="search" className="text-xs sm:text-sm py-2.5">NIN Verification</TabsTrigger>
            <TabsTrigger value="print-nin" className="text-xs sm:text-sm py-2.5">Print NIN</TabsTrigger>
            <TabsTrigger value="personalization" className="text-xs sm:text-sm py-2.5">Personalization</TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs sm:text-sm py-2.5 flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="validate" className="space-y-6">
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

          <TabsContent value="print-nin" className="space-y-6">
            <PrintNinSlip />
          </TabsContent>

          <TabsContent value="personalization" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Personalization />
              <PersonalizationStatus />
            </div>
            <PersonalizationHistory />
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
