# Traffic Prediction & Control System

This repository contains the frontend for a traffic prediction and signal-control demo built with Vite, TypeScript, React, Tailwind CSS and shadcn-ui. It includes pages for data upload, analysis, predictions, and a signal control UI that integrates with Supabase for backend data and Supabase Edge Functions.

Quick links
- Project: Traffic Prediction & Control System
- Folder: `src/` (app source)
- Supabase config: `supabase/` (local config should NOT be committed)

Features
- Visualize traffic congestion and KPIs
- Upload traffic data and run analysis
- Generate short-term traffic predictions
- Basic signal control UI for simulation

Prerequisites
- Node.js 18+ and npm or pnpm
- (Optional) Supabase CLI/Account if you want to run backend services locally

Local setup
1. Clone the repo:

```bash
git clone <YOUR_GIT_URL>
cd traffic-prediction-&-control-system
```

2. Install dependencies:

```bash
npm install
```

3. Copy example env files and configure secrets (do not commit these):

```bash
cp .env.example .env.local
# Edit .env.local and set SUPABASE_URL, SUPABASE_ANON_KEY, etc.
```

4. Start the dev server:

```bash
npm run dev
```

Available scripts (from `package.json`)
- `npm run dev` — start dev server
- `npm run build` — build production bundle
- `npm run preview` — preview production build locally
- `npm run test` — run tests (if configured)

Environment & secrets
- Keep secrets out of the repo. Add values to `.env.local` or use environment variables in CI.
- The `supabase/config.toml` file and `supabase/.env` may contain secrets and are ignored by `.gitignore`.

Supabase notes
- This project includes a `supabase/` folder with local function(s) and a `config.toml` file. Do not commit production keys.
- To run Supabase locally, install the Supabase CLI and follow Supabase docs.

Building & deploying
- Build: `npm run build`
- Deploy static build to any static host (Netlify, Vercel) / platform-specific instructions.

Contributing
- Fork and open a PR. Keep secrets out of commits.
- Add small, focused commits and include context in PR descriptions.

Troubleshooting
- If the app fails to start, confirm Node version and that env variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are set.

Files of interest
- `src/` — React app source
- `src/components/` — UI components
- `supabase/` — local Supabase functions and config (ignored by git)
- `lib/` — helper utilities and sample data

Contact / more info
- See project README in the dashboard or open an issue in this repo for questions.


---

If you'd like, I can:
- add a `CONTRIBUTING.md` and `LICENSE`
- expand the README with command outputs and screenshots
- or remove/add specific ignores for files you want tracked

