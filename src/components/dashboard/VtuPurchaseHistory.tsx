import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, ReceiptText } from "lucide-react";
import { formatNaira } from "@/lib/wallet";
import type { VtuCategory } from "@/lib/vtu";
import { rpcClient } from "@/lib/rpc-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PurchaseRow {
  id: string;
  network: string;
  product_name: string;
  phone: string;
  provider_reference: string | null;
  charged_amount: number;
  status: string;
  created_at: string;
}

const statusClass: Record<string, string> = {
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  unknown: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  reversed: "border-slate-200 bg-slate-100 text-slate-700",
};

export function VtuPurchaseHistory({ category }: { category: VtuCategory }) {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const load = async () => {
      if (timer) window.clearTimeout(timer);
      timer = undefined;
      const { data, error } = await rpcClient.rpc<PurchaseRow[]>("list_my_vtu_transactions", {
        p_category: category,
        p_limit: 10,
        p_offset: 0,
      });
      if (!active) return;
      if (!error) setRows((data ?? []) as PurchaseRow[]);
      setLoading(false);

      if ((data ?? []).some((row: PurchaseRow) => ["pending", "unknown"].includes(row.status))) {
        timer = window.setTimeout(load, 30_000);
      }
    };

    const refresh = () => void load();
    void load();
    window.addEventListener("wallet-updated", refresh);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("wallet-updated", refresh);
    };
  }, [category]);

  return (
    <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ReceiptText className="h-5 w-5 text-blue-600" />
          Recent purchases
        </CardTitle>
        <CardDescription>Provider updates and reversals appear here automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading purchases
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No purchases yet.</p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{row.product_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.phone} | {format(new Date(row.created_at), "d MMM yyyy, h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="font-semibold tabular-nums">{formatNaira(Number(row.charged_amount))}</span>
                  <Badge variant="outline" className={statusClass[row.status] ?? statusClass.unknown}>
                    {row.status === "unknown" ? "Confirming" : row.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
