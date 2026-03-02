import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shield, Search, Loader2, UserCog } from "lucide-react";
import type { UserRole } from "@/hooks/useRole";

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

/**
 * Admin User Role Management Component
 * Allows admins to view all users and change their roles
 * Industry standard: Admins manage roles, not users themselves
 */
export function UserRoleManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // Get all profiles (admins can see all via RLS policy)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, created_at");

      if (profilesError) throw profilesError;

      // Get all user roles (admins can see all via RLS policy)
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const roleEntry = userRoles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || "No email",
          created_at: profile.created_at,
          role: (roleEntry?.role as UserRole) || 'user',
        };
      });

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
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

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);

    try {
      // Update or insert role
      const { error } = await supabase
        .from("user_roles")
        .upsert({ 
          user_id: userId, 
          role: newRole 
        }, { 
          onConflict: 'user_id,role',
          ignoreDuplicates: false 
        });

      if (error) {
        // If upsert failed, try delete old + insert new
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });

        if (insertError) throw insertError;
      }

      toast({
        title: "✅ Role Updated",
        description: `User role changed to ${newRole.toUpperCase()}`,
      });

      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update user role",
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
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {searchTerm ? "No users found matching your search" : "No users found"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCog className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <p className="font-medium text-sm sm:text-base truncate">{user.email}</p>
                    </div>
                    <p className="text-xs text-gray-500">
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

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'user').length}
              </p>
              <p className="text-xs text-gray-600">Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.role === 'vip').length}
              </p>
              <p className="text-xs text-gray-600">VIP</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => u.role === 'staff').length}
              </p>
              <p className="text-xs text-gray-600">Staff</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {users.filter(u => u.role === 'admin').length}
              </p>
              <p className="text-xs text-gray-600">Admins</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
