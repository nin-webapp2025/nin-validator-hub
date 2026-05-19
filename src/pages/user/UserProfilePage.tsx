import { User } from "lucide-react";
import { Profile } from "@/components/dashboard/Profile";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserProfilePage() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Account Center
          </p>
          <CardTitle className="mt-2 flex items-center gap-2 text-2xl text-slate-900 dark:text-slate-100">
            <User className="h-6 w-6 text-blue-600" />
            Profile
          </CardTitle>
          <CardDescription>
            View your real account data, wallet-linked totals, and identity activity from one dedicated profile page.
          </CardDescription>
        </CardHeader>
      </Card>

      <Profile />
    </div>
  );
}
