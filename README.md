# Traffic Prediction & Control System

This repository contains the frontend for a traffic prediction and signal-control demo built with Vite, TypeScript, React, Tailwind CSS and shadcn-ui. It includes pages for data upload, analysis, predictions, and a signal control UI that integrates with Supabase for backend data and Supabase Edge Functions.

Quick links
- Project: Traffic Prediction & Control System
- Folder: `src/` (app source)
- Supabase config: `supabase/` (local config should NOT be committed)

Features
- Visualize traffic congestion and KPIs
- Upload traffic data and run analysis
# Traffic Prediction & Control System

Comprehensive frontend and data-pipeline scaffold for exploring traffic prediction and simulated signal control. The repository provides a web UI for data upload, visualization and KPI monitoring, hooks and utilities for fetching traffic telemetry (including a Supabase Edge Function to fetch TomTom traffic), and a placeholder for integrating prediction models and signal-control strategies.

This README explains the project's motivation, architecture, data flow, how to run it, and how to plug in models for prediction.

Table of contents
- Motivation
- What the project does
- High-level architecture
- Data pipeline
- Prediction integration
- Signal control simulation
- How to run locally
- API / function contracts (examples)
- Evaluation & metrics
- Security & secrets
- Contributing & next steps
- License

Motivation
----------

Traffic congestion is costly: it increases travel time, fuel consumption, emissions and reduces safety. Short-term traffic prediction (minutes to hours) enables adaptive signal control, routing, and demand management strategies that reduce congestion and improve throughput.

This project aims to provide a small end-to-end sandbox where you can:
- ingest/collect traffic telemetry
- visualize congestion and KPIs
- run and compare short-term prediction models
- simulate simple signal-control strategies driven by predictions

What the project does
---------------------

- Ingest traffic telemetry via manual Data Upload or automated fetch (see `supabase/functions/fetch-tomtom-traffic/index.ts`).
- Store telemetry and sample datasets in Supabase (or any compatible DB).
- Visualize current and historical congestion on the `TrafficMap` and `CongestionHeatmap` pages.
- Offer a `Predictions` page to request forecasts and display predicted congestion and KPIs.
- Provide a `SignalControl` UI to simulate timing adjustments and evaluate impact.

High-level architecture
-----------------------

- Frontend: React + TypeScript + Vite (+ shadcn-ui, Tailwind). Primary app code is in `src/`.
- Backend: Supabase for persistence (tables, storage) and serverless Edge Functions for API-like logic (e.g., fetching external traffic feeds).
- Data ingestion: manual CSV upload via the `DataUpload` page, or automated fetch via an Edge Function.
- Prediction: pluggable — can be implemented as a Supabase Edge Function, an external REST API, or a server-side process that writes predictions back to the DB.

Data pipeline
-------------

1. Collection
	- Manual: user uploads CSV using the `DataUpload` page.
	- Automated: scheduled fetch via `supabase/functions/fetch-tomtom-traffic`.

2. Storage
	- Raw telemetry stored in Supabase tables or storage buckets.

3. Preprocessing
	- Frontend hooks (`src/hooks/useTrafficData.ts`) include lightweight processing for display.
	- For model input, implement server-side preprocessing (aggregation, feature extraction, time windows).

4. Model inference
	- Predictions can be run as a serverless function (recommended for production) or by a separate model service.
	- The service accepts a request (time window and location/segment identifiers) and returns time-series forecasts.

5. Postprocess & store
	- Persist predictions in a `predictions` table and surface them in the `Predictions` page.

Prediction integration
----------------------

The repo intentionally leaves model implementation flexible. Two recommended integration patterns:

1) Supabase Edge Function (serverless) — preferred for simplicity and low-latency
	- Add a function under `supabase/functions/predict-traffic/` that loads a saved model (or calls an external model) and returns forecasts.
	- Example flow: frontend POST -> Edge Function preprocesses -> runs model -> writes to `predictions` table -> returns summary response.

2) External ML service (REST or gRPC)
	- Host model in a separate service (FastAPI, Flask, TorchServe, AWS Lambda + Model Container).
	- Frontend calls a small API gateway / Edge Function that forwards model requests and secures API keys.

