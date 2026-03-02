import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Calendar, CheckCircle2, XCircle, Clock, ChevronDown, Download, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { exportToCSV } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 10;

interface BvnHistoryItem {
  id: string;
  bvn: string;
  verification_type: string;
  status: string;
  result: any;
  error_message?: string;
  created_at: string;
}

interface BvnHistoryProps {
  history?: BvnHistoryItem[];
  isAdmin?: boolean;
}

export function BvnHistory({ history: historyProp, isAdmin }: BvnHistoryProps) {
  const [history, setHistory] = useState<BvnHistoryItem[]>(historyProp || []);
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (historyProp) {
      setHistory(historyProp);
      setTotalCount(historyProp.length);
    } else if (user) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyProp, user, page, searchQuery, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter]);

  const fetchHistory = async () => {
    if (!user) return;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('bvn_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    if (statusFilter !== "all") {
      query = query.eq('status', statusFilter);
    }
    if (searchQuery.trim()) {
      query = query.ilike('bvn', `%${searchQuery.trim()}%`);
    }

    const { data, count } = await query.range(from, to);

    if (data) setHistory(data as BvnHistoryItem[]);
    if (count !== null) setTotalCount(count);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleExport = () => {
    if (history.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no BVN verification records to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = history.map(record => ({
      bvn: record.bvn,
      verification_type: record.verification_type,
      status: record.status,
      error_message: record.error_message || "N/A",
      created_at: new Date(record.created_at).toLocaleString(),
    }));

    exportToCSV(exportData, "bvn-history");
    toast({
      title: "Exported successfully",
      description: `${history.length} records exported to CSV`,
    });
  };

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  if (!history || history.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">BVN Verification History</CardTitle>
              <CardDescription>Your recent BVN verification requests</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
              disabled
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No BVN verifications yet</p>
            <p className="text-sm mt-1">Your verification history will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">BVN Verification History</CardTitle>
            <CardDescription>Recent verification requests and results</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by BVN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm dark:bg-slate-900 dark:border-slate-700">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {history.map((item) => {
            const isSuccess = item.status === "success" || item.status === "completed" || item.result?.status === "success" || item.result?.verification?.status === "success";
            const isFailed = item.status === "failed" || item.error_message;
            const isExpanded = expandedItems.has(item.id);

            return (
              <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleItem(item.id)}>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${isSuccess ? 'bg-green-50 dark:bg-green-950/30' : isFailed ? 'bg-red-50 dark:bg-red-950/30' : 'bg-slate-50 dark:bg-slate-900'}`}>
                        <CreditCard className={`h-5 w-5 ${isSuccess ? 'text-green-600' : isFailed ? 'text-red-600' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.bvn.substring(0, 3)}***{item.bvn.substring(8)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {item.verification_type}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.created_at), "MMM d, HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isSuccess ? "default" : isFailed ? "destructive" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : isFailed ? (
                          <XCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {isSuccess ? "Success" : isFailed ? "Failed" : item.status}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    {item.result?.verification?.data && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {item.result.verification.data.first_name && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Name:</span>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {item.result.verification.data.first_name} {item.result.verification.data.last_name}
                            </p>
                          </div>
                        )}
                        {item.result.verification.data.date_of_birth && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">DOB:</span>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {item.result.verification.data.date_of_birth}
                            </p>
                          </div>
                        )}
                        {item.result.verification.data.phone_number && (
                          <div className="col-span-2">
                            <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {item.result.verification.data.phone_number}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {item.error_message && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm text-red-700 dark:text-red-400">
                        {item.error_message}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {page + 1} of {totalPages} ({totalCount} records)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
