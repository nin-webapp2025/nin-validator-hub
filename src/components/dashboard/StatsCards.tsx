import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, CheckCircle, UserCheck } from "lucide-react";

interface StatsCardsProps {
  totalValidations: number;
  successfulValidations: number;
  totalPersonalizations: number;
}

export function StatsCards({ totalValidations, successfulValidations, totalPersonalizations }: StatsCardsProps) {
  const stats = [
    {
      title: "Total Validations",
      value: totalValidations,
      icon: FileCheck,
      color: "text-primary",
      bgColor: "bg-accent",
    },
    {
      title: "Successful",
      value: successfulValidations,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Personalizations",
      value: totalPersonalizations,
      icon: UserCheck,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="shadow-card transition-shadow hover:shadow-card-hover">
          <CardContent className="flex items-center gap-4 p-6">
            <div className={`rounded-xl p-3 ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}