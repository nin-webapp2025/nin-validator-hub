import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deductWallet } from "@/lib/wallet";

interface PersonalizationResult {
  message?: string;
  approved?: boolean;
  category?: string;
  success?: boolean;
}

interface PersonalizationProps {
  onSuccess?: () => void;
}

export function Personalization({ onSuccess }: PersonalizationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trackingId, setTrackingId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PersonalizationResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingId.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a tracking ID",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      // Wallet deduction for Personalization (₦1,500)
      if (user?.id) {
        const walletResult = await deductWallet(user.id, "personalization");
        if (!walletResult.success) {
          toast({
            title: "Insufficient Balance",
            description: walletResult.message || "Please fund your wallet to continue.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: {
          action: "personalization",
          tracking_id: trackingId,
        },
      });

      if (error) throw error;

      // Save to personalization history if logged in
      if (user?.id) {
        await supabase.from("personalization_history").insert({
          user_id: user.id,
          nin: "", // Not available at this stage
          tracking_id: trackingId,
          status: data?.success ? "success" : "failed",
          result: data,
        });
      }

      setResult(data as PersonalizationResult);

      onSuccess?.(); // Trigger refetch

      toast({
        title: data?.success ? "Personalization Submitted" : "Submission Failed",
        description: data?.message || "Personalization request processed",
        variant: data?.success ? "default" : "destructive",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit personalization",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Submit Personalization
          </CardTitle>
          <CardDescription>
            Submit a personalization request using your tracking ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tracking-id">Tracking ID</Label>
              <Input
                id="tracking-id"
                type="text"
                placeholder="Enter your tracking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use the tracking ID received after validation
              </p>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting || !trackingId.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Submit Personalization
                </>
              )}
            </Button>
          </form>

          {result && (
            <div className="mt-6 rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className={`font-medium ${result.success ? "text-success" : "text-destructive"}`}>
                  {result.success ? "Submission Successful" : "Submission Failed"}
                </span>
              </div>
              
              <div className="space-y-2">
                {result.message && (
                  <div>
                    <span className="text-sm text-muted-foreground">Message:</span>
                    <p className="text-sm font-medium mt-1">{result.message}</p>
                  </div>
                )}
                
                {result.approved !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Approved:</span>
                    <Badge variant={result.approved ? "default" : "destructive"}>
                      {result.approved ? "Yes" : "No"}
                    </Badge>
                  </div>
                )}
                
                {result.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <Badge variant="outline">{result.category}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
