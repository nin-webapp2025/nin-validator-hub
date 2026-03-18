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
import { VipModificationForm } from "@/components/dashboard/VipModificationForm";
import { PrintNinSlip } from "@/components/dashboard/PrintNinSlip";
import { WalletTopUp } from "@/components/dashboard/WalletTopUp";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { Crown, Wallet } from "lucide-react";

/**
 * VIP Dashboard - Premium user experience with modification request capability
 * Enhanced UI with purple/gold theme, glassmorphism effects
 * Can submit NIN modification requests that go through admin approval
 */
export default function VipDashboard() {
  const [activeTab, setActiveTab] = useState("modification");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-black overflow-x-hidden">
      <DashboardHeader 
        onNavigateToProfile={() => setActiveTab("profile")} 
        onNavigateToWallet={() => setActiveTab("wallet")}
      />
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Crown className="h-7 w-7 text-amber-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
            VIP Dashboard
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar">
            <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-4 lg:flex lg:flex-row gap-1 p-1.5 h-auto bg-purple-900/50 backdrop-blur-lg border border-amber-500/20">
              <TabsTrigger 
                value="modification" 
                className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
              >
                Modify NIN
              </TabsTrigger>
              <TabsTrigger 
                value="validate" 
                className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
              >
                NIN Validation
              </TabsTrigger>
              <TabsTrigger 
                value="bvn" 
                className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
              >
                BVN Verify
              </TabsTrigger>
              <TabsTrigger 
                value="clearance" 
                className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
              >
                Clearance
              </TabsTrigger>
              <TabsTrigger 
                value="search"
                className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
              >
                NIN Verify
              </TabsTrigger>
              <TabsTrigger 
                value="personalization"
                className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
              >
                Personalize
              </TabsTrigger>
              <TabsTrigger 
                value="print-nin"
                className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
              >
                Print NIN
              </TabsTrigger>
              <TabsTrigger 
                value="wallet"
                className="text-xs sm:text-sm py-2 sm:py-2.5 whitespace-nowrap flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
              >
                <Wallet className="h-3.5 w-3.5" />
                Wallet
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="modification" className="space-y-6">
            <VipModificationForm />
          </TabsContent>

          <TabsContent value="validate" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <ValidationForm />
                <ValidationStatus />
              </div>
              <div className="mt-6">
                <ValidationHistory />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bvn" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <BvnVerification />
              <div className="mt-6">
                <BvnHistory />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clearance" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <ClearanceForm />
                <ClearanceStatus />
              </div>
              <div className="mt-6">
                <ClearanceHistory />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <NinSearch />
            </div>
          </TabsContent>

          <TabsContent value="personalization" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Personalization />
                <PersonalizationStatus />
              </div>
              <div className="mt-6">
                <PersonalizationHistory />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="print-nin" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <PrintNinSlip />
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <WalletTopUp />
                <TransactionHistory />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <Profile />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
