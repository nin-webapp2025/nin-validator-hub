import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Loader2, UserPlus, UserMinus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { logAuditEvent } from "@/lib/audit";

interface UserAccess {
  id: string;
  user_id: string;
  email: string;
  granted_at: string;
}

/**
 * Admin component to manage which users can access the API Documentation page.
 * Admins always have access — this controls access for non-admin accounts.
 */
export function ApiDocsAccessManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accessList, setAccessList] = useState<UserAccess[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [granting, setGranting] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch all users with API docs access
      const { data: accessRecords, error: accessError } = await (supabase as any)
        .from("api_docs_access")
        .select("id, user_id, granted_at");

      if (accessError) throw accessError;

      // Fetch all profiles to get emails
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from("profiles")
        .select("id, email");

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.email || "No email"])
      );

      const enriched: UserAccess[] = (accessRecords || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        email: profileMap.get(r.user_id) || "Unknown",
        granted_at: r.granted_at,
      }));

      setAccessList(enriched);
      setAllUsers(
        (profiles || []).map((p: any) => ({ id: p.id, email: p.email || "No email" }))
      );
    } catch (error) {
      console.error("Error fetching api docs access:", error);
      toast({
        title: "Error",
        description: "Failed to load API docs access list",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grantAccess = async (userId: string) => {
    if (!user) return;
    setGranting(userId);
    try {
      const { error } = await (supabase as any)
        .from("api_docs_access")
        .insert({ user_id: userId, granted_by: user.id });

      if (error) throw error;

      const targetEmail = allUsers.find((u) => u.id === userId)?.email;
      toast({ title: "✅ Access Granted", description: `${targetEmail} can now view API docs` });

      logAuditEvent({
        action: "api_docs_access_granted",
        target_type: "api_docs_access",
        target_id: userId,
        metadata: { email: targetEmail },
      });

      fetchData();
    } catch (error) {
      console.error("Error granting access:", error);
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Could not grant access",
        variant: "destructive",
      });
    } finally {
      setGranting(null);
    }
  };

  const revokeAccess = async (userId: string) => {
    setRevoking(userId);
    try {
      const { error } = await (supabase as any)
        .from("api_docs_access")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      const targetEmail = accessList.find((a) => a.user_id === userId)?.email;
      toast({ title: "Access Revoked", description: `${targetEmail} can no longer view API docs` });

      logAuditEvent({
        action: "api_docs_access_revoked",
        target_type: "api_docs_access",
        target_id: userId,
        metadata: { email: targetEmail },
      });

      fetchData();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Could not revoke access",
        variant: "destructive",
      });
    } finally {
      setRevoking(null);
    }
  };

  const accessUserIds = new Set(accessList.map((a) => a.user_id));

  // Users who DON'T yet have access (excluding the current admin)
  const usersWithoutAccess = allUsers.filter(
    (u) => !accessUserIds.has(u.id) && u.id !== user?.id
  );

  const filteredWithoutAccess = usersWithoutAccess.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Link to view the docs page */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6">
          <div>
            <h3 className="font-semibold text-base">API Documentation Page</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Admins always have access. Grant access to other users below.
            </p>
          </div>
          <Link to="/docs/api">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View API Docs
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Users with access */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <CardTitle>Users with API Docs Access</CardTitle>
          </div>
          <CardDescription>
            {accessList.length} user{accessList.length !== 1 ? "s" : ""} currently have access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accessList.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-slate-400 py-6">
              No users have been granted access yet
            </p>
          ) : (
            <div className="space-y-3">
              {accessList.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-lg p-3 dark:border-slate-700"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{entry.email}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Granted: {new Date(entry.granted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revoking === entry.user_id}
                    onClick={() => revokeAccess(entry.user_id)}
                    className="gap-1 self-end sm:self-auto"
                  >
                    {revoking === entry.user_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserMinus className="h-3.5 w-3.5" />
                    )}
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant access to new users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grant Access</CardTitle>
          <CardDescription>Search for a user by email and grant them access to API docs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <Input
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm.length < 2 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
              Type at least 2 characters to search
            </p>
          ) : filteredWithoutAccess.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
              No matching users without access
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredWithoutAccess.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2 border rounded-lg p-3 dark:border-slate-700"
                >
                  <p className="text-sm truncate min-w-0">{u.email}</p>
                  <Button
                    size="sm"
                    disabled={granting === u.id}
                    onClick={() => grantAccess(u.id)}
                    className="gap-1 flex-shrink-0"
                  >
                    {granting === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Grant
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
