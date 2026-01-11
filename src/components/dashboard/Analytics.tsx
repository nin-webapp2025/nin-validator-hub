import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  Activity, 
  Calendar, 
  PieChart as PieChartIcon,
  Server 
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { ApiUsage } from "./ApiUsage";

const COLORS = {
  success: "#10b981",
  failed: "#ef4444",
  pending: "#f59e0b",
  validation: "#3b82f6",
  personalization: "#8b5cf6",
  clearance: "#06b6d4",
};

export function Analytics() {
  const { user } = useAuth();

  // Fetch validation data
  const { data: validationData } = useQuery({
    queryKey: ["analytics-validation", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("validation_history")
        .select("status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch personalization data
  const { data: personalizationData } = useQuery({
    queryKey: ["analytics-personalization", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("personalization_history")
        .select("status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch clearance data
  const { data: clearanceData } = useQuery({
    queryKey: ["analytics-clearance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("clearance_history")
        .select("status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  // Process data for charts
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    return format(startOfDay(date), "MMM dd");
  });

  const dailyValidations = last30Days.map((day) => {
    const dayData = validationData?.filter(
      (v) => format(new Date(v.created_at), "MMM dd") === day
    ) || [];
    return {
      date: day,
      success: dayData.filter((v) => v.status === "success").length,
      failed: dayData.filter((v) => v.status === "failed").length,
      total: dayData.length,
    };
  });

  const statusDistribution = [
    {
      name: "Successful",
      value: validationData?.filter((v) => v.status === "success").length || 0,
      color: COLORS.success,
    },
    {
      name: "Failed",
      value: validationData?.filter((v) => v.status === "failed").length || 0,
      color: COLORS.failed,
    },
  ];

  const serviceComparison = [
    {
      service: "Validations",
      count: validationData?.length || 0,
      color: COLORS.validation,
    },
    {
      service: "Personalizations",
      count: personalizationData?.length || 0,
      color: COLORS.personalization,
    },
    {
      service: "Clearances",
      count: clearanceData?.length || 0,
      color: COLORS.clearance,
    },
  ];

  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayName = format(date, "EEE");
    const validations = validationData?.filter(
      (v) => format(new Date(v.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    ).length || 0;
    return { day: dayName, validations };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Insights and trends from your validation activities
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Validations</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {validationData?.length || 0}
                </p>
              </div>
              <Activity className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Success Rate</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {validationData?.length
                    ? Math.round(
                        (statusDistribution[0].value / validationData.length) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">This Week</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {weeklyTrend.reduce((sum, day) => sum + day.validations, 0)}
                </p>
              </div>
              <Calendar className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">All Services</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {(validationData?.length || 0) +
                    (personalizationData?.length || 0) +
                    (clearanceData?.length || 0)}
                </p>
              </div>
              <PieChartIcon className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="api-usage">
            <Server className="h-4 w-4 mr-2" />
            API Usage
          </TabsTrigger>
        </TabsList>

        {/* Trends Chart */}
        <TabsContent value="trends" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Daily Validation Trends (Last 30 Days)</CardTitle>
              <CardDescription>Success vs Failed validations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={dailyValidations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="success"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    name="Successful"
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke={COLORS.failed}
                    strokeWidth={2}
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>Validations by day of the week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="validations" fill={COLORS.validation} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Chart */}
        <TabsContent value="distribution" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Validation Status Distribution</CardTitle>
              <CardDescription>Breakdown of successful vs failed validations</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Comparison */}
        <TabsContent value="services" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Service Usage Comparison</CardTitle>
              <CardDescription>Compare usage across all services</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={serviceComparison} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis 
                    dataKey="service" 
                    type="category" 
                    stroke="#64748b"
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {serviceComparison.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Usage */}
        <TabsContent value="api-usage" className="mt-6">
          <ApiUsage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
