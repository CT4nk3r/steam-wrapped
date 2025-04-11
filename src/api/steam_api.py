import requests
import json
from dotenv import load_dotenv
import os

load_dotenv()

class WebAPI:
    """A class to interface with the Steam Web API."""
    def __init__(self, key=None):
        self.key = key
        self.base_url = "https://api.steampowered.com/"

    def call(self, endpoint, **kwargs):
        params = {'key': self.key, 'format': 'json'}
        params.update(kwargs)
        url = f"{self.base_url}{endpoint.replace('.', '/')}/v0001/"
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error calling Steam API endpoint {endpoint}: {e}")
            return {}
        except json.decoder.JSONDecodeError as e:
            print(f"Error decoding JSON from Steam API response: {e}")
            print(f"Response text: {response.text}")
            return {}

def get_steam_data(api_key, steam_id):
    """Retrieves Steam data using the Steam Web API."""
    try:
        webapi = WebAPI(key=api_key)
        response = webapi.call(
            'IPlayerService.GetOwnedGames',
            steamid=steam_id,
            include_appinfo=True,
            include_played_free_games=True,
            appids_filter=[],
            include_free_sub=True,
            language='english',
            include_extended_appinfo=True
        )
        return response.get('response', {}).get('games', [])
    except Exception as e:
        print(f"Error fetching data from Steam API: {e}")
        return []