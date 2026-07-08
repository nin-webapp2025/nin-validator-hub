import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shield, Search, Loader2, UserCog } from "lucide-react";
import type { UserRole } from "@/hooks/useRole";
import { logAuditEvent } from "@/lib/audit";

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: UserRole;
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-500",
  staff: "bg-green-500",
  vip: "bg-purple-500",
  user: "bg-blue-500",
};

function extractErrorMessage(error: unknown) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const anyError = error as Error & {
      code?: string;
      details?: string;
      hint?: string;
    };

    return [
      anyError.message,
      anyError.code ? `Code: ${anyError.code}` : null,
      anyError.details ? `Details: ${anyError.details}` : null,
      anyError.hint ? `Hint: ${anyError.hint}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof error === "object") {
    const anyError = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    return [
      anyError.message || "Unknown error",
      anyError.code ? `Code: ${anyError.code}` : null,
      anyError.details ? `Details: ${anyError.details}` : null,
      anyError.hint ? `Hint: ${anyError.hint}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return "Unknown error";
}

/**
 * Admin User Role Management Component
 * Allows admins to view all users and change their roles.
 */
export function UserRoleManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const { data, error } = await (supabase as any).rpc("get_admin_users_with_roles");
      if (error) throw error;

      const usersWithRoles: UserWithRole[] = (data || []).map((row: any) => ({
        id: row.id,
        email: row.email || "No email",
        created_at: row.created_at,
        role: (row.role as UserRole) || "user",
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      const message = extractErrorMessage(error);
      setLoadError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      setFilteredUsers(users);
      return;
    }

    setFilteredUsers(
      users.filter((user) => user.email.toLowerCase().includes(trimmed)),
    );
  }, [users, searchTerm]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const existingUser = users.find((user) => user.id === userId);
    if (!existingUser || existingUser.role === newRole) return;

    setUpdatingUserId(userId);

    try {
      const { error } = await (supabase as any).rpc("admin_set_user_role", {
        p_user_id: userId,
        p_role: newRole,
      });

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole.toUpperCase()}`,
      });

      logAuditEvent({
        action: "role_change",
        target_type: "user_role",
        target_id: userId,
        metadata: { new_role: newRole, previous_role: existingUser.role, email: existingUser.email },
      });

      await fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Update Failed",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <CardTitle>User Role Management</CardTitle>
        </div>
        <CardDescription>
          Manage user roles and permissions across the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <p className="font-semibold">Unable to load users</p>
            <p className="mt-2">{loadError}</p>
            <p className="mt-3 text-xs text-red-800/80 dark:text-red-200/80">
              If this mentions policy recursion or permissions, apply the latest role-policy migration in production and refresh this page.
            </p>
          </div>
        ) : null}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <Input
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-slate-400 py-8">
            {searchTerm ? "No users found matching your search" : "No users found"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCog className="h-4 w-4 text-gray-500 dark:text-slate-400 flex-shrink-0" />
                      <p className="font-medium text-sm sm:text-base truncate">{user.email}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <Badge className={ROLE_COLORS[user.role]}>
                      {user.role.toUpperCase()}
                    </Badge>

                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                      disabled={updatingUserId === user.id}
                    >
                      <SelectTrigger className="w-[110px] sm:w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    {updatingUserId === user.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter((user) => user.role === "user").length}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-400">Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {users.filter((user) => user.role === "vip").length}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-400">VIP</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {users.filter((user) => user.role === "staff").length}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-400">Staff</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {users.filter((user) => user.role === "admin").length}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-400">Admins</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
