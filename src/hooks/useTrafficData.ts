import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TrafficRecord, Prediction } from "@/lib/sampleData";

const REFETCH_INTERVAL = 30_000; // 30 seconds

export interface Junction {
  id: string;
  city: string;
  location_name: string;
  latitude: number;
  longitude: number;
}

export function useJunctions() {
  return useQuery({
    queryKey: ['junctions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('junctions')
        .select('*')
        .order('id');
      if (error) throw error;
      return (data ?? []) as Junction[];
    },
    staleTime: Infinity, // junction metadata never changes
  });
}

export function useTrafficData(junctionId?: string) {
  return useQuery({
    queryKey: ['traffic_data', junctionId],
    queryFn: async () => {
      let query = supabase
        .from('traffic_data')
        .select('*')
        .order('timestamp', { ascending: true });

      if (junctionId && junctionId !== 'all') {
        query = query.eq('junction_id', junctionId);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return (data ?? []) as TrafficRecord[];
    },
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function usePredictions() {
  return useQuery({
    queryKey: ['predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Prediction[];
    },
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useTrafficStats() {
  return useQuery({
    queryKey: ['traffic_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_data')
        .select('vehicle_count, junction_id, congestion_level, timestamp')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const records = data ?? [];
      const totalVehicles = records.reduce((s, r) => s + (r.vehicle_count ?? 0), 0);
      const junctionIds = [...new Set(records.map(r => r.junction_id))];
      const congestionCounts = records.reduce((acc, r) => {
        acc[r.congestion_level] = (acc[r.congestion_level] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const avgCongestionScore = records.length
        ? records.reduce((s, r) => {
            const score = r.congestion_level === 'High' ? 3 : r.congestion_level === 'Medium' ? 2 : 1;
            return s + score;
          }, 0) / records.length
        : 0;

      return { totalVehicles, activeJunctions: junctionIds.length, avgCongestionScore, congestionCounts, totalRecords: records.length };
    },
    refetchInterval: REFETCH_INTERVAL,
  });
}
