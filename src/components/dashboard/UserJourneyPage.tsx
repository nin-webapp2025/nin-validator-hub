import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
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
        </CardHeader>
      </Card>

      {steps.map((step) => (
        <Card
          key={step.id}
          className="border-slate-200/80 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/95"
        >
          <CardHeader>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {step.label}
              </p>
              <CardTitle className="mt-2 text-xl text-slate-900 dark:text-slate-100">
                {step.title}
              </CardTitle>
              <CardDescription className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {step.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>{step.content}</CardContent>
        </Card>
      ))}
    </div>
  );
}
