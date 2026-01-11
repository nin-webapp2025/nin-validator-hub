import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, CheckCircle, UserCheck, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  totalValidations: number;
  successfulValidations: number;
  totalPersonalizations: number;
  totalClearances?: number;
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const endValue = value;

    const updateNumber = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * endValue));

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    };

    requestAnimationFrame(updateNumber);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

export function StatsCards({ totalValidations, successfulValidations, totalPersonalizations, totalClearances = 0 }: StatsCardsProps) {
  const stats = [
    {
      title: "Total Validations",
      value: totalValidations,
      icon: FileCheck,
      bgColor: "bg-blue-500",
      lightBg: "bg-blue-50",
      borderColor: "border-blue-100",
      textColor: "text-blue-700",
    },
    {
      title: "Successful",
      value: successfulValidations,
      icon: CheckCircle,
      bgColor: "bg-emerald-500",
      lightBg: "bg-emerald-50",
      borderColor: "border-emerald-100",
      textColor: "text-emerald-700",
    },
    {
      title: "Clearances",
      value: totalClearances,
      icon: ShieldCheck,
      bgColor: "bg-purple-500",
      lightBg: "bg-purple-50",
      borderColor: "border-purple-100",
      textColor: "text-purple-700",
    },
    {
      title: "Personalizations",
      value: totalPersonalizations,
      icon: UserCheck,
      bgColor: "bg-amber-500",
      lightBg: "bg-amber-50",
      borderColor: "border-amber-100",
      textColor: "text-amber-700",
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="relative overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      "rounded-xl p-3",
                      stat.bgColor,
                      "shadow-sm"
                    )}
                  >
                    <stat.icon className="h-5 w-5 text-white" />
                  </motion.div>
                </div>
                
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <motion.p
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.4 }}
                    className="text-3xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    <AnimatedNumber value={stat.value} duration={1500} />
                  </motion.p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}