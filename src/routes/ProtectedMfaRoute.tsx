import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MfaRequired from "@/pages/MfaRequired";

export default function ProtectedMfaRoute() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <MfaRequired />
      </ProtectedRoute>
    </AuthProvider>
  );
}
