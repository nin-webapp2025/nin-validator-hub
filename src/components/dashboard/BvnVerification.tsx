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

      console.log("BVN API Response:", JSON.stringify(data, null, 2));
      console.log("Has verification.data?", !!data?.verification?.data);
      console.log("Has data directly?", !!data?.data);

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

        {result && (result?.verification?.data || result?.data) && (
          <div className="mt-6 space-y-4">
            {/* Display Passport Photo if available */}
            {(result.verification?.data?.photo || result.data?.photo || result.data?.image || 
              result.verification?.data?.passport || result.data?.passport || 
              result.verification?.data?.photograph || result.data?.photograph ||
              result.verification?.data?.base64Image || result.data?.base64Image) && (
              <div className="flex justify-center p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">PASSPORT PHOTOGRAPH</p>
                  <img 
                    src={`data:image/jpeg;base64,${
                      result.verification?.data?.photo || result.data?.photo || 
                      result.data?.image || result.verification?.data?.passport || 
                      result.data?.passport || result.verification?.data?.photograph || 
                      result.data?.photograph || result.verification?.data?.base64Image || 
                      result.data?.base64Image
                    }`}
                    alt="Passport"
                    className="max-w-[200px] h-auto rounded-lg shadow-lg border-2 border-emerald-300 dark:border-emerald-700"
                  />
                </div>
              </div>
            )}

            <div className="p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg sm:text-xl text-emerald-900 dark:text-emerald-100">
                  ✅ Verification Successful
                </h3>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-100">
                  {result?.status || result?.verification?.status || "Success"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* BVN */}
                {(result.verification?.data?.bvn || result.data?.bvn) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">BVN</p>
                    <p className="font-semibold text-sm sm:text-base font-mono text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.bvn || result.data?.bvn}
                    </p>
                  </div>
                )}

                {/* First Name */}
                {(result.verification?.data?.first_name || result.data?.first_name || result.data?.firstName) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">FIRST NAME</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.first_name || result.data?.first_name || result.data?.firstName}
                    </p>
                  </div>
                )}

                {/* Last Name */}
                {(result.verification?.data?.last_name || result.data?.last_name || result.data?.lastName) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">LAST NAME</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.last_name || result.data?.last_name || result.data?.lastName}
                    </p>
                  </div>
                )}

                {/* Middle Name */}
                {(result.verification?.data?.middle_name || result.data?.middle_name || result.data?.middleName) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">MIDDLE NAME</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.middle_name || result.data?.middle_name || result.data?.middleName}
                    </p>
                  </div>
                )}

                {/* Date of Birth */}
                {(result.verification?.data?.date_of_birth || result.data?.date_of_birth || result.data?.dateOfBirth) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DATE OF BIRTH</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.date_of_birth || result.data?.date_of_birth || result.data?.dateOfBirth}
                    </p>
                  </div>
                )}

                {/* Phone Number */}
                {(result.verification?.data?.phone_number || result.data?.phone_number || result.data?.phone || result.data?.phoneNumber) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">PHONE NUMBER</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.phone_number || result.data?.phone_number || result.data?.phone || result.data?.phoneNumber}
                    </p>
                  </div>
                )}

                {/* Gender */}
                {(result.verification?.data?.gender || result.data?.gender) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">GENDER</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 uppercase">
                      {(result.verification?.data?.gender || result.data?.gender) === 'M' ? 'Male' : 
                       (result.verification?.data?.gender || result.data?.gender) === 'F' ? 'Female' : 
                       result.verification?.data?.gender || result.data?.gender}
                    </p>
                  </div>
                )}

                {/* Email */}
                {(result.verification?.data?.email || result.data?.email) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">EMAIL</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 break-all">
                      {result.verification?.data?.email || result.data?.email}
                    </p>
                  </div>
                )}

                {/* Nationality */}
                {(result.verification?.data?.nationality || result.data?.nationality) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NATIONALITY</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 capitalize">
                      {result.verification?.data?.nationality || result.data?.nationality}
                    </p>
                  </div>
                )}

                {/* State of Origin */}
                {(result.verification?.data?.state_of_origin || result.data?.state_of_origin || result.data?.stateOfOrigin) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">STATE OF ORIGIN</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.state_of_origin || result.data?.state_of_origin || result.data?.stateOfOrigin}
                    </p>
                  </div>
                )}

                {/* LGA of Origin */}
                {(result.verification?.data?.lga_of_origin || result.data?.lga_of_origin || result.data?.lgaOfOrigin) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">LGA OF ORIGIN</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.lga_of_origin || result.data?.lga_of_origin || result.data?.lgaOfOrigin}
                    </p>
                  </div>
                )}

                {/* Residential Address */}
                {(result.verification?.data?.residential_address || result.data?.residential_address || result.data?.address) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">RESIDENTIAL ADDRESS</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.residential_address || result.data?.residential_address || result.data?.address}
                    </p>
                  </div>
                )}

                {/* State of Residence */}
                {(result.verification?.data?.state_of_residence || result.data?.state_of_residence || result.data?.stateOfResidence) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">STATE OF RESIDENCE</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.state_of_residence || result.data?.state_of_residence || result.data?.stateOfResidence}
                    </p>
                  </div>
                )}

                {/* LGA of Residence */}
                {(result.verification?.data?.lga_of_residence || result.data?.lga_of_residence || result.data?.lgaOfResidence) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">LGA OF RESIDENCE</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.lga_of_residence || result.data?.lga_of_residence || result.data?.lgaOfResidence}
                    </p>
                  </div>
                )}

                {/* Marital Status */}
                {(result.verification?.data?.marital_status || result.data?.marital_status || result.data?.maritalStatus) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">MARITAL STATUS</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 capitalize">
                      {result.verification?.data?.marital_status || result.data?.marital_status || result.data?.maritalStatus}
                    </p>
                  </div>
                )}

                {/* Registration Date */}
                {(result.verification?.data?.registration_date || result.data?.registration_date || result.data?.registrationDate) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">REGISTRATION DATE</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.registration_date || result.data?.registration_date || result.data?.registrationDate}
                    </p>
                  </div>
                )}

                {/* Watch Listed */}
                {(result.verification?.data?.watch_listed || result.data?.watch_listed || result.data?.watchListed) && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700 sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">WATCH LISTED</p>
                    <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {result.verification?.data?.watch_listed || result.data?.watch_listed || result.data?.watchListed}
                    </p>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => setModalOpen(true)}
                size="sm"
                variant="default"
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Complete JSON Response
              </Button>
            </div>
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
