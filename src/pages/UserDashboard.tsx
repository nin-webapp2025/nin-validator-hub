import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AppFooter } from "@/components/dashboard/AppFooter";
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
import { ApiKeyManagement } from "@/components/dashboard/ApiKeyManagement";
import { WalletBalance } from "@/components/dashboard/WalletBalance";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User, Wallet, BookOpen, Key, Search, ShieldCheck, CreditCard, Printer, Sparkles } from "lucide-react";

const DASHBOARD_GROUPS = [
  {
    id: "verify",
    label: "Verify",
    title: "Verification Tools",
    description: "Identity checks and lookups",
    tabs: [
      { value: "validate", label: "NIN Validation", icon: Search },
      { value: "search", label: "NIN Search", icon: Search },
      { value: "bvn", label: "BVN Verification", icon: CreditCard },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    title: "Service Operations",
    description: "Submission and fulfillment workflows",
    tabs: [
      { value: "clearance", label: "Clearance", icon: ShieldCheck },
      { value: "personalization", label: "Personalization", icon: Sparkles },
      { value: "print-nin", label: "Print NIN", icon: Printer },
    ],
  },
  {
    id: "account",
    label: "Account",
    title: "Account Center",
    description: "Funds, keys, and profile settings",
    tabs: [
      { value: "wallet", label: "Wallet", icon: Wallet },
      { value: "api-keys", label: "API Keys", icon: Key },
      { value: "profile", label: "Profile", icon: User },
    ],
  },
] as const;

/**
 * User Dashboard - Full access to all NIN/BVN verification services
 * No API stats, no modification requests
 */
export default function UserDashboard() {
  const location = useLocation();
  const initialTab = (location.state as any)?.tab || "validate";
  const [activeTab, setActiveTab] = useState(initialTab);
  const navigate = useNavigate();
  const activeGroup = useMemo(
    () => DASHBOARD_GROUPS.find((group) => group.tabs.some((tab) => tab.value === activeTab)) ?? DASHBOARD_GROUPS[0],
    [activeTab]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-x-hidden">
      <OnboardingWizard />
      <DashboardHeader 
        onNavigateToProfile={() => setActiveTab("profile")} 
        onNavigateToWallet={() => setActiveTab("wallet")}
      />

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <WalletBalance
            variant="hero"
            onClick={() => setActiveTab("wallet")}
            title="Wallet Balance"
            subtitle="Fund your wallet once and use it across verification, NIN services, printing, and API operations."
          />

          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_12px_40px_rgba(2,6,23,0.45)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Workspace
                  </p>
                </div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {activeGroup.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {activeGroup.description}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100/80 p-1 dark:bg-slate-800/80">
                {DASHBOARD_GROUPS.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveTab(group.tabs[0].value)}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                      activeGroup.id === group.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    )}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60 lg:flex-row lg:items-center lg:justify-between">
              <div className="overflow-x-auto -mx-1 px-1 no-scrollbar">
                <TabsList className="inline-flex h-auto w-max gap-2 bg-transparent p-0">
                  {activeGroup.tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="flex items-center gap-2 rounded-xl border border-transparent bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-200 hover:text-slate-900 data-[state=active]:border-blue-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100 dark:data-[state=active]:border-blue-500 dark:data-[state=active]:bg-blue-500 sm:text-sm"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="whitespace-nowrap">{tab.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/docs/api")}
                className="justify-center gap-2 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <BookOpen className="h-4 w-4" />
                API Docs
              </Button>
            </div>
          </div>

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
            <div className="grid gap-6 md:grid-cols-2">
              <WalletTopUp />
              <TransactionHistory />
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Profile />
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <ApiKeyManagement />
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
}
