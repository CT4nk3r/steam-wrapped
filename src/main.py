from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

from dotenv import load_dotenv

from api.steam_api import SteamApiError, get_steam_data
from analysis.playtime import analyze_playtime
from visualization.charts import generate_charts


ROOT_DIR = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a Steam Wrapped dashboard from your Steam library.")
    parser.add_argument("--api-key", default=None, help="Steam Web API key. Defaults to STEAM_API_KEY from .env.")
    parser.add_argument("--steam-id", default=None, help="Steam 64-bit ID. Defaults to STEAM_ID from .env.")
    parser.add_argument("--output-dir", default="reports", help="Directory for generated JSON report files.")
    parser.add_argument("--serve", action="store_true", help="Start the local preview server after generating data.")
    parser.add_argument("--open", action="store_true", help="Open the preview URL in your default browser.")
    parser.add_argument("--port", default="3000", help="Preview server port when --serve is used.")
    return parser.parse_args()


def write_report_data(output_dir: Path, steam_api_key: str, steam_id: str) -> None:
    games = get_steam_data(steam_api_key, steam_id)
    if not games:
        raise RuntimeError("Steam returned no owned-game data. Check that the profile and game details are public.")

    report_games = analyze_playtime(games)
    if not report_games:
        raise RuntimeError("No games were available to write.")

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "games_data.json").write_text(json.dumps(report_games, indent=2), encoding="utf-8")
    if not generate_charts(report_games, output_dir):
        raise RuntimeError("Failed to generate chart and summary JSON.")

    print(f"Wrote {len(report_games)} games to {output_dir / 'games_data.json'}")


def start_preview_server(port: str, should_open: bool) -> subprocess.Popen:
    env = os.environ.copy()
    env["PORT"] = port
    process = subprocess.Popen(["npm", "start"], cwd=ROOT_DIR / "webapp", env=env)
    time.sleep(2)

    url = f"http://localhost:{port}"
    print(f"Preview server running at {url}")
    if should_open:
        webbrowser.open(url)

    return process


def main() -> int:
    load_dotenv(ROOT_DIR / ".env")
    args = parse_args()

    api_key = args.api_key or os.getenv("STEAM_API_KEY")
    steam_id = args.steam_id or os.getenv("STEAM_ID")
    if not api_key or not steam_id:
        print("STEAM_API_KEY and STEAM_ID are required. Put them in .env or pass --api-key and --steam-id.")
        return 1

    output_dir = (ROOT_DIR / args.output_dir).resolve()
    try:
        write_report_data(output_dir, api_key, steam_id)
    except (RuntimeError, SteamApiError) as exc:
        print(exc)
        return 1

    if args.serve:
        start_preview_server(args.port, args.open)

    return 0


if __name__ == "__main__":
    sys.exit(main())
