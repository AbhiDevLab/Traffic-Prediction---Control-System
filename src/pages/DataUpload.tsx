import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CongestionBadge } from "@/components/CongestionBadge";
import { Upload, FileSpreadsheet, CheckCircle, Circle, Loader, Database, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateSampleData, TrafficRecord, classifyCongestion } from "@/lib/sampleData";
import { useQueryClient } from "@tanstack/react-query";

type PipelineStep = 'idle' | 'upload' | 'parse' | 'extract' | 'store' | 'done' | 'error';

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'parse', label: 'Parse' },
  { key: 'extract', label: 'Feature Extract' },
  { key: 'store', label: 'Store' },
  { key: 'done', label: 'Ready' },
];

function stepIndex(step: PipelineStep): number {
  return STEPS.findIndex(s => s.key === step);
}

function parseCSV(text: string): TrafficRecord[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });

    const vehicle_count = parseInt(obj['vehicle_count'] || obj['vehiclecount'] || '0');
    const congestion_level = (obj['congestion_level'] || obj['congestionlevel'] || classifyCongestion(vehicle_count));

    return {
      junction_id: obj['junction_id'] || obj['junctionid'] || 'J1',
      timestamp: obj['timestamp'] || new Date().toISOString(),
      vehicle_count,
      average_speed: parseFloat(obj['average_speed'] || obj['averagespeed'] || '40'),
      congestion_level: ['Low','Medium','High'].includes(congestion_level) ? congestion_level as 'Low'|'Medium'|'High' : classifyCongestion(vehicle_count),
    };
  }).filter(r => r.vehicle_count > 0);
}

