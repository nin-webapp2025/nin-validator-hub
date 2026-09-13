import { useRef, useState } from "react";
import { format } from "date-fns";
import { Download, FileImage, FileText, Loader2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNaira } from "@/lib/wallet";
import type { VtuCategory } from "@/lib/vtu";

export interface VtuReceiptRow {
  id: string;
  category: VtuCategory;
  network: string;
  product_name: string;
  phone: string;
  service_identifier?: string | null;
  token?: string | null;
  provider?: string | null;
  provider_reference: string | null;
  face_value?: number | null;
  charged_amount: number;
  status: string;
  completed_at?: string | null;
  created_at: string;
}

const ELECTRICITY_UNITS_PER_1000_NAIRA = 7.3;

const categoryLabel: Record<VtuCategory, string> = {
  airtime: "Airtime Purchase",
  data: "Mobile Data Purchase",
  tv: "TV Subscription",
  electricity: "Electricity Payment",
};

const identifierLabel: Record<VtuCategory, string> = {
  airtime: "Phone Number",
  data: "Phone Number",
  tv: "Smartcard / IUC Number",
  electricity: "Meter Number",
};

function statusLabel(status: string) {
  if (status === "succeeded") return "SUCCESSFUL";
  if (status === "pending") return "PENDING";
  if (status === "unknown") return "CONFIRMING";
  if (status === "reversed") return "REVERSED";
  return "FAILED";
}

function displayDate(value: string | null | undefined) {
  if (!value) return "N/A";
  return format(new Date(value), "d MMM yyyy, h:mm a");
}

function receiptReference(row: VtuReceiptRow) {
  return row.provider_reference || row.id;
}

function serviceIdentifier(row: VtuReceiptRow) {
  return row.service_identifier || row.phone || "N/A";
}

function operatorLabel(category: VtuCategory) {
  if (category === "electricity") return "Disco";
  if (category === "tv") return "TV provider";
  return "Operator";
}

function electricityUnits(row: VtuReceiptRow) {
  if (row.category !== "electricity") return null;
  const electricityValue = Number(row.face_value ?? row.charged_amount);
  if (!Number.isFinite(electricityValue) || electricityValue <= 0) return null;
  return (electricityValue / 1000) * ELECTRICITY_UNITS_PER_1000_NAIRA;
}

function formatUnits(value: number) {
  return value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
}

async function renderReceiptCanvas(element: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas");
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    if (image.complete && image.naturalWidth > 0) return;
    if (typeof image.decode === "function") {
      await image.decode().catch(() => undefined);
      return;
    }
    await new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));

  return html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: Math.min(window.devicePixelRatio || 2, 3),
    useCORS: true,
  });
}

async function downloadReceiptImage(row: VtuReceiptRow, element: HTMLElement, type: "png" | "jpeg") {
  const canvas = await renderReceiptCanvas(element);
  const link = document.createElement("a");
  link.download = `sparklabid-${row.category}-receipt-${safeFilename(receiptReference(row))}.${type === "jpeg" ? "jpg" : "png"}`;
  link.href = canvas.toDataURL(type === "jpeg" ? "image/jpeg" : "image/png", 0.95);
  link.click();
}

async function downloadReceiptPdf(row: VtuReceiptRow, element: HTMLElement) {
  const [{ jsPDF }, canvas] = await Promise.all([
    import("jspdf"),
    renderReceiptCanvas(element),
  ]);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`sparklabid-${row.category}-receipt-${safeFilename(receiptReference(row))}.pdf`);
}

function ReceiptLogo() {
  return (
    <img src="/newlogo.jpeg" alt="SparklabID" className="h-auto w-32 object-contain sm:w-36" />
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-5 py-3">
      <p className="text-xs font-medium text-slate-400 sm:text-sm">{label}</p>
      <p className="break-words text-right text-xs font-semibold leading-snug text-slate-950 sm:text-sm">{value || "N/A"}</p>
    </div>
  );
}

export function VtuReceiptDialog({
  row,
  open,
  onOpenChange,
}: {
  row: VtuReceiptRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState<"png" | "jpg" | "pdf" | null>(null);
  if (!row) return null;

  const handleDownload = async (type: "png" | "jpg" | "pdf") => {
    if (!receiptRef.current) return;
    setDownloading(type);
    try {
      if (type === "pdf") {
        await downloadReceiptPdf(row, receiptRef.current);
      } else {
        await downloadReceiptImage(row, receiptRef.current, type === "jpg" ? "jpeg" : "png");
      }
    } finally {
      setDownloading(null);
    }
  };
  const units = electricityUnits(row);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            Transaction Receipt
          </DialogTitle>
          <DialogDescription>Preview and download your receipt.</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)] dark:border-slate-800">
          <div
            ref={receiptRef}
            className="mx-auto w-full max-w-[560px] bg-white px-7 py-7 text-slate-950 sm:px-9 sm:py-8"
          >
            <div className="flex items-start justify-between gap-5">
              <ReceiptLogo />
              <p className="pt-1 text-right text-base font-black text-slate-950 sm:text-xl">Transaction Receipt</p>
            </div>

            <div className="py-8 text-center">
              <p className="font-display text-3xl font-black tracking-tight text-primary tabular-nums sm:text-4xl">
                {formatNaira(Number(row.charged_amount))}
              </p>
              <p className="mt-4 text-xl font-semibold uppercase tracking-wide text-slate-950">
                {statusLabel(row.status)}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-400 sm:text-sm">{displayDate(row.completed_at || row.created_at)}</p>
            </div>

            <div className="border-t border-slate-700 pt-5">
              <Detail label="Transaction type" value={categoryLabel[row.category]} />
              <Detail label="Amount" value={formatNaira(Number(row.charged_amount))} />
              {units !== null ? <Detail label="Units bought" value={formatUnits(units)} /> : null}
              <Detail label={operatorLabel(row.category)} value={row.network} />
              <Detail label={identifierLabel[row.category]} value={serviceIdentifier(row)} />
              {row.category === "electricity" && row.token ? <Detail label="Token" value={row.token} /> : null}
              <Detail label="Paid with" value="SparklabID Wallet" />
              <Detail label="Transaction number" value={receiptReference(row)} />
            </div>

            <div className="pt-8 text-center">
              <p className="text-xs font-bold text-slate-400 sm:text-sm">Support</p>
              <p className="mt-2 text-xs font-black text-primary sm:text-sm">support@sparkid.ng</p>
            </div>

            <div className="mt-5 border-t border-dashed border-slate-500 pt-4">
              <p className="text-xs font-semibold leading-snug text-slate-900 sm:text-sm">
                SparklabID provides secure identity services, wallet payments, airtime, data, TV, and electricity transactions.
                Keep this receipt for your records and share the transaction number with support if you need help.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button className="gap-2" onClick={() => void handleDownload("png")} disabled={!!downloading}>
            {downloading === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
            PNG
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void handleDownload("jpg")} disabled={!!downloading}>
            {downloading === "jpg" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            JPG
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void handleDownload("pdf")} disabled={!!downloading}>
            {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
