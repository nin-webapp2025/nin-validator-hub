import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trackApiRequest } from "@/components/dashboard/RateLimitIndicator";
import { createNotification } from "@/lib/notifications";
import { deductCredit } from "@/lib/credits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, CheckCircle, XCircle, Copy, CheckCheck } from "lucide-react";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ninSchema = z.string().trim().length(11, "NIN must be exactly 11 digits").regex(/^\d+$/, "NIN must contain only numbers");

interface ValidationFormProps {
  onSuccess?: () => void;
}

interface ValidationResult {
  status: string;
  tracking_id?: string;
  data?: {
    firstname?: string;
    surname?: string;
    middlename?: string;
    birthdate?: string;
    gender?: string;
    photo?: string;
  };
  message?: string;
}

export function ValidationForm({ onSuccess }: ValidationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nin, setNin] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      ninSchema.parse(nin);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Invalid NIN",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsValidating(true);
    setCopiedTrackingId(false);
    setResult(null);

    try {
      // Track API request for rate limiting
      trackApiRequest();

      // Credit deduction disabled until payment system is implemented
      // if (user?.id) {
      //   const creditResult = await deductCredit(user.id);
      //   if (!creditResult.success) {
      //     toast({
      //       title: "No Credits",
      //       description: "You have no API credits remaining. Contact an admin to top up.",
      //       variant: "destructive",
      //     });
      //     setIsValidating(false);
      //     return;
      //   }
      // }

      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: {
          action: "validate",
          nin: nin,
          number: nin,
        },
      });

      if (error) {
        console.error("Edge function invocation error:", error);
        throw error;
      }

      console.log("NIN API Response:", JSON.stringify(data, null, 2));
      console.log("Response structure:", {
        hasVerification: !!data?.verification,
        hasData: !!data?.data,
        hasVerificationData: !!data?.verification?.data,
        status: data?.status,
        verificationStatus: data?.verification?.status
      });

      const payload: any = data;
      
      // Check if the API key is not configured
      if (payload?.error === "API key not configured") {
        toast({
          title: "Configuration Error",
          description: "The API service is not properly configured. Please contact support.",
          variant: "destructive",
        });
        return;
      }
      
      const balanceMsg = payload?.message?.balance;
      const isSuccess = payload?.status === "success" || payload?.success === true;

      // Save to history (including failed/billing responses) – only if logged in
      if (user?.id) {
        await supabase.from("validation_history").insert({
          user_id: user.id,
          nin: nin,
          status: isSuccess ? "success" : "failed",
          result: payload,
          tracking_id: payload?.tracking_id || null,
        });
      }

      // Only show result card for actual validation payloads
      if (typeof payload?.status === "string") {
        setResult(payload as ValidationResult);
      } else {
        setResult(null);
      }

      onSuccess?.();

      // Create in-app notification
      createNotification({
        title: isSuccess ? "NIN Validation Success" : "NIN Validation Failed",
        message: isSuccess
          ? `NIN ${nin.substring(0, 3)}****${nin.substring(7)} validated successfully.`
          : `Validation failed for NIN ${nin.substring(0, 3)}****${nin.substring(7)}.`,
        type: isSuccess ? "success" : "error",
      });

      if (!isSuccess && typeof balanceMsg === "string") {
        toast({
          title: "Insufficient Balance",
          description: `API billing error: ${balanceMsg}`,
          variant: "destructive",
        });
        return;
      }

      const description =
        typeof payload?.message === "string"
          ? payload.message
          : "NIN validation completed.";

      toast({
        title: isSuccess ? "Validation Successful" : "Validation Failed",
        description,
        variant: isSuccess ? "default" : "destructive",
      });
    } catch (error: unknown) {
      let errorTitle = "Error";
      let errorMessage = "Failed to validate NIN";

      // Prefer structured error bodies returned by the Edge Function
      if (error instanceof FunctionsHttpError) {
        try {
          const errBody: any = await error.context.json();
          const balanceMsg = errBody?.message?.balance;

          if (typeof balanceMsg === "string") {
            errorTitle = "Insufficient Balance";
            errorMessage = `API billing error: ${balanceMsg}`;
          } else if (typeof errBody?.message === "string") {
            errorMessage = errBody.message;
          } else if (typeof errBody?.error === "string") {
            errorMessage = errBody.error;
          } else {
            errorMessage = "The validation service returned an error.";
          }
        } catch {
          errorMessage = "The validation service returned an error.";
        }
      } else if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        // Fallback: parse message text
        const message = error.message;
        if (message.includes("balance") || message.includes("fund")) {
          errorTitle = "Insufficient Balance";
          errorMessage = "Your API account has insufficient funds. Please top up your account to continue validating.";
        } else {
          errorMessage = message;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          NIN Validation
        </CardTitle>
        <CardDescription>
          Enter an 11-digit NIN to validate identity information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleValidate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nin">National Identification Number</Label>
            <Input
              id="nin"
              type="text"
              placeholder="Enter 11-digit NIN"
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
              maxLength={11}
              required
            />
            <p className="text-xs text-muted-foreground">{nin.length}/11 digits</p>
          </div>
          
          <Button type="submit" className="w-full" disabled={isValidating || nin.length !== 11}>
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Validate NIN
              </>
            )}
          </Button>
        </form>

        {result && (
          <div className="mt-6 space-y-4">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {result.status === "success" ? (
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                  )}
                  <h3 className="font-bold text-lg sm:text-xl text-blue-900 dark:text-blue-100">
                    {result.status === "success" ? "✅ Validation Successful" : "❌ Validation Failed"}
                  </h3>
                </div>
                <Badge className={result.status === "success" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}>
                  {result.status}
                </Badge>
              </div>

              {result.data && (
                <div className="space-y-4">
                  {result.data.photo && (
                    <div className="flex justify-center mb-4">
                      <img 
                        src={`data:image/jpeg;base64,${result.data.photo}`} 
                        alt="Profile" 
                        className="h-32 w-32 sm:h-40 sm:w-40 rounded-lg object-cover border-4 border-white shadow-lg"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {result.data.firstname && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">FIRST NAME</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.data.firstname}
                        </p>
                      </div>
                    )}
                    {result.data.surname && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">SURNAME</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.data.surname}
                        </p>
                      </div>
                    )}
                    {result.data.middlename && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">MIDDLE NAME</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.data.middlename}
                        </p>
                      </div>
                    )}
                    {result.data.birthdate && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DATE OF BIRTH</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.data.birthdate}
                        </p>
                      </div>
                    )}
                    {result.data.gender && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">GENDER</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.data.gender}
                        </p>
                      </div>
                    )}
                    {result.data.maritalstatus && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">MARITAL STATUS</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.data.maritalstatus}
                        </p>
                      </div>
                    )}
                    {result.data.telephoneno && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">PHONE NUMBER</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.data.telephoneno}
                        </p>
                      </div>
                    )}
                    {result.data.email && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700 sm:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">EMAIL</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 break-all">
                          {result.data.email}
                        </p>
                      </div>
                    )}
                    {result.data.residence_address && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700 sm:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">RESIDENCE ADDRESS</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.data.residence_address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {result.message && (
                <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">{result.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {result?.tracking_id && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Tracking ID (Use for Personalization)
                </p>
                <p className="font-mono text-sm font-medium break-all">
                  {result.tracking_id}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(result.tracking_id!);
                  setCopiedTrackingId(true);
                  setTimeout(() => setCopiedTrackingId(false), 2000);
                  toast({
                    title: "Copied!",
                    description: "Tracking ID copied to clipboard",
                  });
                }}
              >
                {copiedTrackingId ? (
                  <>
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Save this tracking ID to check personalization status or submit personalization requests
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}