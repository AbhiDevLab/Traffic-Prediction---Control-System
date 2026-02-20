
-- Create junctions metadata table
CREATE TABLE public.junctions (
  id TEXT NOT NULL PRIMARY KEY,
  city TEXT NOT NULL,
  location_name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read-only, no auth required)
ALTER TABLE public.junctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Junctions are publicly readable"
ON public.junctions
FOR SELECT
USING (true);
