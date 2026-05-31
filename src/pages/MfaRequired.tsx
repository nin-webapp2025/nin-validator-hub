import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "loading" | "enroll" | "challenge";

export default function MfaRequired() {
  const {
    user,
    signOut,
    enrollMFA,
    challengeMFA,
    verifyMFA,
    mfaHasVerifiedFactor,
    mfaAssuranceLevel,
    mfaLoading,
    refreshMFAStatus,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const returnTo = useMemo(() => {
    const state = location.state as { returnTo?: string } | null;
    return state?.returnTo || "/dashboard/admin";
  }, [location.state]);

  const [viewMode, setViewMode] = useState<ViewMode>("loading");
  const [loadingAction, setLoadingAction] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (mfaLoading) {
      setViewMode("loading");
      return;
    }

    if (mfaHasVerifiedFactor && mfaAssuranceLevel === "aal2") {
      navigate(returnTo, { replace: true });
      return;
    }

    const loadFactorState = async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = data?.totp?.find((factor) => factor.status === "verified");
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        setViewMode("challenge");
      } else {
        setViewMode("enroll");
      }
    };

    loadFactorState();
  }, [user, mfaLoading, mfaHasVerifiedFactor, mfaAssuranceLevel, navigate, returnTo]);

  const handleStartEnrollment = async () => {
    setLoadingAction(true);
    const { data, error } = await enrollMFA();
    setLoadingAction(false);

    if (error) {
      toast({
        title: "Unable to start MFA setup",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  };

  const handleVerifyEnrollment = async () => {
    if (!factorId || code.length !== 6) return;

    setLoadingAction(true);
    const { data: challenge, error: challengeError } = await challengeMFA(factorId);
    if (challengeError) {
      setLoadingAction(false);
      toast({
        title: "Unable to verify MFA setup",
        description: challengeError.message,
        variant: "destructive",
      });
      return;
    }

    const { error: verifyError } = await verifyMFA(factorId, challenge.id, code);
    setLoadingAction(false);
    if (verifyError) {
      toast({
        title: "Invalid verification code",
        description: "Please check the code in your authenticator app and try again.",
        variant: "destructive",
      });
      return;
    }

    await refreshMFAStatus();
    toast({
      title: "MFA enabled",
      description: "Admin access is now protected by your authenticator app.",
    });
    navigate(returnTo, { replace: true });
  };

  const handleStartChallenge = async () => {
    if (!factorId) return;

    setLoadingAction(true);
    const { data, error } = await challengeMFA(factorId);
    setLoadingAction(false);

    if (error) {
      toast({
        title: "Unable to send MFA challenge",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setChallengeId(data.id);
    toast({
      title: "Challenge ready",
      description: "Enter the current 6-digit code from your authenticator app.",
    });
  };

  const handleVerifyChallenge = async () => {
    if (!factorId || !challengeId || code.length !== 6) return;

    setLoadingAction(true);
    const { error } = await verifyMFA(factorId, challengeId, code);
    setLoadingAction(false);

    if (error) {
      toast({
        title: "Invalid verification code",
        description: "The code was incorrect. Please try again.",
        variant: "destructive",
      });
      return;
    }

    await refreshMFAStatus();
    navigate(returnTo, { replace: true });
  };

  const renderBody = () => {
    if (viewMode === "loading") {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Checking your security status...</p>
        </div>
      );
    }

    if (viewMode === "challenge") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            Your admin account already has MFA enabled. Verify with your authenticator app before entering the admin panel.
          </div>
          {!challengeId && (
            <Button onClick={handleStartChallenge} disabled={loadingAction} className="w-full">
              {loadingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Start Verification
            </Button>
          )}
          {challengeId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mfa-auth-code">Authenticator Code</Label>
                <Input
                  id="mfa-auth-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-[0.35em]"
                />
              </div>
              <Button onClick={handleVerifyChallenge} disabled={loadingAction || code.length !== 6} className="w-full">
                {loadingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Verify and Continue
              </Button>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          Admin access requires MFA in production. Set it up once here, then future sign-ins will require your authenticator code.
        </div>

        {!qrCode ? (
          <Button onClick={handleStartEnrollment} disabled={loadingAction} className="w-full">
            {loadingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
            Set Up Authenticator App
          </Button>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Scan this QR code with Google Authenticator, Authy, or another TOTP app.
            </p>
            <div className="flex justify-center">
              <img src={qrCode} alt="MFA QR Code" className="h-52 w-52 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700" />
            </div>
            {secret && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Secret: <span className="font-mono break-all">{secret}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="mfa-setup-code">Enter 6-digit code from your app</Label>
              <Input
                id="mfa-setup-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-lg font-mono tracking-[0.35em]"
              />
            </div>
            <Button onClick={handleVerifyEnrollment} disabled={loadingAction || code.length !== 6} className="w-full">
              {loadingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Verify and Protect Admin Access
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_45%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_55%,#020617_100%)] p-4">
      <Card className="w-full max-w-lg border-slate-200/80 bg-white/95 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold">Secure Admin Access</CardTitle>
          <CardDescription>
            Admin pages require multi-factor authentication before access is granted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderBody()}

          <Button
            type="button"
            variant="ghost"
            className="w-full text-xs"
            onClick={async () => {
              await signOut();
              navigate("/auth", { replace: true });
            }}
          >
            Sign out instead
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
