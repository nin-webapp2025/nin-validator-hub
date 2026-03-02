import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { deductCredit } from "@/lib/credits";
import { createNotification } from "@/lib/notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Printer, Download, FileImage, FileText, ArrowLeft, Phone, Hash } from "lucide-react";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ---------- Validation schemas ----------
const ninSchema = z.string().trim().length(11, "NIN must be exactly 11 digits").regex(/^\d+$/, "NIN must contain only numbers");
const phoneSchema = z.string().regex(/^0\d{10}$/, "Phone must be 11 digits starting with 0");

// ---------- NIN data shape ----------
interface NinData {
  nin: string;
  firstName: string;
  surname: string;
  middleName: string;
  dateOfBirth: string;
  gender: string;
  photo: string; // base64
  trackingId: string;
  address: string;
  state: string;
  issueDate: string;
}

type SlipType = "premium" | "long";
type SearchMode = "nin" | "phone";

// ---------- Helper: extract NIN data from various API response shapes ----------
function extractNinData(payload: any): NinData | null {
  // Prembly nin_advance response shape
  const d =
    payload?.nin_data ||
    payload?.data ||
    payload?.verification?.data ||
    payload?.result ||
    payload;

  if (!d) return null;

  const nin =
    d.nin || d.NIN || d.idNumber || d.vnin || payload?.nin || "";
  const firstName =
    d.firstName || d.firstname || d.first_name || d.givenNames || "";
  const surname = d.lastName || d.surname || d.last_name || d.surName || "";
  const middleName =
    d.middleName || d.middlename || d.middle_name || "";
  const dateOfBirth =
    d.dateOfBirth || d.birthdate || d.date_of_birth || d.dob || "";
  const gender = d.gender || d.Gender || d.sex || "";
  const photo = d.photo || d.Photo || d.photograph || d.image || "";
  const trackingId =
    d.tracking_id || d.trackingId || d.Tracking_ID || payload?.tracking_id || "";
  const address =
    d.residence_AdressLine1 ||
    d.residenceAddressLine1 ||
    d.residence_address ||
    d.address ||
    d.residence_addr ||
    "";
  const state =
    d.residence_state ||
    d.residenceState ||
    d.state_of_residence ||
    d.state ||
    "";

  if (!nin && !firstName && !surname) return null;

  const now = new Date();
  const issueDate = `${String(now.getDate()).padStart(2, "0")} ${now.toLocaleString("en-US", { month: "short" }).toUpperCase()} ${now.getFullYear()}`;

  return {
    nin: nin.replace(/\s/g, ""),
    firstName: firstName.toUpperCase(),
    surname: surname.toUpperCase(),
    middleName: middleName.toUpperCase(),
    dateOfBirth,
    gender: gender.toUpperCase(),
    photo,
    trackingId,
    address: address.toUpperCase(),
    state: state.charAt(0).toUpperCase() + state.slice(1).toLowerCase(),
    issueDate,
  };
}

// ---------- Format NIN with spaces: 9728 694 3431 ----------
function formatNin(nin: string): string {
  if (nin.length !== 11) return nin;
  return `${nin.slice(0, 4)} ${nin.slice(4, 7)} ${nin.slice(7)}`;
}

