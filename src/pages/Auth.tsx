import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters");

type AuthView = "main" | "forgot-password" | "signup-success" | "mfa-challenge";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-orange-500" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-yellow-500" };
  if (score === 4) return { score: 4, label: "Strong", color: "bg-green-500" };
  return { score: 5, label: "Very Strong", color: "bg-emerald-600" };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              level <= strength.score ? strength.color : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        strength.score <= 1 ? "text-red-500" :
        strength.score === 2 ? "text-orange-500" :
        strength.score === 3 ? "text-yellow-600 dark:text-yellow-400" :
        "text-green-600 dark:text-green-400"
      }`}>
        {strength.label}
      </p>
    </div>
  );
}

export default function Auth() {
  const { user, signIn, signUp, loading, challengeMFA, verifyMFA } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [authView, setAuthView] = useState<AuthView>("main");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [signupSuccessEmail, setSignupSuccessEmail] = useState("");
  // MFA challenge state
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (user && authView !== "signup-success") {
      navigate("/dashboard");
    }
  }, [user, navigate, authView]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    const { error, mfaRequired } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password. Please try again."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    // If MFA is required, initiate challenge
    if (mfaRequired) {
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === "verified");
        if (totp) {
          const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
          if (challengeErr) throw challengeErr;
          setMfaFactorId(totp.id);
          setMfaChallengeId(challenge.id);
          setAuthView("mfa-challenge");
          return;
        }
      } catch (err) {
        console.error("MFA challenge error:", err);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          title: "Account Exists",
          description: "This email is already registered. Please login instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      setSignupSuccessEmail(signupEmail);
      setAuthView("signup-success");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(resetEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset Email Sent",
        description: "Check your inbox for the password reset link.",
      });
      setResetEmail("");
      setAuthView("main");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // MFA challenge screen
  if (authView === "mfa-challenge") {
    const handleMfaVerify = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      const { error } = await verifyMFA(mfaFactorId, mfaChallengeId, mfaCode);
      setIsSubmitting(false);
      if (error) {
        toast({
          title: "Invalid Code",
          description: "The verification code was incorrect. Please try again.",
          variant: "destructive",
        });
        return;
      }
      navigate("/dashboard");
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-3 sm:p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="space-y-1 text-center p-4 sm:p-6">
            <div className="mx-auto mb-3 sm:mb-4">
              <img src="/logo.svg" alt="SparkID" className="h-12 sm:h-14 w-auto" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Two-Factor Authentication</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <Input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl font-mono tracking-[0.5em] h-14"
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={mfaCode.length !== 6 || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs"
                onClick={() => { setAuthView("main"); setMfaCode(""); }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup success screen
  if (authView === "signup-success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-3 sm:p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="space-y-1 text-center p-4 sm:p-6">
            <div className="mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-950/50 p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Account Created!</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Welcome to SparkID, your account is ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 text-center space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <Mail className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p>
                Signed up as <span className="font-medium text-foreground">{signupSuccessEmail}</span>
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-xs"
              onClick={() => { setAuthView("main"); }}
            >
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password screen
  if (authView === "forgot-password") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-3 sm:p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="space-y-1 text-center p-4 sm:p-6">
            <div className="mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <img 
                src="/logo.svg" 
                alt="SparkID" 
                className="h-12 sm:h-14 w-auto"
              />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2"
                onClick={() => setAuthView("main")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-3 sm:p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-1 text-center p-4 sm:p-6">
          <div className="mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <img 
              src="/logo.svg" 
              alt="SparkID" 
              className="h-12 sm:h-14 w-auto"
            />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">SparkID</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Validate and personalize National Identification Numbers</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
              <TabsTrigger value="login" className="text-xs sm:text-sm">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs sm:text-sm">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(loginEmail);
                        setAuthView("forgot-password");
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                  <PasswordStrengthMeter password={signupPassword} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}