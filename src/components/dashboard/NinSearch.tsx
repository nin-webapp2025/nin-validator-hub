import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, User, Phone, FileText, Eye } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataDisplayModal } from "@/components/ui/data-display-modal";
import { Badge } from "@/components/ui/badge";

const ninSchema = z.string().regex(/^\d{11}$/, "NIN must be exactly 11 digits");
const phoneSchema = z.string().regex(/^0\d{10}$/, "Phone must be 11 digits starting with 0");

// Helper function to clean response data by removing photo and signature fields
const cleanResponseData = (data: any) => {
  if (!data) return data;
  
  const cleanedData = { ...data };
  
  // Remove photo and signature from nested data object
  if (cleanedData.data) {
    const { photo, signature, Photo, Signature, photograph, Photograph, ...rest } = cleanedData.data;
    cleanedData.data = rest;
  }
  
  // Remove from top level as well
  const { photo, signature, Photo, Signature, photograph, Photograph, ...topLevel } = cleanedData;
  
  return { ...topLevel, data: cleanedData.data };
};

export default function NinSearch() {
  const [activeTab, setActiveTab] = useState("nin");
  const [nin, setNin] = useState("");
  const [phone, setPhone] = useState("");
  const [demoNin, setDemoNin] = useState("");
  const [basicNin, setBasicNin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const handleNinSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      ninSchema.parse(nin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid NIN",
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
        body: { action: "nin_advance", nin, number: nin },
      });

      if (error) throw error;

      console.log("NIN search response:", data);

      if (data.status === "success" || data.verification?.status === "success" || data.success) {
        setResult(data);
        toast({
          title: "Search Successful",
          description: data.message || "NIN data retrieved successfully.",
        });
      } else {
        const errorMsg = data.message || data.error || "Failed to retrieve NIN data.";
        toast({
          title: "Search Failed",
          description: errorMsg === "Unauthorized" 
            ? "API key configuration error. Please contact administrator."
            : errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("NIN search error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      phoneSchema.parse(phone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Phone Number",
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
        body: { action: "nin_phone", phone },
      });

      if (error) throw error;

      console.log("Phone lookup response:", data);

      if (data.success) {
        const cleanedData = cleanResponseData(data);
        setResult(cleanedData);
        toast({
          title: "Lookup Successful",
          description: data.message || "NIN retrieved successfully.",
        });
      } else {
        const errorMsg = data.message || data.error || "Failed to retrieve NIN.";
        toast({
          title: "Lookup Failed",
          description: errorMsg === "Unauthorized" 
            ? "API key configuration error. Please contact administrator."
            : errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Phone lookup error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      ninSchema.parse(demoNin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid NIN",
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
        body: { action: "nin_demo", nin: demoNin },
      });

      if (error) throw error;

      console.log("Demo response:", data);

      if (data.success) {
        const cleanedData = cleanResponseData(data);
        setResult(cleanedData);
        toast({
          title: "Demo Successful",
          description: data.message || "Demo completed successfully.",
        });
      } else {
        const errorMsg = data.message || data.error || "Demo request failed.";
        toast({
          title: "Demo Failed",
          description: errorMsg === "Unauthorized" 
            ? "API key configuration error. Please contact administrator."
            : errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Demo error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBasicVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      ninSchema.parse(basicNin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid NIN",
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
        body: { 
          action: "nin_basic", 
          nin: basicNin,
          number: basicNin 
        },
      });

      if (error) throw error;

      console.log("Basic verification response:", data);

      if (data.status === "success" || data.verification?.status === "success") {
        setResult(data);
        toast({
          title: "Verification Successful",
          description: data.message || "NIN verified successfully.",
        });
      } else {
        const errorMsg = data.message || data.error || "Verification failed.";
        toast({
          title: "Verification Failed",
          description: errorMsg === "Unauthorized" 
            ? "API key configuration error. Please contact administrator."
            : errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Basic verification error:", error);
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
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="nin">
            <User className="h-4 w-4 mr-2" />
            By NIN
          </TabsTrigger>
          <TabsTrigger value="basic">
            <Search className="h-4 w-4 mr-2" />
            Basic Verification
          </TabsTrigger>
          <TabsTrigger value="phone">
            <Phone className="h-4 w-4 mr-2" />
            By Phone
          </TabsTrigger>
          <TabsTrigger value="demo">
            <FileText className="h-4 w-4 mr-2" />
            Demo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search by NIN
              </CardTitle>
              <CardDescription>
                Enter a NIN to retrieve associated information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNinSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search-nin">National Identification Number</Label>
                  <Input
                    id="search-nin"
                    placeholder="Enter 11-digit NIN"
                    value={nin}
                    onChange={(e) => setNin(e.target.value)}
                    maxLength={11}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Search NIN"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Basic NIN Verification
              </CardTitle>
              <CardDescription>
                Quick verification using Prembly API - returns essential identity information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicVerification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basic-nin">National Identification Number</Label>
                  <Input
                    id="basic-nin"
                    placeholder="Enter 11-digit NIN"
                    value={basicNin}
                    onChange={(e) => setBasicNin(e.target.value)}
                    maxLength={11}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify NIN"
                  )}
                </Button>
              </form>

              {result && (result.verification?.data || result.data) && (
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
                    {(result.verification?.data?.first_name || result.data?.first_name) && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">First Name:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.first_name || result.data?.first_name}
                        </span>
                      </div>
                    )}
                    {(result.verification?.data?.last_name || result.data?.last_name) && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Last Name:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.last_name || result.data?.last_name}
                        </span>
                      </div>
                    )}
                    {(result.verification?.data?.middle_name || result.data?.middle_name) && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Middle Name:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.middle_name || result.data?.middle_name}
                        </span>
                      </div>
                    )}
                    {(result.verification?.data?.date_of_birth || result.data?.date_of_birth) && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Date of Birth:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.date_of_birth || result.data?.date_of_birth}
                        </span>
                      </div>
                    )}
                    {(result.verification?.data?.phone || result.data?.phone) && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Phone:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.phone || result.data?.phone}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phone">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Search by Phone Number
              </CardTitle>
              <CardDescription>
                Enter a phone number to retrieve associated NIN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePhoneSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search-phone">Phone Number</Label>
                  <Input
                    id="search-phone"
                    placeholder="08012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={11}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Search by Phone"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Demo Search
              </CardTitle>
              <CardDescription>
                Test the NIN search functionality with demo data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDemoSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-nin">National Identification Number</Label>
                  <Input
                    id="demo-nin"
                    placeholder="Enter 11-digit NIN for demo"
                    value={demoNin}
                    onChange={(e) => setDemoNin(e.target.value)}
                    maxLength={11}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Demo...
                    </>
                  ) : (
                    "Run Demo"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {result && (
        <>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center justify-between">
                <span>Search Results</span>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  Success
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.message && (
                <div className="p-3 bg-white rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-slate-500 mb-1">STATUS</p>
                  <p className="text-sm text-slate-900">{result.message}</p>
                </div>
              )}
              
              {result.nin && (
                <div className="p-3 bg-white rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-slate-500 mb-1">NIN</p>
                  <p className="text-sm font-mono text-slate-900">{result.nin}</p>
                </div>
              )}

              {(result.verification?.data || result.data || result) && (
                <div className="p-4 bg-white rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500">PERSONAL INFORMATION</p>
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
                  
                  {(result.verification?.data?.first_name || result.data?.firstName) && (result.verification?.data?.last_name || result.data?.lastName) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">First Name</p>
                        <p className="text-sm font-medium text-slate-900">
                          {result.verification?.data?.first_name || result.data?.firstName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Last Name</p>
                        <p className="text-sm font-medium text-slate-900">
                          {result.verification?.data?.last_name || result.data?.lastName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <DataDisplayModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Complete NIN Information"
            data={result}
          />
        </>
      )}
    </div>
  );
}
