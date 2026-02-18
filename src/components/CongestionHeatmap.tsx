import { CongestionLevel } from "@/lib/sampleData";

interface CongestionHeatmapProps {
  data: { junction_id: string; timestamp: string; congestion_level: CongestionLevel }[];
}

const JUNCTIONS = ['J1', 'J2', 'J3', 'J4'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const levelColor: Record<CongestionLevel, string> = {
  Low: "bg-traffic-low/70 hover:bg-traffic-low",
  Medium: "bg-traffic-medium/70 hover:bg-traffic-medium",
  High: "bg-traffic-high/70 hover:bg-traffic-high",
};

export function CongestionHeatmap({ data }: CongestionHeatmapProps) {
  // Build a map: junction -> hour -> congestion
  const map: Record<string, Record<number, CongestionLevel>> = {};
  data.forEach(r => {
    const hour = new Date(r.timestamp).getHours();
    if (!map[r.junction_id]) map[r.junction_id] = {};
    map[r.junction_id][hour] = r.congestion_level;
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Hour labels */}
        <div className="flex mb-1 ml-8">
          {HOURS.map(h => (
            <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {JUNCTIONS.map(j => (
          <div key={j} className="flex items-center gap-1 mb-1">
            <div className="w-7 text-xs text-muted-foreground font-mono shrink-0">{j}</div>
            {HOURS.map(h => {
              const level = map[j]?.[h];
              return (
                <div
                  key={h}
                  title={level ? `${j} ${h}:00 — ${level}` : `${j} ${h}:00 — No data`}
                  className={`flex-1 h-5 rounded-sm transition-colors ${level ? levelColor[level] : 'bg-muted/30'}`}
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 ml-8">
          {(['Low', 'Medium', 'High'] as CongestionLevel[]).map(l => (
            <div key={l} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${levelColor[l]}`} />
              <span className="text-xs text-muted-foreground">{l}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted/30" />
            <span className="text-xs text-muted-foreground">No data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