export default function DataUpload() {
  const [pipeline, setPipeline] = useState<PipelineStep>('idle');
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<TrafficRecord[]>([]);
  const [features, setFeatures] = useState<Record<string, number | string> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processRecords = async (records: TrafficRecord[]) => {
    setPipeline('parse');
    setProgress(20);
    await new Promise(r => setTimeout(r, 400));

    setPreviewData(records.slice(0, 20));

    setPipeline('extract');
    setProgress(50);
    await new Promise(r => setTimeout(r, 500));

    // Extract features
    const counts = records.map(r => r.vehicle_count);
    setFeatures({
      total_records: records.length,
      min_vehicles: Math.min(...counts),
      max_vehicles: Math.max(...counts),
      avg_vehicles: Math.round(counts.reduce((a,b) => a+b, 0) / counts.length),
      unique_junctions: [...new Set(records.map(r => r.junction_id))].join(', '),
      high_congestion_pct: `${Math.round(records.filter(r => r.congestion_level === 'High').length / records.length * 100)}%`,
    });

    setPipeline('store');
    setProgress(75);

    // Store in batches of 100
    const chunks = [];
    for (let i = 0; i < records.length; i += 100) chunks.push(records.slice(i, i + 100));
    for (const chunk of chunks) {
      const { error } = await supabase.from('traffic_data').insert(chunk);
      if (error) { throw new Error(error.message); }
    }

    setProgress(100);
    setPipeline('done');
    await queryClient.invalidateQueries({ queryKey: ['traffic_data'] });
    await queryClient.invalidateQueries({ queryKey: ['traffic_stats'] });

    toast({ title: "Data uploaded successfully", description: `${records.length} records stored.` });
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }
    setPipeline('upload');
    setProgress(10);
    try {
      const text = await file.text();
      const records = parseCSV(text);
      if (records.length === 0) throw new Error('No valid records found in CSV');
      await processRecords(records);
    } catch (e) {
      setPipeline('error');
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    }
  }, [toast, queryClient]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const loadSampleData = async () => {
    setPipeline('upload');
    setProgress(10);
    try {
      const records = generateSampleData();
      await processRecords(records);
    } catch (e) {
      setPipeline('error');
      toast({ title: "Error seeding data", description: (e as Error).message, variant: "destructive" });
    }
  };

  const clearData = async () => {
    await supabase.from('traffic_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await queryClient.invalidateQueries();
    setPipeline('idle');
    setPreviewData([]);
    setFeatures(null);
    setProgress(0);
    toast({ title: "Data cleared" });
  };

  const downloadSampleCSV = () => {
    const sample = generateSampleData().slice(0, 50);
    const header = 'junction_id,timestamp,vehicle_count,average_speed,congestion_level';
    const rows = sample.map(r => `${r.junction_id},${r.timestamp},${r.vehicle_count},${r.average_speed},${r.congestion_level}`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample_traffic_data.csv'; a.click();
  };

  const currentStepIdx = stepIndex(pipeline);
  const isBusy = ['upload','parse','extract','store'].includes(pipeline);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Data Upload & Processing</h1>
        <p className="text-sm text-muted-foreground">Upload traffic CSV data or load the sample dataset</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">CSV Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/20'
                }`}
              >
                <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm text-foreground font-medium">Drag & drop your CSV file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <p className="text-xs text-muted-foreground mt-2 opacity-60">
                  Columns: junction_id, timestamp, vehicle_count, average_speed, congestion_level
                </p>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={loadSampleData} disabled={isBusy} className="gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Load Sample Dataset
                </Button>
                <Button variant="outline" size="sm" onClick={downloadSampleCSV} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download Sample CSV
                </Button>
                <Button variant="outline" size="sm" onClick={clearData} disabled={isBusy} className="gap-1.5 text-traffic-high hover:text-traffic-high">
                  <Trash2 className="w-3.5 h-3.5" /> Clear All Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Visualization */}
          {pipeline !== 'idle' && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">Processing Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} className="h-2" />
                <div className="flex items-center gap-0">
                  {STEPS.map((step, idx) => {
                    const isDone = pipeline === 'done' || (currentStepIdx > idx);
                    const isActive = currentStepIdx === idx && pipeline !== 'done';
                    return (
                      <div key={step.key} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-colors ${
                            pipeline === 'error' && isActive ? 'border-traffic-high bg-traffic-high/20 text-traffic-high'
                            : isDone ? 'border-traffic-low bg-traffic-low/20 text-traffic-low'
                            : isActive ? 'border-primary bg-primary/20 text-primary'
                            : 'border-border bg-muted/30 text-muted-foreground'
                          }`}>
                            {isDone ? <CheckCircle className="w-4 h-4" />
                              : isActive ? <Loader className="w-3.5 h-3.5 animate-spin" />
                              : <Circle className="w-3 h-3" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight whitespace-nowrap">{step.label}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 mb-4 ${isDone ? 'bg-traffic-low/50' : 'bg-border'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Features panel */}
        <div className="space-y-4">
          {features ? (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" /> Extracted Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(features).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-mono text-foreground">{v}</span>
                  </div>
                ))}
                <Badge className="mt-2 bg-traffic-low/20 text-traffic-low border-traffic-low/40 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Ready for analysis
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Features will appear here after upload</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Data Preview Table */}
      {previewData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Data Preview (first 20 rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Junction</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Timestamp</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Vehicles</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Avg Speed</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Hour</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Day</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Congestion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((r, i) => {
                  const d = new Date(r.timestamp);
                  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                  return (
                    <TableRow key={i} className="border-border hover:bg-muted/20">
                      <TableCell className="text-xs font-mono text-primary">{r.junction_id}</TableCell>
                      <TableCell className="text-xs text-foreground">{d.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-mono">{r.vehicle_count}</TableCell>
                      <TableCell className="text-xs font-mono">{r.average_speed}</TableCell>
                      <TableCell className="text-xs font-mono">{d.getHours()}:00</TableCell>
                      <TableCell className="text-xs">{days[d.getDay()]}</TableCell>
                      <TableCell><CongestionBadge level={r.congestion_level} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
