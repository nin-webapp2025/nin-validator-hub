import { AuthProvider } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";

export default function AuthRoute() {
  return (
    <AuthProvider>
      <Auth />
    </AuthProvider>
  );
}
