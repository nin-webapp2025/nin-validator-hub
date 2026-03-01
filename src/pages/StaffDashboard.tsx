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
import { Briefcase } from "lucide-react";

/**
 * Staff Dashboard - Full access to all NIN/BVN services
 * Can process assigned modification requests from admin
 * No API stats
 */
export default function StaffDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-blue-50">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        </div>

        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 gap-2">
            <TabsTrigger value="tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="validation">Validate NIN</TabsTrigger>
            <TabsTrigger value="search">NIN Search</TabsTrigger>
            <TabsTrigger value="personalization">Personalization</TabsTrigger>
            <TabsTrigger value="clearance">Clearance</TabsTrigger>
            <TabsTrigger value="bvn">BVN Verify</TabsTrigger>
            <TabsTrigger value="batch">Batch</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

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

          <TabsContent value="profile" className="space-y-6">
            <Profile />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
