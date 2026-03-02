import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, CheckCircle, XCircle, Copy, Download, Shield, Calendar, ChevronDown, ChevronLeft, ChevronRight, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { exportToCSV, exportToPDF, copyToClipboard } from "@/lib/export";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 10;

interface ValidationRecord {
  id: string;
  nin: string;
  status: string;
  created_at: string;
  result: unknown;
  tracking_id?: string | null;
}

interface ValidationHistoryProps {
  history?: ValidationRecord[];
  isAdmin?: boolean;
}

export function ValidationHistory({ history: historyProp, isAdmin }: ValidationHistoryProps) {
  const [history, setHistory] = useState<ValidationRecord[]>(historyProp || []);
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
        .from('validation_history')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Admin sees all users; regular users see only their own
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
        if (data) setHistory(data as ValidationRecord[]);
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

  const maskNin = (nin: string) => {
    return nin.substring(0, 3) + "****" + nin.substring(7);
  };

  const handleCopyTrackingId = async (trackingId: string, recordId: string) => {
    try {
      await copyToClipboard(trackingId);
      setCopiedId(recordId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied!",
        description: "Tracking ID copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (history.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no validation records to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = history.map(record => ({
      nin: record.nin,
      status: record.status,
      tracking_id: record.tracking_id || "N/A",
      created_at: new Date(record.created_at).toLocaleString(),
    }));

    exportToCSV(exportData, "validation-history");
    toast({
      title: "Exported successfully",
      description: `${history.length} records exported to CSV`,
    });
  };

  const handleExportPDF = async () => {
    if (history.length === 0) {
      toast({ title: "No data", description: "Nothing to export", variant: "destructive" });
      return;
    }
    const pdfData = history.map(record => ({
      NIN: record.nin,
      Status: record.status,
      "Tracking ID": record.tracking_id || "N/A",
      Date: new Date(record.created_at).toLocaleString(),
    }));
    await exportToPDF(pdfData, "NIN Validation Report", "validation-report");
    toast({ title: "PDF exported", description: `${history.length} records exported to PDF` });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Validations
            </CardTitle>
            <CardDescription>Your last 10 NIN validation requests</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
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

        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No validation history yet</p>
            <p className="text-sm mt-1">Your validation requests will appear here</p>
          </div>
        ) : (
          <>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {history.map((record) => {
              const isSuccess = record.status === "success";
              const isExpanded = expandedItems.has(record.id);

              return (
                <Collapsible key={record.id} open={isExpanded} onOpenChange={() => toggleItem(record.id)}>
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${isSuccess ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                          <Shield className={`h-5 w-5 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                            {maskNin(record.nin)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {record.tracking_id && (
                              <>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                  {record.tracking_id.substring(0, 8)}...
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleCopyTrackingId(record.tracking_id!, record.id)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
                              </>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(record.created_at), "MMM d, HH:mm")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isSuccess ? "default" : "destructive"}
                          className="flex items-center gap-1"
                        >
                          {isSuccess ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {isSuccess ? "Success" : "Failed"}
                        </Badge>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      {record.tracking_id && (
                        <div className="text-sm space-y-1">
                          <span className="text-slate-500 dark:text-slate-400">Tracking ID:</span>
                          <p className="font-mono text-xs text-slate-900 dark:text-slate-100 break-all">
                            {record.tracking_id}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
