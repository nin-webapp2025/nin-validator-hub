import { format } from "date-fns";
import { Download, ReceiptText } from "lucide-react";
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

async function downloadReceiptPdf(row: VtuReceiptRow) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 44;
  let y = 52;

  const writePair = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(label.toUpperCase(), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(value || "N/A", margin, y + 17, { maxWidth: pageWidth - margin * 2 });
    y += 46;
  };

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 86, 12, 12, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SparkID Receipt", margin + 20, y + 32);
  doc.setFontSize(26);
  doc.text(formatNaira(Number(row.charged_amount)), pageWidth - margin - 20, y + 34, { align: "right" });
  doc.setFontSize(11);
  doc.text(statusLabel(row.status), margin + 20, y + 60);
  doc.text(displayDate(row.completed_at || row.created_at), pageWidth - margin - 20, y + 60, { align: "right" });
  y += 118;

  writePair("Transaction Type", categoryLabel[row.category]);
  writePair("Product", row.product_name);
  writePair("Network / Provider", row.network);
  writePair(identifierLabel[row.category], serviceIdentifier(row));
  writePair("Phone Number", row.phone);
  writePair("Wallet Charge", formatNaira(Number(row.charged_amount)));
  writePair("Transaction Reference", receiptReference(row));
  writePair("Status", statusLabel(row.status));

  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Keep this receipt for your records. Contact support with the transaction reference if you need help.", margin, y, {
    maxWidth: pageWidth - margin * 2,
  });

  doc.save(`sparkid-${row.category}-receipt-${safeFilename(receiptReference(row))}.pdf`);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">{value || "N/A"}</p>
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
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            Transaction Receipt
          </DialogTitle>
          <DialogDescription>Preview and download this payment receipt.</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          <div className="bg-emerald-600 px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase opacity-90">{categoryLabel[row.category]}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{formatNaira(Number(row.charged_amount))}</p>
              </div>
              <Badge variant="outline" className={`border-white/40 bg-white text-emerald-700 ${statusClass(row.status)}`}>
                {statusLabel(row.status)}
              </Badge>
            </div>
            <p className="mt-3 text-sm opacity-90">{displayDate(row.completed_at || row.created_at)}</p>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Detail label="Product" value={row.product_name} />
            <Detail label="Network / Provider" value={row.network} />
            <Detail label={identifierLabel[row.category]} value={serviceIdentifier(row)} />
            <Detail label="Phone Number" value={row.phone} />
            <Detail label="Wallet Charge" value={formatNaira(Number(row.charged_amount))} />
            <Detail label="Provider" value={row.provider || "Ikonect"} />
            <div className="sm:col-span-2">
              <Detail label="Transaction Reference" value={receiptReference(row)} />
            </div>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={() => void downloadReceiptPdf(row)}>
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </DialogContent>
    </Dialog>
  );
}