Request / response contract (recommended)

Request (POST /predict)

```json
{
  "site_id": "intersection-123",
  "start_timestamp": "2026-04-26T12:00:00Z",
  "horizon_minutes": 60,
  "granularity_minutes": 5,
  "features": { "recent_flow": [120,130,125], "recent_speed": [35,34,33] }
}
```

Response

```json
{
  "site_id": "intersection-123",
  "predictions": [
	 { "timestamp": "2026-04-26T12:05:00Z", "flow": 120, "speed": 35 },
	 { "timestamp": "2026-04-26T12:10:00Z", "flow": 132, "speed": 33 }
  ],
  "meta": { "model": "baseline-v1", "run_id": "abc123" }
}
```

Example: add a serverless function

1. Create `supabase/functions/predict-traffic/index.ts` that accepts the request above.
2. Perform server-side preprocessing, call model code or request to external model service.
3. Write `predictions` rows to your Supabase DB and return a summarized response.

Signal control simulation
-------------------------

The `SignalControl` page provides a UI to test simple strategies:
- Fixed-time adjustments
- Prediction-driven phase extensions
- Comparison mode: baseline vs. strategy

Workflow for experiments
1. Collect a recent traffic window, store it in DB.
2. Request predictions for the next N minutes.
3. Simulate signal timing adjustments using predictions and compute KPI deltas (avg delay, queue length).
4. Persist experiment results for later analysis.

How to run locally
------------------

1. Clone and install

```bash
git clone <YOUR_GIT_URL>
cd traffic-prediction-&-control-system
npm install
```

2. Configure environment (do NOT commit these files)

```bash
cp .env.example .env.local
# set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
```

3. Run dev server

```bash
npm run dev
```

4. (Optional) Run Supabase locally and deploy functions

```bash
# install supabase cli (see supabase docs)
supabase start
supabase functions deploy fetch-tomtom-traffic
```

API / function contracts (examples)
----------------------------------

- `GET /api/traffic/latest?site_id=...` — returns last observed telemetry.
- `POST /api/predict` — accepts the payload above and returns predictions.
- `POST /api/experiments` — run a simulation and store experiment metrics.

Evaluation & metrics
---------------------

When evaluating predictors, use standard time-series and forecasting metrics:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- Mean Absolute Percentage Error (MAPE)
- Speed / latency for real-time usage

Also test control impact using operational KPIs:
- Average delay per vehicle
- Average queue length
- Throughput (vehicles/hour)

Limitations & caveats
---------------------

- This repo is a frontend/data-pipeline scaffold — it does not include a production-grade ML model by default.
- Quality of predictions depends on data quality, sensor coverage, and model choice.
- For safety and production use, validate from historical backtests and run A/B experiments before live deployments.

Security & secrets
------------------

- Never commit `.env` or `supabase/config.toml` containing keys. Those are ignored by the `.gitignore`.
- Use environment variables in CI and secret stores for production keys.

Files of interest
-----------------
- `src/` — React application and UI components
- `src/hooks/` — custom hooks for traffic data (`useTrafficData.ts`, `useSeedData.ts`)
- `supabase/functions/` — Edge/Serverless functions (e.g., `fetch-tomtom-traffic`)
- `lib/` — helper utilities and `sampleData.ts` for offline testing

Contributing & next steps
-------------------------

If you want, I can add:
- `CONTRIBUTING.md` with PR and branch guidance
- A sample `predict-traffic` function with a minimal baseline model (AR/linear) that runs locally
- Example notebooks or unit tests to validate prediction accuracy

License
-------

MIT — add a `LICENSE` file if you want to publish this project openly.

Contact / support
-----------------

Open an issue in this repository for questions, or ask in the Lovable project dashboard if it's linked.

---

Updated README. If you want I can now:
- add a minimal baseline model skeleton (in `supabase/functions/predict-traffic`) and example test data
- create `CONTRIBUTING.md` and `LICENSE`
Tell me which of these you'd like next.

