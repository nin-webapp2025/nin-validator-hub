import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ApiDocs from "@/pages/ApiDocs";

export default function ProtectedApiDocsRoute() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <ApiDocs />
      </ProtectedRoute>
    </AuthProvider>
  );
}
