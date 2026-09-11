import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const StaffDashboard = lazy(() => import("@/pages/StaffDashboard"));
const UserAppShell = lazy(() =>
  import("@/components/dashboard/UserAppShell").then((module) => ({
    default: module.UserAppShell,
  }))
);
const UserOverviewPage = lazy(() => import("@/pages/user/UserOverviewPage"));
const UserModificationPage = lazy(() => import("@/pages/user/UserModificationPage"));
const UserNinValidationPage = lazy(() => import("@/pages/user/UserNinValidationPage"));
const UserNinSearchPage = lazy(() => import("@/pages/user/UserNinSearchPage"));
const UserBvnPage = lazy(() => import("@/pages/user/UserBvnPage"));
const UserClearancePage = lazy(() => import("@/pages/user/UserClearancePage"));
const UserPersonalizationPage = lazy(() => import("@/pages/user/UserPersonalizationPage"));
const UserPrintNinPage = lazy(() => import("@/pages/user/UserPrintNinPage"));
const UserAirtimePage = lazy(() => import("@/pages/user/UserAirtimePage"));
const UserDataPage = lazy(() => import("@/pages/user/UserDataPage"));
const UserWalletPage = lazy(() => import("@/pages/user/UserWalletPage"));
const UserApiKeysPage = lazy(() => import("@/pages/user/UserApiKeysPage"));
const UserProfilePage = lazy(() => import("@/pages/user/UserProfilePage"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function RoleBasedDashboard() {
  const { role, isLoading } = useRole();

  if (isLoading) {
    return <RouteFallback />;
  }

  switch (role) {
    case "admin":
      return <Navigate to="/dashboard/admin" replace />;
    case "staff":
      return <Navigate to="/dashboard/staff" replace />;
    case "user":
    default:
      return <Navigate to="/dashboard/user" replace />;
  }
}

export default function DashboardRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              index
              element={
                <ProtectedRoute>
                  <RoleBasedDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="legacy"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="user"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
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
              path="staff"
              element={
                <ProtectedRoute allowedRoles={["staff"]}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}
