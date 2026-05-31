from __future__ import annotations

from datetime import date, datetime
from typing import Any


def _number(value: Any, default: float = 0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _last_played(game: dict[str, Any]) -> datetime | None:
    timestamp = game.get("rtime_last_played")
    if timestamp:
        return datetime.fromtimestamp(int(timestamp))

    raw_value = game.get("Last Played") or game.get("last_played")
    if not raw_value:
        return None

    try:
        return datetime.fromisoformat(str(raw_value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def analyze_playtime(
    games: list[dict[str, Any]],
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    """Normalize Steam game data into a sorted list of dictionaries.

    Steam's owned-games endpoint only gives lifetime playtime plus the last-played
    timestamp. Date filters therefore filter by last-played date instead of
    pretending to know how many hours happened inside that range.
    """

    rows: list[dict[str, Any]] = []
    for game in games:
        app_id = game.get("appid") or game.get("AppID")
        name = game.get("name") or game.get("Name") or f"Steam app {app_id}"
        playtime_minutes = int(_number(game.get("playtime_forever", game.get("Playtime (minutes)"))))
        last_played = _last_played(game)

        if start_date and end_date:
            if not last_played or not (start_date <= last_played.date() <= end_date):
                continue

        rows.append(
            {
                "Name": name,
                "AppID": int(app_id) if app_id is not None else None,
                "Playtime (minutes)": playtime_minutes,
                "Playtime (hours)": round(playtime_minutes / 60, 2),
                "Last Played": last_played.isoformat(timespec="seconds") if last_played else None,
                "Played": playtime_minutes > 0,
            }
        )

    return sorted(rows, key=lambda row: (-row["Playtime (minutes)"], row["Name"].casefold()))
