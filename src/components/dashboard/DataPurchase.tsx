import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Loader2, Smartphone, Wifi } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/wallet";
import { listVtuProducts, purchaseVtu, type VtuProduct } from "@/lib/vtu";
import { trackApiRequest } from "./RateLimitIndicator";

export function DataPurchase() {
  const { toast } = useToast();
  const [products, setProducts] = useState<VtuProduct[]>([]);
  const [network, setNetwork] = useState("");
  const [productId, setProductId] = useState("");
  const [phone, setPhone] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ state: string; message: string; reference?: string } | null>(null);

  useEffect(() => {
    let active = true;
    listVtuProducts("data")
      .then((items) => {
        if (!active) return;
        setProducts(items);
        setNetwork(items[0]?.network || "");
        setProductId(items[0]?.id || "");
      })
      .catch((error: Error) => active && setCatalogError(error.message))
      .finally(() => active && setCatalogLoading(false));
    return () => { active = false; };
  }, []);

  const networks = useMemo(
    () => Array.from(new Set(products.map((product) => product.network))),
    [products],
  );
  const networkProducts = useMemo(
    () => products.filter((product) => product.network === network),
    [network, products],
  );
  const selectedProduct = products.find((product) => product.id === productId) ?? networkProducts[0];

  const handleNetworkChange = (value: string) => {
    setNetwork(value);
    setProductId(products.find((product) => product.network === value)?.id || "");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);

    if (!selectedProduct) {
      toast({ title: "Data unavailable", description: "No data bundle is currently available.", variant: "destructive" });
      return;
    }
    if (!/^0[7-9][01]\d{8}$/.test(phone)) {
      toast({ title: "Invalid phone number", description: "Enter a valid 11-digit Nigerian phone number.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      trackApiRequest();
      const response = await purchaseVtu({
        category: "data",
        productId: selectedProduct.id,
        phone,
      });
      const state = response.normalized?.state ?? response.status ?? "pending";
      const message = response.normalized?.message || response.message || response.response || "Purchase submitted.";
      const reference = response.normalized?.provider_reference || response.reference;
      setResult({ state, message, reference });
      toast({
        title: state === "succeeded" ? "Data delivered" : "Purchase submitted",
        description: message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete this purchase.";
      setResult({ state: "failed", message });
      toast({ title: "Data purchase failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Buy Mobile Data
        </CardTitle>
        <CardDescription>Choose an available bundle and pay securely from your wallet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {catalogLoading ? (
            <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading data bundles
            </div>
          ) : catalogError || products.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Mobile data is temporarily unavailable</AlertTitle>
              <AlertDescription>{catalogError || "No data bundles are available right now."}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Network</Label>
                <Select value={network} onValueChange={handleNetworkChange}>
                  <SelectTrigger><SelectValue placeholder="Choose network" /></SelectTrigger>
                  <SelectContent>
                    {networks.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Plan</Label>
                <Select value={selectedProduct?.id || ""} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Choose a bundle" /></SelectTrigger>
                  <SelectContent>
                    {networkProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatNaira(Number(product.retail_price))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="data-phone">Phone Number</Label>
            <Input
              id="data-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="08012345678"
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Wifi className="h-4 w-4 text-blue-600" /> Bundle summary
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Smartphone className="h-4 w-4" /> {selectedProduct?.network || "Select a network"}
              </span>
              <span>{selectedProduct?.name || "Select a plan"}</span>
              <span className="font-semibold">{formatNaira(Number(selectedProduct?.retail_price ?? 0))}</span>
            </div>
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            {submitting ? "Processing purchase" : `Pay ${formatNaira(Number(selectedProduct?.retail_price ?? 0))}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