// ======================== PREMIUM NIN SLIP (Green Card) ========================
function PremiumNinSlip({ data }: { data: NinData }) {
  return (
    <div className="w-full max-w-[500px] mx-auto">
      {/* FRONT */}
      <div
        className="relative overflow-hidden rounded-lg border-2 border-green-700"
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #d1fae5 30%, #a7f3d0 60%, #6ee7b7 100%)",
          aspectRatio: "1.6/1",
        }}
      >
        {/* Watermark pattern */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23166534' fill-rule='evenodd'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative p-4 sm:p-5 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="text-center mb-2">
            <p className="text-[10px] sm:text-xs font-bold text-green-900 tracking-wider uppercase">
              Federal Republic of Nigeria
            </p>
            <p className="text-[9px] sm:text-[10px] font-semibold text-green-800 uppercase">
              Digital NIN Slip
            </p>
          </div>

          {/* Body */}
          <div className="flex gap-3 sm:gap-4 flex-1">
            {/* Photo */}
            <div className="flex-shrink-0">
              {data.photo ? (
                <img
                  src={data.photo.startsWith("data:") ? data.photo : `data:image/jpeg;base64,${data.photo}`}
                  alt="Photo"
                  className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded border border-green-700"
                />
              ) : (
                <div className="w-16 h-20 sm:w-20 sm:h-24 bg-green-100 border border-green-700 rounded flex items-center justify-center">
                  <span className="text-[10px] text-green-700">No Photo</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-1">
              <div>
                <p className="text-[8px] sm:text-[9px] text-green-700 uppercase tracking-wide">Surname/Nom</p>
                <p className="text-xs sm:text-sm font-bold text-green-950 truncate">{data.surname}</p>
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] text-green-700 uppercase tracking-wide">Given Names/Prénoms</p>
                <p className="text-xs sm:text-sm font-bold text-green-950 truncate">
                  {data.firstName} {data.middleName}
                </p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-[8px] sm:text-[9px] text-green-700 uppercase tracking-wide">Date of Birth</p>
                  <p className="text-[10px] sm:text-xs font-semibold text-green-950">{data.dateOfBirth}</p>
                </div>
                <div>
                  <p className="text-[8px] sm:text-[9px] text-green-700 uppercase tracking-wide">Sex/Sexe</p>
                  <p className="text-[10px] sm:text-xs font-semibold text-green-950">{data.gender}</p>
                </div>
              </div>
            </div>

            {/* QR + Nationality */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <QRCodeSVG value={data.nin} size={56} level="M" className="border border-green-700 p-0.5 bg-white rounded" />
              <p className="text-lg sm:text-xl font-black text-green-800 leading-none">NGA</p>
              <div className="text-center">
                <p className="text-[7px] sm:text-[8px] text-green-700 uppercase">Issue Date</p>
                <p className="text-[9px] sm:text-[10px] font-semibold text-green-950">{data.issueDate}</p>
              </div>
            </div>
          </div>

          {/* NIN Number */}
          <div className="text-center mt-2">
            <p className="text-[8px] text-green-700 mb-0.5">National Identification Number (NIN)</p>
            <p className="text-2xl sm:text-3xl font-black text-green-950 tracking-[0.15em] font-mono">
              {formatNin(data.nin)}
            </p>
          </div>
        </div>
      </div>

      {/* BACK (Disclaimer) */}
      <div
        className="mt-3 rounded-lg border-2 border-green-700 p-4 sm:p-5"
        style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)" }}
      >
        <h3 className="text-center text-sm sm:text-base font-black text-red-700 tracking-widest uppercase mb-3">
          Disclaimer
        </h3>
        <p className="text-[10px] sm:text-xs text-green-900 italic text-center mb-2">Trust, but verify</p>
        <div className="space-y-1.5 text-[9px] sm:text-[10px] text-green-900 leading-relaxed">
          <p>Kindly ensure each time this ID is presented, that you verify the credentials using a Government-APPROVED verification resource.</p>
          <p>The details on the front of this NIN Slip must EXACTLY match the verification result.</p>
          <p className="font-bold text-red-800 uppercase text-center mt-2">Caution!</p>
          <p>If this NIN was not issued to the person on the front of this document, please DO NOT attempt to scan, photocopy or replicate the personal data contained herein.</p>
          <p>You are only permitted to scan the barcode for the purpose of identity verification.</p>
          <p>The FEDERAL GOVERNMENT of NIGERIA assumes no responsibility if you accept any variance in the scan result or do not scan the 2D barcode overleaf.</p>
        </div>
      </div>
    </div>
  );
}

