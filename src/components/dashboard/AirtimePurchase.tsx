import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Zap, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";

const NETWORKS = [
  { id: "mtn", label: "MTN", accent: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { id: "airtel", label: "Airtel", accent: "bg-red-100 text-red-800 border-red-200" },
  { id: "glo", label: "Glo", accent: "bg-green-100 text-green-800 border-green-200" },
  { id: "9mobile", label: "9mobile", accent: "bg-emerald-100 text-emerald-800 border-emerald-200" },
] as const;

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000];

export function AirtimePurchase() {
  const { toast } = useToast();
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]["id"]>("mtn");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("500");

  const selectedNetwork = useMemo(
    () => NETWORKS.find((item) => item.id === network) ?? NETWORKS[0],
    [network]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Airtime purchase unavailable",
      description: "Airtime purchases are temporarily unavailable at the moment.",
    });
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Buy Airtime
            </CardTitle>
            <CardDescription className="mt-1">
              Top up any major Nigerian mobile network from your dashboard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Network</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NETWORKS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNetwork(item.id)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-semibold transition-all",
                    network === item.id
                      ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="airtime-phone">Phone Number</Label>
            <Input
              id="airtime-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="08012345678"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="airtime-amount">Amount</Label>
            <Input
              id="airtime-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="500"
              inputMode="decimal"
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  N{value.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <RadioTower className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Selected network
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", selectedNetwork.accent)}>
                {selectedNetwork.label}
              </span>
              <span className="ml-2">Review your selected network before proceeding.</span>
            </p>
          </div>

          <Button type="submit" className="w-full gap-2">
            <Zap className="h-4 w-4" />
            Buy Airtime
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
