import { Key } from "lucide-react";
import { ApiKeyManagement } from "@/components/dashboard/ApiKeyManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserApiKeysPage() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Developer Access
          </p>
          <CardTitle className="mt-2 flex items-center gap-2 text-2xl text-slate-900 dark:text-slate-100">
            <Key className="h-6 w-6 text-blue-600" />
            API Keys
          </CardTitle>
          <CardDescription>
            Generate, rotate, and manage developer keys from one dedicated page.
          </CardDescription>
        </CardHeader>
      </Card>

      <ApiKeyManagement />
    </div>
  );
}
