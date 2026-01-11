import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, CheckCircle2, XCircle, Clock, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

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
  history: BvnHistoryItem[];
}

export function BvnHistory({ history }: BvnHistoryProps) {
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

  if (!history || history.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold">BVN Verification History</CardTitle>
          <CardDescription>Your recent BVN verification requests</CardDescription>
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
        <CardTitle className="text-xl font-bold">BVN Verification History</CardTitle>
        <CardDescription>Recent verification requests and results</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
