import os
from dotenv import load_dotenv
import webbrowser
import time
from api.steam_api import get_steam_data
from analysis.playtime import analyze_playtime
from visualization.charts import generate_charts

# Load environment variables
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

    # Analyze full dataset
    df = analyze_playtime(games)
    if df.empty:
        print("No playtime data. Exiting.")
        return

    # Generate chart data
    charts_generated = generate_charts(df)
    if not charts_generated:
        print("Failed to generate charts. Exiting.")
        return

    # Save DataFrame as JSON
    os.makedirs("data", exist_ok=True)
    df.to_json("data/games_data.json", orient="records", date_format="iso")
    print("Games data saved to data/games_data.json")

    # Build and start the Next.js production server
    print("Building and starting Next.js server...")
    try:
        os.chdir("webapp")
        # Build the Next.js app
        print("Building Next.js app...")
        os.system("npm run build")
        
        # Start the production server
        print("Starting Next.js production server...")
        if os.name == 'nt':  # Windows
            os.system("start cmd /c npm run start")
        else:  # Linux/Mac
            os.system("npm run start &")
        
        # Wait for the server to start
        time.sleep(5)
        
        # Open the browser
        print("Opening browser to http://localhost:3000...")
        webbrowser.open("http://localhost:3000")
    except Exception as e:
        print(f"Error starting Next.js server: {e}")
        print("Please navigate to the 'webapp' directory and run 'npm run build' and 'npm run start' manually.")

if __name__ == "__main__":
    main()