import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Clock, CheckCircle2, XCircle } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

const ninSchema = z.string().trim().length(11, "NIN must be exactly 11 digits").regex(/^\d+$/, "NIN must contain only numbers");

interface StatusResult {
  message?: string;
  status?: string;
  success?: boolean;
  "in-progress"?: boolean;
}

export function ValidationStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nin, setNin] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);

  const handleCheckStatus = async (e: React.FormEvent) => {
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

    setIsChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: {
          action: "validation_status",
          nin: nin,
        },
      });

      if (error) throw error;

      setResult(data as StatusResult);

      toast({
        title: "Status Retrieved",
        description: data?.message || "Status check completed",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check status",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    if (result.success) return <CheckCircle2 className="h-5 w-5 text-success" />;
    if (result["in-progress"]) return <Clock className="h-5 w-5 text-warning animate-pulse" />;
    return <XCircle className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusColor = () => {
    if (!result) return "default";
    if (result.success) return "default";
    if (result["in-progress"]) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="shadow-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Check Validation Status
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Check the current status of a NIN validation request
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleCheckStatus} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status-nin">National Identification Number</Label>
              <Input
                id="status-nin"
                type="text"
                placeholder="Enter 11-digit NIN"
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                maxLength={11}
                required
              />
              <p className="text-xs text-muted-foreground">{nin.length}/11 digits</p>
            </div>
            
            <Button type="submit" className="w-full" disabled={isChecking || nin.length !== 11}>
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Check Status
                </>
              )}
            </Button>
          </form>

          {result && (
            <div className="mt-4 sm:mt-6 rounded-lg border p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                {getStatusIcon()}
                <span className="text-sm sm:text-base font-medium">Validation Status</span>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {result.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={getStatusColor() as any}>
                      {result.status}
                    </Badge>
                  </div>
                )}
                
                {result.message && (
                  <div>
                    <span className="text-sm text-muted-foreground">Message:</span>
                    <p className="text-sm font-medium mt-1">{result.message}</p>
                  </div>
                )}
                
                {result["in-progress"] && (
                  <div className="flex items-center gap-2 text-warning">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span className="text-sm">Validation in progress...</span>
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
