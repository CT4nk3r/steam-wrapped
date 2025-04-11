import pandas as pd
from datetime import datetime

def analyze_playtime(games):
    """Analyzes playtime data and creates a Pandas DataFrame."""
    game_data = []
    for game in games:
        game_data.append({
            "Name": game["name"],
            "AppID": game["appid"],
            "Playtime (minutes)": game.get("playtime_forever", 0),
            "Playtime (hours)": game.get("playtime_forever", 0) / 60,
            "Last Played": datetime.fromtimestamp(game.get("rtime_last_played", 0)) if game.get("rtime_last_played") else None
        })
    df = pd.DataFrame(game_data)
    df = df.sort_values(by="Playtime (minutes)", ascending=False)
    return df