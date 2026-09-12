import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Send,
  Loader2,
  ArrowLeft,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { formatNaira, getWalletBalance } from "@/lib/wallet";
import { MODIFICATION_FEES } from "../../../shared/pricing";
import { createRequestId } from "@/lib/request-id";
import type { ModificationType } from "@/types/modification";

type VerifiedRecord = Record<string, unknown>;

const MODIFICATION_LABELS: Record<ModificationType, string> = {
  change_name: "Change of Name",
  change_phone: "Change of Phone Number",
  change_address: "Change of Address",
  change_dob: "Change of Date of Birth",
};

const CURRENT_VALUE_FIELDS: Record<ModificationType, string[]> = {
  change_name: ["firstname", "middlename", "surname"],
  change_phone: ["telephoneno", "phone", "phone_number"],
  change_address: ["residence_address", "residence_AdressLine1"],
  change_dob: ["birthdate", "dateOfBirth", "date_of_birth"],
};

const PREVIEW_FIELDS: { label: string; keys: string[] }[] = [
  { label: "First Name", keys: ["firstname", "firstName"] },
  { label: "Surname", keys: ["surname", "lastName", "last_name"] },
  { label: "Middle Name", keys: ["middlename", "middleName", "middle_name"] },
  { label: "Date of Birth", keys: ["birthdate", "dateOfBirth", "date_of_birth"] },
  { label: "Gender", keys: ["gender"] },
  { label: "Phone Number", keys: ["telephoneno", "phone", "phone_number"] },
  { label: "Residential Address", keys: ["residence_address", "residence_AdressLine1"] },
];

function getResultRecord(result: any): VerifiedRecord | null {
  return result?.data || result?.nin_data || result?.verification?.data || null;
}

