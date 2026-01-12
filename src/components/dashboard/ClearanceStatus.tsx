import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { z } from "zod";
import { DataDisplayModal } from "@/components/ui/data-display-modal";
import { Badge } from "@/components/ui/badge";

const trackingIdSchema = z.string().length(15, "Tracking ID must be exactly 15 characters");

export default function ClearanceStatus() {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      trackingIdSchema.parse(trackingId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Tracking ID",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: { action: "clearance_status", trackingId },
      });

      if (error) throw error;

      console.log("Clearance status response:", data);

      if (data.success) {
        setResult(data);
        toast({
          title: "Status Retrieved",
          description: "Clearance status fetched successfully.",
        });
      } else {
        toast({
          title: "Status Check Failed",
          description: data.message || "Failed to retrieve clearance status.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Clearance status error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === "pending" || status === "in-progress") return <Clock className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "completed") return "border-green-200 bg-green-50";
    if (status === "pending" || status === "in-progress") return "border-yellow-200 bg-yellow-50";
    return "border-red-200 bg-red-50";
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            Check Clearance Status
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Enter Tracking ID to check the status of your clearance request
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status-trackingId">Tracking ID</Label>
              <Input
                id="status-trackingId"
                placeholder="Enter 15-character Tracking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                maxLength={15}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Check Status"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className={getStatusColor(result.status)}>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span>Clearance Status</span>
                </div>
                <Badge variant="outline" className="capitalize">
                  {result.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs font-semibold text-slate-500 mb-1">MESSAGE</p>
                <p className="text-sm text-slate-900">{result.message}</p>
              </div>
              
              {result.data && Object.keys(result.data).length > 0 && (
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500">ADDITIONAL DETAILS</p>
                    <Button 
                      onClick={() => setModalOpen(true)}
                      size="sm"
                      variant="outline"
                      className="h-8"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All Details
                    </Button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Click "View All Details" to see complete information
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <DataDisplayModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Complete Clearance Details"
            data={result}
          />
        </>
      )}
    </div>
  );
}
