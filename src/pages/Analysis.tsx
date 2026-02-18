import { useTrafficData } from "@/hooks/useTrafficData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

const JUNCTIONS = ['J1','J2','J3','J4'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const COLORS = { J1: 'hsl(210,100%,56%)', J2: 'hsl(142,71%,45%)', J3: 'hsl(38,92%,50%)', J4: 'hsl(0,84%,60%)' };

function median(arr: number[]) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export default function Analysis() {
  const { data: records = [], isLoading } = useTrafficData();

  // Hourly trend (average by hour across all junctions)
  const hourlyData = useMemo(() => {
    const hourBuckets: Record<number, number[]> = {};
    records.forEach(r => {
      const h = new Date(r.timestamp).getHours();
      if (!hourBuckets[h]) hourBuckets[h] = [];
      hourBuckets[h].push(r.vehicle_count);
    });
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      avg: hourBuckets[h] ? Math.round(hourBuckets[h].reduce((a,b) => a+b,0) / hourBuckets[h].length) : 0,
    }));
  }, [records]);

  // Top 5 peak hours
  const peakHours = useMemo(() =>
    [...hourlyData].sort((a, b) => b.avg - a.avg).slice(0, 5),
    [hourlyData]
  );

  // Junction comparison
  const junctionData = useMemo(() => {
    const jBuckets: Record<string, Record<string, number[]>> = {};
    records.forEach(r => {
      if (!jBuckets[r.junction_id]) jBuckets[r.junction_id] = {};
      const dayKey = DAYS[new Date(r.timestamp).getDay()];
      if (!jBuckets[r.junction_id][dayKey]) jBuckets[r.junction_id][dayKey] = [];
      jBuckets[r.junction_id][dayKey].push(r.vehicle_count);
    });
    return DAYS.map(day => {
      const entry: Record<string, number | string> = { day };
      JUNCTIONS.forEach(j => {
        const vals = jBuckets[j]?.[day] ?? [];
        entry[j] = vals.length ? Math.round(vals.reduce((a,b) => a+b,0) / vals.length) : 0;
      });
      return entry;
    });
  }, [records]);

  // Day-of-week breakdown
  const dayData = useMemo(() => {
    const dayBuckets: Record<number, number[]> = {};
    records.forEach(r => {
      const d = new Date(r.timestamp).getDay();
      if (!dayBuckets[d]) dayBuckets[d] = [];
      dayBuckets[d].push(r.vehicle_count);
    });
    return DAYS.map((day, i) => ({
      day,
      avg: dayBuckets[i] ? Math.round(dayBuckets[i].reduce((a,b) => a+b,0) / dayBuckets[i].length) : 0,
    }));
  }, [records]);

  // Stats per junction
  const statsTable = useMemo(() => JUNCTIONS.map(j => {
    const vals = records.filter(r => r.junction_id === j).map(r => r.vehicle_count);
    if (!vals.length) return { junction: j, min: '-', max: '-', mean: '-', median: '-' };
    return {
      junction: j,
      min: Math.min(...vals),
      max: Math.max(...vals),
      mean: Math.round(vals.reduce((a,b) => a+b,0) / vals.length),
      median: median(vals),
    };
  }), [records]);

  const tooltipStyle = {
    contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' },
    labelStyle: { color: 'hsl(var(--foreground))' },
  };

  if (isLoading) return (
    <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">Loading analysis…</div>
  );

  if (records.length === 0) return (
    <div className="p-6 flex flex-col items-center justify-center h-64 text-center">
      <p className="text-muted-foreground text-sm">No data available. Please upload data on the Data Upload page first.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Traffic Analysis</h1>
        <p className="text-sm text-muted-foreground">Statistical breakdown of traffic patterns across junctions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Trend */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Hourly Traffic Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hourlyData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Avg Vehicles" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Top 5 Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={peakHours} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="avg" fill="hsl(38,92%,50%)" name="Avg Vehicles" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Junction Comparison */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Junction Comparison by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={junctionData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                {JUNCTIONS.map(j => (
                  <Bar key={j} dataKey={j} fill={COLORS[j as keyof typeof COLORS]} name={`Junction ${j}`} radius={[2,2,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Day of Week */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Day-of-Week Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dayData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="avg" fill="hsl(210,100%,56%)" name="Avg Vehicles" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stats Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Statistics Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  {['Junction','Min','Max','Mean','Median'].map(h => (
                    <TableHead key={h} className="text-muted-foreground text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsTable.map(row => (
                  <TableRow key={row.junction} className="border-border hover:bg-muted/20">
                    <TableCell className="text-xs font-mono text-primary font-semibold">{row.junction}</TableCell>
                    <TableCell className="text-xs font-mono">{row.min}</TableCell>
                    <TableCell className="text-xs font-mono">{row.max}</TableCell>
                    <TableCell className="text-xs font-mono">{row.mean}</TableCell>
                    <TableCell className="text-xs font-mono">{row.median}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
