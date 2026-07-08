import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RadioTower, Smartphone, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/wallet";
import { listVtuProducts, purchaseVtu, type VtuProduct } from "@/lib/vtu";
import { cn } from "@/lib/utils";
import { trackApiRequest } from "./RateLimitIndicator";

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000];

export function AirtimePurchase() {
  const { toast } = useToast();
  const [products, setProducts] = useState<VtuProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("500");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ state: string; message: string; reference?: string } | null>(null);

  useEffect(() => {
    let active = true;
    listVtuProducts("airtime")
      .then((items) => {
        if (!active) return;
        setProducts(items);
        setProductId((current) => current || items[0]?.id || "");
      })
      .catch((error: Error) => active && setCatalogError(error.message))
      .finally(() => active && setCatalogLoading(false));
    return () => { active = false; };
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? products[0],
    [productId, products],
  );
  const numericAmount = Number(amount || 0);
  const fee = selectedProduct
    ? selectedProduct.fee_flat + (numericAmount * selectedProduct.fee_percent / 100)
    : 0;
  const total = numericAmount + fee;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);

    if (!selectedProduct) {
      toast({ title: "Airtime unavailable", description: "No airtime product is currently available.", variant: "destructive" });
      return;
    }
    if (!/^0[7-9][01]\d{8}$/.test(phone)) {
      toast({ title: "Invalid phone number", description: "Enter a valid 11-digit Nigerian phone number.", variant: "destructive" });
      return;
    }
    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < Number(selectedProduct.min_amount) ||
      numericAmount > Number(selectedProduct.max_amount)
    ) {
      toast({
        title: "Invalid amount",
        description: `Enter an amount between ${formatNaira(Number(selectedProduct.min_amount))} and ${formatNaira(Number(selectedProduct.max_amount))}.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      trackApiRequest();
      const response = await purchaseVtu({
        category: "airtime",
        productId: selectedProduct.id,
        phone,
        amount: numericAmount,
      });
      const state = response.normalized?.state ?? response.status ?? "pending";
      const message = response.normalized?.message || response.message || response.response || "Purchase submitted.";
      const reference = response.normalized?.provider_reference || response.reference;
      setResult({ state, message, reference });
      toast({
        title: state === "succeeded" ? "Airtime delivered" : "Purchase submitted",
        description: message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete this purchase.";
      setResult({ state: "failed", message });
      toast({ title: "Airtime purchase failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Buy Airtime
        </CardTitle>
        <CardDescription>Top up a Nigerian mobile number securely from your wallet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Network</Label>
            {catalogLoading ? (
              <div className="flex h-20 items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading networks
              </div>
            ) : catalogError || products.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Airtime is temporarily unavailable</AlertTitle>
                <AlertDescription>{catalogError || "No airtime networks are available right now."}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setProductId(product.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-semibold transition-all",
                      selectedProduct?.id === product.id
                        ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                    )}
                  >
                    {product.network}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="airtime-phone">Phone Number</Label>
            <Input
              id="airtime-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="08012345678"
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="airtime-amount">Airtime Amount</Label>
            <Input
              id="airtime-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="500"
              inputMode="decimal"
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {formatNaira(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RadioTower className="h-4 w-4 text-blue-600" /> Purchase summary
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Airtime</dt><dd>{formatNaira(numericAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Service fee</dt><dd>{formatNaira(fee)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-slate-700"><dt>Total wallet charge</dt><dd>{formatNaira(total)}</dd></div>
            </dl>
          </div>

          {result && (
            <Alert variant={result.state === "failed" ? "destructive" : "default"}>
              {result.state === "failed" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              <AlertTitle>{result.state === "succeeded" ? "Purchase completed" : result.state === "failed" ? "Purchase failed" : "Purchase is processing"}</AlertTitle>
              <AlertDescription>
                {result.message}{result.reference ? ` Reference: ${result.reference}` : ""}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full gap-2" disabled={submitting || catalogLoading || !selectedProduct}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {submitting ? "Processing purchase" : `Pay ${formatNaira(total)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
