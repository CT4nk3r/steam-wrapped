import pandas as pd
from datetime import datetime

def analyze_playtime(games, start_date=None, end_date=None):
    """Analyzes playtime data and creates a Pandas DataFrame, optionally filtered by date range."""
    game_data = []
    for game in games:
        last_played = datetime.fromtimestamp(game.get("rtime_last_played", 0)) if game.get("rtime_last_played") else None
        total_playtime_minutes = game.get("playtime_forever", 0)

        # Estimate playtime in date range
        playtime_minutes = total_playtime_minutes
        if start_date and end_date and last_played:
            # If last played is before start_date, assume no playtime in range
            if last_played.date() < start_date:
                playtime_minutes = 0
            # If last played is within range, include all playtime (simplification)
            elif start_date <= last_played.date() <= end_date:
                playtime_minutes = total_playtime_minutes
            else:
                # If last played is after end_date, assume partial playtime (linear estimate)
                playtime_minutes = total_playtime_minutes / 2  # Rough estimate

        game_data.append({
            "Name": game["name"],
            "AppID": game["appid"],
            "Playtime (minutes)": playtime_minutes,
            "Playtime (hours)": playtime_minutes / 60,
            "Last Played": last_played
        })

    df = pd.DataFrame(game_data)
    df = df.sort_values(by="Playtime (minutes)", ascending=False)
    # Filter out games with zero playtime if date range is specified
    if start_date and end_date:
        df = df[df["Playtime (minutes)"] > 0]
    return df