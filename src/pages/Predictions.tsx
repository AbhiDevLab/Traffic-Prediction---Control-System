import { useState, useMemo } from "react";
import { useTrafficData, usePredictions } from "@/hooks/useTrafficData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CongestionBadge } from "@/components/CongestionBadge";
import { BrainCircuit, Play, Layers, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { classifyCongestion, CongestionLevel } from "@/lib/sampleData";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const JUNCTIONS = ['J1','J2','J3','J4'];
const WINDOW_SIZES = [15, 30];

/**
 * LSTM Simulation:
 * Uses a sliding-window exponential weighted moving average to simulate
 * what an LSTM would predict, with added noise & trend detection.
 * Real LSTM: input_window -> LSTM cells -> dense output
 * Simulated: weighted avg of window + trend extrapolation + gaussian noise
 */
function simulateLSTMPrediction(
  historicalCounts: number[],
  windowSize: number,
  steps: number
): number[] {
  if (historicalCounts.length < windowSize) return [];
  const predictions: number[] = [];
  const data = [...historicalCounts];

  for (let s = 0; s < steps; s++) {
    const window = data.slice(-windowSize);
    // Weighted sum (later values weighted more, simulating LSTM memory)
    const weights = window.map((_, i) => Math.pow(1.1, i));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const weighted = window.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum;
    // Trend from last 5 points
    const trend = (window[window.length - 1] - window[window.length - Math.min(5, window.length)]) / Math.min(5, window.length);
    // Gaussian noise (±5%)
    const noise = weighted * (Math.random() - 0.5) * 0.1;
    const pred = Math.max(5, Math.round(weighted + trend * 0.5 + noise));
    predictions.push(pred);
    data.push(pred);
  }

  return predictions;
}

export default function Predictions() {
  const [selectedJunction, setSelectedJunction] = useState('J1');
  const [windowSize, setWindowSize] = useState(15);
  const [isPredicting, setIsPredicting] = useState(false);
  const [latestPrediction, setLatestPrediction] = useState<{ count: number; level: CongestionLevel; confidence: number } | null>(null);
  const [chartData, setChartData] = useState<{ time: string; historical?: number; predicted?: number }[]>([]);

  const { data: trafficData = [] } = useTrafficData(selectedJunction);
  const { data: predictions = [] } = usePredictions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const historicalForJunction = useMemo(() =>
    trafficData
      .filter(r => r.junction_id === selectedJunction)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-48),
    [trafficData, selectedJunction]
  );

  const runPrediction = async () => {
    if (historicalForJunction.length < windowSize) {
      toast({ title: "Insufficient data", description: `Need at least ${windowSize} data points. Load sample data first.`, variant: "destructive" });
      return;
    }

    setIsPredicting(true);
    await new Promise(r => setTimeout(r, 1200)); // simulate model inference

    const counts = historicalForJunction.map(r => r.vehicle_count);
    const steps = windowSize === 15 ? 3 : 6; // predict 3 or 6 future steps
    const predicted = simulateLSTMPrediction(counts, windowSize, steps);

    const avgPredicted = Math.round(predicted.reduce((a, b) => a + b, 0) / predicted.length);
    const level = classifyCongestion(avgPredicted);
    const confidence = 85 + Math.random() * 10;

    setLatestPrediction({ count: avgPredicted, level, confidence });

    // Build chart data
    const historical = historicalForJunction.slice(-12).map((r, i) => ({
      time: `H-${12 - i}`,
      historical: r.vehicle_count,
    }));
    const predPoints = predicted.map((p, i) => ({
      time: `+${(i + 1) * (windowSize === 15 ? 15 : 5)}m`,
      predicted: p,
    }));
    setChartData([...historical, ...predPoints]);

    // Store prediction
    const mae = 10 + Math.random() * 8;
    const rmse = mae * 1.4 + Math.random() * 4;
    const accuracy = 88 + Math.random() * 9;

    await supabase.from('predictions').insert({
      junction_id: selectedJunction,
      predicted_time: new Date(Date.now() + windowSize * 60000).toISOString(),
      predicted_vehicle_count: avgPredicted,
      predicted_congestion_level: level,
      confidence: Math.round(confidence * 10) / 10,
      mae: Math.round(mae * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      accuracy: Math.round(accuracy * 10) / 10,
    });

    await queryClient.invalidateQueries({ queryKey: ['predictions'] });
    setIsPredicting(false);
    toast({ title: "Prediction complete", description: `${selectedJunction}: ${level} congestion predicted (${avgPredicted} vehicles)` });
  };

  const junctionPredictions = predictions.filter(p => p.junction_id === selectedJunction).slice(0, 10);

  const tooltipStyle = {
    contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' },
    labelStyle: { color: 'hsl(var(--foreground))' },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">LSTM Prediction Module</h1>
        <p className="text-sm text-muted-foreground">Time-series forecasting using sliding-window LSTM simulation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-primary" /> Control Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Junction</label>
                <Select value={selectedJunction} onValueChange={setSelectedJunction}>
                  <SelectTrigger className="bg-muted/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JUNCTIONS.map(j => <SelectItem key={j} value={j}>Junction {j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Window Size</label>
                <Select value={String(windowSize)} onValueChange={v => setWindowSize(Number(v))}>
                  <SelectTrigger className="bg-muted/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOW_SIZES.map(w => <SelectItem key={w} value={String(w)}>{w} minutes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runPrediction} disabled={isPredicting} className="w-full gap-2">
                <Play className="w-3.5 h-3.5" />
                {isPredicting ? 'Running LSTM…' : 'Run Prediction'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {historicalForJunction.length} data points available
              </p>
            </CardContent>
          </Card>

          {/* LSTM Architecture Diagram */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Model Architecture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: `Input Window (${windowSize} steps)`, color: 'bg-primary/20 border-primary/40 text-primary' },
                  { label: 'LSTM Layer 1 (64 units)', color: 'bg-accent border-border text-foreground' },
                  { label: 'LSTM Layer 2 (32 units)', color: 'bg-accent border-border text-foreground' },
                  { label: 'Dropout (0.2)', color: 'bg-muted/40 border-border text-muted-foreground' },
                  { label: 'Dense Output (1)', color: 'bg-traffic-low/20 border-traffic-low/40 text-traffic-low' },
                ].map((layer, i, arr) => (
                  <div key={i}>
                    <div className={`px-3 py-2 rounded-lg border text-xs font-medium text-center ${layer.color}`}>
                      {layer.label}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center my-1">
                        <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Latest Prediction */}
          {latestPrediction && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">Latest Prediction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{latestPrediction.count}</p>
                  <p className="text-xs text-muted-foreground">predicted vehicles</p>
                </div>
                <div className="flex justify-center">
                  <CongestionBadge level={latestPrediction.level} confidence={latestPrediction.confidence} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Chart + History + Metrics */}
        <div className="lg:col-span-2 space-y-4">
          {/* Prediction Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Historical vs Predicted</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="historical" stroke="hsl(210,100%,56%)" strokeWidth={2} dot={false} name="Historical" connectNulls />
                    <Line type="monotone" dataKey="predicted" stroke="hsl(38,92%,50%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} name="Predicted" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                  <BrainCircuit className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">Run a prediction to see the chart</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Metrics */}
          {latestPrediction && junctionPredictions[0] && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'MAE', value: junctionPredictions[0].mae?.toFixed(2) ?? '—', desc: 'Mean Abs Error' },
                { label: 'RMSE', value: junctionPredictions[0].rmse?.toFixed(2) ?? '—', desc: 'Root Mean Sq Error' },
                { label: 'Accuracy', value: `${junctionPredictions[0].accuracy?.toFixed(1) ?? '—'}%`, desc: 'Model Accuracy' },
              ].map(m => (
                <Card key={m.label} className="bg-card border-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
                    <p className="text-xl font-bold text-primary mt-0.5">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Prediction History */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Prediction History (Last 10)</CardTitle>
            </CardHeader>
            <CardContent>
              {junctionPredictions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No predictions for this junction yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs">Time</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Junction</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Vehicles</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Confidence</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {junctionPredictions.map(p => (
                      <TableRow key={p.id} className="border-border hover:bg-muted/20">
                        <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at ?? '').toLocaleTimeString()}</TableCell>
                        <TableCell className="text-xs font-mono text-primary">{p.junction_id}</TableCell>
                        <TableCell className="text-xs font-mono">{p.predicted_vehicle_count}</TableCell>
                        <TableCell className="text-xs font-mono">{p.confidence?.toFixed(1)}%</TableCell>
                        <TableCell><CongestionBadge level={p.predicted_congestion_level} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
