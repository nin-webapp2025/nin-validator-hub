/**
 * WalletTopUp — Paystack-powered wallet top-up form.
 * Uses react-paystack Inline popup. After payment, verifies via edge function.
 */
import { useState, useCallback, useEffect } from "react";
import { usePaystackPayment } from "react-paystack";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { creditWallet, getWalletBalance, formatNaira, OPERATION_PRICES, OPERATION_LABELS } from "@/lib/wallet";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, CreditCard, ArrowUpRight, Loader2, CheckCircle2, Info } from "lucide-react";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

// Quick-top-up amounts
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export function WalletTopUp() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!user?.id) return;
    const b = await getWalletBalance(user.id);
    setBalance(b);
  }, [user?.id]);

  useEffect(() => {
    fetchBalance();
    const handler = () => fetchBalance();
    window.addEventListener("wallet-updated", handler);
    return () => window.removeEventListener("wallet-updated", handler);
  }, [fetchBalance]);

  const numAmount = parseFloat(amount) || 0;

  // Paystack config
  const config = {
    reference: `wtop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: user?.email || "",
    amount: Math.round(numAmount * 100), // Paystack expects kobo
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: "NGN",
    metadata: {
      custom_fields: [
        { display_name: "User ID", variable_name: "user_id", value: user?.id || "" },
        { display_name: "Purpose", variable_name: "purpose", value: "wallet_top_up" },
      ],
    },
  };

  const initializePayment = usePaystackPayment(config);

  const onPaystackSuccess = useCallback(
    async (ref: any) => {
      const reference = ref?.reference || ref?.trxref || config.reference;
      setProcessing(true);

      try {
        // Verify with our edge function
        const { data: verifyData, error } = await supabase.functions.invoke("paystack-verify", {
          body: { reference },
        });

        if (error || !verifyData?.success) {
          toast({
            title: "Verification Failed",
            description: verifyData?.error || "Could not verify payment. Contact support with reference: " + reference,
            variant: "destructive",
          });
          return;
        }

        // Credit the wallet
        const result = await creditWallet(user!.id, verifyData.amount, reference);
        if (result.success) {
          toast({
            title: "Wallet Funded!",
            description: `${formatNaira(verifyData.amount)} has been added to your wallet. New balance: ${formatNaira(result.balance)}`,
          });
          setAmount("");
        } else {
          toast({
            title: "Credit Error",
            description: "Payment was successful but wallet credit failed. Contact support with reference: " + reference,
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("Payment verification error:", err);
        toast({
          title: "Error",
          description: "An error occurred during payment verification. Reference: " + reference,
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
    },
    [user, toast, config.reference]
  );

  const onPaystackClose = useCallback(() => {
    toast({
      title: "Payment Cancelled",
      description: "You closed the payment window. No charges were made.",
    });
  }, [toast]);

  const handlePay = () => {
    if (numAmount < 100) {
      toast({ title: "Minimum Amount", description: "Minimum top-up is ₦100.", variant: "destructive" });
      return;
    }
    if (!PAYSTACK_PUBLIC_KEY) {
      toast({ title: "Configuration Error", description: "Paystack is not configured. Contact support.", variant: "destructive" });
      return;
    }
    initializePayment({ onSuccess: onPaystackSuccess, onClose: onPaystackClose });
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="shadow-card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Wallet Balance</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                {formatNaira(balance)}
              </p>
            </div>
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <Wallet className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top-up Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-green-600" />
            Fund Wallet
          </CardTitle>
          <CardDescription>Add money to your wallet via Paystack. Funds are instant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Quick amounts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Amounts</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <Button
                  key={a}
                  type="button"
                  variant={numAmount === a ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setAmount(String(a))}
                >
                  {formatNaira(a)}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <Label htmlFor="topup-amount" className="text-sm font-medium">
              Or enter amount (₦)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₦</span>
              <Input
                id="topup-amount"
                type="number"
                min={100}
                step={100}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum top-up: ₦100</p>
          </div>

          {/* Pay button */}
          <Button
            onClick={handlePay}
            disabled={numAmount < 100 || processing}
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying Payment...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Pay {numAmount >= 100 ? formatNaira(numAmount) : ""}
              </>
            )}
          </Button>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Payments are processed securely by Paystack. Your card details are never stored on our servers.</p>
          </div>
        </CardContent>
      </Card>

      {/* Service Prices */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowUpRight className="h-5 w-5 text-blue-600" />
            Service Pricing
          </CardTitle>
          <CardDescription>Cost per operation deducted from your wallet balance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {Object.entries(OPERATION_PRICES).map(([key, price]) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {OPERATION_LABELS[key] || key}
                </span>
                <Badge
                  variant="secondary"
                  className="font-semibold text-xs"
                >
                  {formatNaira(price)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