// ======================== LONG NIN SLIP (NINS Table) ========================
function LongNinSlip({ data }: { data: NinData }) {
  return (
    <div className="w-full max-w-[600px] mx-auto">
      <div className="border-2 border-gray-800 rounded-lg overflow-hidden bg-white text-black">
        {/* Header */}
        <div className="text-center py-3 px-4 border-b border-gray-800">
          <h2 className="text-sm sm:text-base font-bold">National Identity Management System</h2>
          <p className="text-[10px] sm:text-xs text-gray-700">Federal Republic of Nigeria</p>
          <p className="text-[10px] sm:text-xs font-semibold text-gray-800">
            National Identification Number Slip (NINS)
          </p>
        </div>

        {/* Table body */}
        <div className="flex">
          {/* Left: data fields */}
          <div className="flex-1 border-r border-gray-800">
            <div className="grid grid-cols-2 text-[10px] sm:text-xs">
              {/* Row 1: Tracking ID + Surname */}
              <div className="border-b border-r border-gray-300 p-2">
                <span className="font-bold text-gray-600">Tracking ID:</span>
                <span className="ml-1 font-semibold">{data.trackingId || "N/A"}</span>
              </div>
              <div className="border-b border-gray-300 p-2">
                <span className="font-bold text-gray-600">Surname:</span>
                <span className="ml-1 font-semibold">{data.surname}</span>
              </div>

              {/* Row 2: NIN + First Name */}
              <div className="border-b border-r border-gray-300 p-2">
                <span className="font-bold text-gray-600">NIN:</span>
                <span className="ml-1 font-semibold">{data.nin}</span>
              </div>
              <div className="border-b border-gray-300 p-2">
                <span className="font-bold text-gray-600">First Name:</span>
                <span className="ml-1 font-semibold">{data.firstName}</span>
              </div>

              {/* Row 3: empty + Middle Name */}
              <div className="border-b border-r border-gray-300 p-2">&nbsp;</div>
              <div className="border-b border-gray-300 p-2">
                <span className="font-bold text-gray-600">Middle Name:</span>
                <span className="ml-1 font-semibold">{data.middleName || ""}</span>
              </div>

              {/* Row 4: empty + Gender */}
              <div className="border-r border-gray-300 p-2">&nbsp;</div>
              <div className="border-gray-300 p-2">
                <span className="font-bold text-gray-600">Gender:</span>
                <span className="ml-1 font-semibold">{data.gender}</span>
              </div>
            </div>
          </div>

          {/* Right: Address + Photo */}
          <div className="w-[140px] sm:w-[160px] flex flex-col">
            <div className="p-2 border-b border-gray-300 flex-1 text-[10px] sm:text-xs">
              <span className="font-bold text-gray-600">Address:</span>
              <p className="font-semibold mt-0.5 leading-tight">{data.address || "N/A"}</p>
              <p className="mt-1 font-semibold">{data.state || ""}</p>
            </div>
            <div className="p-2 flex items-center justify-center">
              {data.photo ? (
                <img
                  src={data.photo.startsWith("data:") ? data.photo : `data:image/jpeg;base64,${data.photo}`}
                  alt="Photo"
                  className="w-20 h-24 sm:w-24 sm:h-28 object-cover border border-gray-400"
                />
              ) : (
                <div className="w-20 h-24 sm:w-24 sm:h-28 bg-gray-100 border border-gray-400 flex items-center justify-center">
                  <span className="text-[9px] text-gray-500">No Photo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="border-t border-gray-800 px-3 py-2 text-[8px] sm:text-[9px] text-gray-600 space-y-0.5">
          <p>
            <strong>Note:</strong> The <em>National Identification Number (NIN) is your identity.</em>{" "}
            It is confidential and may only be released for legitimate transactions.
          </p>
          <p>You will be notified when your National Identity Card is ready (for any enquiries please contact)</p>
        </div>

        {/* Footer bar */}
        <div className="border-t border-gray-800 grid grid-cols-4 text-[7px] sm:text-[8px] text-center divide-x divide-gray-300">
          <div className="p-1.5 text-gray-700">helpdesk@nimc.gov.ng</div>
          <div className="p-1.5 text-gray-700">www.nimc.gov.ng</div>
          <div className="p-1.5 text-gray-700">
            0700-CALL-NIMC
            <br />
            (0700-2255-646)
          </div>
          <div className="p-1.5 text-gray-700 leading-tight">
            National Identity Management Commission
            <br />
            11, Sokode Crescent, Off Dalaba Street, Zone 5 Wuse, Abuja Nigeria
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================== MAIN COMPONENT ========================
export function PrintNinSlip() {
  const { user } = useAuth();
  const { toast } = useToast();
  const slipRef = useRef<HTMLDivElement>(null);

  // Step state
  const [step, setStep] = useState<"input" | "preview">("input");

  // Input state
  const [searchMode, setSearchMode] = useState<SearchMode>("nin");
  const [slipType, setSlipType] = useState<SlipType>("premium");
  const [ninInput, setNinInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Result state
  const [ninData, setNinData] = useState<NinData | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "image" | null>(null);

  // ---------- verification ----------
  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    try {
      if (searchMode === "nin") {
        ninSchema.parse(ninInput);
      } else {
        phoneSchema.parse(phoneInput);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: err.errors[0].message, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    setNinData(null);

    try {
      // Deduct credit
      if (user?.id) {
        const cr = await deductCredit(user.id);
        if (!cr.success) {
          toast({ title: "No Credits", description: "You have no API credits remaining. Contact an admin to top up.", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      // For NIN input: use nin_advance (Prembly) which returns full data + photo
      // For phone input: first get NIN from nin_phone, then look up nin_advance
      let finalPayload: any = null;

      if (searchMode === "nin") {
        const { data, error } = await supabase.functions.invoke("robosttech-api", {
          body: { action: "nin_advance", nin: ninInput, number: ninInput },
        });
        if (error) throw error;
        finalPayload = data;
      } else {
        // Step 1: phone → NIN
        const { data: phoneData, error: phoneError } = await supabase.functions.invoke("robosttech-api", {
          body: { action: "nin_phone", phone: phoneInput },
        });
        if (phoneError) throw phoneError;

        const foundNin = phoneData?.nin || phoneData?.data?.nin || phoneData?.NIN;
        if (!foundNin) {
          toast({ title: "Not Found", description: phoneData?.message || "Could not retrieve NIN from this phone number.", variant: "destructive" });
          setLoading(false);
          return;
        }

        // Step 2: NIN → full data
        const { data, error } = await supabase.functions.invoke("robosttech-api", {
          body: { action: "nin_advance", nin: foundNin, number: foundNin },
        });
        if (error) throw error;
        finalPayload = data;
      }

      console.log("Print NIN response:", finalPayload);

      const isSuccess =
        finalPayload?.status === true ||
        finalPayload?.status === "success" ||
        finalPayload?.verification?.status === "VERIFIED" ||
        finalPayload?.success === true;

      if (!isSuccess) {
        const msg = finalPayload?.message || finalPayload?.error || "Verification failed. Please check your input.";
        toast({ title: "Verification Failed", description: typeof msg === "string" ? msg : JSON.stringify(msg), variant: "destructive" });
        setLoading(false);
        return;
      }

      const extracted = extractNinData(finalPayload);
      if (!extracted) {
        toast({ title: "Data Error", description: "Could not extract NIN data from the response.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setNinData(extracted);
      setStep("preview");

      // Notification
      if (user?.id) {
        createNotification({
          userId: user.id,
          title: "NIN Slip Generated",
          message: `${slipType === "premium" ? "Premium" : "Long"} NIN Slip for NIN ***${extracted.nin.slice(-4)} is ready to download.`,
          type: "success",
        });
      }

      toast({ title: "Slip Ready", description: "Your NIN slip has been generated. Download it below." });
    } catch (err: any) {
      console.error("Print NIN error:", err);
      toast({ title: "Error", description: err?.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [searchMode, ninInput, phoneInput, slipType, user, toast]);

  // ---------- download as image ----------
  const handleDownloadImage = useCallback(async () => {
    if (!slipRef.current) return;
    setDownloading("image");
    try {
      const canvas = await html2canvas(slipRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: slipType === "premium" ? "#f0fdf4" : "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `NIN_Slip_${slipType === "premium" ? "Premium" : "Long"}_${ninData?.nin || "unknown"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Downloaded", description: "NIN slip saved as PNG image." });
    } catch (err) {
      console.error("Image download error:", err);
      toast({ title: "Download Failed", description: "Could not generate image. Please try again.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }, [slipType, ninData, toast]);

  // ---------- download as PDF ----------
  const handleDownloadPDF = useCallback(async () => {
    if (!slipRef.current) return;
    setDownloading("pdf");
    try {
      const canvas = await html2canvas(slipRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: slipType === "premium" ? "#f0fdf4" : "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height / canvas.width) * contentWidth;

      // Title
      pdf.setFontSize(14);
      pdf.setTextColor(22, 101, 52); // green-800
      pdf.text(
        slipType === "premium" ? "Premium NIN Slip" : "Long NIN Slip",
        pdfWidth / 2,
        15,
        { align: "center" }
      );
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text("Generated by SparkID Identity Verification", pdfWidth / 2, 21, { align: "center" });

      pdf.addImage(imgData, "PNG", margin, 28, contentWidth, contentHeight);

      // Footer
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text("This document is for personal use only. Unauthorized reproduction is prohibited.", pdfWidth / 2, pageHeight - 8, { align: "center" });

      pdf.save(`NIN_Slip_${slipType === "premium" ? "Premium" : "Long"}_${ninData?.nin || "unknown"}.pdf`);
      toast({ title: "Downloaded", description: "NIN slip saved as PDF." });
    } catch (err) {
      console.error("PDF download error:", err);
      toast({ title: "Download Failed", description: "Could not generate PDF. Please try again.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }, [slipType, ninData, toast]);

  // ---------- reset ----------
  const handleReset = () => {
    setStep("input");
    setNinData(null);
    setNinInput("");
    setPhoneInput("");
  };

  // ===================== RENDER =====================

  // STEP 2: Preview & Download
  if (step === "preview" && ninData) {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Printer className="h-5 w-5 text-green-600" />
                  {slipType === "premium" ? "Premium NIN Slip" : "Long NIN Slip"}
                </CardTitle>
                <CardDescription>Preview your slip below, then download as PDF or image.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Download buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button onClick={handleDownloadPDF} disabled={!!downloading} className="gap-2 bg-red-600 hover:bg-red-700">
                {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Download PDF
              </Button>
              <Button onClick={handleDownloadImage} disabled={!!downloading} variant="outline" className="gap-2">
                {downloading === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
                Download Image
              </Button>
            </div>

            {/* Slip preview */}
            <div ref={slipRef} className="p-4 sm:p-6">
              {slipType === "premium" ? (
                <PremiumNinSlip data={ninData} />
              ) : (
                <LongNinSlip data={ninData} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 1: Input form
  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-5 w-5 text-blue-600" />
            Print NIN Slip
          </CardTitle>
          <CardDescription>
            Generate and download your NIN slip. Choose your preferred slip format and search method.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slip type selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Select Slip Type</Label>
            <RadioGroup
              value={slipType}
              onValueChange={(v) => setSlipType(v as SlipType)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <Label
                htmlFor="premium"
                className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  slipType === "premium"
                    ? "border-green-600 bg-green-50 dark:bg-green-950/30 dark:border-green-500"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <RadioGroupItem value="premium" id="premium" className="mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Premium NIN Slip</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    High-resolution green digital card with QR code, photo and NIN. Foldable with disclaimer.
                  </p>
                </div>
              </Label>
              <Label
                htmlFor="long"
                className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  slipType === "long"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-500"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <RadioGroupItem value="long" id="long" className="mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Long NIN Slip</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Official NIMC table format with tracking ID, full name, address and NIMC footer.
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Search mode */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Search By</Label>
            <RadioGroup
              value={searchMode}
              onValueChange={(v) => setSearchMode(v as SearchMode)}
              className="flex gap-4"
            >
              <Label htmlFor="search-nin" className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="nin" id="search-nin" />
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">NIN Number</span>
              </Label>
              <Label htmlFor="search-phone" className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="phone" id="search-phone" />
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Phone Number</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Input field + submit */}
          <form onSubmit={handleVerify} className="space-y-4">
            {searchMode === "nin" ? (
              <div className="space-y-2">
                <Label htmlFor="nin-print">NIN Number</Label>
                <Input
                  id="nin-print"
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="Enter 11-digit NIN"
                  value={ninInput}
                  onChange={(e) => setNinInput(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="phone-print">Phone Number</Label>
                <Input
                  id="phone-print"
                  type="tel"
                  maxLength={11}
                  placeholder="e.g. 08012345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying & Generating...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Generate NIN Slip
                </>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Generating a slip costs 1 API credit. Your NIN will be verified before the slip is created.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
