import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Calendar, 
  Activity, 
  CheckCircle, 
  FileCheck, 
  Clock,
  TrendingUp,
  Shield,
  Award,
  Zap
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

export function Profile() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: validationStats } = useQuery({
    queryKey: ["validation-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("validation_history")
        .select("status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const total = data.length;
      const successful = data.filter(v => v.status === "success").length;
      const failed = data.filter(v => v.status === "failed").length;
      const mostRecent = data.length > 0 ? data[0].created_at : null;
      const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
      
      return { total, successful, failed, mostRecent, successRate };
    },
    enabled: !!user,
  });

  const { data: personalizationStats } = useQuery({
    queryKey: ["personalization-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("personalization_history")
        .select("status, created_at")
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      return {
        total: data.length,
        successful: data.filter(p => p.status === "success").length,
      };
    },
    enabled: !!user,
  });

  const { data: clearanceStats } = useQuery({
    queryKey: ["clearance-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("clearance_history")
        .select("status, created_at")
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      return {
        total: data.length,
        successful: data.filter(c => c.status === "success").length,
      };
    },
    enabled: !!user,
  });

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "??";
  };

  const getMembershipLevel = () => {
    const total = validationStats?.total || 0;
    if (total >= 1000) return { level: "Enterprise", color: "bg-purple-500", icon: Award };
    if (total >= 500) return { level: "Pro", color: "bg-blue-600", icon: Zap };
    if (total >= 100) return { level: "Advanced", color: "bg-green-600", icon: TrendingUp };
    return { level: "Starter", color: "bg-slate-600", icon: Shield };
  };

  const membership = getMembershipLevel();
  const MembershipIcon = membership.icon;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto px-2 sm:px-0">
      {/* Hero Profile Card */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg sm:shadow-xl overflow-hidden relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTAgMThjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTE4LTE4YzAtMi4yMDktMS43OTEtNC00LTRzLTQgMS43OTEtNCA0IDEuNzkxIDQgNCA0IDQtMS43OTEgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <CardContent className="relative pt-6 sm:pt-8 pb-4 sm:pb-6 px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
              <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-white/20 shadow-2xl ring-2 sm:ring-4 ring-white/10">
                <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-white/10 backdrop-blur-sm text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-white flex-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 break-words">
                  {profile?.display_name || user?.email?.split('@')[0] || "User"}
                </h2>
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 opacity-90 flex-shrink-0" />
                  <p className="text-blue-100 text-sm font-medium">{user?.email}</p>
                </div>
                <Badge className={`${membership.color} text-white border-0 shadow-lg gap-1.5 px-3 py-1`}>
                  <MembershipIcon className="h-3.5 w-3.5" />
                  {membership.level} Member
                </Badge>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex-1 lg:ml-auto grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-100" />
                  <p className="text-xs text-blue-100 font-medium">Total Requests</p>
                </div>
                <p className="text-2xl font-bold text-white">{validationStats?.total || 0}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-200" />
                  <p className="text-xs text-blue-100 font-medium">Success Rate</p>
                </div>
                <p className="text-2xl font-bold text-white">{validationStats?.successRate || 0}%</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-100" />
                  <p className="text-xs text-blue-100 font-medium">Member Since</p>
                </div>
                <p className="text-sm font-semibold text-white">
                  {profile?.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : 'Recently'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Validation Stats */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800 hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Validations
              </CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {validationStats?.successful || 0}
            </p>
            <div className="flex items-center gap-2">
              <Progress value={validationStats?.successRate || 0} className="h-2" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {validationStats?.successRate || 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Clearance Stats */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800 hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Clearances
              </CardTitle>
              <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {clearanceStats?.successful || 0}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              of {clearanceStats?.total || 0} total requests
            </p>
          </CardContent>
        </Card>

        {/* Personalization Stats */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800 hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Personalizations
              </CardTitle>
              <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {personalizationStats?.successful || 0}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              of {personalizationStats?.total || 0} total requests
            </p>
          </CardContent>
        </Card>

        {/* Last Activity */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800 hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Last Activity
              </CardTitle>
              <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              {validationStats?.mostRecent
                ? formatDistanceToNow(new Date(validationStats.mostRecent), { addSuffix: true })
                : "No activity yet"}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Last validation request
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Account Information
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Your account details and membership information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Display Name
                </Label>
                <p className="text-base font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {profile?.display_name || "Not set"}
                </p>
              </div>
              
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email Address
                </Label>
                <p className="text-base font-medium text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Account Created
                </Label>
                <p className="text-base font-medium text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {profile?.created_at
                    ? format(new Date(profile.created_at), 'MMMM dd, yyyy')
                    : "Unknown"}
                </p>
              </div>
              
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Membership Level
                </Label>
                <p className="text-base font-medium text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                  <MembershipIcon className="h-4 w-4 text-slate-400" />
                  {membership.level}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Summary */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Activity Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {validationStats?.total || 0}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Total Validations
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {validationStats?.successful || 0}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Successful
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {validationStats?.failed || 0}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Failed
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {validationStats?.successRate || 0}%
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Success Rate
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Label component
function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>;
}
