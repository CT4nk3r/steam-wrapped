from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _hours(game: dict) -> float:
    return float(game.get("Playtime (hours)", 0) or 0)


def _minutes(game: dict) -> int:
    return int(game.get("Playtime (minutes)", 0) or 0)


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _playtime_distribution(games: list[dict]) -> tuple[list[str], list[int]]:
    played_hours = [_hours(game) for game in games if _minutes(game) > 0]
    buckets = [
        ("<1h", 0, 1),
        ("1-5h", 1, 5),
        ("5-20h", 5, 20),
        ("20-50h", 20, 50),
        ("50-100h", 50, 100),
        ("100h+", 100, float("inf")),
    ]

    counts = []
    for _, start, end in buckets:
        if end == float("inf"):
            counts.append(sum(1 for hours in played_hours if hours >= start))
        else:
            counts.append(sum(1 for hours in played_hours if start <= hours < end))

    return [label for label, _, _ in buckets], counts


def build_summary(games: list[dict]) -> dict:
    if not games:
        return {
            "total_games": 0,
            "played_games": 0,
            "unplayed_games": 0,
            "total_hours": 0,
            "top_game": None,
            "generated_at": datetime.now().isoformat(timespec="seconds"),
        }

    played = [game for game in games if _minutes(game) > 0]
    top_game = played[0] if played else None
    last_played = [_parse_date(game.get("Last Played")) for game in games]
    years = [value.year for value in last_played if value]
    recent_year = max(years) if years else None

    return {
        "total_games": len(games),
        "played_games": len(played),
        "unplayed_games": len(games) - len(played),
        "total_hours": round(sum(_hours(game) for game in games), 2),
        "top_game": top_game,
        "recent_year": recent_year,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def generate_charts(games: list[dict], output_dir: str | Path = "reports") -> bool:
    """Write Chart.js-compatible JSON files next to the generated game data."""

    try:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        played = [game for game in games if _minutes(game) > 0]
        top_10 = played[:10]

        top_games_data = {
            "type": "bar",
            "data": {
                "labels": [game["Name"] for game in top_10],
                "datasets": [
                    {
                        "label": "Hours",
                        "data": [round(_hours(game), 2) for game in top_10],
                        "backgroundColor": "#66c0f4",
                        "hoverBackgroundColor": "#a4d65e",
                    }
                ],
            },
            "options": {"indexAxis": "y", "responsive": True, "plugins": {"legend": {"display": False}}},
        }
        _write_json(output_path / "top_games_chart.json", top_games_data)

        labels, counts = _playtime_distribution(games)
        distribution_data = {
            "type": "bar",
            "data": {
                "labels": labels,
                "datasets": [
                    {
                        "label": "Games",
                        "data": counts,
                        "backgroundColor": "#ffb000",
                        "hoverBackgroundColor": "#ffd166",
                    }
                ],
            },
            "options": {"responsive": True, "plugins": {"legend": {"display": False}}},
        }
        _write_json(output_path / "playtime_distribution.json", distribution_data)
        _write_json(output_path / "summary.json", build_summary(games))
        return True
    except Exception as exc:
        print(f"Error generating report data: {exc}")
        return False
