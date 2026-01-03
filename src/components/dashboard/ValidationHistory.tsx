import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ValidationRecord {
  id: string;
  nin: string;
  status: string;
  created_at: string;
  result: unknown;
}

interface ValidationHistoryProps {
  history: ValidationRecord[];
}

export function ValidationHistory({ history }: ValidationHistoryProps) {
  const maskNin = (nin: string) => {
    return nin.substring(0, 3) + "****" + nin.substring(7);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Recent Validations
        </CardTitle>
        <CardDescription>Your last 10 NIN validation requests</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No validations yet</p>
            <p className="text-xs text-muted-foreground">Start by validating a NIN</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {record.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-mono text-sm font-medium">{maskNin(record.nin)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={record.status === "success" ? "default" : "destructive"}>
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