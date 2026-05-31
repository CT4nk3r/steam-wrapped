# Steam Wrapped

A Steam library dashboard that turns a public Steam profile into a shareable playtime report.

Paste a Steam profile URL, fetch the public library through the backend, and explore the results as a polished dashboard: top games, lifetime hours, library spread, playtime buckets, recent activity signals, and an exportable JSON bundle.

## What This Can And Cannot Show

Steam's public owned-games API exposes lifetime playtime, recent two-week playtime, and last-played metadata. It does **not** expose exact per-year playtime for arbitrary dates.

That means this app can accurately show:

- lifetime library stats
- most-played games overall
- recently played games when Steam exposes that data
- past annual data if imported from Steam Replay JSON
- future year-to-date stats after the app has started tracking snapshots

It cannot reconstruct something like "hours played in 2026 so far" for a brand-new user unless Steam Replay or a previous snapshot provides the missing baseline.

## Current App

- Static dashboard UI in `webapp/public`
- Express API in `webapp/server.js`
- Vercel adapter in `api/index.js`
- Sample report JSON in `reports`
- Browser-local imported report persistence with `localStorage`
- Optional Python generator in `src/main.py`

The web app works with the included sample data before you connect a Steam account.

## Requirements

- Node.js 18+
- Python 3.10+ only if you want to use the local Python report generator
- A Steam Web API key for backend imports when Steam's public Community XML feed is not enough

Get a Steam Web API key from:

```text
https://steamcommunity.com/dev/apikey
```

## Environment

Create `.env` in the project root:

```env
STEAM_API_KEY=your_backend_steam_web_api_key

# Optional: only needed for the Python generator.
STEAM_ID=your_17_digit_steamid64
```

Do not expose `STEAM_API_KEY` in the browser. The import form never asks users for a key; the backend uses this value.

## Local Development

Install dependencies:

```bash
npm install
cd webapp
npm install
```

Run the dashboard:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

You can paste any of these into the import form:

- `https://steamcommunity.com/id/CT4nk3r/`
- `https://steamcommunity.com/profiles/7656119.../`
- a raw 17-digit SteamID64

The backend first tries Steam's public Community XML games feed. If that does not return a library, it falls back to the official Steam Web API using `STEAM_API_KEY`.

## Python Report Generator

The Python pipeline is optional. It can generate local report JSON from `STEAM_ID` and `STEAM_API_KEY`:

```bash
python -m pip install -r requirements.txt
python src/main.py
```

Generated files:

- `reports/games_data.json`
- `reports/summary.json`
- `reports/top_games_chart.json`
- `reports/playtime_distribution.json`

You can also generate and launch the local preview in one step:

```bash
python src/main.py --serve --open
```

## JSON Export

From the running app:

- `Export Bundle`: downloads the current report shown in the browser
- `/api/export`: downloads the server-side bundled sample/generated report
- `Health`: `/health`

The export bundle contains normalized games, summary data, and chart-ready data.

On local development, importing a profile also rewrites the `reports/*.json` files. On Vercel, the server is stateless, so the import response is saved in the user's browser instead. Reloading the page restores that browser-saved report, and `Reset Sample` clears it.

## Deploying To Vercel

This repo includes a Vercel adapter:

- `api/index.js` exports the Express app as a Vercel Function.
- `vercel.json` routes all requests through that function.
- `.vercelignore` keeps local secrets and dependencies out of deployments.

Log in and deploy:

```bash
npx vercel login
npx vercel deploy --yes --scope ct4nk3r-projects --project steam-wrapped
```

Set `STEAM_API_KEY` in Vercel for Preview and Production environments. Without it, imports still try public Community XML first, but private/missing XML library data cannot fall back to the Steam Web API.

The same UI is used locally and on Vercel:

- local mode can read and write `reports/*.json`
- deployed mode returns imported report data directly and stores it in the browser
- exports are generated client-side from the current report, so they work in both modes

## Privacy Notes

- Steam profiles must have public game details for imports to work.
- The backend key belongs on the server only.
- Vercel deployment mode is stateless: imported data is returned to the browser and saved only in that user's browser storage.
- Accurate future year-to-date reports require an opt-in snapshot store, which is not implemented yet.
