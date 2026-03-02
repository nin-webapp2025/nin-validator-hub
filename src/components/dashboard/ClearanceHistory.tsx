import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Calendar, CheckCircle, XCircle, Download, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 10;

interface ClearanceHistoryProps {
  history?: Array<{
    id: string;
    nin: string;
    response: {
      success?: boolean;
      message?: string;
      approved?: boolean;
      status?: string;
    };
    created_at: string;
  }>;
  isAdmin?: boolean;
}

export function ClearanceHistory({ history: historyProp, isAdmin }: ClearanceHistoryProps) {
  const [history, setHistory] = useState<ClearanceHistoryProps['history']>(historyProp || []);
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
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('clearance_history')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      if (searchQuery.trim()) {
        query = query.ilike('nin', `%${searchQuery.trim()}%`);
      }

      query.range(from, to).then(({ data, count }) => {
        if (data) setHistory(data as any);
        if (count !== null) setTotalCount(count);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyProp, user, page, searchQuery, statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleExport = () => {
    if (!history || history.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no clearance records to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = history.map(record => ({
      nin: record.nin,
      status: record.response?.status || "N/A",
      approved: record.response?.approved ? "Yes" : "No",
      message: record.response?.message || "N/A",
      created_at: new Date(record.created_at).toLocaleString(),
    }));

    exportToCSV(exportData, "clearance-history");
    toast({
      title: "Exported successfully",
      description: `${history.length} records exported to CSV`,
    });
  };

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Clearance History
          </CardTitle>
          <CardDescription>Your recent clearance requests will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No clearance requests yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Clearance History
            </CardTitle>
            <CardDescription>Your recent clearance requests</CardDescription>
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
              placeholder="Search by NIN..."
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

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {history.map((item) => {
            const isSuccess = item.response?.success;
            const isExpanded = expandedItems.has(item.id);

            return (
              <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleItem(item.id)}>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${isSuccess ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                        <ShieldCheck className={`h-5 w-5 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                          NIN: {item.nin}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.response?.approved !== undefined && (
                            <Badge variant={item.response.approved ? "default" : "destructive"} className="text-xs">
                              {item.response.approved ? "Approved" : "Not Approved"}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.created_at), "MMM d, HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.response?.status && (
                        <Badge variant="outline" className="capitalize">
                          {item.response.status}
                        </Badge>
                      )}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    {item.response?.message && (
                      <div className="text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Message:</span>
                        <p className="mt-1 text-slate-900 dark:text-slate-100">
                          {item.response.message}
                        </p>
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
