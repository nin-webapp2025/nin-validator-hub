import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Calendar, CheckCircle, XCircle, Download, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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
}

export function ClearanceHistory({ history = [] }: ClearanceHistoryProps = {}) {
  const { toast } = useToast();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
      </CardContent>
    </Card>
  );
}
