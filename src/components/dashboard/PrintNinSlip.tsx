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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Printer, Download, FileImage, FileText, ArrowLeft, Phone, Hash, Eye } from "lucide-react";
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

// ======================== PREMIUM NIN SLIP ========================
// Plain white background, grey bold title labels, black user data (non-bold, smaller)
// Front card + upside-down disclaimer back — both CR80 ID card size (85.6×54mm, ratio 1.585:1)
function PremiumNinSlip({ data }: { data: NinData }) {
  const photoSrc = data.photo
    ? data.photo.startsWith("data:") ? data.photo : `data:image/jpeg;base64,${data.photo}`
    : "";

  // Style constants
  const titleColor = "#888888"; // grey for title/label text
  const valueColor = "#000000"; // black for user data

  // CR80 card dimensions (ratio 1.585:1)
  const cardWidth = 520;
  const cardHeight = Math.round(cardWidth / 1.585); // ~328px

  return (
    <div style={{ width: cardWidth, margin: "0 auto", fontFamily: "Arial, Helvetica, sans-serif", color: valueColor }}>
      {/* Instruction text above card */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: "#222", margin: "0 0 4px" }}>
          Please find below your new High Resolution NIN Slip
        </p>
        <p style={{ fontSize: 12, color: "#444", margin: 0 }}>
          You may cut it out of the paper, fold and laminate as desired
        </p>
      </div>

      {/* ===== FRONT OF CARD (CR80) ===== */}
      <div
        style={{
          width: cardWidth,
          height: cardHeight,
          background: "#ffffff",
          border: "2px solid #cccccc",
          borderRadius: 6,
          padding: "12px 16px 10px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        {/* === Header (left-aligned) === */}
        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: titleColor,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              lineHeight: 1.3,
            }}
          >
            Federal Republic of Nigeria
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: titleColor,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginTop: 1,
            }}
          >
            Digital NIN Slip
          </div>
        </div>

        {/* === Body: Photo | Details | QR+NGA === */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1 }}>
          {/* Photo */}
          <div style={{ flexShrink: 0 }}>
            {photoSrc ? (
              <img
                src={photoSrc}
                alt="Photo"
                crossOrigin="anonymous"
                style={{
                  width: 72,
                  height: 88,
                  objectFit: "cover",
                  border: "1px solid #ccc",
                  borderRadius: 2,
                  backgroundColor: "#f0f0f0",
                }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 88,
                  border: "1px solid #ccc",
                  borderRadius: 2,
                  backgroundColor: "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  color: "#999",
                }}
              >
                No Photo
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: titleColor, textTransform: "uppercase", letterSpacing: 0.6, lineHeight: 1.2 }}>
              Surname / Nom
            </div>
            <div style={{ fontSize: 11, fontWeight: 400, color: valueColor, lineHeight: 1.3, marginBottom: 4 }}>
              {data.surname}
            </div>

            <div style={{ fontSize: 9, fontWeight: 700, color: titleColor, textTransform: "uppercase", letterSpacing: 0.6, lineHeight: 1.2 }}>
              Given Names / Prénoms
            </div>
            <div style={{ fontSize: 11, fontWeight: 400, color: valueColor, lineHeight: 1.3, marginBottom: 5 }}>
              {data.firstName}{data.middleName ? `, ${data.middleName}` : ""}
            </div>

            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: titleColor, textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1.2 }}>
                  Date of Birth
                </div>
                <div style={{ fontSize: 10, fontWeight: 400, color: valueColor, letterSpacing: 0.3 }}>
                  {data.dateOfBirth}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: titleColor, textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1.2 }}>
                  Sex / Sexe
                </div>
                <div style={{ fontSize: 10, fontWeight: 400, color: valueColor, letterSpacing: 0.3 }}>
                  {data.gender}
                </div>
              </div>
            </div>
          </div>

          {/* QR Code + NGA + Issue Date */}
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <QRCodeSVG
              value={data.nin}
              size={72}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              style={{
                border: "1px solid #ccc",
                padding: 3,
                backgroundColor: "#fff",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: valueColor,
                lineHeight: 1,
                letterSpacing: 2,
                marginTop: 2,
              }}
            >
              NGA
            </div>
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 700, color: titleColor, textTransform: "uppercase", letterSpacing: 0.4, textAlign: "center" }}>
                Issue Date
              </div>
              <div style={{ fontSize: 9, fontWeight: 400, color: valueColor, textAlign: "center" }}>
                {data.issueDate}
              </div>
            </div>
          </div>
        </div>

        {/* === NIN Number === */}
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: titleColor, marginBottom: 2, letterSpacing: 0.4 }}>
            National Identification Number (NIN)
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: valueColor,
              letterSpacing: 5,
              fontFamily: "'Courier New', Courier, monospace",
              lineHeight: 1,
            }}
          >
            {formatNin(data.nin)}
          </div>
        </div>
      </div>

      {/* ===== BACK OF CARD (CR80, upside-down for cut-fold-laminate) ===== */}
      <div
        style={{
          width: cardWidth,
          height: cardHeight,
          background: "#ffffff",
          border: "2px solid #cccccc",
          borderTop: "none",
          borderRadius: "0 0 6px 6px",
          padding: "14px 18px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* All back content is rotated 180° so it reads correctly when folded */}
        <div style={{ transform: "rotate(180deg)", width: "100%" }}>
          <div
            style={{
              color: valueColor,
              fontSize: 16,
              fontWeight: 900,
              textAlign: "center",
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Disclaimer
          </div>

          <p
            style={{
              fontStyle: "italic",
              textAlign: "center",
              fontSize: 9.5,
              color: valueColor,
              margin: "0 0 8px",
            }}
          >
            Trust, but verify
          </p>

          <div style={{ fontSize: 8.5, color: valueColor, lineHeight: 1.55, textAlign: "center" }}>
            <p style={{ margin: "0 0 5px" }}>
              Kindly ensure each time this ID is presented, that you verify the credentials
              using a government-approved verification resource.
            </p>
            <p style={{ margin: "0 0 5px" }}>
              The details on the front of this NIN slip must exactly match the
              verification result.
            </p>

            <p
              style={{
                fontWeight: 900,
                color: valueColor,
                textTransform: "uppercase",
                fontSize: 10,
                letterSpacing: 1,
                margin: "8px 0 5px",
              }}
            >
              Caution!
            </p>

            <p style={{ margin: "0 0 5px" }}>
              If this NIN was not issued to the person on the front of this document, please do
              not attempt to scan, photocopy or replicate the personal data contained herein.
            </p>
            <p style={{ margin: "0 0 5px" }}>
              You are only permitted to scan the barcode for the purpose of identity verification.
            </p>
            <p style={{ margin: 0 }}>
              The Federal Government of Nigeria assumes no responsibility if you accept any
              variance in the scan result or do not scan the 2D barcode overleaf.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================== LONG NIN SLIP (NINS Table) ========================
// Exact replica of the official NIMC National Identification Number Slip (NINS)
// White background, black bordered table, Coat of Arms + NIMC logo header
function LongNinSlip({ data }: { data: NinData }) {
  const photoSrc = data.photo
    ? data.photo.startsWith("data:") ? data.photo : `data:image/jpeg;base64,${data.photo}`
    : "";

  const cellStyle = {
    borderBottom: "1px solid #000",
    borderRight: "1px solid #000",
    padding: "4px 8px",
    verticalAlign: "top" as const,
    fontSize: 11,
  };

  const labelStyle = {
    fontWeight: 700 as const,
    fontSize: 11,
    color: "#000",
  };

  const valueStyle = {
    fontWeight: 400 as const,
    fontSize: 11,
    color: "#000",
    marginLeft: 6,
  };

  return (
    <div style={{ width: "100%", fontFamily: "Arial, Helvetica, sans-serif", color: "#000" }}>
      <div style={{ border: "2.5px solid #000", backgroundColor: "#fff" }}>

        {/* ===== HEADER: Coat of Arms | Title | NIMC Logo ===== */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px 8px",
            borderBottom: "2px solid #000",
          }}
        >
          {/* Nigerian Coat of Arms (placeholder - styled representation) */}
          <div
            style={{
              width: 52,
              height: 52,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              {/* Simplified Nigerian Coat of Arms */}
              <rect x="0" y="0" width="48" height="48" fill="none" />
              {/* Eagle */}
              <path d="M24 2 L28 8 L32 6 L30 12 L34 10 L31 15 L35 14 L30 18 L24 16 L18 18 L13 14 L17 15 L14 10 L18 12 L16 6 L20 8 Z" fill="#2d2d2d" />
              {/* Shield */}
              <rect x="16" y="18" width="16" height="14" rx="1" fill="#fff" stroke="#000" strokeWidth="0.8" />
              <rect x="16" y="18" width="5.3" height="14" fill="#008751" />
              <rect x="26.7" y="18" width="5.3" height="14" fill="#008751" />
              {/* Y-shaped band (black) */}
              <path d="M16 18 L24 26 L32 18" fill="none" stroke="#000" strokeWidth="1.5" />
              <line x1="24" y1="26" x2="24" y2="32" stroke="#000" strokeWidth="1.5" />
              {/* Horses */}
              <text x="8" y="30" fontSize="10" fill="#8B4513">🐴</text>
              <text x="34" y="30" fontSize="10" fill="#8B4513" transform="scale(-1,1) translate(-76,0)">🐴</text>
              {/* Base motto */}
              <rect x="10" y="34" width="28" height="5" rx="1" fill="#f0e68c" stroke="#8B4513" strokeWidth="0.3" />
              <text x="24" y="38" fontSize="3.2" fill="#000" textAnchor="middle" fontWeight="bold">UNITY AND FAITH</text>
              {/* Flowers */}
              <circle cx="10" y="42" r="3" fill="#e74c3c" opacity="0.8" />
              <circle cx="38" y="42" r="3" fill="#e74c3c" opacity="0.8" />
            </svg>
          </div>

          {/* Center title */}
          <div style={{ flex: 1, textAlign: "center", padding: "0 12px" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#000", lineHeight: 1.25 }}>
              National Identity Management System
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#000", lineHeight: 1.3 }}>
              Federal Republic of Nigeria
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#000", lineHeight: 1.4 }}>
              National Identification Number Slip (NINS)
            </div>
          </div>

          {/* NIMC Logo (styled text representation) */}
          <div
            style={{
              width: 52,
              height: 52,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="42" height="20" viewBox="0 0 42 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="21" cy="6" r="5" fill="#008751" opacity="0.8" />
              <path d="M16 6 Q21 0 26 6" fill="none" stroke="#008751" strokeWidth="1.5" />
            </svg>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                fontStyle: "italic",
                color: "#008751",
                lineHeight: 1,
                letterSpacing: -0.5,
              }}
            >
              Nimc
            </div>
          </div>
        </div>

        {/* ===== TABLE BODY ===== */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
          cellPadding={0}
          cellSpacing={0}
        >
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "30%" }} />
          </colgroup>
          <tbody>
            {/* Row 1: Tracking ID | Surname | Address + Photo */}
            <tr>
              <td style={{ ...cellStyle, fontWeight: 700 }}>
                Tracking ID:
              </td>
              <td style={{ ...cellStyle, fontSize: 10.5 }}>
                {data.trackingId || "N/A"}
              </td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>
                Surname:
              </td>
              <td style={{ ...cellStyle }}>
                {data.surname}
              </td>
              <td
                rowSpan={2}
                style={{
                  borderBottom: "1px solid #000",
                  padding: "4px 8px",
                  verticalAlign: "top",
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <span style={labelStyle}>Address:</span>
                    <div style={{ fontSize: 10.5, lineHeight: 1.35, marginTop: 2 }}>
                      {data.address || "N/A"}
                    </div>
                  </div>
                  {/* Photo (spans rows visually) */}
                  <div
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "flex-start",
                    }}
                  >
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt="Photo"
                        crossOrigin="anonymous"
                        style={{
                          width: 72,
                          height: 88,
                          objectFit: "cover",
                          border: "1px solid #666",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 72,
                          height: 88,
                          border: "1px solid #666",
                          backgroundColor: "#f5f5f5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          color: "#999",
                        }}
                      >
                        No Photo
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>

            {/* Row 2: NIN | First Name */}
            <tr>
              <td style={{ ...cellStyle, fontWeight: 700 }}>
                NIN:
              </td>
              <td style={{ ...cellStyle }}>
                {data.nin}
              </td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>
                First Name:
              </td>
              <td style={{ ...cellStyle }}>
                {data.firstName}
              </td>
            </tr>

            {/* Row 3: (empty) | Middle Name */}
            <tr>
              <td style={{ ...cellStyle }}>&nbsp;</td>
              <td style={{ ...cellStyle }}>&nbsp;</td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>
                Middle Name:
              </td>
              <td style={{ ...cellStyle }}>
                {data.middleName || ""}
              </td>
              <td style={{ ...cellStyle, borderRight: "none" }}>&nbsp;</td>
            </tr>

            {/* Row 4: (empty) | Gender | State */}
            <tr>
              <td style={{ ...cellStyle }}>&nbsp;</td>
              <td style={{ ...cellStyle }}>&nbsp;</td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>
                Gender:
              </td>
              <td style={{ ...cellStyle }}>
                {data.gender}
              </td>
              <td style={{ ...cellStyle, borderRight: "none" }}>
                {data.state || ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== FOOTER NOTES ===== */}
        <div
          style={{
            borderTop: "1px solid #000",
            padding: "5px 10px",
            fontSize: 10,
            lineHeight: 1.4,
            color: "#000",
          }}
        >
          <p style={{ margin: "0 0 2px" }}>
            <strong>Note:</strong> The{" "}
            <em><strong>National Identification Number (NIN) is your identity.</strong></em>
            {"          "}It is confidential and may only be released for legitimate transactions.
          </p>
          <p style={{ margin: 0, fontSize: 9.5 }}>
            You will be notified when your National Identity Card is ready{"  "}(for any enquiries please contact)
          </p>
        </div>

        {/* ===== FOOTER CONTACT BAR ===== */}
        <div
          style={{
            borderTop: "1.5px solid #000",
            display: "flex",
          }}
        >
          {/* Email */}
          <div
            style={{
              flex: 1,
              padding: "6px 4px",
              textAlign: "center",
              borderRight: "1px solid #ccc",
              fontSize: 9,
              color: "#000",
            }}
          >
            <div style={{ marginBottom: 2, fontSize: 14 }}>✉</div>
            helpdesk@nimc.gov.ng
          </div>
          {/* Website */}
          <div
            style={{
              flex: 1,
              padding: "6px 4px",
              textAlign: "center",
              borderRight: "1px solid #ccc",
              fontSize: 9,
              color: "#000",
            }}
          >
            <div style={{ marginBottom: 2, fontSize: 14 }}>🌐</div>
            www.nimc.gov.ng
          </div>
          {/* Phone */}
          <div
            style={{
              flex: 1,
              padding: "6px 4px",
              textAlign: "center",
              borderRight: "1px solid #ccc",
              fontSize: 9,
              color: "#000",
            }}
          >
            <div style={{ marginBottom: 2, fontSize: 14 }}>📞</div>
            <div>0700-CALL-NIMC</div>
            <div style={{ fontSize: 8.5 }}>(0700-2255-646)</div>
          </div>
          {/* Address */}
          <div
            style={{
              flex: 1.4,
              padding: "6px 4px",
              textAlign: "center",
              fontSize: 8.5,
              color: "#000",
              lineHeight: 1.3,
            }}
          >
            <div style={{ marginBottom: 2, fontSize: 14 }}>🏛</div>
            <div style={{ fontWeight: 700, fontSize: 9 }}>National Identity Management Commission</div>
            <div>11, Sokode Crescent, Off Dalaba Street, Zone 5 Wuse, Abuja Nigeria</div>
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
  const [showSlipDialog, setShowSlipDialog] = useState(false);

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
        backgroundColor: slipType === "premium" ? "#ffffff" : "#ffffff",
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
        backgroundColor: slipType === "premium" ? "#ffffff" : "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // The hidden render div is already A4-sized, so place the image full-page
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

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
                <CardDescription>Your NIN slip has been generated. Preview or download it below.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowSlipDialog(true)} variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview Slip
              </Button>
              <Button onClick={handleDownloadPDF} disabled={!!downloading} className="gap-2 bg-red-600 hover:bg-red-700">
                {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Download PDF
              </Button>
              <Button onClick={handleDownloadImage} disabled={!!downloading} variant="outline" className="gap-2">
                {downloading === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
                Download Image
              </Button>
            </div>

            {/* Hidden slip for html2canvas rendering — A4 paper (794×1123px at 96dpi) */}
            <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
              <div
                ref={slipRef}
                style={{
                  width: 794,
                  minHeight: 1123,
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: slipType === "premium" ? "center" : "stretch",
                  justifyContent: slipType === "premium" ? "center" : "flex-start",
                  padding: slipType === "premium" ? "0 40px" : "40px 40px",
                  boxSizing: "border-box",
                }}
              >
                {slipType === "premium" ? (
                  <PremiumNinSlip data={ninData} />
                ) : (
                  <div style={{ width: "100%" }}>
                    <LongNinSlip data={ninData} />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slip preview dialog */}
        <Dialog open={showSlipDialog} onOpenChange={setShowSlipDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-green-600" />
                {slipType === "premium" ? "Premium NIN Slip" : "Long NIN Slip"}
              </DialogTitle>
              <DialogDescription>Preview your NIN slip. Close this dialog and use the download buttons to save.</DialogDescription>
            </DialogHeader>
            <div className="p-2">
              {slipType === "premium" ? (
                <PremiumNinSlip data={ninData} />
              ) : (
                <LongNinSlip data={ninData} />
              )}
            </div>
          </DialogContent>
        </Dialog>
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
