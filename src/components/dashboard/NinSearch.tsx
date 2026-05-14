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
import { deductWallet, refundWallet } from "@/lib/wallet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ninSchema = z.string().regex(/^\d{11}$/, "NIN must be exactly 11 digits");
const phoneSchema = z.string().regex(/^0\d{10}$/, "Phone must be 11 digits starting with 0");
const demoSearchSchema = z.object({
  firstname: z.string().trim().min(1, "First name is required"),
  lastname: z.string().trim().min(1, "Last name is required"),
  middlename: z.string().trim().optional(),
  gender: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Gender must be either male or female" }),
  }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format"),
});

type DisplayField = {
  label: string;
  keys: string[];
  className?: string;
  format?: (value: string) => string;
};

const DISPLAY_FIELDS: DisplayField[] = [
  { label: "FIRST NAME", keys: ["firstname", "firstName"] },
  { label: "SURNAME", keys: ["surname", "lastName", "last_name"] },
  { label: "MIDDLE NAME", keys: ["middlename", "middleName", "middle_name"] },
  { label: "NIN", keys: ["nin"], className: "font-mono" },
  { label: "DATE OF BIRTH", keys: ["birthdate", "dateOfBirth", "date_of_birth"] },
  {
    label: "GENDER",
    keys: ["gender"],
    format: (value) => {
      const normalized = value.toLowerCase();
      if (normalized === "f") return "Female";
      if (normalized === "m") return "Male";
      if (normalized === "female") return "Female";
      if (normalized === "male") return "Male";
      return value;
    },
  },
  { label: "PHONE NUMBER", keys: ["telephoneno", "phone", "phone_number"], className: "sm:col-span-2" },
  { label: "EMAIL", keys: ["email"], className: "sm:col-span-2 break-all" },
  { label: "BIRTH COUNTRY", keys: ["birthcountry"] },
  { label: "BIRTH STATE", keys: ["birthstate"] },
  { label: "BIRTH LGA", keys: ["birthlga"], className: "sm:col-span-2" },
  { label: "RESIDENTIAL ADDRESS", keys: ["residence_address", "residence_AdressLine1"], className: "sm:col-span-2" },
  { label: "RESIDENCE STATE", keys: ["residence_state"] },
  { label: "RESIDENCE TOWN", keys: ["residence_town", "residence_Town"] },
  { label: "RESIDENCE LGA", keys: ["residence_lga"], className: "sm:col-span-2" },
  { label: "NOK FIRST NAME", keys: ["nok_firstname"] },
  { label: "NOK SURNAME", keys: ["nok_surname"] },
  { label: "NOK ADDRESS", keys: ["nok_address1"], className: "sm:col-span-2" },
  { label: "NOK TOWN", keys: ["nok_town"] },
  { label: "NOK LGA", keys: ["nok_lga"] },
  { label: "NOK STATE", keys: ["nok_state"], className: "sm:col-span-2" },
];

const cleanResponseData = (data: any) => {
  if (!data) return data;

  const cleanedData = { ...data };
  if (cleanedData.data) {
    const { photo, signature, Photo, Signature, photograph, Photograph, ...rest } = cleanedData.data;
    cleanedData.data = rest;
  }

  const { photo, signature, Photo, Signature, photograph, Photograph, ...topLevel } = cleanedData;
  return { ...topLevel, data: cleanedData.data };
};

const getResultRecord = (result: any) => result?.data || result?.nin_data || result?.verification?.data || null;

const getFieldValue = (record: Record<string, unknown> | null, keys: string[]) => {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
};

