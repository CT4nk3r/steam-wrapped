# Steam Wrapped

A local Steam library dashboard. Python fetches and normalizes your Steam owned-games data, then a small Express server previews the dashboard from the generated JSON.

## Setup

```bash
python -m pip install -r requirements.txt
cd webapp
npm install
```

Create a `.env` file in the project root:

```env
STEAM_API_KEY=your_steam_web_api_key
STEAM_ID=your_64_bit_steam_id
```

Your Steam profile and game details need to be public for the owned-games endpoint to return data.

## Generate Your Wrapped

```bash
python src/main.py
```

This writes:

- `reports/games_data.json`
- `reports/summary.json`
- `reports/top_games_chart.json`
- `reports/playtime_distribution.json`

The repository includes sample report data, so the preview app works before you add your own API key.

## Preview

```bash
cd webapp
npm start
```

Open `http://localhost:3000`.

You can also generate and start the preview in one step:

```bash
python src/main.py --serve --open
```

## Import From A Profile URL

The preview app can fetch a public Steam library directly. Paste any of these into the import form:

- `https://steamcommunity.com/id/CT4nk3r/`
- `https://steamcommunity.com/profiles/7656119.../`
- a raw 17-digit SteamID64

The server first tries Steam's public Community XML feed. If Steam does not expose the game list there, the server uses `STEAM_API_KEY` from `.env` to call the official Steam Web API. Users should not need to provide their own API key.

Steam only returns owned-game data when the target profile and game details are public.

## Export JSON

Use `Games JSON` for the normalized game list, or `Export Bundle` for one file containing games, summary, and chart data:

- `http://localhost:3000/reports/games_data.json`
- `http://localhost:3000/api/export`
