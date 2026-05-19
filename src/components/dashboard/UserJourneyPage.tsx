import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface JourneyStep {
  id: string;
  label: string;
  title: string;
  description: string;
  content: React.ReactNode;
}

interface UserJourneyPageProps {
  eyebrow?: string;
  title: string;
  description: string;
  steps: JourneyStep[];
}

export function UserJourneyPage({
  eyebrow = "User Journey",
  title,
  description,
  steps,
}: UserJourneyPageProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const activeStep = steps[currentStep];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
              {eyebrow}
            </p>
            <CardTitle className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              {description}
            </CardDescription>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isComplete = index < currentStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-slate-600",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                      Step {index + 1}
                    </span>
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                        isActive
                          ? "bg-blue-600 text-white"
                          : isComplete
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
                      )}
                    >
                      {index + 1}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{step.label}</p>
                  <p className="mt-1 text-xs opacity-80">{step.description}</p>
                </button>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      <Card className="border-slate-200/80 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/95">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {activeStep.label}
            </p>
            <CardTitle className="mt-2 text-xl text-slate-900 dark:text-slate-100">
              {activeStep.title}
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {activeStep.description}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentStep((step) => Math.min(steps.length - 1, step + 1))}
              disabled={currentStep === steps.length - 1}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>{activeStep.content}</CardContent>
      </Card>
    </div>
  );
}
