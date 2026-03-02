import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Footer } from "@/components/dashboard/Footer";
import { ValidationHistory } from "@/components/dashboard/ValidationHistory";
import { PersonalizationHistory } from "@/components/dashboard/PersonalizationHistory";
import { ClearanceHistory } from "@/components/dashboard/ClearanceHistory";
import { BvnHistory } from "@/components/dashboard/BvnHistory";
import { Profile } from "@/components/dashboard/Profile";
import { VipModificationForm } from "@/components/dashboard/VipModificationForm";
import { Crown } from "lucide-react";

/**
 * VIP Dashboard - Premium user experience with modification request capability
 * Enhanced UI with purple/gold theme, glassmorphism effects
 * Can submit NIN modification requests that go through admin approval
 */
export default function VipDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-black">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Crown className="h-7 w-7 text-amber-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
            VIP Dashboard
          </h1>
        </div>

        <Tabs defaultValue="modification" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto gap-1 p-1 no-scrollbar bg-purple-900/50 backdrop-blur-lg border border-amber-500/20">
            <TabsTrigger 
              value="modification" 
              className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
            >
              Modify NIN
            </TabsTrigger>
            <TabsTrigger 
              value="validation" 
              className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
            >
              Validation
            </TabsTrigger>
            <TabsTrigger 
              value="personalization"
              className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
            >
              Personalization
            </TabsTrigger>
            <TabsTrigger 
              value="clearance"
              className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
            >
              Clearance
            </TabsTrigger>
            <TabsTrigger 
              value="bvn"
              className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
            >
              BVN
            </TabsTrigger>
            <TabsTrigger 
              value="profile"
              className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-black"
            >
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modification" className="space-y-6">
            <VipModificationForm />
          </TabsContent>

          <TabsContent value="validation" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <ValidationHistory />
            </div>
          </TabsContent>

          <TabsContent value="personalization" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <PersonalizationHistory />
            </div>
          </TabsContent>

          <TabsContent value="clearance" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <ClearanceHistory />
            </div>
          </TabsContent>

          <TabsContent value="bvn" className="space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-lg border border-amber-500/20 rounded-lg p-6">
              <BvnHistory />
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
