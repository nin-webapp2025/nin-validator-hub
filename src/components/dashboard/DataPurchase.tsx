import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Database, Wifi, Smartphone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NETWORKS = [
  {
    id: "mtn",
    label: "MTN",
    plans: [
      { id: "mtn-500mb", label: "500 MB", price: "N400" },
      { id: "mtn-1gb", label: "1 GB", price: "N650" },
      { id: "mtn-2gb", label: "2 GB", price: "N1300" },
    ],
  },
  {
    id: "airtel",
    label: "Airtel",
    plans: [
      { id: "airtel-750mb", label: "750 MB", price: "N500" },
      { id: "airtel-1.5gb", label: "1.5 GB", price: "N1000" },
      { id: "airtel-3gb", label: "3 GB", price: "N1500" },
    ],
  },
  {
    id: "glo",
    label: "Glo",
    plans: [
      { id: "glo-1gb", label: "1 GB", price: "N500" },
      { id: "glo-2.2gb", label: "2.2 GB", price: "N1000" },
      { id: "glo-5gb", label: "5 GB", price: "N2000" },
    ],
  },
  {
    id: "9mobile",
    label: "9mobile",
    plans: [
      { id: "9mobile-500mb", label: "500 MB", price: "N500" },
      { id: "9mobile-1.5gb", label: "1.5 GB", price: "N1200" },
      { id: "9mobile-3gb", label: "3 GB", price: "N1800" },
    ],
  },
] as const;

export function DataPurchase() {
  const { toast } = useToast();
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]["id"]>("mtn");
  const [phone, setPhone] = useState("");
  const selectedNetwork = useMemo(
    () => NETWORKS.find((item) => item.id === network) ?? NETWORKS[0],
    [network]
  );
  const [planId, setPlanId] = useState(selectedNetwork.plans[0].id);

  const selectedPlan = selectedNetwork.plans.find((plan) => plan.id === planId) ?? selectedNetwork.plans[0];

  const handleNetworkChange = (value: string) => {
    const nextNetwork = NETWORKS.find((item) => item.id === value) ?? NETWORKS[0];
    setNetwork(nextNetwork.id);
    setPlanId(nextNetwork.plans[0].id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Data purchase coming soon",
      description: "The UI is ready. The next step is connecting a live data-bundle provider.",
    });
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Buy Mobile Data
            </CardTitle>
            <CardDescription className="mt-1">
              Pick a network and plan, then activate data bundles from your wallet.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            Plans UI
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={network} onValueChange={handleNetworkChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose network" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bundle" />
                </SelectTrigger>
                <SelectContent>
                  {selectedNetwork.plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.label} - {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-phone">Phone Number</Label>
            <Input
              id="data-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="08012345678"
              inputMode="numeric"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Bundle summary
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                {selectedNetwork.label}
              </span>
              <span>{selectedPlan.label}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPlan.price}</span>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2">
            <Wifi className="h-4 w-4" />
            Buy Data
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
