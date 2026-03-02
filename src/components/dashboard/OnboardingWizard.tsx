import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Search, Bell, Settings, ArrowRight, X, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to SparkID!",
    description:
      "Your identity verification platform. Let's take a quick tour of the features available to you.",
  },
  {
    icon: Search,
    title: "Validate a NIN",
    description:
      "Go to the 'Validate NIN' tab and enter an 11-digit National Identification Number to verify identity information instantly.",
  },
  {
    icon: Shield,
    title: "BVN & Clearance",
    description:
      "You can also verify Bank Verification Numbers and perform clearance checks from their respective tabs.",
  },
  {
    icon: Bell,
    title: "Stay Notified",
    description:
      "Click the bell icon in the header to see notification updates about your verification results and account activity.",
  },
  {
    icon: Settings,
    title: "Your Settings",
    description:
      "Visit the Settings tab to update your profile, change your password, and manage notification preferences. You're all set!",
  },
];

export function OnboardingWizard() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      // Show wizard if onboarding_completed is false or column missing
      if (data && data.onboarding_completed === false) {
        setShow(true);
      }
      setLoading(false);
    })();
  }, [user]);

  const finishOnboarding = async () => {
    setShow(false);
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("id", user.id);
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  if (loading || !show) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-2xl border-blue-200 dark:border-blue-800 dark:bg-slate-900 animate-in fade-in zoom-in-95">
        <CardContent className="p-6 sm:p-8">
          {/* Close */}
          <div className="flex justify-end -mt-2 -mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={finishOnboarding}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-blue-600"
                    : i < step
                    ? "w-1.5 bg-blue-400"
                    : "w-1.5 bg-slate-300 dark:bg-slate-600"
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-blue-100 dark:bg-blue-950/50 p-4">
              <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {current.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {current.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={finishOnboarding}
              className="text-xs text-slate-500"
            >
              Skip tour
            </Button>
            <Button size="sm" onClick={handleNext} className="gap-1">
              {step < steps.length - 1 ? (
                <>
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
