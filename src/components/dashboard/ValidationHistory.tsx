import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { History, CheckCircle, XCircle, Copy, Download, Shield, Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { exportToCSV, copyToClipboard } from "@/lib/export";

interface ValidationRecord {
  id: string;
  nin: string;
  status: string;
  created_at: string;
  result: unknown;
  tracking_id?: string | null;
}

interface ValidationHistoryProps {
  history: ValidationRecord[];
}

export function ValidationHistory({ history }: ValidationHistoryProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
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
          </divdiv>
                  </div>
                  <Badge 
                    variant={record.status === "success" ? "default" : "destructive"}
                    className="flex-shrink-0"
                  >
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
