import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, Copy, CheckCircle } from "lucide-react";
import { z } from "zod";

const trackingIdSchema = z.string().length(15, "Tracking ID must be exactly 15 characters");

export default function ClearanceForm({ onSuccess }: { onSuccess?: () => void }) {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
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
        body: { action: "clearance", trackingId },
      });

      if (error) throw error;

      console.log("Clearance response:", data);

      if (data.success) {
        setResult(data);
        toast({
          title: "Clearance Submitted",
          description: data.message || "Your clearance request has been submitted successfully.",
        });

        // Save to clearance history
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("clearance_history").insert({
            user_id: user.id,
            nin: trackingId,
            response: data,
            status: "success",
          });
        }

        onSuccess?.();
      } else {
        toast({
          title: "Clearance Failed",
          description: data.message || "Failed to submit clearance request.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Clearance error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            Submit Clearance Request
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Submit a Tracking ID for clearance verification
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trackingId">Tracking ID</Label>
              <Input
                id="trackingId"
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
                  Submitting...
                </>
              ) : (
                "Submit Clearance"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-green-700 text-sm sm:text-base">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Clearance Submitted Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-2">
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Tracking ID:</span>
                <span className="text-sm font-mono">{trackingId}</span>
              </div>
              {result.approved !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Approved:</span>
                  <span className="text-sm">{result.approved ? "Yes" : "No"}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Message:</span>
                <span className="text-sm">{result.message}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
