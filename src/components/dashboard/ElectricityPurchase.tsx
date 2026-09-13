import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserCheck, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/wallet";
import { calculateVariableVtuCharge, listVtuProducts, purchaseVtu, verifyElectricityMeter, type VtuProduct } from "@/lib/vtu";
import { trackApiRequest } from "./RateLimitIndicator";
import { VtuReceiptDialog, type VtuReceiptRow } from "@/components/dashboard/VtuReceiptDialog";

export function ElectricityPurchase() {
  const { toast } = useToast();
  const [products, setProducts] = useState<VtuProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [meterNumber, setMeterNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("1000");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<{ state: string; message: string; reference?: string; token?: string } | null>(null);
  const [receipt, setReceipt] = useState<VtuReceiptRow | null>(null);

  useEffect(() => {
    let active = true;
    listVtuProducts("electricity")
      .then((items) => {
        if (!active) return;
        setProducts(items);
        setProductId(items[0]?.id || "");
      })
      .catch((error: Error) => active && setCatalogError(error.message))
      .finally(() => active && setCatalogLoading(false));
    return () => { active = false; };
  }, []);

  const selectedProduct = useMemo(() => products.find((product) => product.id === productId) ?? products[0], [productId, products]);
  const numericAmount = Number(amount || 0);
  const pricing = calculateVariableVtuCharge(numericAmount, selectedProduct);

  const handleVerify = async () => {
    if (!selectedProduct || !meterNumber.trim()) {
      toast({ title: "Missing details", description: "Choose a disco and enter a meter number.", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const data = await verifyElectricityMeter({ disco: selectedProduct.network, meterNumber: meterNumber.trim(), meterType });
      setVerification(data);
      toast({ title: "Meter verified", description: String(data.customer_name ?? data.message ?? "Verification completed.") });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify this meter.";
      toast({ title: "Verification failed", description: message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);

    if (!selectedProduct) {
      toast({ title: "Electricity unavailable", description: "No disco is currently available.", variant: "destructive" });
      return;
    }
    if (!/^0\d{10}$/.test(phone)) {
      toast({ title: "Invalid phone number", description: "Enter a valid 11-digit Nigerian phone number.", variant: "destructive" });
      return;
    }
    const minimumAmount = Number(selectedProduct.min_amount ?? 1000);
    const maximumAmount = selectedProduct.max_amount === null ? null : Number(selectedProduct.max_amount);
    if (!Number.isFinite(numericAmount) || numericAmount < minimumAmount || (maximumAmount !== null && numericAmount > maximumAmount)) {
      toast({ title: "Invalid amount", description: `Enter an amount from ${formatNaira(minimumAmount)} upward.`, variant: "destructive" });
      return;
    }
    if (!meterNumber.trim()) {
      toast({ title: "Meter required", description: "Enter the meter number.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      trackApiRequest();
      const response = await purchaseVtu({
        category: "electricity",
        productId: selectedProduct.id,
        phone,
        amount: numericAmount,
        meterNumber: meterNumber.trim(),
        meterType,
      });
      const state = response.normalized?.state ?? response.status ?? "pending";
      const message = response.normalized?.message || response.message || response.response || "Payment submitted.";
      const reference = response.normalized?.provider_reference || response.reference || response.normalized?.request_id || "";
      const token = response.token || "";
      const now = new Date().toISOString();
      setResult({ state, message, reference, token });
      setReceipt({
        id: reference || `electricity-${Date.now()}`,
        category: "electricity",
        network: selectedProduct.network,
        product_name: selectedProduct.name,
        phone,
        service_identifier: meterNumber.trim(),
        token: token || null,
        provider_reference: reference || null,
        face_value: pricing.faceValue,
        charged_amount: pricing.chargeAmount,
        status: state,
        completed_at: state === "succeeded" ? now : null,
        created_at: now,
      });
      toast({ title: state === "succeeded" ? "Electricity payment completed" : "Payment submitted", description: token ? `Token: ${token}` : message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete this payment.";
      setResult({ state: "failed", message });
      toast({ title: "Payment failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Card className="border-slate-200 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Electricity Payment
        </CardTitle>
        <CardDescription>Verify a meter and pay supported electricity discos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {catalogLoading ? (
            <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading discos
            </div>
          ) : catalogError || products.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Electricity payments are temporarily unavailable</AlertTitle>
              <AlertDescription>{catalogError || "No electricity providers are available right now."}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Disco</Label>
                <Select value={selectedProduct?.id || ""} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Choose disco" /></SelectTrigger>
                  <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meter Type</Label>
                <Select value={meterType} onValueChange={(value) => setMeterType(value as "prepaid" | "postpaid")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prepaid">Prepaid</SelectItem>
                    <SelectItem value="postpaid">Postpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="electricity-meter">Meter Number</Label>
              <Input id="electricity-meter" value={meterNumber} onChange={(event) => setMeterNumber(event.target.value.replace(/\D/g, "").slice(0, 20))} inputMode="numeric" />
            </div>
            <Button type="button" variant="outline" className="self-end gap-2" onClick={handleVerify} disabled={verifying || !selectedProduct || !meterNumber}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Verify
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="electricity-phone">Phone Number</Label>
              <Input id="electricity-phone" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="08105314004" inputMode="numeric" autoComplete="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="electricity-amount">Amount</Label>
              <Input id="electricity-amount" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" />
            </div>
          </div>

          {verification && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle>{String(verification.customer_name ?? "Meter verified")}</AlertTitle>
              <AlertDescription>{String(verification.address ?? verification.message ?? "Verification completed.")}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant={result.state === "failed" ? "destructive" : "default"}>
              {result.state === "failed" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              <AlertTitle>{result.state === "succeeded" ? "Payment completed" : result.state === "failed" ? "Payment failed" : "Payment is processing"}</AlertTitle>
              <AlertDescription>
                {result.message}{result.token ? ` Token: ${result.token}` : ""}{result.reference ? ` Reference: ${result.reference}` : ""}
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Electricity value</dt><dd>{formatNaira(pricing.faceValue)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Service fee</dt><dd>{formatNaira(pricing.feeAmount)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-slate-700"><dt>Wallet charge</dt><dd>{formatNaira(pricing.chargeAmount)}</dd></div>
            </dl>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={submitting || catalogLoading || !selectedProduct}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {submitting ? "Processing payment" : `Pay ${formatNaira(pricing.chargeAmount)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
    <VtuReceiptDialog
      row={receipt}
      open={!!receipt}
      onOpenChange={(open) => {
        if (!open) setReceipt(null);
      }}
    />
    </>
  );
}