function getFieldValue(record: VerifiedRecord | null, keys: string[]): string {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function deriveCurrentValue(type: ModificationType, record: VerifiedRecord | null): string {
  if (type === "change_name") {
    const first = getFieldValue(record, ["firstname", "firstName"]);
    const middle = getFieldValue(record, ["middlename", "middleName", "middle_name"]);
    const last = getFieldValue(record, ["surname", "lastName", "last_name"]);
    return [first, middle, last].filter(Boolean).join(" ");
  }
  return getFieldValue(record, CURRENT_VALUE_FIELDS[type]);
}

async function extractFunctionErrorMessage(error: any, fallback: string): Promise<{ message: string; balance?: number }> {
  try {
    if (error?.context && typeof error.context.json === "function") {
      const body = await error.context.clone().json();
      return {
        message: body?.message || body?.error || fallback,
        balance: typeof body?.balance === "number" ? body.balance : undefined,
      };
    }
  } catch {
    // fall through to generic message below
  }
  return { message: error?.message || fallback };
}

const formSchema = z.object({
  modification_type: z.enum(["change_name", "change_phone", "change_address", "change_dob"] as const),
  requested_value: z.string().min(1, "Please provide the new value"),
  reason: z.string().min(20, "Please provide a detailed reason (minimum 20 characters)"),
});

type FormValues = z.infer<typeof formSchema>;

interface NinModificationWizardProps {
  onSubmitted?: () => void;
}

export function NinModificationWizard({ onSubmitted }: NinModificationWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"verify" | "form">("verify");
  const [nin, setNin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedRecord, setVerifiedRecord] = useState<VerifiedRecord | null>(null);
  const [balance, setBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestKey, setRequestKey] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modification_type: "change_name",
      requested_value: "",
      reason: "",
    },
  });

  const selectedType = form.watch("modification_type");
  const fee = MODIFICATION_FEES[selectedType];
  const currentValue = useMemo(() => deriveCurrentValue(selectedType, verifiedRecord), [selectedType, verifiedRecord]);
  const hasEnoughBalance = balance >= fee;

  const refreshBalance = async () => {
    if (!user?.id) return;
    const b = await getWalletBalance(user.id);
    setBalance(b);
  };

  useEffect(() => {
    void refreshBalance();
    const handler = () => void refreshBalance();
    window.addEventListener("wallet-updated", handler);
    return () => window.removeEventListener("wallet-updated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{11}$/.test(nin)) {
      toast({ title: "Invalid NIN", description: "NIN must be exactly 11 digits", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to continue.", variant: "destructive" });
      return;
    }

    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: {
          request_id: createRequestId("nin-modify-verify"),
          action: "nin_advance",
          nin,
          number_nin: nin,
        },
      });

      if (error) {
        const { message, balance: balanceFromError } = await extractFunctionErrorMessage(
          error,
          "Unable to verify this NIN right now.",
        );
        if (typeof balanceFromError === "number") setBalance(balanceFromError);
        toast({ title: "Verification Failed", description: message, variant: "destructive" });
        return;
      }

      const isSuccess =
        data?.status === true ||
        data?.status === "success" ||
        data?.verification?.status === "VERIFIED" ||
        data?.verification?.status === "success" ||
        data?.success === true;

      if (!isSuccess) {
        toast({
          title: "Verification Failed",
          description: data?.message || "We couldn't verify this NIN. Please check the number and try again.",
          variant: "destructive",
        });
        return;
      }

      setVerifiedRecord(getResultRecord(data));
      form.reset({ modification_type: "change_name", requested_value: "", reason: "" });
      setRequestKey(null);
      setPhase("form");
      void refreshBalance();
      toast({
        title: "NIN Verified",
        description: "Here's what's on record. Review it, then choose what you'd like to change.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleChangeNin = () => {
    setPhase("verify");
    setVerifiedRecord(null);
    setRequestKey(null);
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to continue.", variant: "destructive" });
      return;
    }

    if (!hasEnoughBalance) {
      toast({
        title: "Insufficient Wallet Balance",
        description: `This modification costs ${formatNaira(fee)}, but your wallet only has ${formatNaira(balance)}. Top up your wallet to continue.`,
        variant: "destructive",
      });
      return;
    }

    // Stable across retries so a network blip can't cause a double charge.
    const key = requestKey ?? createRequestId("modify");
    if (!requestKey) setRequestKey(key);

    setIsSubmitting(true);

    try {
      const { data, error } = await (supabase as any).rpc("submit_paid_modification_request", {
        p_nin: nin,
        p_modification_type: values.modification_type,
        p_current_value: currentValue || null,
        p_requested_value: values.requested_value,
        p_reason: values.reason,
        p_request_key: key,
      });

      if (error) throw error;

      if (!data?.success) {
        if (typeof data?.balance === "number") setBalance(data.balance);
        toast({
          title: "Payment Failed",
          description: data?.message || `Unable to charge ${formatNaira(fee)} from your wallet.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: data?.already_processed ? "Request Already Submitted" : "Payment Successful — Request Submitted",
        description: `${formatNaira(fee)} was charged and your modification request is now pending admin review.`,
        className: "bg-primary text-primary-foreground border-primary",
      });

      if (typeof data?.balance === "number") setBalance(data.balance);
      window.dispatchEvent(new Event("wallet-updated"));

      form.reset({ modification_type: "change_name", requested_value: "", reason: "" });
      setPhase("verify");
      setNin("");
      setVerifiedRecord(null);
      setRequestKey(null);
      onSubmitted?.();
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === "verify") {
    return (
      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-slate-900 dark:text-slate-100">Step 1 — Verify Your NIN</CardTitle>
          </div>
          <CardDescription>
            We'll pull the details currently on record for this NIN so you can confirm they're correct before
            requesting a change. This verification costs {formatNaira(800)}, charged from your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="modify-nin" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                National Identification Number (NIN)
              </label>
              <Input
                id="modify-nin"
                placeholder="12345678901"
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                maxLength={11}
                className="dark:bg-slate-900"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter the 11-digit NIN you want to modify</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Wallet className="h-4 w-4" />
                Wallet balance
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatNaira(balance)}</span>
            </div>

            <Button type="submit" disabled={verifying || nin.length !== 11} className="w-full">
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify NIN — {formatNaira(800)}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-slate-900 dark:text-slate-100">Step 2 — Confirm &amp; Submit</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleChangeNin} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Verify a different NIN
          </Button>
        </div>
        <CardDescription>
          NIN <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{nin}</span> verified. Review
          what's on record below, then choose what you'd like to change.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Currently on record
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PREVIEW_FIELDS.map((field) => {
              const value = getFieldValue(verifiedRecord, field.keys);
              if (!value) return null;
              return (
                <div key={field.label} className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{field.label}</p>
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="modification_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modification Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select modification type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(MODIFICATION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label} — {formatNaira(MODIFICATION_FEES[value as ModificationType])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Current Value (from verified record)</FormLabel>
              <Input value={currentValue || "Not available on record"} readOnly disabled className="dark:bg-slate-900" />
            </div>

            <FormField
              control={form.control}
              name="requested_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New/Requested Value</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} className="dark:bg-slate-900" />
                  </FormControl>
                  <FormDescription className="text-slate-500 dark:text-slate-400">
                    The new value you're requesting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Modification</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed explanation for why this modification is necessary..."
                      {...field}
                      rows={4}
                      className="dark:bg-slate-900"
                    />
                  </FormControl>
                  <FormDescription className="text-slate-500 dark:text-slate-400">
                    Minimum 20 characters - be specific and detailed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div
              className={`rounded-lg border p-4 ${
                hasEnoughBalance
                  ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                  : "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Modification fee</span>
                <Badge className="bg-primary text-primary-foreground">{formatNaira(fee)}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Your wallet balance</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatNaira(balance)}</span>
              </div>

              {!hasEnoughBalance && (
                <div className="mt-3 flex items-start gap-2 border-t border-red-200 pt-3 text-red-700 dark:border-red-900/60 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-2 text-xs">
                    <p>
                      You need {formatNaira(fee - balance)} more to submit this request. Top up your wallet to
                      continue.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                      onClick={() => navigate("/dashboard/user/wallet")}
                    >
                      <Wallet className="mr-1.5 h-3.5 w-3.5" />
                      Top up wallet
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting || !hasEnoughBalance} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Pay {formatNaira(fee)} &amp; Submit Request
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
