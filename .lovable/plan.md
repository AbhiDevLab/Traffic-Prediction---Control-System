
## Intelligent Traffic Prediction & Control System

### App Overview
A professional, dark-themed traffic management dashboard that demonstrates time-series forecasting, smart signal control simulation, and real-time analytics — all in one cohesive full-stack React application.

---

### 🎨 Design & Layout
- **Dark command-center theme** — deep navy/dark backgrounds with blue, green, and amber accent colors to indicate congestion levels
- **Sidebar navigation** with sections: Dashboard, Data Upload, Analysis, Predictions, Signal Control
- **Responsive grid layout** — adapts from wide desktop monitors to tablets
- **Status bar** at the top showing system health, active junctions, and last update time

---

### 📊 Page 1: Main Dashboard
- **4 KPI cards** at the top: Total Vehicles Monitored, Active Junctions, Average Congestion Level, Predictions Made Today
- **Live traffic trend line chart** — shows vehicle count over the last 24 hours across junctions (animated)
- **Congestion heatmap grid** — color-coded cells (green/yellow/red) per junction per hour
- **Peak hour indicator** — highlights the busiest hour with a badge
- **Quick junction selector** — dropdown to filter data by junction ID

---

### 📁 Page 2: Data Upload & Processing
- **CSV drag-and-drop upload area** with file validation
- **Data preview table** — shows first 20 rows after upload with columns: timestamp, junction ID, vehicle count, average speed, congestion level
- **Processing pipeline visualization** — step-by-step status indicators (Upload → Parse → Feature Extract → Store → Ready)
- **Extracted features display** — shows computed hour, day-of-week, vehicle count statistics
- **Sample dataset** — pre-loaded seed data so the app works immediately without uploading

---

### 📈 Page 3: Traffic Analysis
- **Hourly traffic trend graph** — line chart showing traffic patterns by hour of day (averaged across all days)
- **Peak hour detection panel** — bar chart highlighting top 5 busiest hours
- **Junction comparison chart** — grouped bar chart comparing vehicle counts across all junctions (Junction 1–4)
- **Day-of-week breakdown** — shows which days have highest/lowest traffic
- **Statistics summary table** — min, max, mean, median vehicle counts per junction

---

### 🤖 Page 4: LSTM Prediction Module
- **Prediction control panel** — select junction, set window size (15 or 30 minutes), trigger prediction
- **LSTM simulation explanation** — visual diagram showing sliding window → LSTM layers → output (educational)
- **Prediction output chart** — dual-line chart showing historical (solid) vs predicted (dashed) vehicle counts
- **Congestion classification badge** — color-coded Low / Medium / High result with confidence percentage
- **Prediction history table** — last 10 predictions with timestamp, junction, predicted count, actual congestion level
- **Model metrics display** — simulated MAE, RMSE, accuracy scores

---

### 🚦 Page 5: Smart Signal Timing Simulation
- **Junction signal visualizer** — animated traffic light component showing current signal state (red/yellow/green)
- **Fixed vs Smart timing comparison** — side-by-side bar chart
  - Fixed: always 30s green, 30s red
  - Smart: dynamically adjusted based on congestion (High → 60s green, Low → 15s green)
- **Signal timing calculator** — input congestion level and see computed green/red timing in real-time
- **Simulation runner** — press "Run Simulation" to animate a 1-minute cycle comparing both approaches
- **Efficiency gain metric** — shows percentage improvement in throughput with smart timing

---

### 🗄️ Data & Backend
- **Supabase integration** with two tables:
  - `traffic_data`: junction_id, timestamp, vehicle_count, average_speed, congestion_level
  - `predictions`: junction_id, predicted_time, predicted_vehicle_count, predicted_congestion_level
- **Pre-seeded sample dataset** with realistic traffic data across 4 junctions over 7 days
- **CSV import** stores parsed data directly to Supabase
- **All charts** pull from live Supabase data

---

### 🔧 Technical Structure
- Modular page-per-feature architecture with shared components
- Reusable chart components (TrafficLineChart, CongestionHeatmap, JunctionCompare)
- Custom hooks for data fetching (useTrafficData, usePredictions, useSignalSimulation)
- Environment-based configuration
- Type-safe TypeScript throughout
- Toast notifications for upload success, prediction completion, errors
