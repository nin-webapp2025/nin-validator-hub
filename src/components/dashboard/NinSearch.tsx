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
import { useAuth } from "@/hooks/useAuth";
import { deductWallet } from "@/lib/wallet";

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
  const { user } = useAuth();
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
      // Wallet deduction for NIN Verification (₦800)
      if (user?.id) {
        const walletResult = await deductWallet(user.id, "nin_verification");
        if (!walletResult.success) {
          toast({
            title: "Insufficient Balance",
            description: walletResult.message || "Please fund your wallet to continue.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: { action: "nin_advance", nin, number: nin },
      });

      if (error) throw error;

      console.log("NIN search response:", data);

      // Prembly API returns status: true (boolean), RobostTech returns status: "success" (string)
      const isSuccess = 
        data.status === true || 
        data.status === "success" || 
        data.verification?.status === "VERIFIED" ||
        data.verification?.status === "success" || 
        data.success === true;

      if (isSuccess) {
        setResult(data);
        toast({
          title: "Search Successful",
          description: data.message || "NIN data retrieved successfully.",
        });
      } else {
        const errorMsg = data.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || "Failed to retrieve NIN data.";
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
      // Wallet deduction for NIN Verification via phone (₦800)
      if (user?.id) {
        const walletResult = await deductWallet(user.id, "nin_verification");
        if (!walletResult.success) {
          toast({
            title: "Insufficient Balance",
            description: walletResult.message || "Please fund your wallet to continue.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: { action: "nin_phone", phone },
      });

      if (error) throw error;

      console.log("Phone lookup response:", data);

      if (data.success) {
        setResult(data);
        toast({
          title: "Lookup Successful",
          description: data.message || "NIN retrieved successfully.",
        });
      } else {
        const errorMsg = data.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || "Failed to retrieve NIN.";
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
        setResult(data);
        toast({
          title: "Demo Successful",
          description: data.message || "Demo completed successfully.",
        });
      } else {
        const errorMsg = data.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || "Demo request failed.";
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

      // Prembly API returns status: true (boolean), verification.status: "VERIFIED"
      const isSuccess = 
        data.status === true || 
        data.status === "success" || 
        data.verification?.status === "VERIFIED" ||
        data.verification?.status === "success" || 
        data.success === true;

      if (isSuccess) {
        setResult(data);
        toast({
          title: "Verification Successful",
          description: data.detail || data.message || "NIN verified successfully.",
        });
      } else {
        const errorMsg = data.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || "Verification failed.";
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
        <TabsList className="grid w-full grid-cols-4 gap-1 sm:gap-0">
          <TabsTrigger value="nin" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">By NIN</span>
          </TabsTrigger>
          <TabsTrigger value="basic" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="phone" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3">
            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Phone</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Demo</span>
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
                <div className="mt-6 p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg sm:text-xl text-purple-900 dark:text-purple-100">
                      ✅ Verification Successful
                    </h3>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-100">
                      {result?.status || result?.verification?.status || "Success"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {(result.verification?.data?.first_name || result.data?.first_name) && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">FIRST NAME</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.first_name || result.data?.first_name}
                        </p>
                      </div>
                    )}
                    {(result.verification?.data?.last_name || result.data?.last_name) && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">LAST NAME</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.last_name || result.data?.last_name}
                        </p>
                      </div>
                    )}
                    {(result.verification?.data?.middle_name || result.data?.middle_name) && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">MIDDLE NAME</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.middle_name || result.data?.middle_name}
                        </p>
                      </div>
                    )}
                    {(result.verification?.data?.date_of_birth || result.data?.date_of_birth) && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DATE OF BIRTH</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.date_of_birth || result.data?.date_of_birth}
                        </p>
                      </div>
                    )}
                    {(result.verification?.data?.phone || result.data?.phone) && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-slate-700 sm:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">PHONE</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.phone || result.data?.phone}
                        </p>
                      </div>
                    )}
                    {(result.verification?.data?.gender || result.data?.gender) && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">GENDER</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {result.verification?.data?.gender || result.data?.gender}
                        </p>
                      </div>
                    )}
                    {(result.verification?.data?.email || result.data?.email) && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-slate-700 sm:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">EMAIL</p>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 break-all">
                          {result.verification?.data?.email || result.data?.email}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => setModalOpen(true)}
                    size="sm"
                    variant="default"
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Complete JSON Response
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
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center justify-between">
                <span>Search Results</span>
                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-100">
                  Success
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display Passport Photo if available */}
              {(result.data?.photo || result.nin_data?.photo) && (
                <div className="flex justify-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">PASSPORT PHOTOGRAPH</p>
                    <img 
                      src={`data:image/jpeg;base64,${result.data?.photo || result.nin_data?.photo}`}
                      alt="Passport"
                      className="max-w-[200px] h-auto rounded-lg shadow-lg border-2 border-blue-200 dark:border-blue-800"
                    />
                  </div>
                </div>
              )}

              {/* Display Signature if available */}
              {(result.data?.signature || result.nin_data?.signature) && (
                <div className="flex justify-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">SIGNATURE</p>
                    <img 
                      src={`data:image/jpeg;base64,${result.data?.signature || result.nin_data?.signature}`}
                      alt="Signature"
                      className="max-w-[200px] h-auto rounded-lg shadow-lg border-2 border-blue-200 dark:border-blue-800"
                    />
                  </div>
                </div>
              )}

              {/* Comprehensive Personal Information Grid */}
              <div className="p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">PERSONAL INFORMATION</p>
                  <Button 
                    onClick={() => setModalOpen(true)}
                    size="sm"
                    variant="outline"
                    className="h-8"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View JSON
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* First Name */}
                  {(result.data?.firstname || result.nin_data?.firstname) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">FIRST NAME</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.firstname || result.nin_data?.firstname}
                      </p>
                    </div>
                  )}

                  {/* Surname */}
                  {(result.data?.surname || result.nin_data?.surname) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">SURNAME</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.surname || result.nin_data?.surname}
                      </p>
                    </div>
                  )}

                  {/* Middle Name */}
                  {(result.data?.middlename || result.nin_data?.middlename) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">MIDDLE NAME</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.middlename || result.nin_data?.middlename}
                      </p>
                    </div>
                  )}

                  {/* NIN */}
                  {(result.data?.nin || result.nin_data?.nin) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NIN</p>
                      <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.nin || result.nin_data?.nin}
                      </p>
                    </div>
                  )}

                  {/* Date of Birth */}
                  {(result.data?.birthdate || result.nin_data?.birthdate) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DATE OF BIRTH</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.birthdate || result.nin_data?.birthdate}
                      </p>
                    </div>
                  )}

                  {/* Gender */}
                  {(result.data?.gender || result.nin_data?.gender) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">GENDER</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase">
                        {result.data?.gender === 'f' ? 'Female' : result.data?.gender === 'm' ? 'Male' : result.data?.gender || result.nin_data?.gender}
                      </p>
                    </div>
                  )}

                  {/* Phone Number */}
                  {(result.data?.telephoneno || result.nin_data?.telephoneno) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">PHONE NUMBER</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.telephoneno || result.nin_data?.telephoneno}
                      </p>
                    </div>
                  )}

                  {/* Email */}
                  {(result.data?.email || result.nin_data?.email) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">EMAIL</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-all">
                        {result.data?.email || result.nin_data?.email}
                      </p>
                    </div>
                  )}

                  {/* Birth Country */}
                  {(result.data?.birthcountry || result.nin_data?.birthcountry) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">BIRTH COUNTRY</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {result.data?.birthcountry || result.nin_data?.birthcountry}
                      </p>
                    </div>
                  )}

                  {/* Birth State */}
                  {(result.data?.birthstate || result.nin_data?.birthstate) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">BIRTH STATE</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.birthstate || result.nin_data?.birthstate}
                      </p>
                    </div>
                  )}

                  {/* Birth LGA */}
                  {(result.data?.birthlga || result.nin_data?.birthlga) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">BIRTH LGA</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.birthlga || result.nin_data?.birthlga}
                      </p>
                    </div>
                  )}

                  {/* Residential Address */}
                  {(result.data?.residence_address || result.data?.residence_AdressLine1 || result.nin_data?.residence_address) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">RESIDENTIAL ADDRESS</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.residence_address || result.data?.residence_AdressLine1 || result.nin_data?.residence_address}
                      </p>
                    </div>
                  )}

                  {/* Residence State */}
                  {(result.data?.residence_state || result.nin_data?.residence_state) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">RESIDENCE STATE</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.residence_state || result.nin_data?.residence_state}
                      </p>
                    </div>
                  )}

                  {/* Residence Town */}
                  {(result.data?.residence_town || result.data?.residence_Town || result.nin_data?.residence_town) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">RESIDENCE TOWN</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.residence_town || result.data?.residence_Town || result.nin_data?.residence_town}
                      </p>
                    </div>
                  )}

                  {/* Residence LGA */}
                  {(result.data?.residence_lga || result.nin_data?.residence_lga) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">RESIDENCE LGA</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.data?.residence_lga || result.nin_data?.residence_lga}
                      </p>
                    </div>
                  )}

                  {/* Next of Kin Information */}
                  {(result.data?.nok_firstname || result.nin_data?.nok_firstname) && (
                    <>
                      <div className="sm:col-span-2 mt-4 mb-2">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 border-b pb-2">NEXT OF KIN INFORMATION</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NOK FIRST NAME</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {result.data?.nok_firstname || result.nin_data?.nok_firstname}
                        </p>
                      </div>

                      {(result.data?.nok_surname || result.nin_data?.nok_surname) && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NOK SURNAME</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {result.data?.nok_surname || result.nin_data?.nok_surname}
                          </p>
                        </div>
                      )}

                      {(result.data?.nok_address1 || result.nin_data?.nok_address1) && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 sm:col-span-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NOK ADDRESS</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {result.data?.nok_address1 || result.nin_data?.nok_address1}
                          </p>
                        </div>
                      )}

                      {(result.data?.nok_town || result.nin_data?.nok_town) && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NOK TOWN</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {result.data?.nok_town || result.nin_data?.nok_town}
                          </p>
                        </div>
                      )}

                      {(result.data?.nok_lga || result.nin_data?.nok_lga) && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NOK LGA</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {result.data?.nok_lga || result.nin_data?.nok_lga}
                          </p>
                        </div>
                      )}

                      {(result.data?.nok_state || result.nin_data?.nok_state) && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 sm:col-span-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NOK STATE</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {result.data?.nok_state || result.nin_data?.nok_state}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <DataDisplayModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Complete NIN Information"
            data={cleanResponseData(result)}
          />
        </>
      )}
    </div>
  );
}
