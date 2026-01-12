import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Clock,
  TrendingUp,
  Zap,
  AlertCircle,
  CheckCircle2,
  Server,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

const ENDPOINT_COLORS: Record<string, string> = {
  validation: "#3b82f6",
  validation_status: "#06b6d4",
  personalization: "#8b5cf6",
  personalization_status: "#a855f7",
  clearance: "#10b981",
  clearance_status: "#14b8a6",
  nin_search: "#f59e0b",
  nin_phone: "#f97316",
  nin_demo: "#6366f1",
};

const STATUS_COLORS = {
  success: "#10b981",
  failed: "#ef4444",
  pending: "#f59e0b",
};

export function ApiUsage() {
  const { user } = useAuth();

  // Fetch validation history
  const { data: validationHistory } = useQuery({
    queryKey: ["api-usage-validation", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("validation_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch personalization history
  const { data: personalizationHistory } = useQuery({
    queryKey: ["api-usage-personalization", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("personalization_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch clearance history
  const { data: clearanceHistory } = useQuery({
    queryKey: ["api-usage-clearance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("clearance_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate API metrics
  const allRequests = [
    ...(validationHistory?.map((v) => ({ ...v, endpoint: "validation" })) || []),
    ...(personalizationHistory?.map((p) => ({ ...p, endpoint: "personalization" })) || []),
    ...(clearanceHistory?.map((c) => ({ ...c, endpoint: "clearance" })) || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalRequests = allRequests.length;
  const successfulRequests = allRequests.filter((r) => r.status === "success").length;
  const failedRequests = allRequests.filter((r) => r.status === "failed").length;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

  // Hourly requests (last 24 hours)
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = subDays(new Date(), 0);
    hour.setHours(new Date().getHours() - (23 - i), 0, 0, 0);
    const hourStr = format(hour, "HH:mm");
    
    const requests = allRequests.filter((r) => {
      const reqHour = new Date(r.created_at);
      reqHour.setMinutes(0, 0, 0);
      return reqHour.getTime() === hour.getTime();
    });

    return {
      hour: hourStr,
      requests: requests.length,
      success: requests.filter((r) => r.status === "success").length,
      failed: requests.filter((r) => r.status === "failed").length,
    };
  });

  // Daily requests (last 7 days)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, "EEE, MMM d");
    const dayDate = format(startOfDay(date), "yyyy-MM-dd");

    const requests = allRequests.filter(
      (r) => format(new Date(r.created_at), "yyyy-MM-dd") === dayDate
    );

    return {
      day: dayStr,
      requests: requests.length,
      success: requests.filter((r) => r.status === "success").length,
      failed: requests.filter((r) => r.status === "failed").length,
    };
  });

  // Endpoint distribution
  const endpointData = Object.entries(
    allRequests.reduce((acc, req) => {
      const endpoint = req.endpoint || "unknown";
      acc[endpoint] = (acc[endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([endpoint, count]) => ({
      endpoint: endpoint.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      count: count as number,
      color: ENDPOINT_COLORS[endpoint] || "#64748b",
    }))
    .sort((a, b) => (b.count as number) - (a.count as number));

  // Status distribution
  const statusData = [
    { name: "Successful", value: successfulRequests, color: STATUS_COLORS.success },
    { name: "Failed", value: failedRequests, color: STATUS_COLORS.failed },
  ];

  // Peak usage hours
  const peakHour = hourlyData.reduce(
    (max, hour) => (hour.requests > max.requests ? hour : max),
    hourlyData[0] || { hour: "N/A", requests: 0 }
  );

  // Average requests per day (last 7 days)
  const avgRequestsPerDay = dailyData.reduce((sum, day) => sum + day.requests, 0) / 7;

  // Recent activity (last 10 requests)
  const recentActivity = allRequests.slice(0, 10);

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">API Usage</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Detailed analytics of your API consumption and performance
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Requests</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {totalRequests.toLocaleString()}
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
                  {successRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <Progress value={successRate} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Avg Daily Requests</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {avgRequestsPerDay.toFixed(0)}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Peak Hour</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {peakHour.hour}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {peakHour.requests} requests
                </p>
              </div>
              <Clock className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Requests */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Hourly Requests (Last 24 Hours)</CardTitle>
            <CardDescription>API calls by hour with success/failure breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="hour"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  interval={5}
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
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
                  stroke={STATUS_COLORS.success}
                  strokeWidth={2}
                  name="Success"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke={STATUS_COLORS.failed}
                  strokeWidth={2}
                  name="Failed"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Requests */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Daily Requests (Last 7 Days)</CardTitle>
            <CardDescription>API usage trends over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="success" stackId="a" fill={STATUS_COLORS.success} name="Success" />
                <Bar dataKey="failed" stackId="a" fill={STATUS_COLORS.failed} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Distribution & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoint Distribution */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Endpoint Distribution</CardTitle>
            <CardDescription>Usage breakdown by API endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={endpointData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="endpoint"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
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
                  {endpointData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Request Status Distribution</CardTitle>
            <CardDescription>Success vs failure rate visualization</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Recent API Activity
          </CardTitle>
          <CardDescription>Last 10 API requests with status and timing</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No API activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.status === "success"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {activity.endpoint || "unknown"}
                        </Badge>
                        {activity.nin && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            NIN: {activity.nin.substring(0, 3)}...
                          </span>
                        )}
                        {activity.tracking_id && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            ID: {activity.tracking_id.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={activity.status === "success" ? "default" : "destructive"}
                      className="min-w-[70px] justify-center"
                    >
                      {activity.status}
                    </Badge>
                    <div className="text-xs text-slate-500 dark:text-slate-400 min-w-[100px] text-right">
                      {format(new Date(activity.created_at), "MMM d, HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Health Summary */}
      <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                API Health Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Total Endpoints Used</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {endpointData.length}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Failed Requests</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {failedRequests}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Most Used Endpoint</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {endpointData[0]?.endpoint || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
