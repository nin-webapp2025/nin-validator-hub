import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataDisplayModal } from "@/components/ui/data-display-modal";
import { trackApiRequest } from "./RateLimitIndicator";

interface BvnFormProps {
  onSuccess?: () => void;
}

export function BvnVerification({ onSuccess }: BvnFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bvn, setBvn] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [verificationType, setVerificationType] = useState<"basic" | "advance">("basic");
  const [modalOpen, setModalOpen] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to verify BVN",
        variant: "destructive",
      });
      return;
    }

    if (!bvn || bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
      toast({
        title: "Invalid BVN",
        description: "BVN must be exactly 11 digits",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      trackApiRequest();

      const action = verificationType === "basic" ? "bvn_basic" : "bvn_advance";
      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: { 
          action,
          bvn,
          number: bvn
        },
      });

      if (error) throw error;

      // Save to database
      const { error: dbError } = await supabase
        .from("bvn_history")
        .insert({
          user_id: user.id,
          bvn: bvn,
          verification_type: verificationType,
          status: data?.status || "completed",
          result: data,
        });

      if (dbError) {
        console.error("Failed to save BVN history:", dbError);
      }

      setResult(data);

      if (data?.status === "success" || data?.verification?.status === "success") {
        toast({
          title: "BVN Verified Successfully",
          description: `${verificationType === "basic" ? "Basic" : "Advanced"} verification completed`,
        });
        onSuccess?.();
      } else {
        toast({
          title: "Verification completed",
          description: data?.message || "Check the result below",
        });
      }
    } catch (error: any) {
      console.error("BVN verification error:", error);
      
      // Save error to database
      try {
        await supabase
          .from("bvn_history")
          .insert({
            user_id: user.id,
            bvn: bvn,
            verification_type: verificationType,
            status: "failed",
            error_message: error.message,
          });
      } catch (dbError) {
        console.error("Failed to save error:", dbError);
      }

      toast({
        title: "Verification failed",
        description: error.message || "An error occurred during verification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          BVN Verification
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Verify Bank Verification Numbers instantly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={verificationType} onValueChange={(v) => setVerificationType(v as "basic" | "advance")}>
          <TabsList className="grid w-full grid-cols-2 gap-1 mb-4 sm:mb-6">
            <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic</TabsTrigger>
            <TabsTrigger value="advance" className="text-xs sm:text-sm">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-0">
            <Alert className="mb-4">
              <AlertDescription>
                Basic verification provides essential BVN details and validation status
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="advance" className="mt-0">
            <Alert className="mb-4">
              <AlertDescription>
                Advanced verification includes comprehensive personal information and biometric data
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bvn">Bank Verification Number (BVN)</Label>
            <Input
              id="bvn"
              type="text"
              placeholder="Enter 11-digit BVN"
              value={bvn}
              onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
              maxLength={11}
              disabled={loading}
              className="font-mono"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your BVN is secure and will only be used for verification purposes
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={loading || !bvn} 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verify BVN ({verificationType === "basic" ? "Basic" : "Advanced"})
              </>
            )}
          </Button>
        </form>

        {result && result?.verification?.data && (
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Verification Result
              </h3>
              <Badge variant="default">
                {result?.status || result?.verification?.status || "Success"}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              {result.verification.data.first_name && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">First Name:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {result.verification.data.first_name}
                  </span>
                </div>
              )}
              {result.verification.data.last_name && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Last Name:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {result.verification.data.last_name}
                  </span>
                </div>
              )}
              {result.verification.data.middle_name && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Middle Name:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {result.verification.data.middle_name}
                  </span>
                </div>
              )}
              {result.verification.data.date_of_birth && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Date of Birth:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {result.verification.data.date_of_birth}
                  </span>
                </div>
              )}
              {result.verification.data.phone_number && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Phone:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {result.verification.data.phone_number}
                  </span>
                </div>
              )}
            </div>

            <Button 
              onClick={() => setModalOpen(true)}
              size="sm"
              variant="outline"
              className="w-full mt-4"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          </div>
        )}

        <DataDisplayModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Complete BVN Verification Details"
          data={result}
        />
      </CardContent>
    </Card>
  );
}
