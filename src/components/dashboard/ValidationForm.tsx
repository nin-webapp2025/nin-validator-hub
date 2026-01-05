import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, CheckCircle, XCircle } from "lucide-react";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { z } from "zod";

const ninSchema = z.string().trim().length(11, "NIN must be exactly 11 digits").regex(/^\d+$/, "NIN must contain only numbers");

interface ValidationFormProps {
  onSuccess: () => void;
}

interface ValidationResult {
  status: string;
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
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: {
          action: "validate",
          nin: nin,
        },
      });

      if (error) throw error;

      const payload: any = data;
      const balanceMsg = payload?.message?.balance;
      const isSuccess = payload?.status === "success" || payload?.success === true;

      // Save to history (including failed/billing responses)
      await supabase.from("validation_history").insert({
        user_id: user!.id,
        nin: nin,
        status: isSuccess ? "success" : "failed",
        result: payload,
      });

      // Only show result card for actual validation payloads
      if (typeof payload?.status === "string") {
        setResult(payload as ValidationResult);
      } else {
        setResult(null);
      }

      onSuccess();

      if (!isSuccess && typeof balanceMsg === "string") {
        toast({
          title: "Insufficient Balance",
          description: `RobostTech billing error: ${balanceMsg}`,
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
            errorMessage = `RobostTech billing error: ${balanceMsg}`;
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
          errorMessage = "Your API account has insufficient funds. Please top up your RobostTech account to continue validating.";
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
          <div className="mt-6 rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              {result.status === "success" ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className={`font-medium ${result.status === "success" ? "text-success" : "text-destructive"}`}>
                {result.status === "success" ? "Valid NIN" : "Invalid NIN"}
              </span>
            </div>
            
            {result.data && (
              <div className="space-y-2 text-sm">
                {result.data.photo && (
                  <div className="mb-4">
                    <img 
                      src={`data:image/jpeg;base64,${result.data.photo}`} 
                      alt="Profile" 
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {result.data.firstname && (
                    <div>
                      <span className="text-muted-foreground">First Name:</span>
                      <p className="font-medium">{result.data.firstname}</p>
                    </div>
                  )}
                  {result.data.surname && (
                    <div>
                      <span className="text-muted-foreground">Surname:</span>
                      <p className="font-medium">{result.data.surname}</p>
                    </div>
                  )}
                  {result.data.middlename && (
                    <div>
                      <span className="text-muted-foreground">Middle Name:</span>
                      <p className="font-medium">{result.data.middlename}</p>
                    </div>
                  )}
                  {result.data.birthdate && (
                    <div>
                      <span className="text-muted-foreground">Date of Birth:</span>
                      <p className="font-medium">{result.data.birthdate}</p>
                    </div>
                  )}
                  {result.data.gender && (
                    <div>
                      <span className="text-muted-foreground">Gender:</span>
                      <p className="font-medium">{result.data.gender}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {result.message && (
              <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}