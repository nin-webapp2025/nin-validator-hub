import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Calendar, CheckCircle, XCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

interface ClearanceHistoryProps {
  history: Array<{
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

export function ClearanceHistory({ history }: ClearanceHistoryProps) {
  const { toast } = useToast();

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
          <p className="text-sm text-muted-foreground text-center py-8">
            No clearance requests yet
          </p>
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
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {item.response?.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium">
                      NIN: {item.nin}
                    </span>
                    {item.response?.approved !== undefined && (
                      <Badge variant={item.response.approved ? "default" : "destructive"}>
                        {item.response.approved ? "Approved" : "Not Approved"}
                      </Badge>
                    )}
                    {item.response?.status && (
                      <Badge variant="outline" className="capitalize">
                        {item.response.status}
                      </Badge>
                    )}
                  </div>
                  {item.response?.message && (
                    <p className="text-sm text-muted-foreground">
                      {item.response.message}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(item.created_at), "PPp")}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
