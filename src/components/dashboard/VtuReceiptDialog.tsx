import { useRef, useState } from "react";
import { format } from "date-fns";
import { Download, FileImage, FileText, Loader2, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

export interface VtuReceiptRow {
  id: string;
  category: VtuCategory;
  network: string;
  product_name: string;
  phone: string;
  service_identifier?: string | null;
  provider?: string | null;
  provider_reference: string | null;
  charged_amount: number;
  status: string;
  completed_at?: string | null;
  created_at: string;
}

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

function statusClass(status: string) {
  if (status === "succeeded") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (status === "reversed") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
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

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
}

async function renderReceiptCanvas(element: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: Math.min(window.devicePixelRatio || 2, 3),
    useCORS: true,
  });
}

async function downloadReceiptImage(row: VtuReceiptRow, element: HTMLElement, type: "png" | "jpeg") {
  const canvas = await renderReceiptCanvas(element);
  const link = document.createElement("a");
  link.download = `sparkid-${row.category}-receipt-${safeFilename(receiptReference(row))}.${type === "jpeg" ? "jpg" : "png"}`;
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
  pdf.save(`sparkid-${row.category}-receipt-${safeFilename(receiptReference(row))}.pdf`);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 border-b border-slate-100 py-3 last:border-0 max-[430px]:grid-cols-1 max-[430px]:gap-1">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="break-words text-right text-sm font-bold leading-snug text-slate-950 max-[430px]:text-left">{value || "N/A"}</p>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            Transaction Receipt
          </DialogTitle>
          <DialogDescription>Preview and download your receipt.</DialogDescription>
        </DialogHeader>

        <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-slate-800">
          <div
            ref={receiptRef}
            className="relative overflow-hidden rounded-[24px] bg-white text-slate-950 ring-1 ring-inset ring-slate-200"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-5">
              <img src="/logo.svg" alt="SparkID" className="h-auto w-36" />
              <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-[11px] font-extrabold uppercase", statusClass(row.status))}>
                {statusLabel(row.status)}
              </Badge>
            </div>

            <div className="mx-4 rounded-[24px] bg-[radial-gradient(circle_at_18%_10%,rgba(245,158,11,0.42),transparent_34%),linear-gradient(145deg,#111827_0%,#1e293b_48%,#78350f_100%)] px-5 py-7 text-center text-white shadow-[0_24px_50px_rgba(30,41,59,0.18)]">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-200/50 bg-emerald-500/15 text-3xl font-black text-emerald-100">
                ✓
              </div>
              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/70">Amount paid</p>
              <p className="mt-2 font-display text-4xl font-black tracking-tight text-orange-50 tabular-nums sm:text-5xl">
                {formatNaira(Number(row.charged_amount))}
              </p>
              <p className="mt-2 text-sm font-extrabold text-amber-100">{categoryLabel[row.category]}</p>
              <p className="mt-1 text-xs font-medium text-white/70">{displayDate(row.completed_at || row.created_at)}</p>
            </div>

            <div className="px-5 py-5">
              <div className="mb-4 border-t border-dashed border-slate-300" />
              <Detail label="Service" value={row.product_name} />
              <Detail label={identifierLabel[row.category] === "Phone Number" ? "Recipient" : identifierLabel[row.category]} value={serviceIdentifier(row)} />
              <Detail label={row.category === "electricity" ? "Disco" : row.category === "tv" ? "TV provider" : "Network"} value={row.network} />
              <Detail label="Payment method" value="SparkID Wallet" />

              <div className="mt-5 rounded-[18px] border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-800">Transaction reference</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">{receiptReference(row)}</p>
              </div>

              <div className="mt-5 border-t border-dashed border-slate-200 pt-4 text-center">
                <p className="text-xs font-bold text-slate-700">Need help? Share this transaction reference with support.</p>
                <p className="mx-auto mt-2 max-w-xs text-[11px] leading-relaxed text-slate-400">
                  This receipt confirms your SparkID wallet payment. Keep it for your records.
                </p>
              </div>
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
