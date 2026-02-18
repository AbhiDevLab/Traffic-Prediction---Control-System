import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { CongestionBadge } from "@/components/CongestionBadge";
import { Play, Square, Zap, Timer } from "lucide-react";
import { computeSignalTiming, FIXED_TIMING, calcEfficiencyGain, CongestionLevel } from "@/lib/sampleData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type SignalState = 'green' | 'yellow' | 'red';

interface TrafficLightProps {
  state: SignalState;
  label: string;
  greenTime: number;
  redTime: number;
}

function TrafficLight({ state, label, greenTime, redTime }: TrafficLightProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="bg-secondary/60 border border-border rounded-xl p-3 flex flex-col items-center gap-2 w-16">
        {(['red', 'yellow', 'green'] as SignalState[]).map(color => {
          const active = state === color;
          const colorMap = {
            red: { on: 'bg-traffic-high', off: 'bg-traffic-high/15', glow: 'shadow-[0_0_12px_hsl(0,84%,60%)]' },
            yellow: { on: 'bg-traffic-medium', off: 'bg-traffic-medium/15', glow: 'shadow-[0_0_12px_hsl(38,92%,50%)]' },
            green: { on: 'bg-traffic-low', off: 'bg-traffic-low/15', glow: 'shadow-[0_0_12px_hsl(142,71%,45%)]' },
          };
          return (
            <div
              key={color}
              className={`w-9 h-9 rounded-full transition-all duration-300 ${active ? `${colorMap[color].on} ${colorMap[color].glow} animate-signal` : colorMap[color].off}`}
            />
          );
        })}
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">🟢 {greenTime}s  🔴 {redTime}s</p>
      </div>
    </div>
  );
}

const CONGESTION_LEVELS: CongestionLevel[] = ['Low', 'Medium', 'High'];
const JUNCTIONS = ['J1', 'J2', 'J3', 'J4'];

