export type CongestionLevel = 'Low' | 'Medium' | 'High';

export interface TrafficRecord {
  id?: string;
  junction_id: string;
  timestamp: string;
  vehicle_count: number;
  average_speed: number;
  congestion_level: CongestionLevel;
}

export interface Prediction {
  id?: string;
  junction_id: string;
  predicted_time: string;
  predicted_vehicle_count: number;
  predicted_congestion_level: CongestionLevel;
  confidence?: number;
  mae?: number;
  rmse?: number;
  accuracy?: number;
  created_at?: string;
}

const JUNCTIONS = ['J1', 'J2', 'J3', 'J4'];

function getCongestionLevel(vehicleCount: number): CongestionLevel {
  if (vehicleCount < 80) return 'Low';
  if (vehicleCount < 150) return 'Medium';
  return 'High';
}

function getHourlyBase(hour: number, junction: string): number {
  const bases: Record<string, number[]> = {
    J1: [30,20,15,12,14,28,65,120,180,160,140,130,150,145,135,140,170,190,175,150,120,90,70,45],
    J2: [25,15,10,8,10,22,55,100,160,140,120,115,135,130,120,125,155,170,160,135,105,80,60,38],
    J3: [35,25,18,14,16,32,72,135,195,175,155,145,165,158,148,155,182,205,188,162,130,98,76,50],
    J4: [20,12,8,6,8,18,48,88,140,125,108,102,120,115,106,112,138,152,142,120,96,72,54,32],
  };
  return bases[junction]?.[hour] ?? 50;
}

export function generateSampleData(): TrafficRecord[] {
  const records: TrafficRecord[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  JUNCTIONS.forEach(junction => {
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const date = new Date(sevenDaysAgo.getTime() + day * 24 * 60 * 60 * 1000);
        date.setHours(hour, 0, 0, 0);
        const base = getHourlyBase(hour, junction);
        const noise = Math.floor((Math.random() - 0.5) * 20);
        const dayFactor = [0.8, 1.0, 1.05, 1.1, 1.15, 1.2, 0.85][day] ?? 1;
        const vehicle_count = Math.max(5, Math.round((base + noise) * dayFactor));
        const speed = vehicle_count > 150 ? 15 + Math.random() * 10
          : vehicle_count > 80 ? 25 + Math.random() * 15
          : 40 + Math.random() * 20;

        records.push({
          junction_id: junction,
          timestamp: date.toISOString(),
          vehicle_count,
          average_speed: Math.round(speed * 10) / 10,
          congestion_level: getCongestionLevel(vehicle_count),
        });
      }
    }
  });

  return records;
}

export function classifyCongestion(vehicleCount: number): CongestionLevel {
  return getCongestionLevel(vehicleCount);
}

export function computeSignalTiming(congestion: CongestionLevel): { green: number; red: number } {
  if (congestion === 'High') return { green: 60, red: 20 };
  if (congestion === 'Medium') return { green: 35, red: 30 };
  return { green: 15, red: 45 };
}

export const FIXED_TIMING = { green: 30, red: 30 };

export function calcEfficiencyGain(congestion: CongestionLevel): number {
  const smart = computeSignalTiming(congestion);
  const throughputSmart = smart.green / (smart.green + smart.red);
  const throughputFixed = FIXED_TIMING.green / (FIXED_TIMING.green + FIXED_TIMING.red);
  return Math.round(((throughputSmart - throughputFixed) / throughputFixed) * 100);
}
