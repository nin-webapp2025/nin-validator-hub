/**
 * WalletTopUp — Paystack-powered wallet top-up form.
 * Uses react-paystack Inline popup. After payment, verifies via edge function.
 */
import { useState, useCallback, useEffect, useRef } from "react";
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
import { Wallet, Plus, CreditCard, ArrowUpRight, Loader2, CheckCircle2, Info, RefreshCw, AlertTriangle } from "lucide-react";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

// Quick-top-up amounts
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

/**
 * Inner component that re-mounts when payKey changes so usePaystackPayment
 * always gets a fresh config (it reads config only on first render).
 */
function PaystackButton({
  amount,
  email,
  publicKey,
  userId,
  onVerified,
  onClose,
  disabled,
  processing,
  label,
}: {
  amount: number;
  email: string;
  publicKey: string;
  userId: string;
  onVerified: (reference: string) => void;
  onClose: () => void;
  disabled: boolean;
  processing: boolean;
  label: string;
}) {
  const config = {
    reference: `wtop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email,
    amount: Math.round(amount * 100), // Paystack expects kobo
    publicKey,
    currency: "NGN" as const,
    metadata: {
      custom_fields: [
        { display_name: "User ID", variable_name: "user_id", value: userId },
        { display_name: "Purpose", variable_name: "purpose", value: "wallet_top_up" },
      ],
    },
  };

  const initializePayment = usePaystackPayment(config);

  const handleClick = () => {
    initializePayment({
      onSuccess: (ref: any) => {
        const reference = ref?.reference || ref?.trxref || config.reference;
        onVerified(reference);
      },
      onClose,
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || processing}
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
          {label}
        </>
      )}
    </Button>
  );
}

/** Max retries for transient edge function failures */
const MAX_VERIFY_RETRIES = 3;

/** Persists pending references to localStorage so they survive page refreshes */
const PENDING_REF_KEY = "sparkid_pending_wallet_ref";

function savePendingReference(ref: string) {
  try { localStorage.setItem(PENDING_REF_KEY, ref); } catch {}
}
function loadPendingReference(): string | null {
  try { return localStorage.getItem(PENDING_REF_KEY); } catch { return null; }
}
function clearPendingReference() {
  try { localStorage.removeItem(PENDING_REF_KEY); } catch {}
}

export function WalletTopUp() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  // Increment payKey to force PaystackButton to remount with fresh config
  const [payKey, setPayKey] = useState(0);
  // Reference that failed verification — stored for retry
  const [pendingReference, setPendingReference] = useState<string | null>(
    loadPendingReference
  );

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

  /**
   * Extract a useful error message from the supabase.functions.invoke error.
   * The SDK may return FunctionsHttpError, FunctionsRelayError, or FunctionsFetchError.
   */
  const extractErrorDetails = (error: any): string => {
    if (!error) return "Unknown error";
    // FunctionsHttpError/FunctionsRelayError have a context property
    if (error.context) {
      if (typeof error.context === "string") return error.context;
      if (error.context?.responseText) return error.context.responseText;
    }
    if (error.message) return error.message;
    try { return JSON.stringify(error); } catch { return String(error); }
  };

  /**
   * Call the paystack-verify edge function with automatic retry.
   * Refreshes the JWT session first to avoid token-expiry failures
   * (user may have spent time in the Paystack popup on mobile).
   */
  const verifyWithRetry = useCallback(
    async (reference: string): Promise<{ data: any; error: any }> => {
      // Refresh session before calling edge function — prevents JWT expiry after
      // the user spent time in the Paystack popup (especially on mobile browsers
      // that background the tab).
      try {
        await supabase.auth.refreshSession();
      } catch (refreshErr) {
        console.warn("[WalletTopUp] Session refresh warning:", refreshErr);
      }

      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_VERIFY_RETRIES; attempt++) {
        console.log(`[WalletTopUp] Verify attempt ${attempt}/${MAX_VERIFY_RETRIES} for ref: ${reference}`);

        const { data, error } = await supabase.functions.invoke("paystack-verify", {
          body: { reference },
        });

        if (!error) return { data, error: null };

        lastError = error;
        const details = extractErrorDetails(error);
        console.warn(`[WalletTopUp] Attempt ${attempt} failed:`, details);

        // Don't retry on 4xx client errors (bad request, unauthorized, etc.)
        if (error.name === "FunctionsHttpError" && details.includes("4")) {
          break;
        }

        // Wait before retrying (exponential back-off: 1s, 2s, 4s)
        if (attempt < MAX_VERIFY_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      }

      return { data: null, error: lastError };
    },
    []
  );

  /** Called after Paystack popup reports success */
  const handleVerified = useCallback(
    async (reference: string) => {
      setProcessing(true);
      // Immediately persist the reference so it survives page refresh
      savePendingReference(reference);
      setPendingReference(reference);

      try {
        console.log("[WalletTopUp] Verifying reference:", reference);

        const { data: verifyData, error } = await verifyWithRetry(reference);

        console.log("[WalletTopUp] Edge function response:", { verifyData, error });

        // supabase.functions.invoke may return a FunctionsHttpError in `error`
        // or the edge function may return { success: false } in `data`
        if (error) {
          const details = extractErrorDetails(error);
          console.error("[WalletTopUp] Edge function error:", details);
          toast({
            title: "Verification Failed",
            description: `Could not reach verification server. Tap "Retry Verification" below. Reference: ${reference}`,
            variant: "destructive",
          });
          return;
        }

        if (!verifyData?.success) {
          console.error("[WalletTopUp] Paystack verify unsuccessful:", verifyData);
          toast({
            title: "Verification Failed",
            description: verifyData?.error || verifyData?.message || "Payment verification failed. Reference: " + reference,
            variant: "destructive",
          });
          return;
        }

        // Credit the wallet
        const result = await creditWallet(user!.id, verifyData.amount, reference);
        if (result.success) {
          // Success — clear saved reference
          clearPendingReference();
          setPendingReference(null);

          toast({
            title: "Wallet Funded!",
            description: `${formatNaira(verifyData.amount)} has been added to your wallet. New balance: ${formatNaira(result.balance)}`,
          });
          setAmount("");
          setPayKey((k) => k + 1); // remount PaystackButton for fresh reference
        } else {
          toast({
            title: "Credit Error",
            description: "Payment was successful but wallet credit failed. Contact support with reference: " + reference,
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("[WalletTopUp] Payment verification error:", err);
        toast({
          title: "Error",
          description: "An unexpected error occurred during verification. Reference: " + reference,
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
    },
    [user, toast, verifyWithRetry]
  );

  const handleClose = useCallback(() => {
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

      {/* Pending Verification — Retry banner */}
      {pendingReference && !processing && (
        <Card className="shadow-card border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Pending Payment Verification
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  A previous payment hasn't been verified yet. If you were charged, tap retry to credit your wallet.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-mono break-all">
                  Ref: {pendingReference}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleVerified(pendingReference)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Verification
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700"
                onClick={() => {
                  clearPendingReference();
                  setPendingReference(null);
                  toast({ title: "Dismissed", description: "Pending reference cleared. Contact support if you were charged." });
                }}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

          {/* Pay button — uses key={payKey} so it remounts with fresh Paystack config */}
          {numAmount >= 100 && PAYSTACK_PUBLIC_KEY ? (
            <PaystackButton
              key={payKey}
              amount={numAmount}
              email={user?.email || ""}
              publicKey={PAYSTACK_PUBLIC_KEY}
              userId={user?.id || ""}
              onVerified={handleVerified}
              onClose={handleClose}
              disabled={numAmount < 100}
              processing={processing}
              label={`Pay ${formatNaira(numAmount)}`}
            />
          ) : (
            <Button
              onClick={handlePay}
              disabled={numAmount < 100 || processing}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <CreditCard className="h-4 w-4" />
              Pay
            </Button>
          )}

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
