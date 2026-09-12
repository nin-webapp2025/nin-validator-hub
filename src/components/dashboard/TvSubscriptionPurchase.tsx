import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Tv, UserCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/wallet";
import { listVtuProducts, purchaseVtu, verifyTvSmartcard, type VtuProduct } from "@/lib/vtu";
import { trackApiRequest } from "./RateLimitIndicator";

export function TvSubscriptionPurchase() {
  const { toast } = useToast();
  const [products, setProducts] = useState<VtuProduct[]>([]);
  const [provider, setProvider] = useState("");
  const [productId, setProductId] = useState("");
  const [smartcardNumber, setSmartcardNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<{ state: string; message: string; reference?: string } | null>(null);

  useEffect(() => {
    let active = true;
    listVtuProducts("tv")
      .then((items) => {
        if (!active) return;
        setProducts(items);
        setProvider(items[0]?.network || "");
        setProductId(items[0]?.id || "");
      })
      .catch((error: Error) => active && setCatalogError(error.message))
      .finally(() => active && setCatalogLoading(false));
    return () => { active = false; };
  }, []);

  const providers = useMemo(() => Array.from(new Set(products.map((product) => product.network))), [products]);
  const providerProducts = useMemo(() => products.filter((product) => product.network === provider), [products, provider]);
  const selectedProduct = products.find((product) => product.id === productId) ?? providerProducts[0];

  const handleProviderChange = (value: string) => {
    setProvider(value);
    setProductId(products.find((product) => product.network === value)?.id || "");
    setVerification(null);
  };

  const handleVerify = async () => {
    if (!provider || !smartcardNumber.trim()) {
      toast({ title: "Missing details", description: "Choose a provider and enter a smartcard number.", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const data = await verifyTvSmartcard({ provider, smartcardNumber: smartcardNumber.trim() });
      setVerification(data);
      toast({ title: "Smartcard verified", description: String(data.customer_name ?? data.message ?? "Verification completed.") });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify this smartcard.";
      toast({ title: "Verification failed", description: message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);

    if (!selectedProduct) {
      toast({ title: "TV plans unavailable", description: "No TV subscription plan is currently available.", variant: "destructive" });
      return;
    }
    if (!/^0\d{10}$/.test(phone)) {
      toast({ title: "Invalid phone number", description: "Enter a valid 11-digit Nigerian phone number.", variant: "destructive" });
      return;
    }
    if (!smartcardNumber.trim()) {
      toast({ title: "Smartcard required", description: "Enter the smartcard or IUC number.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      trackApiRequest();
      const response = await purchaseVtu({
        category: "tv",
        productId: selectedProduct.id,
        phone,
        smartcardNumber: smartcardNumber.trim(),
      });
      const state = response.normalized?.state ?? response.status ?? "pending";
      const message = response.normalized?.message || response.message || response.response || "Subscription submitted.";
      const reference = response.normalized?.provider_reference || response.reference;
      setResult({ state, message, reference });
      toast({ title: state === "succeeded" ? "Subscription completed" : "Subscription submitted", description: message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete this subscription.";
      setResult({ state: "failed", message });
      toast({ title: "Subscription failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tv className="h-5 w-5 text-primary" />
          TV Subscription
        </CardTitle>
        <CardDescription>Subscribe DStv, GOtv, or Startimes from your wallet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {catalogLoading ? (
            <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading TV plans
            </div>
          ) : catalogError || products.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>TV subscriptions are not fully configured</AlertTitle>
              <AlertDescription>{catalogError || "Add Ikonect TV plan IDs and prices to the product catalogue before selling TV subscriptions."}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={handleProviderChange}>
                  <SelectTrigger><SelectValue placeholder="Choose provider" /></SelectTrigger>
                  <SelectContent>{providers.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={selectedProduct?.id || ""} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Choose plan" /></SelectTrigger>
                  <SelectContent>
                    {providerProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatNaira(Number(product.retail_price))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="tv-smartcard">Smartcard / IUC Number</Label>
              <Input id="tv-smartcard" value={smartcardNumber} onChange={(event) => setSmartcardNumber(event.target.value.replace(/\D/g, "").slice(0, 20))} inputMode="numeric" />
            </div>
            <Button type="button" variant="outline" className="self-end gap-2" onClick={handleVerify} disabled={verifying || !provider || !smartcardNumber}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Verify
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tv-phone">Phone Number</Label>
            <Input id="tv-phone" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="08105314004" inputMode="numeric" autoComplete="tel" />
          </div>

          {verification && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle>{String(verification.customer_name ?? "Smartcard verified")}</AlertTitle>
              <AlertDescription>{String(verification.current_bouquet ?? verification.message ?? "Verification completed.")}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant={result.state === "failed" ? "destructive" : "default"}>
              {result.state === "failed" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              <AlertTitle>{result.state === "succeeded" ? "Subscription completed" : result.state === "failed" ? "Subscription failed" : "Subscription is processing"}</AlertTitle>
              <AlertDescription>{result.message}{result.reference ? ` Reference: ${result.reference}` : ""}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full gap-2" disabled={submitting || catalogLoading || !selectedProduct}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tv className="h-4 w-4" />}
            {submitting ? "Processing subscription" : `Pay ${formatNaira(Number(selectedProduct?.retail_price ?? 0))}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
