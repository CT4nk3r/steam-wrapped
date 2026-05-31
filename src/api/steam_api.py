import json
from dataclasses import dataclass
from typing import Any

import requests


class SteamApiError(RuntimeError):
    """Raised when Steam returns an unusable API response."""


@dataclass
class WebAPI:
    """Small Steam Web API client for the endpoints this project needs."""

    key: str
    timeout: int = 20

    base_url = "https://api.steampowered.com"

    def call(self, interface: str, method: str, version: str = "v0001", **params: Any) -> dict[str, Any]:
        url = f"{self.base_url}/{interface}/{method}/{version}/"
        request_params = {"key": self.key, "format": "json", **params}

        try:
            response = requests.get(url, params=request_params, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as exc:
            raise SteamApiError(f"Steam API request failed for {interface}.{method}: {exc}") from exc
        except json.JSONDecodeError as exc:
            raise SteamApiError("Steam returned a response that was not valid JSON.") from exc


def get_steam_data(api_key: str, steam_id: str) -> list[dict[str, Any]]:
    """Return the owned games list for a Steam user."""

    webapi = WebAPI(key=api_key)
    response = webapi.call(
        "IPlayerService",
        "GetOwnedGames",
        steamid=steam_id,
        include_appinfo=True,
        include_played_free_games=True,
        include_free_sub=True,
        language="english",
    )

    return response.get("response", {}).get("games", [])
