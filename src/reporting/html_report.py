import pandas as pd
import os
import json

def generate_html_report(df):
    """Generates a fancy HTML report with interactive charts and tables."""
    # Debug: Print DataFrame to ensure data is present
    print("DataFrame head:\n", df.head())
    print("DataFrame length:", len(df))

    # Calculate summary stats
    total_games = len(df)
    total_playtime_hours = df["Playtime (hours)"].sum()
    most_played_game = df.iloc[0]["Name"] if not df.empty else "No games played"
    most_played_time = df.iloc[0]["Playtime (hours)"] if not df.empty else 0

    # Load chart JSON data
    top_games_json = "{}"
    playtime_dist_json = "{}"
    games_data_json = "[]"
    try:
        with open("top_games_chart.json", "r", encoding="utf-8") as f:
            top_games_json = f.read()
    except Exception as e:
        print(f"Error reading top_games_chart.json: {e}")

    try:
        with open("playtime_distribution.json", "r", encoding="utf-8") as f:
            playtime_dist_json = f.read()
    except Exception as e:
        print(f"Error reading playtime_distribution.json: {e}")

    try:
        with open("reports/games_data.json", "r", encoding="utf-8") as f:
            games_data_json = f.read()
    except Exception as e:
        print(f"Error reading games_data.json: {e}")

    try:
        template_path = os.path.join("src", "templates", "report_template.html")
        with open(template_path, "r", encoding="utf-8") as f:
            html_template = f.read()
    except FileNotFoundError:
        print(f"Error: {template_path} not found. Using default HTML.")
        html_template = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Steam Wrapped</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" rel="stylesheet">
                <link href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" rel="stylesheet">
                <link rel="stylesheet" href="../src/static/css/styles.css">
                <style>
                    body {
                        background: linear-gradient(135deg, #1a3c34, #4b0082, #000000);
                        color: white;
                        font-family: 'Segoe UI', sans-serif;
                        min-height: 100vh;
                        animation: gradientShift 15s ease infinite;
                    }
                    @keyframes gradientShift {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    .card {
                        border: none;
                        border-radius: 10px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                        transition: transform 0.3s;
                        background-color: rgba(0, 0, 0, 0.7);
                    }
                    .card:hover {
                        transform: scale(1.05);
                    }
                    .table-dark {
                        background-color: rgba(0, 0, 0, 0.7);
                        border-radius: 10px;
                    }
                    h1, h2 {
                        font-family: 'Segoe UI', sans-serif;
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                    }
                    canvas {
                        border-radius: 10px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    }
                    .text-white { color: white !important; }
                    .bg-dark { background-color: rgba(0, 0, 0, 0.7) !important; }
                    .chart-error {
                        color: #ff4444;
                        text-align: center;
                        padding: 20px;
                        background-color: rgba(0, 0, 0, 0.7);
                        border-radius: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container mx-auto py-8">
                    <h1 class="text-5xl font-bold text-center mb-8 animate__animated animate__fadeIn text-white">Your Steam Wrapped</h1>
                    <section class="mb-12">
                        <h2 class="text-3xl font-semibold mb-4 animate__animated animate__fadeInUp text-white">Your Gaming Journey</h2>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="card bg-dark text-white p-4">
                                    <p class="text-2xl">Total Games</p>
                                    <p class="text-4xl font-bold">{{total_games}}</p>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card bg-dark text-white p-4">
                                    <p class="text-2xl">Total Playtime</p>
                                    <p class="text-4xl font-bold">{{total_playtime_hours}} hours</p>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card bg-dark text-white p-4">
                                    <p class="text-2xl">Most Played</p>
                                    <p class="text-4xl font-bold">{{most_played_game}}</p>
                                    <p class="text-xl">({{most_played_time}} hours)</p>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section class="mb-12">
                        <h2 class="text-3xl font-semibold mb-4 animate__animated animate__fadeInUp text-white">Filter Your Stats</h2>
                        <div class="mb-4">
                            <label for="date_range" class="block text-lg mb-2 text-white">Select Date Range:</label>
                            <input type="text" id="date_range" class="form-control w-1/2 bg-gray-800 text-white border-gray-600">
                        </div>
                    </section>
                    <section class="mb-12">
                        <h2 class="text-3xl font-semibold mb-4 animate__animated animate__fadeInUp text-white">Top Games</h2>
                        <div id="topGamesChartContainer">
                            <canvas id="topGamesChart" class="bg-dark p-4 rounded"></canvas>
                            <div id="topGamesChartError" class="chart-error" style="display: none;">Failed to load Top Games chart.</div>
                        </div>
                    </section>
                    <section class="mb-12">
                        <h2 class="text-3xl font-semibold mb-4 animate__animated animate__fadeInUp text-white">Playtime Distribution</h2>
                        <div id="playtimeDistChartContainer">
                            <canvas id="playtimeDistChart" class="bg-dark p-4 rounded"></canvas>
                            <div id="playtimeDistChartError" class="chart-error" style="display: none;">Failed to load Playtime Distribution chart.</div>
                        </div>
                    </section>
                    <section>
                        <h2 class="text-3xl font-semibold mb-4 animate__animated animate__fadeInUp text-white">All Games</h2>
                        <table id="gamesTable" class="table table-dark table-striped w-full">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>AppID</th>
                                    <th>Playtime (Hours)</th>
                                    <th>Last Played</th>
                                </tr>
                            </thead>
                            <tbody>
                                {{table_rows}}
                            </tbody>
                        </table>
                    </section>
                </div>
                <script>
                    // Inline JSON data
                    const topGamesChartData = {{top_games_json}};
                    const playtimeDistChartData = {{playtime_dist_json}};
                    const gamesData = {{games_data_json}};
                </script>
                <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
                <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
                <script src="../src/static/js/scripts.js"></script>
            </body>
            </html>
            """

    # Prepare the table rows
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
                <td colspan="4" class="text-center text-white">No data available</td>
            </tr>
        """

    # Insert stats and JSON data into the template
    html = html_template.replace("{{table_rows}}", table_rows)
    html = html.replace("{{total_games}}", str(total_games))
    html = html.replace("{{total_playtime_hours}}", f"{total_playtime_hours:.2f}")
    html = html.replace("{{most_played_game}}", most_played_game)
    html = html.replace("{{most_played_time}}", f"{most_played_time:.2f}")
    html = html.replace("{{top_games_json}}", top_games_json)
    html = html.replace("{{playtime_dist_json}}", playtime_dist_json)
    html = html.replace("{{games_data_json}}", games_data_json)

    try:
        os.makedirs("reports", exist_ok=True)
        with open("reports/steam_report.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("HTML report generated: reports/steam_report.html")
        return True
    except Exception as e:
        print(f"Error writing HTML report: {e}")
        return False