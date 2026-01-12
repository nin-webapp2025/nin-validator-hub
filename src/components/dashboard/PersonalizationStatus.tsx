import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, User, Calendar, MapPin, Heart, Church } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PersonalizationData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  idNumber?: string;
  photo?: string;
  residence_state?: string;
  religion?: string;
  maritalstatus?: string;
}

interface PersonalizationStatusResult {
  message?: string;
  personalized?: boolean;
  success?: boolean;
  status?: string;
  data?: PersonalizationData;
}

export function PersonalizationStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trackingId, setTrackingId] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PersonalizationStatusResult | null>(null);

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingId.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a tracking ID",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: {
          action: "personalization_status",
          tracking_id: trackingId,
        },
      });

      if (error) throw error;

      setResult(data as PersonalizationStatusResult);

      toast({
        title: data?.success ? "Status Retrieved" : "Check Failed",
        description: data?.message || "Personalization status retrieved",
        variant: data?.success ? "default" : "destructive",
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="shadow-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Check Personalization Status
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            View the status and details of your personalization request
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleCheckStatus} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status-tracking-id">Tracking ID</Label>
              <Input
                id="status-tracking-id"
                type="text"
                placeholder="Enter your tracking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isChecking || !trackingId.trim()}>
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
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              {/* Status Overview */}
              <div className="rounded-lg border p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium">Status</span>
                  <Badge variant={result.success ? "default" : "secondary"}>
                    {result.status || "Unknown"}
                  </Badge>
                </div>
                {result.message && (
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                )}
              </div>

              {/* Profile Card */}
              {result.data && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-primary" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Photo */}
                    {result.data.photo && (
                      <div className="flex justify-center">
                        <img 
                          src={`data:image/jpeg;base64,${result.data.photo}`} 
                          alt="Profile" 
                          className="h-32 w-32 rounded-lg object-cover border-2 border-primary/20"
                        />
                      </div>
                    )}

                    <Separator />

                    {/* Personal Details Grid */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {result.data.firstName && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">First Name</p>
                          <p className="font-medium">{result.data.firstName}</p>
                        </div>
                      )}
                      
                      {result.data.lastName && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Last Name</p>
                          <p className="font-medium">{result.data.lastName}</p>
                        </div>
                      )}
                      
                      {result.data.dateOfBirth && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Date of Birth</p>
                          </div>
                          <p className="font-medium">{result.data.dateOfBirth}</p>
                        </div>
                      )}
                      
                      {result.data.gender && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Gender</p>
                          <p className="font-medium">{result.data.gender}</p>
                        </div>
                      )}
                      
                      {result.data.idNumber && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">ID Number</p>
                          <p className="font-mono text-sm font-medium">{result.data.idNumber}</p>
                        </div>
                      )}
                      
                      {result.data.residence_state && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Residence State</p>
                          </div>
                          <p className="font-medium">{result.data.residence_state}</p>
                        </div>
                      )}
                      
                      {result.data.religion && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Church className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Religion</p>
                          </div>
                          <p className="font-medium">{result.data.religion}</p>
                        </div>
                      )}
                      
                      {result.data.maritalstatus && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Marital Status</p>
                          </div>
                          <p className="font-medium">{result.data.maritalstatus}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
