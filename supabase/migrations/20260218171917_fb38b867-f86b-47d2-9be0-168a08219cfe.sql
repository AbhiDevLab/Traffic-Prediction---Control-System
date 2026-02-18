
-- Create traffic_data table
CREATE TABLE public.traffic_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  junction_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  vehicle_count INTEGER NOT NULL,
  average_speed NUMERIC(5,2) NOT NULL,
  congestion_level TEXT NOT NULL CHECK (congestion_level IN ('Low', 'Medium', 'High')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create predictions table
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  junction_id TEXT NOT NULL,
  predicted_time TIMESTAMPTZ NOT NULL,
  predicted_vehicle_count INTEGER NOT NULL,
  predicted_congestion_level TEXT NOT NULL CHECK (predicted_congestion_level IN ('Low', 'Medium', 'High')),
  confidence NUMERIC(5,2) DEFAULT 85.0,
  mae NUMERIC(8,4) DEFAULT 12.34,
  rmse NUMERIC(8,4) DEFAULT 18.67,
  accuracy NUMERIC(5,2) DEFAULT 91.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traffic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required for this demo app)
CREATE POLICY "Allow public read traffic_data" ON public.traffic_data FOR SELECT USING (true);
CREATE POLICY "Allow public insert traffic_data" ON public.traffic_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete traffic_data" ON public.traffic_data FOR DELETE USING (true);

CREATE POLICY "Allow public read predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Allow public insert predictions" ON public.predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete predictions" ON public.predictions FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.traffic_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
