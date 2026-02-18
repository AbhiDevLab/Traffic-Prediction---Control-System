import { CongestionLevel } from "@/lib/sampleData";
import { cn } from "@/lib/utils";

interface CongestionBadgeProps {
  level: CongestionLevel;
  confidence?: number;
  className?: string;
}

export function CongestionBadge({ level, confidence, className }: CongestionBadgeProps) {
  const colors: Record<CongestionLevel, string> = {
    Low: "border-traffic-low text-traffic-low bg-traffic-low/10",
    Medium: "border-traffic-medium text-traffic-medium bg-traffic-medium/10",
    High: "border-traffic-high text-traffic-high bg-traffic-high/10",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
      colors[level],
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {level}
      {confidence != null && <span className="opacity-70">({confidence.toFixed(1)}%)</span>}
    </span>
  );
}
