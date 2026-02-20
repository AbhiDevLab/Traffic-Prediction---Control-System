import { useEffect, useRef } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface JunctionMapData {
  id: string;
  city: string;
  location_name: string;
  lat: number;
  lon: number;
  congestion_level?: string;
  average_speed?: number;
  vehicle_count?: number;
}

interface Props {
  junctions: JunctionMapData[];
}

function congestionColor(level?: string) {
  if (level === "High")   return "#ef4444";
  if (level === "Medium") return "#f59e0b";
  return "#22c55e";
}

export function TrafficMap({ junctions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<LeafletMap | null>(null);
  const markersRef  = useRef<CircleMarker[]>([]);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import so SSR-safe (not an issue here but good practice)
    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [22, 79],   // centre of India
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers whenever junction data changes
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      // Remove old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      junctions.forEach(j => {
        const color = congestionColor(j.congestion_level);
        const marker = L.circleMarker([j.lat, j.lon], {
          radius: 14,
          fillColor: color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        });

        const speedLine = j.average_speed !== undefined
          ? `<br/><span style="color:#94a3b8">Speed: ${j.average_speed} km/h</span>`
          : "";
        const vehicleLine = j.vehicle_count !== undefined
          ? `<br/><span style="color:#94a3b8">Vehicles: ~${j.vehicle_count}</span>`
          : "";

        marker.bindPopup(
          `<div style="font-family:system-ui;min-width:140px">
            <strong style="font-size:14px">${j.city}</strong>
            <br/><span style="color:#94a3b8;font-size:12px">${j.location_name}</span>
            <br/><br/>
            <span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">
              ${j.congestion_level ?? "No data"}
            </span>
            ${speedLine}${vehicleLine}
          </div>`,
          { maxWidth: 200 }
        );

        marker.addTo(mapRef.current!);
        markersRef.current.push(marker);
      });
    });
  }, [junctions]);

  return (
    <div
      ref={containerRef}
      style={{ height: "340px", width: "100%", borderRadius: "0.5rem" }}
    />
  );
}
