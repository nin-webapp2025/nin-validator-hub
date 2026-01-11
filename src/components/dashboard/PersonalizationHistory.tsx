import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, CheckCircle, XCircle, Copy, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { exportToCSV, copyToClipboard } from "@/lib/export";

interface PersonalizationRecord {
  id: string;
  tracking_id: string | null;
  status: string;
  created_at: string;
  result: unknown;
}

interface PersonalizationHistoryProps {
  history: PersonalizationRecord[];
}

export function PersonalizationHistory({ history }: PersonalizationHistoryProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const maskTrackingId = (trackingId: string) => {
    if (trackingId.length <= 8) return trackingId;
    return trackingId.substring(0, 4) + "****" + trackingId.substring(trackingId.length - 4);
  };

  const handleCopy = async (trackingId: string, recordId: string) => {
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
        description: "There are no personalization records to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = history.map(record => ({
      tracking_id: record.tracking_id || "N/A",
      status: record.status,
      created_at: new Date(record.created_at).toLocaleString(),
    }));

    exportToCSV(exportData, "personalization-history");
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
              Recent Personalizations
            </CardTitle>
            <CardDescription>Your last 10 personalization requests</CardDescription>
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
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No personalizations yet</p>
            <p className="text-xs text-muted-foreground">Submit a personalization request to get started</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {record.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {record.tracking_id ? (
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium truncate">
                            {maskTrackingId(record.tracking_id)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => handleCopy(record.tracking_id!, record.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No tracking ID</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                      </p>
                    </div>
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
