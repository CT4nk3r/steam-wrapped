import plotly.graph_objects as go
from plotly.offline import plot
import os

def generate_charts(df):
    """Generates charts for playtime and top games, with error handling."""
    try:
        os.makedirs("reports", exist_ok=True)

        top_10 = df.head(10)
        fig1 = go.Figure(data=[go.Bar(
            x=top_10["Name"],
            y=top_10["Playtime (hours)"],
            marker_color="#6b8e23",
            hovertemplate="<b>Game:</b> %{x}<br><b>Playtime:</b> %{y:.2f} Hours"
        )])
        fig1.update_layout(
            title="Top 10 Games by Playtime",
            xaxis_title="Game",
            yaxis_title="Playtime (Hours)",
            font=dict(size=12),
            margin=dict(b=100),
        )
        plot(fig1, filename="reports/top_games_chart.html", auto_open=False, include_plotlyjs='cdn', full_html=False)

        fig2 = go.Figure(data=[go.Histogram(
            x=df["Playtime (hours)"],
            nbinsx=20,
            marker_color="#4682b4",
            hovertemplate="<b>Range:</b> %{x}<br><b>Count:</b> %{y}"
        )])
        fig2.update_layout(
            title="Playtime Distribution",
            xaxis_title="Playtime (Hours)",
            yaxis_title="Number of Games",
            font=dict(size=12),
        )
        plot(fig2, filename="reports/playtime_distribution.html", auto_open=False, include_plotlyjs='cdn', full_html=False)
        return True
    except Exception as e:
        print(f"Error generating charts: {e}")
        return False