export default function NinSearch() {
  const [activeTab, setActiveTab] = useState("nin");
  const { user } = useAuth();
  const [nin, setNin] = useState("");
  const [phone, setPhone] = useState("");
  const [demoFirstname, setDemoFirstname] = useState("");
  const [demoLastname, setDemoLastname] = useState("");
  const [demoMiddlename, setDemoMiddlename] = useState("");
  const [demoGender, setDemoGender] = useState("");
  const [demoDateOfBirth, setDemoDateOfBirth] = useState("");
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
      }
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (!user?.id) {
        toast({ title: "Authentication Required", description: "Please sign in to continue.", variant: "destructive" });
        return;
      }

      const walletResult = await deductWallet(user.id, "nin_verification");
      if (!walletResult.success) {
        toast({
          title: "Insufficient Balance",
          description: walletResult.message || "Please fund your wallet to continue.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: { action: "nin_advance", nin, number: nin },
      });

      if (error) throw error;

      const isSuccess =
        data.status === true ||
        data.status === "success" ||
        data.verification?.status === "VERIFIED" ||
        data.verification?.status === "success" ||
        data.success === true;

      if (!isSuccess) {
        const errorMsg = data.message || (typeof data.error === "string" ? data.error : JSON.stringify(data.error)) || "Failed to retrieve NIN data.";
        toast({
          title: "Search Failed",
          description: errorMsg === "Unauthorized" ? "API key configuration error. Please contact administrator." : errorMsg,
          variant: "destructive",
        });
        return;
      }

      setResult(data);
      toast({
        title: "Search Successful",
        description: data.message || "NIN data retrieved successfully.",
      });
    } catch (error: any) {
      if (user?.id) {
        await refundWallet(user.id, "nin_verification").catch(console.error);
      }
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
      }
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (!user?.id) {
        toast({ title: "Authentication Required", description: "Please sign in to continue.", variant: "destructive" });
        return;
      }

      const walletResult = await deductWallet(user.id, "nin_verification");
      if (!walletResult.success) {
        toast({
          title: "Insufficient Balance",
          description: walletResult.message || "Please fund your wallet to continue.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: { action: "nin_phone", phone },
      });

      if (error) throw error;

      if (!data.success) {
        const errorMsg = data.message || (typeof data.error === "string" ? data.error : JSON.stringify(data.error)) || "Failed to retrieve NIN.";
        toast({
          title: "Lookup Failed",
          description: errorMsg === "Unauthorized" ? "API key configuration error. Please contact administrator." : errorMsg,
          variant: "destructive",
        });
        return;
      }

      setResult(data);
      toast({
        title: "Lookup Successful",
        description: data.message || "NIN retrieved successfully.",
      });
    } catch (error: any) {
      if (user?.id) {
        await refundWallet(user.id, "nin_verification").catch(console.error);
      }
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

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    let payload: z.infer<typeof demoSearchSchema>;
    try {
      payload = demoSearchSchema.parse({
        firstname: String(formData.get("firstname") ?? ""),
        lastname: String(formData.get("lastname") ?? ""),
        middlename: String(formData.get("middlename") ?? ""),
        gender: demoGender,
        dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Demographic Data",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: {
          action: "nin_demo",
          firstname: payload.firstname.toUpperCase(),
          lastname: payload.lastname.toUpperCase(),
          middlename: payload.middlename?.toUpperCase() ?? "",
          gender: payload.gender,
          dateOfBirth: payload.dateOfBirth,
        },
      });

      if (error) throw error;

      if (!data.success) {
        const errorMsg = data.message || (typeof data.error === "string" ? data.error : JSON.stringify(data.error)) || "Demo request failed.";
        toast({
          title: "Search Failed",
          description: errorMsg === "Unauthorized" ? "API key configuration error. Please contact administrator." : errorMsg,
          variant: "destructive",
        });
        return;
      }

      setResult(data);
      toast({
        title: "Search Successful",
        description: data.message || "Demographic search completed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resultRecord = getResultRecord(result);
  const photo = getFieldValue(resultRecord, ["photo", "Photo", "photograph", "Photograph"]);
  const signature = getFieldValue(resultRecord, ["signature", "Signature"]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-0">
          <TabsTrigger value="nin" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">By NIN</span>
          </TabsTrigger>
          <TabsTrigger value="phone" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3">
            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">By Phone</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">By Demographics</span>
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
                Search by Demographic Data
              </CardTitle>
              <CardDescription>
                Search for a NIN record using name, gender, and date of birth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDemoSearch} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="demo-firstname">First Name</Label>
                    <Input
                      id="demo-firstname"
                      name="firstname"
                      placeholder="Enter first name"
                      value={demoFirstname}
                      onChange={(e) => setDemoFirstname(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-lastname">Last Name</Label>
                    <Input
                      id="demo-lastname"
                      name="lastname"
                      placeholder="Enter last name"
                      value={demoLastname}
                      onChange={(e) => setDemoLastname(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-middlename">Middle Name</Label>
                    <Input
                      id="demo-middlename"
                      name="middlename"
                      placeholder="Optional middle name"
                      value={demoMiddlename}
                      onChange={(e) => setDemoMiddlename(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-gender">Gender</Label>
                    <Select value={demoGender} onValueChange={setDemoGender}>
                      <SelectTrigger id="demo-gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="demo-date-of-birth">Date of Birth</Label>
                    <Input
                      id="demo-date-of-birth"
                      name="dateOfBirth"
                      type="date"
                      value={demoDateOfBirth}
                      onChange={(e) => setDemoDateOfBirth(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Search Demographics"
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
              {photo && (
                <div className="flex justify-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">PASSPORT PHOTOGRAPH</p>
                    <img
                      src={`data:image/jpeg;base64,${photo}`}
                      alt="Passport"
                      className="max-w-[200px] h-auto rounded-lg shadow-lg border-2 border-blue-200 dark:border-blue-800"
                    />
                  </div>
                </div>
              )}

              {signature && (
                <div className="flex justify-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">SIGNATURE</p>
                    <img
                      src={`data:image/jpeg;base64,${signature}`}
                      alt="Signature"
                      className="max-w-[200px] h-auto rounded-lg shadow-lg border-2 border-blue-200 dark:border-blue-800"
                    />
                  </div>
                </div>
              )}

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
                  {DISPLAY_FIELDS.map((field) => {
                    const value = getFieldValue(resultRecord, field.keys);
                    if (!value) return null;

                    return (
                      <div
                        key={field.label}
                        className={`p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 ${field.className ?? ""}`.trim()}
                      >
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{field.label}</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {field.format ? field.format(value) : value}
                        </p>
                      </div>
                    );
                  })}
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
