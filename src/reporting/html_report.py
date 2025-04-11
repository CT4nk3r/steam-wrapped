import pandas as pd
import os

def generate_html_report(df):
    """Generates a fancy HTML report with tables and interactive charts."""
    total_games = len(df)
    total_playtime_hours = df["Playtime (hours)"].sum()
    most_played_game = df.iloc[0]["Name"] if not df.empty else "No games played"
    most_played_time = df.iloc[0]["Playtime (hours)"] if not df.empty else 0

    try:
        template_path = os.path.join("src", "templates", "report_template.html")
        with open(template_path, "r", encoding="utf-8") as f:
            html_template = f.read()
    except FileNotFoundError:
        print(f"Error: {template_path} not found. Using default HTML.")
        html_template = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Steam Wrapped Report</title>
                <style>
                    body { font-family: sans-serif; }
                    table { width: 80%; border-collapse: collapse; margin: 20px auto; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    img { display: block; margin: 20px auto; max-width: 100%; }
                    h2 { margin-top: 50px; }
                </style>
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            </head>
            <body>
                <h1>Steam Wrapped Report</h1>
                <p>Total Games: {{total_games}}</p>
                <p>Total Playtime: {{total_playtime_hours}} hours</p>
                <p>Most Played Game: {{most_played_game}} ({{most_played_time}} hours)</p>
                <h2>Top 10 Games by Playtime</h2>
                <div id="top_games_chart"></div>
                <h2>Playtime Distribution</h2>
                <div id="playtime_distribution"></div>
                <h2>All Games Data</h2>
                <table>
                    <tr>
                        <th>Name</th>
                        <th>AppID</th>
                        <th>Playtime (Hours)</th>
                        <th>Last Played</th>
                    </tr>
                    {{table_rows}}
                </table>
            </body>
            </html>
            """

    table_rows = ""
    if not df.empty:
        for _, row in df.iterrows():
            last_played = row['Last Played']
            last_played_str = last_played.strftime('%Y-%m-%d') if pd.notna(last_played) else 'Never'
            table_rows += f"""
                <tr>
                    <td>{row['Name']}</td>
                    <td>{row['AppID']}</td>
                    <td>{row['Playtime (hours)']:.2f}</td>
                    <td>{last_played_str}</td>
                </tr>
            """
    else:
        table_rows = """
            <tr>
                <td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No data available</td>
            </tr>
        """

    html = html_template.replace("{{table_rows}}", table_rows)
    html = html.replace("{{total_games}}", str(total_games))
    html = html.replace("{{total_playtime_hours}}", f"{total_playtime_hours:.2f}")
    html = html.replace("{{most_played_game}}", most_played_game)
    html = html.replace("{{most_played_time}}", f"{most_played_time:.2f}")

    try:
        with open("reports/top_games_chart.html", "r", encoding="utf-8") as f:
            top_games_chart_html = f.read()
        html = html.replace('<div id="top_games_chart"></div>', top_games_chart_html)
    except FileNotFoundError:
        print("Warning: top_games_chart.html not found. Chart will be omitted.")

    try:
        with open("reports/playtime_distribution.html", "r", encoding="utf-8") as f:
            playtime_distribution_html = f.read()
        html = html.replace('<div id="playtime_distribution"></div>', playtime_distribution_html)
    except FileNotFoundError:
        print("Warning: playtime_distribution.html not found. Chart will be omitted.")

    try:
        os.makedirs("reports", exist_ok=True)
        with open("reports/steam_report.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("HTML report generated: reports/steam_report.html")
        return True
    except Exception as e:
        print(f"Error writing HTML report: {e}")
        return False