import { useTrafficData, useTrafficStats, usePredictions } from "@/hooks/useTrafficData";
import { KpiCard } from "@/components/KpiCard";
import { CongestionHeatmap } from "@/components/CongestionHeatmap";
import { CongestionBadge } from "@/components/CongestionBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Car, Radio, TrendingUp, BrainCircuit, Zap, RefreshCw } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const JUNCTIONS = ['all', 'J1', 'J2', 'J3', 'J4'];
const COLORS = { J1: 'hsl(210,100%,56%)', J2: 'hsl(142,71%,45%)', J3: 'hsl(38,92%,50%)', J4: 'hsl(0,84%,60%)' };

export default function Dashboard() {
  const [selectedJunction, setSelectedJunction] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { data: trafficData = [], isLoading, isFetching } = useTrafficData();
  const { data: stats } = useTrafficStats();
  const { data: predictions = [] } = usePredictions();

  // Update last-updated timestamp whenever data is fetched
  useEffect(() => {
    if (!isFetching) setLastUpdated(new Date());
  }, [isFetching]);

  // Build last-24h trend by hour and junction
  const trendData = useMemo(() => {
    if (trafficData.length === 0) return [];
    // Anchor to the latest timestamp in the dataset (not now) so seeded/historic data always shows
    const latestMs = Math.max(...trafficData.map(r => new Date(r.timestamp).getTime()));
    const anchor = new Date(latestMs);
    // Round anchor up to the next full hour so the window ends cleanly
    anchor.setMinutes(0, 0, 0);
    anchor.setHours(anchor.getHours() + 1);

    const hours: { hour: string; J1?: number; J2?: number; J3?: number; J4?: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const slotStart = new Date(anchor.getTime() - i * 3600000);
      const slotEnd = new Date(slotStart.getTime() + 3600000);
      const label = `${slotStart.getHours()}:00`;
      const entry: typeof hours[0] = { hour: label };
      ['J1','J2','J3','J4'].forEach(j => {
        const rec = trafficData.find(r => {
          const t = new Date(r.timestamp).getTime();
          return r.junction_id === j && t >= slotStart.getTime() && t < slotEnd.getTime();
        });
        if (rec) (entry as Record<string, unknown>)[j] = rec.vehicle_count;
      });
      hours.push(entry);
    }
    return hours;
  }, [trafficData]);

  // Peak hour from data
  const peakHour = useMemo(() => {
    const hourTotals: Record<number, number> = {};
    trafficData.forEach(r => {
      const h = new Date(r.timestamp).getHours();
      hourTotals[h] = (hourTotals[h] ?? 0) + r.vehicle_count;
    });
    const peak = Object.entries(hourTotals).sort(([,a],[,b]) => b - a)[0];
    return peak ? parseInt(peak[0]) : null;
  }, [trafficData]);

  const visibleJunctions = selectedJunction === 'all' ? ['J1','J2','J3','J4'] : [selectedJunction];

  const avgScore = stats?.avgCongestionScore ?? 0;
  const congestionLabel = avgScore >= 2.5 ? 'High' : avgScore >= 1.5 ? 'Medium' : 'Low';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Traffic Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time monitoring across all junctions</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Last updated + syncing indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 border border-border px-2.5 py-1.5 rounded-md">
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>
              {isFetching ? 'Syncing…' : `Updated ${lastUpdated.toLocaleTimeString()}`}
            </span>
            {!isFetching && (
              <span className="text-muted-foreground/60">· auto-refresh 30s</span>
            )}
          </div>
          <Select value={selectedJunction} onValueChange={setSelectedJunction}>
            <SelectTrigger className="w-36 bg-card border-border">
              <SelectValue placeholder="Junction" />
            </SelectTrigger>
            <SelectContent>
              {JUNCTIONS.map(j => (
                <SelectItem key={j} value={j}>{j === 'all' ? 'All Junctions' : `Junction ${j}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Vehicles"
          value={isLoading ? '…' : (stats?.totalVehicles ?? 0).toLocaleString()}
          subtitle="Monitored this week"
          icon={Car}
          color="blue"
        />
        <KpiCard
          title="Active Junctions"
          value={isLoading ? '…' : stats?.activeJunctions ?? 0}
          subtitle="Reporting live"
          icon={Radio}
          color="green"
        />
        <KpiCard
          title="Avg Congestion"
          value={isLoading ? '…' : congestionLabel}
          subtitle="Across all junctions"
          icon={TrendingUp}
          color={avgScore >= 2.5 ? 'red' : avgScore >= 1.5 ? 'amber' : 'green'}
        />
        <KpiCard
          title="Predictions Today"
          value={predictions.filter(p => {
            const d = new Date(p.created_at ?? '');
            return d.toDateString() === new Date().toDateString();
          }).length}
          subtitle="LSTM forecasts run"
          icon={BrainCircuit}
          color="amber"
        />
      </div>

      {/* Traffic Trend Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold text-foreground">Live Traffic Trend (24h)</CardTitle>
            {peakHour !== null && (
              <Badge className="bg-traffic-medium/20 text-traffic-medium border border-traffic-medium/40 text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Peak: {peakHour}:00–{peakHour + 1}:00
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={3} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              {visibleJunctions.map(j => (
                <Line
                  key={j}
                  type="monotone"
                  dataKey={j}
                  stroke={COLORS[j as keyof typeof COLORS]}
                  strokeWidth={2}
                  dot={false}
                  name={`Junction ${j}`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Congestion Heatmap */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Congestion Heatmap (per junction/hour)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading data…</div>
          ) : trafficData.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              No data yet — upload a dataset or seed sample data on the Upload page
            </div>
          ) : (
            <CongestionHeatmap data={trafficData} />
          )}
        </CardContent>
      </Card>

      {/* Recent congestion overview */}
      {trafficData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Junction Status (Latest Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['J1','J2','J3','J4'].map(j => {
                const latest = trafficData
                  .filter(r => r.junction_id === j)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                return (
                  <div key={j} className="p-3 rounded-lg bg-muted/20 border border-border">
                    <p className="text-sm font-semibold text-foreground mb-2">Junction {j}</p>
                    {latest ? (
                      <>
                        <CongestionBadge level={latest.congestion_level} />
                        <p className="text-xs text-muted-foreground mt-1.5">{latest.vehicle_count} vehicles</p>
                        <p className="text-xs text-muted-foreground">{latest.average_speed} km/h avg</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No data</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
