import { useTrafficData, useTrafficStats, usePredictions, useJunctions } from "@/hooks/useTrafficData";
import { KpiCard } from "@/components/KpiCard";
import { CongestionHeatmap } from "@/components/CongestionHeatmap";
import { CongestionBadge } from "@/components/CongestionBadge";
import { TrafficMap, type JunctionMapData } from "@/components/TrafficMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Radio, TrendingUp, BrainCircuit, Zap, RefreshCw, MapPin, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const JUNCTION_IDS = ['J1', 'J2', 'J3', 'J4'];
const JUNCTION_LABELS: Record<string, string> = {
  J1: 'Lucknow', J2: 'Sonipat', J3: 'Delhi', J4: 'Bangalore',
};
const COLORS = { J1: 'hsl(210,100%,56%)', J2: 'hsl(142,71%,45%)', J3: 'hsl(38,92%,50%)', J4: 'hsl(0,84%,60%)' };

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-tomtom-traffic`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function Dashboard() {
  const [selectedJunction, setSelectedJunction] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFetchingLive, setIsFetchingLive] = useState(false);

  const queryClient = useQueryClient();
  const { data: trafficData = [], isLoading, isFetching } = useTrafficData();
  const { data: stats } = useTrafficStats();
  const { data: predictions = [] } = usePredictions();
  const { data: junctions = [] } = useJunctions();

  // Update last-updated timestamp whenever data is fetched
  useEffect(() => {
    if (!isFetching) setLastUpdated(new Date());
  }, [isFetching]);

  // --- Fetch live traffic from TomTom edge function ---
  const fetchLiveTraffic = useCallback(async (silent = false) => {
    if (isFetchingLive) return;
    setIsFetchingLive(true);
    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const msg = json.error ?? "Unknown error from edge function";
        if (!silent) toast.error(`Live traffic fetch failed: ${msg}`);
        console.error("TomTom fetch error:", json);
        return;
      }
      // Invalidate queries so UI refreshes immediately
      await queryClient.invalidateQueries({ queryKey: ['traffic_data'] });
      await queryClient.invalidateQueries({ queryKey: ['traffic_stats'] });
      if (!silent) {
        toast.success("Live traffic fetched for Lucknow, Sonipat, Delhi, Bangalore");
      }
    } catch (err) {
      if (!silent) toast.error(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsFetchingLive(false);
    }
  }, [isFetchingLive, queryClient]);

  // Auto-fetch every 5 minutes
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    // initial fetch on mount (silent — don't show toast on every page load)
    fetchLiveTraffic(true);
    pollRef.current = setInterval(() => fetchLiveTraffic(true), POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Build last-24h trend by hour and junction ---
  const trendData = useMemo(() => {
    if (trafficData.length === 0) return [];
    const latestMs = Math.max(...trafficData.map(r => new Date(r.timestamp).getTime()));
    const anchor = new Date(latestMs);
    anchor.setMinutes(0, 0, 0);
    anchor.setHours(anchor.getHours() + 1);

    const hours: { hour: string; J1?: number; J2?: number; J3?: number; J4?: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const slotStart = new Date(anchor.getTime() - i * 3600000);
      const slotEnd   = new Date(slotStart.getTime() + 3600000);
      const label = `${slotStart.getHours()}:00`;
      const entry: typeof hours[0] = { hour: label };
      JUNCTION_IDS.forEach(j => {
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

  // Peak hour
  const peakHour = useMemo(() => {
    const hourTotals: Record<number, number> = {};
    trafficData.forEach(r => {
      const h = new Date(r.timestamp).getHours();
      hourTotals[h] = (hourTotals[h] ?? 0) + r.vehicle_count;
    });
    const peak = Object.entries(hourTotals).sort(([,a],[,b]) => b - a)[0];
    return peak ? parseInt(peak[0]) : null;
  }, [trafficData]);

  // Build map junction data merging metadata + latest traffic
  const mapJunctions: JunctionMapData[] = useMemo(() => {
    return junctions.map(j => {
      const latest = trafficData
        .filter(r => r.junction_id === j.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      return {
        id: j.id,
        city: j.city,
        location_name: j.location_name,
        lat: j.latitude,
        lon: j.longitude,
        congestion_level: latest?.congestion_level,
        average_speed: latest?.average_speed,
        vehicle_count: latest?.vehicle_count,
      };
    });
  }, [junctions, trafficData]);

  const visibleJunctions = selectedJunction === 'all' ? JUNCTION_IDS : [selectedJunction];
  const avgScore = stats?.avgCongestionScore ?? 0;
  const congestionLabel = avgScore >= 2.5 ? 'High' : avgScore >= 1.5 ? 'Medium' : 'Low';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Traffic Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time monitoring — Lucknow · Sonipat · Delhi · Bangalore</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Fetch live traffic button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLiveTraffic(false)}
            disabled={isFetchingLive}
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
          >
            {isFetchingLive
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <MapPin className="w-3.5 h-3.5" />
            }
            {isFetchingLive ? "Fetching…" : "Fetch Live Traffic"}
          </Button>

          {/* Last updated indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 border border-border px-2.5 py-1.5 rounded-md">
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>{isFetching ? 'Syncing…' : `Updated ${lastUpdated.toLocaleTimeString()}`}</span>
            {!isFetching && <span className="text-muted-foreground/60">· auto-refresh 30s</span>}
          </div>

          <Select value={selectedJunction} onValueChange={setSelectedJunction}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue placeholder="Junction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {JUNCTION_IDS.map(j => (
                <SelectItem key={j} value={j}>{JUNCTION_LABELS[j]}</SelectItem>
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
          subtitle="Across all cities"
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

      {/* Live Traffic Map */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Live Traffic Map
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-traffic-low inline-block" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-traffic-medium inline-block" /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-traffic-high inline-block" /> High</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <TrafficMap junctions={mapJunctions} />
        </CardContent>
      </Card>

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
                  name={JUNCTION_LABELS[j]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Congestion Heatmap */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Congestion Heatmap (per city/hour)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading data…</div>
          ) : trafficData.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              No data yet — click "Fetch Live Traffic" to load real-time data
            </div>
          ) : (
            <CongestionHeatmap data={trafficData} />
          )}
        </CardContent>
      </Card>

      {/* Junction Status Cards */}
      {trafficData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">City Junction Status (Latest)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {JUNCTION_IDS.map(j => {
                const latest = trafficData
                  .filter(r => r.junction_id === j)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                return (
                  <div key={j} className="p-3 rounded-lg bg-muted/20 border border-border">
                    <p className="text-sm font-semibold text-foreground mb-0.5">{JUNCTION_LABELS[j]}</p>
                    <p className="text-xs text-muted-foreground mb-2">{j}</p>
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
