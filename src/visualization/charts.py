import json
import os

def generate_charts(df):
    """Generates Chart.js-compatible JSON data for playtime charts."""
    try:
        # Ensure data directory exists
        os.makedirs("data", exist_ok=True)

        # Debug: Log DataFrame info
        print("Generating charts with DataFrame length:", len(df))
        print("Top 10 games:\n", df.head(10)[["Name", "Playtime (hours)"]])

        # Top 10 Games by Playtime
        top_10 = df.head(10)
        top_games_data = {
            "type": "bar",
            "data": {
                "labels": top_10["Name"].tolist(),
                "datasets": [{
                    "label": "Playtime (Hours)",
                    "data": top_10["Playtime (hours)"].round(2).tolist(),
                    "backgroundColor": "#6b8e23",
                    "hoverBackgroundColor": "#8ab92d"
                }]
            },
            "options": {
                "responsive": true,
                "plugins": {
                    "title": {"display": true, "text": "Top 10 Games by Playtime"},
                    "legend": {"display": false}
                },
                "scales": {
                    "y": {"title": {"display": true, "text": "Playtime (Hours)"}}
                }
            }
        }

        top_games_path = "data/top_games_chart.json"
        with open(top_games_path, "w", encoding="utf-8") as f:
            json.dump(top_games_data, f, indent=2)
        print(f"Top games chart JSON saved to {top_games_path}")

        # Playtime Distribution as a bar chart with bins
        hist_data = df["Playtime (hours)"].round(2).tolist()
        max_hours = max(hist_data) if hist_data else 1
        bin_size = max_hours / 20  # 20 bins
        bins = [0] * 20
        for hours in hist_data:
            bin_index = min(int(hours / bin_size), 19)
            bins[bin_index] += 1
        bin_labels = [f"{(i * bin_size):.1f}-{(i + 1) * bin_size:.1f}" for i in range(20)]
        playtime_dist_data = {
            "type": "bar",
            "data": {
                "labels": bin_labels,
                "datasets": [{
                    "label": "Number of Games",
                    "data": bins,
                    "backgroundColor": "#4682b4",
                    "hoverBackgroundColor": "#5a9bd4"
                }]
            },
            "options": {
                "responsive": true,
                "plugins": {
                    "title": {"display": true, "text": "Playtime Distribution"},
                    "legend": {"display": false}
                },
                "scales": {
                    "x": {"title": {"display": true, "text": "Playtime (Hours)"}},
                    "y": {"title": {"display": true, "text": "Number of Games"}}
                }
            }
        }

        playtime_dist_path = "data/playtime_distribution.json"
        with open(playtime_dist_path, "w", encoding="utf-8") as f:
            json.dump(playtime_dist_data, f, indent=2)
        print(f"Playtime distribution JSON saved to {playtime_dist_path}")

        return True
    except Exception as e:
        print(f"Error generating chart data: {e}")
        return False