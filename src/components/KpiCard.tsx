import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  color?: "blue" | "green" | "amber" | "red";
}

const colorMap = {
  blue: { icon: "text-primary bg-primary/15 border-primary/30", border: "border-l-primary" },
  green: { icon: "text-traffic-low bg-traffic-low/15 border-traffic-low/30", border: "border-l-traffic-low" },
  amber: { icon: "text-traffic-medium bg-traffic-medium/15 border-traffic-medium/30", border: "border-l-traffic-medium" },
  red: { icon: "text-traffic-high bg-traffic-high/15 border-traffic-high/30", border: "border-l-traffic-high" },
};

export function KpiCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: KpiCardProps) {
  const colors = colorMap[color];
  return (
    <Card className={cn("border-l-4 bg-card card-gradient", colors.border)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1 leading-none">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && <p className="text-xs text-traffic-low mt-1">{trend}</p>}
          </div>
          <div className={cn("p-2.5 rounded-lg border shrink-0 ml-3", colors.icon)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