export default function SignalControl() {
  const [selectedJunction, setSelectedJunction] = useState('J1');
  const [manualCongestion, setManualCongestion] = useState<CongestionLevel>('Medium');
  const [vehicleInput, setVehicleInput] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [fixedState, setFixedState] = useState<SignalState>('green');
  const [smartState, setSmartState] = useState<SignalState>('green');
  const [elapsed, setElapsed] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const smartTiming = computeSignalTiming(manualCongestion);
  const effGain = calcEfficiencyGain(manualCongestion);

  const getFixedSignalState = useCallback((t: number): SignalState => {
    const cycle = t % (FIXED_TIMING.green + FIXED_TIMING.red);
    if (cycle < FIXED_TIMING.green - 3) return 'green';
    if (cycle < FIXED_TIMING.green) return 'yellow';
    return 'red';
  }, []);

  const getSmartSignalState = useCallback((t: number): SignalState => {
    const total = smartTiming.green + smartTiming.red;
    const cycle = t % total;
    if (cycle < smartTiming.green - 3) return 'green';
    if (cycle < smartTiming.green) return 'yellow';
    return 'red';
  }, [smartTiming]);

  const startSimulation = () => {
    setIsRunning(true);
    setElapsed(0);
    setCyclesCompleted(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        setFixedState(getFixedSignalState(next));
        setSmartState(getSmartSignalState(next));
        const totalFixed = FIXED_TIMING.green + FIXED_TIMING.red;
        if (next % totalFixed === 0) setCyclesCompleted(c => c + 1);
        if (next >= 120) {
          clearInterval(timerRef.current);
          setIsRunning(false);
        }
        return next;
      });
    }, 200); // 5x speed
  };

  const stopSimulation = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setFixedState('green');
    setSmartState('green');
    setElapsed(0);
    setCyclesCompleted(0);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Auto-classify vehicle count
  const derivedCongestion: CongestionLevel = vehicleInput < 80 ? 'Low' : vehicleInput < 150 ? 'Medium' : 'High';

  const comparisonData = CONGESTION_LEVELS.map(level => {
    const smart = computeSignalTiming(level);
    return {
      level,
      'Fixed Green': FIXED_TIMING.green,
      'Smart Green': smart.green,
      'Fixed Red': FIXED_TIMING.red,
      'Smart Red': smart.red,
    };
  });

  const tooltipStyle = {
    contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' },
    labelStyle: { color: 'hsl(var(--foreground))' },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Smart Signal Timing Simulation</h1>
        <p className="text-sm text-muted-foreground">Compare fixed vs. AI-driven adaptive signal control</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Configuration</CardTitle>
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
                <label className="text-xs text-muted-foreground font-medium">Congestion Level</label>
                <Select value={manualCongestion} onValueChange={v => setManualCongestion(v as CongestionLevel)}>
                  <SelectTrigger className="bg-muted/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONGESTION_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Vehicle Count: {vehicleInput}</label>
                <Slider
                  value={[vehicleInput]}
                  onValueChange={([v]) => {
                    setVehicleInput(v);
                    setManualCongestion(v < 80 ? 'Low' : v < 150 ? 'Medium' : 'High');
                  }}
                  min={10} max={250} step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>10</span><span>250</span>
                </div>
                <CongestionBadge level={derivedCongestion} />
              </div>

              <div className="flex gap-2">
                <Button onClick={startSimulation} disabled={isRunning} size="sm" className="flex-1 gap-1.5">
                  <Play className="w-3.5 h-3.5" /> Run
                </Button>
                <Button onClick={stopSimulation} disabled={!isRunning} variant="outline" size="sm" className="flex-1 gap-1.5">
                  <Square className="w-3.5 h-3.5" /> Stop
                </Button>
              </div>

              {isRunning && (
                <div className="text-xs text-muted-foreground text-center space-y-0.5">
                  <p>Elapsed: {elapsed}s (simulated)</p>
                  <p>Cycles: {cyclesCompleted}</p>
                  <p className="text-[10px] opacity-60">Running at 5× speed</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signal Timing Calculator */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" /> Timing Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fixed Green</span>
                  <span className="font-mono text-foreground">{FIXED_TIMING.green}s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fixed Red</span>
                  <span className="font-mono text-foreground">{FIXED_TIMING.red}s</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Smart Green</span>
                  <span className="font-mono font-semibold text-traffic-low">{smartTiming.green}s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Smart Red</span>
                  <span className="font-mono font-semibold text-traffic-high">{smartTiming.red}s</span>
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg border text-center ${effGain >= 0 ? 'bg-traffic-low/10 border-traffic-low/40' : 'bg-traffic-high/10 border-traffic-high/40'}`}>
                <div className="flex items-center justify-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${effGain >= 0 ? 'text-traffic-low' : 'text-traffic-high'}`} />
                  <span className={`text-sm font-bold ${effGain >= 0 ? 'text-traffic-low' : 'text-traffic-high'}`}>
                    {effGain >= 0 ? '+' : ''}{effGain}% throughput
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">vs fixed timing</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Traffic Light Visualizer */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">Signal Visualizer</CardTitle>
                {isRunning && (
                  <Badge className="bg-traffic-low/20 text-traffic-low border-traffic-low/40 animate-pulse-slow text-xs">
                    LIVE
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-around py-4">
                <TrafficLight
                  state={fixedState}
                  label="Fixed Timing"
                  greenTime={FIXED_TIMING.green}
                  redTime={FIXED_TIMING.red}
                />
                <div className="text-center px-4">
                  <p className="text-xs text-muted-foreground mb-1">vs</p>
                  <CongestionBadge level={manualCongestion} />
                </div>
                <TrafficLight
                  state={smartState}
                  label="Smart Timing"
                  greenTime={smartTiming.green}
                  redTime={smartTiming.red}
                />
              </div>
            </CardContent>
          </Card>

          {/* Comparison Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Fixed vs Smart Timing Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={comparisonData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="level" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="Fixed Green" fill="hsl(142,71%,45%)" opacity={0.5} radius={[2,2,0,0]} />
                  <Bar dataKey="Smart Green" fill="hsl(142,71%,45%)" radius={[2,2,0,0]} />
                  <Bar dataKey="Fixed Red" fill="hsl(0,84%,60%)" opacity={0.5} radius={[2,2,0,0]} />
                  <Bar dataKey="Smart Red" fill="hsl(0,84%,60%)" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center mt-2">Faded = Fixed, Solid = Smart</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
