import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JUNCTIONS = [
  { id: "J1", city: "Lucknow",   lat: 26.8476, lon: 80.9462 },
  { id: "J2", city: "Sonipat",   lat: 28.9931, lon: 77.0151 },
  { id: "J3", city: "Delhi",     lat: 28.6315, lon: 77.2167 },
  { id: "J4", city: "Bangalore", lat: 12.9716, lon: 77.6076 },
];

function classifyCongestion(ratio: number): string {
  if (ratio < 0.5)  return "High";
  if (ratio < 0.75) return "Medium";
  return "Low";
}

/** Estimate vehicles from speed ratio: at ratio=0 → ~200, at ratio=1 → ~20 */
function estimateVehicles(ratio: number): number {
  return Math.round(20 + (1 - ratio) * 180);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOMTOM_API_KEY = Deno.env.get("TOMTOM_API_KEY");
    if (!TOMTOM_API_KEY) {
      return new Response(
        JSON.stringify({ error: "TOMTOM_API_KEY secret is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all 4 junctions in parallel
    const results = await Promise.allSettled(
      JUNCTIONS.map(async (junction) => {
        const url =
          `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` +
          `?point=${junction.lat},${junction.lon}&key=${TOMTOM_API_KEY}`;

        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`TomTom API error for ${junction.id}: ${res.status} ${text}`);
        }

        const json = await res.json();
        const flow = json?.flowSegmentData;
        if (!flow) throw new Error(`No flowSegmentData for ${junction.id}`);

        const currentSpeed: number = flow.currentSpeed ?? 0;
        const freeFlowSpeed: number = flow.freeFlowSpeed ?? 1;
        const ratio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;

        return {
          junction_id: junction.id,
          timestamp: new Date().toISOString(),
          vehicle_count: estimateVehicles(ratio),
          average_speed: Math.round(currentSpeed),
          congestion_level: classifyCongestion(ratio),
          // pass along for response
          city: junction.city,
          ratio: Math.round(ratio * 100) / 100,
        };
      })
    );

    const inserted: string[] = [];
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { city, ratio, ...row } = result.value;
        const { error } = await supabase.from("traffic_data").insert(row);
        if (error) {
          errors.push(`Insert failed for ${row.junction_id}: ${error.message}`);
        } else {
          inserted.push(`${city} (${row.congestion_level}, ${row.average_speed} km/h, ratio ${ratio})`);
        }
      } else {
        errors.push(result.reason?.message ?? String(result.reason));
      }
    }

    return new Response(
      JSON.stringify({
        success: inserted.length > 0,
        inserted,
        errors: errors.length ? errors : undefined,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-tomtom-traffic error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
