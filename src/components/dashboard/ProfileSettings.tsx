import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  Trash2, 
  Camera,
  Save,
  Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [validationAlerts, setValidationAlerts] = useState(true);
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      
      // Set initial values
      setDisplayName(data.display_name || "");
      setEmailNotifications(data.email_notifications ?? true);
      setValidationAlerts(data.validation_alerts ?? true);
      
      return data;
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { display_name?: string; email_notifications?: boolean; validation_alerts?: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Profile updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      // Delete user data from profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);
      
      if (profileError) throw profileError;
      
      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) throw authError;
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      // Sign out will happen automatically
    },
    onError: (error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      display_name: displayName,
      email_notifications: emailNotifications,
      validation_alerts: validationAlerts,
    });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    updatePasswordMutation.mutate(newPassword);
  };

  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "??";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto px-2 sm:px-0">
      {/* Profile Information Card */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Update your personal information and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Avatar Section */}
          <div className="flex flex-col xs:flex-row items-center gap-3 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-blue-100 dark:border-blue-900">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Button variant="outline" className="gap-2" disabled>
                <Camera className="h-4 w-4" />
                Change Photo
              </Button>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Photo upload coming soon
              </p>
            </div>
          </div>

          <Separator />

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-semibold">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              Email Address
            </Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Email cannot be changed. Contact support for assistance.
            </p>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Security
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-semibold">
                New Password
              </Label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" />
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm Password
              </Label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handlePasswordChange}
              disabled={!newPassword || !confirmPassword || updatePasswordMutation.isPending}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {updatePasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Notifications
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Email Notifications</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Receive updates and announcements via email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Validation Alerts</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Get notified when validation requests complete
              </p>
            </div>
            <Switch
              checked={validationAlerts}
              onCheckedChange={setValidationAlerts}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-red-200 dark:border-red-900 shadow-lg bg-red-50/50 dark:bg-red-950/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-red-600 dark:text-red-500">
            <Trash2 className="h-6 w-6" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Irreversible actions - proceed with caution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="dark:bg-slate-800 dark:border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl">
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data from our servers, including:
                  <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                    <li>Profile information</li>
                    <li>Validation history</li>
                    <li>Personalization records</li>
                    <li>All associated data</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAccountMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteAccountMutation.isPending}
                >
                  {deleteAccountMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    "Yes, delete my account"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
