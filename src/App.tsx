import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import MfaRequired from "./pages/MfaRequired";
import { UserAppShell } from "@/components/dashboard/UserAppShell";
import UserOverviewPage from "./pages/user/UserOverviewPage";
import UserModificationPage from "./pages/user/UserModificationPage";
import UserNinValidationPage from "./pages/user/UserNinValidationPage";
import UserNinSearchPage from "./pages/user/UserNinSearchPage";
import UserBvnPage from "./pages/user/UserBvnPage";
import UserClearancePage from "./pages/user/UserClearancePage";
import UserPersonalizationPage from "./pages/user/UserPersonalizationPage";
import UserPrintNinPage from "./pages/user/UserPrintNinPage";
import UserAirtimePage from "./pages/user/UserAirtimePage";
import UserDataPage from "./pages/user/UserDataPage";
import UserWalletPage from "./pages/user/UserWalletPage";
import UserApiKeysPage from "./pages/user/UserApiKeysPage";
import UserProfilePage from "./pages/user/UserProfilePage";

/**
 * Role-based dashboard router component
 * Redirects users to their appropriate dashboard based on role
 */
const RoleBasedDashboard = () => {
  const { role, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to role-specific dashboard
  switch (role) {
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    case 'staff':
      return <Navigate to="/dashboard/staff" replace />;
    case 'vip':
      return <Navigate to="/dashboard/user/modification" replace />;
    case 'user':
    default:
      return <Navigate to="/dashboard/user" replace />;
  }
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/mfa-required"
              element={
                <ProtectedRoute>
                  <MfaRequired />
                </ProtectedRoute>
              }
            />
            {/* Legacy dashboard route - redirects to role-based dashboard */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <RoleBasedDashboard />
                </ProtectedRoute>
              } 
            />
            {/* Role-specific dashboard routes with protection */}
            <Route 
              path="/dashboard/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/user" 
              element={
                <ProtectedRoute allowedRoles={['user', 'vip']}>
                  <UserAppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserOverviewPage />} />
              <Route path="modification" element={<UserModificationPage />} />
              <Route path="nin-validation" element={<UserNinValidationPage />} />
              <Route path="nin-search" element={<UserNinSearchPage />} />
              <Route path="bvn" element={<UserBvnPage />} />
              <Route path="clearance" element={<UserClearancePage />} />
              <Route path="personalization" element={<UserPersonalizationPage />} />
              <Route path="print-nin" element={<UserPrintNinPage />} />
              <Route path="airtime" element={<UserAirtimePage />} />
              <Route path="data" element={<UserDataPage />} />
              <Route path="wallet" element={<UserWalletPage />} />
              <Route path="api-keys" element={<UserApiKeysPage />} />
              <Route path="profile" element={<UserProfilePage />} />
            </Route>
            <Route 
              path="/dashboard/staff" 
              element={
                <ProtectedRoute allowedRoles={['staff']}>
                  <StaffDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/vip" 
              element={
                <ProtectedRoute allowedRoles={['vip']}>
                  <Navigate to="/dashboard/user/modification" replace />
                </ProtectedRoute>
              } 
            />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/docs/api" element={
              <ProtectedRoute>
                <ApiDocs />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
