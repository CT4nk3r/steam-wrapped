import os
from dotenv import load_dotenv
import webbrowser
from api.steam_api import get_steam_data
from analysis.playtime import analyze_playtime
from visualization.charts import generate_charts
from reporting.html_report import generate_html_report

load_dotenv()
STEAM_API_KEY = os.getenv("STEAM_API_KEY")
STEAM_ID = os.getenv("STEAM_ID")

def main():
    """Main function to orchestrate the process."""
    if not STEAM_API_KEY or not STEAM_ID:
        print("Error: STEAM_API_KEY and STEAM_ID must be set in the .env file.")
        return

    games = get_steam_data(STEAM_API_KEY, STEAM_ID)
    if not games:
        print("No game data received. Exiting.")
        return

    df = analyze_playtime(games)
    if df.empty:
        print("No playtime data. Exiting.")
        return

    charts_generated = generate_charts(df)
    if not charts_generated:
        print("Failed to generate charts. HTML report will be generated without them.")

    report_generated = generate_html_report(df)
    if report_generated:
        webbrowser.open("reports/steam_report.html")

if __name__ == "__main__":
    main()