
## TomTom Real Traffic Integration — Lucknow, Sonipat, Delhi, Bangalore

### What This Does
Replaces the synthetic/seeded dummy data with live traffic congestion data fetched from TomTom's Traffic Flow API for 4 real Indian city junctions. The dashboard, analysis, and predictions pages will all reflect actual road conditions.

---

### Junction Locations (Real Coordinates)

| Junction ID | City      | Location                              | Coordinates              |
|-------------|-----------|---------------------------------------|--------------------------|
| J1          | Lucknow   | Hazratganj Chauraha (busy CBD cross)  | 26.8476° N, 80.9462° E  |
| J2          | Sonipat   | Sabzi Mandi Chowk (main city cross)   | 28.9931° N, 77.0151° E  |
| J3          | Delhi     | Connaught Place Roundabout            | 28.6315° N, 77.2167° E  |
| J4          | Bangalore | MG Road / Trinity Circle              | 12.9716° N, 77.6076° E  |

---

### How TomTom Congestion Works

TomTom's Traffic Flow API returns for each coordinate:
- `currentSpeed` — actual live speed (km/h)
- `freeFlowSpeed` — normal speed with no traffic (km/h)
- A ratio: `currentSpeed / freeFlowSpeed`

Congestion is classified as:
```
ratio < 0.5  → High   (less than half the normal speed)
ratio < 0.75 → Medium (75% of normal speed)
ratio >= 0.75 → Low   (near free-flow conditions)
```

Vehicle count is estimated from the speed ratio (inverse relationship — slower = more vehicles).

---

### Architecture

```text
[TomTom Traffic Flow API]
        |
        | (HTTPS GET — once per 5 minutes)
        v
[Backend Edge Function: fetch-tomtom-traffic]
        |
        | Stores computed records
        v
[traffic_data table in database]
        |
        | (existing hooks, 30s polling)
        v
[Dashboard / Analysis / Predictions UI]
```

---

### Technical Implementation Plan

#### Step 1 — Securely Store the API Key
- Store the TomTom API key as a backend secret named `TOMTOM_API_KEY`
- Never exposed in frontend code

#### Step 2 — Create Backend Edge Function: `fetch-tomtom-traffic`
- A backend function that accepts a POST or GET request
- Calls TomTom Traffic Flow API for all 4 junction coordinates simultaneously
- Parses `currentSpeed` and `freeFlowSpeed` from the response
- Calculates congestion level (Low/Medium/High) from the speed ratio
- Estimates vehicle count from the ratio (inverse formula)
- Inserts a new row into `traffic_data` for each junction with:
  - `junction_id`: J1–J4
  - `timestamp`: current UTC time
  - `vehicle_count`: estimated from speed ratio
  - `average_speed`: `currentSpeed` directly from TomTom
  - `congestion_level`: computed from ratio

#### Step 3 — Add a `junctions` metadata table (migration)
- Stores junction name, city, latitude, longitude for each J1–J4
- Used by the map component and tooltip labels
- No RLS needed (public read-only reference data)

#### Step 4 — Add "Fetch Live Traffic" Button to Dashboard
- A button labeled "Fetch Live Traffic" in the Dashboard header
- Calls the backend edge function on demand
- Shows a loading spinner while fetching
- Shows a success toast: "Live traffic fetched for Lucknow, Sonipat, Delhi, Bangalore"
- Auto-schedules fetch every 5 minutes via the dashboard

#### Step 5 — Rename Junctions Throughout the UI
- Update labels from "J1/J2/J3/J4" to "Lucknow / Sonipat / Delhi / Bangalore" in:
  - Dashboard KPI cards
  - Junction Status cards (bottom section)
  - Traffic Trend chart legend
  - Analysis page junction comparison chart
  - Signal Control page

#### Step 6 — Add a Live Traffic Map Panel
- Add an interactive map card to the Dashboard using **Leaflet.js** (free, no extra key needed)
- Shows 4 city pins color-coded by live congestion:
  - Red pin = High
  - Yellow pin = Medium
  - Green pin = Low
- Clicking a pin shows a popup: city name, current speed, congestion level

---

### What Stays the Same
- All existing charts and hooks continue working unchanged
- The `traffic_data` table schema is unchanged (no migration needed for the table itself)
- Seeded/historical data still visible in Analysis page

---

### Files to Create / Modify

| File | Action |
|------|--------|
| `supabase/functions/fetch-tomtom-traffic/index.ts` | Create — edge function |
| `supabase/migrations/xxx_junctions_table.sql` | Create — junctions metadata table |
| `src/pages/Dashboard.tsx` | Update — add fetch button, map panel, rename junctions |
| `src/components/TrafficMap.tsx` | Create — Leaflet map with junction pins |
| `src/hooks/useTrafficData.ts` | Update — add `useJunctions` hook for metadata |

---

### Prerequisites Before Implementation
You need to share the TomTom API key — once you do, I will:
1. Store it as a secure backend secret
2. Build and deploy the edge function
3. Update the dashboard UI

The free TomTom tier gives **2,500 requests/day** — at one fetch per 5 minutes that's 288 requests/day (well within limits).
