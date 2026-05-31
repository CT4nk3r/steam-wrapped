const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = path.resolve(__dirname, "..");
const reportDir = path.join(rootDir, "reports");
const publicDir = path.join(__dirname, "public");

loadRootEnv();

app.use(express.json({ limit: "1mb" }));

function loadRootEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match || process.env[match[1]]) {
      continue;
    }

    const value = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
    process.env[match[1]] = value;
  }
}

function readJson(fileName, fallback) {
  const filePath = path.join(reportDir, fileName);

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not parse ${filePath}:`, error.message);
    }
    return fallback;
  }
}

function writeJson(fileName, payload) {
  if (process.env.VERCEL) {
    return;
  }

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, fileName), JSON.stringify(payload, null, 2), "utf8");
}

function normalizeReportGame(game) {
  const hoursOnRecord = parseNumber(game.hoursOnRecord);
  const minutes = Number(game.playtime_forever ?? game["Playtime (minutes)"] ?? game.minutes ?? Math.round(hoursOnRecord * 60) ?? 0);
  const appId = Number(game.appid ?? game.appID ?? game.AppID ?? game.appId ?? 0);
  const lastPlayedSeconds = Number(game.rtime_last_played ?? 0);
  const lastPlayed = game["Last Played"] ?? game.lastPlayed ?? (lastPlayedSeconds ? new Date(lastPlayedSeconds * 1000).toISOString().replace(".000Z", "") : null);

  return {
    Name: game.name ?? game.Name ?? "Unknown game",
    AppID: appId,
    "Playtime (minutes)": minutes,
    "Playtime (hours)": Math.round((minutes / 60) * 100) / 100,
    "Last Played": lastPlayed,
    Played: minutes > 0,
  };
}

function parseNumber(value) {
  const parsed = Number(String(value ?? "0").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGame(game) {
  const minutes = Number(game["Playtime (minutes)"] ?? game.playtime_forever ?? 0);
  const hours = Number(game["Playtime (hours)"] ?? minutes / 60);

  return {
    name: game.Name ?? game.name ?? "Unknown game",
    appId: Number(game.AppID ?? game.appid ?? 0),
    minutes,
    hours: Math.round(hours * 100) / 100,
    lastPlayed: game["Last Played"] ?? game.lastPlayed ?? null,
    played: Boolean(game.Played ?? minutes > 0),
  };
}

function buildBuckets(games) {
  const buckets = [
    { label: "<1h", min: 0, max: 1 },
    { label: "1-5h", min: 1, max: 5 },
    { label: "5-20h", min: 5, max: 20 },
    { label: "20-50h", min: 20, max: 50 },
    { label: "50-100h", min: 50, max: 100 },
    { label: "100h+", min: 100, max: Infinity },
  ];

  return buckets.map((bucket) => ({
    label: bucket.label,
    count: games.filter((game) => game["Playtime (minutes)"] > 0 && game["Playtime (hours)"] >= bucket.min && game["Playtime (hours)"] < bucket.max).length,
  }));
}

function buildSummary(games) {
  const played = games.filter((game) => game["Playtime (minutes)"] > 0);
  const dates = games
    .map((game) => (game["Last Played"] ? new Date(game["Last Played"]) : null))
    .filter((date) => date && !Number.isNaN(date.getTime()));
  const recentYear = dates.length ? Math.max(...dates.map((date) => date.getFullYear())) : null;

  return {
    total_games: games.length,
    played_games: played.length,
    unplayed_games: games.length - played.length,
    total_hours: Math.round(games.reduce((sum, game) => sum + game["Playtime (hours)"], 0) * 100) / 100,
    top_game: played[0] ?? null,
    recent_year: recentYear,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, ""),
  };
}

function writeReportFiles(games) {
  const sortedGames = games.sort((a, b) => b["Playtime (minutes)"] - a["Playtime (minutes)"] || a.Name.localeCompare(b.Name));
  const topGames = sortedGames.filter((game) => game["Playtime (minutes)"] > 0).slice(0, 10);
  const buckets = buildBuckets(sortedGames);

  writeJson("games_data.json", sortedGames);
  writeJson("summary.json", buildSummary(sortedGames));
  writeJson("top_games_chart.json", {
    type: "bar",
    data: {
      labels: topGames.map((game) => game.Name),
      datasets: [
        {
          label: "Hours",
          data: topGames.map((game) => game["Playtime (hours)"]),
          backgroundColor: "#66c0f4",
          hoverBackgroundColor: "#a4d65e",
        },
      ],
    },
    options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false } } },
  });
  writeJson("playtime_distribution.json", {
    type: "bar",
    data: {
      labels: buckets.map((bucket) => bucket.label),
      datasets: [
        {
          label: "Games",
          data: buckets.map((bucket) => bucket.count),
          backgroundColor: "#ffb000",
          hoverBackgroundColor: "#ffd166",
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });

  return sortedGames;
}

function parseSteamProfile(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    throw new Error("Enter a Steam profile URL or SteamID64.");
  }

  if (/^\d{17}$/.test(raw)) {
    return { steamId: raw };
  }

  let url;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return { vanity: raw.replace(/^@/, "") };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const [kind, value] = parts;
  if (kind === "profiles" && /^\d{17}$/.test(value || "")) {
    return { steamId: value };
  }

  if (kind === "id" && value) {
    return { vanity: decodeURIComponent(value) };
  }

  throw new Error("Use a steamcommunity.com/id/name URL, /profiles/steamid URL, or raw SteamID64.");
}

function communityPathForProfile(profile) {
  const parsed = parseSteamProfile(profile);
  if (parsed.steamId) {
    return `profiles/${parsed.steamId}`;
  }

  return `id/${encodeURIComponent(parsed.vanity)}`;
}

function decodeXml(value) {
  return String(value || "")
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function xmlTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXml(match[1].trim()) : null;
}

function parseCommunityGamesXml(xml) {
  if (!/<gamesList[\s>]/i.test(xml) || /<title>\s*Sign In\s*<\/title>/i.test(xml)) {
    return [];
  }

  return [...xml.matchAll(/<game>([\s\S]*?)<\/game>/gi)]
    .map((match) => ({
      appID: xmlTag(match[1], "appID"),
      name: xmlTag(match[1], "name"),
      hoursOnRecord: xmlTag(match[1], "hoursOnRecord"),
    }))
    .filter((game) => game.appID && game.name);
}

async function fetchCommunityGames(profile) {
  const communityPath = communityPathForProfile(profile);
  const response = await fetch(`https://steamcommunity.com/${communityPath}/games/?tab=all&xml=1`);
  if (!response.ok) {
    return [];
  }

  return parseCommunityGamesXml(await response.text());
}

async function resolveSteamIdFromCommunity(profile) {
  const parsed = parseSteamProfile(profile);
  if (parsed.steamId) {
    return parsed.steamId;
  }

  const response = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(parsed.vanity)}?xml=1`);
  if (!response.ok) {
    return null;
  }

  return xmlTag(await response.text(), "steamID64");
}

async function steamApi(pathname, params) {
  const url = new URL(`https://api.steampowered.com/${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Steam API returned ${response.status}.`);
  }

  return response.json();
}

async function resolveSteamId(profile, apiKey) {
  const parsed = parseSteamProfile(profile);
  if (parsed.steamId) {
    return parsed.steamId;
  }

  const communitySteamId = await resolveSteamIdFromCommunity(profile);
  if (communitySteamId) {
    return communitySteamId;
  }

  const payload = await steamApi("ISteamUser/ResolveVanityURL/v0001/", {
    key: apiKey,
    vanityurl: parsed.vanity,
  });
  const response = payload.response || {};
  if (response.success !== 1 || !response.steamid) {
    throw new Error("Could not resolve that Steam vanity URL.");
  }

  return response.steamid;
}

async function fetchOwnedGames(steamId, apiKey) {
  const payload = await steamApi("IPlayerService/GetOwnedGames/v0001/", {
    key: apiKey,
    steamid: steamId,
    include_appinfo: "true",
    include_played_free_games: "true",
    include_free_sub: "true",
    language: "english",
  });

  return payload.response?.games || [];
}

app.use(express.static(publicDir));
app.use("/reports", express.static(reportDir));

app.get("/api/games", (_req, res) => {
  const games = readJson("games_data.json", []).map(normalizeGame);
  res.json({ games });
});

app.get("/api/report", (_req, res) => {
  const games = readJson("games_data.json", []).map(normalizeGame);
  const summary = readJson("summary.json", null);
  res.json({ games, summary });
});

app.get("/api/export", (_req, res) => {
  const bundle = {
    games: readJson("games_data.json", []),
    summary: readJson("summary.json", null),
    topGamesChart: readJson("top_games_chart.json", null),
    playtimeDistribution: readJson("playtime_distribution.json", null),
  };

  res.setHeader("Content-Disposition", "attachment; filename=\"steam-wrapped-report.json\"");
  res.json(bundle);
});

app.post("/api/import", async (req, res) => {
  try {
    const profile = String(req.body.profile || "").trim();
    if (!profile) {
      return res.status(400).json({ error: "Paste a Steam profile URL or SteamID64." });
    }

    const communityGames = await fetchCommunityGames(profile);
    if (communityGames.length) {
      const reportGames = writeReportFiles(communityGames.map(normalizeReportGame));
      const steamId = (await resolveSteamIdFromCommunity(profile)) || null;
      return res.json({
        source: "steam-community-xml",
        steamId,
        games: reportGames.map(normalizeGame),
        summary: buildSummary(reportGames),
      });
    }

    const apiKey = String(process.env.STEAM_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(400).json({
        error:
          "This profile could not be imported without Steam's API. Add STEAM_API_KEY to the backend .env so users do not need their own key.",
      });
    }

    const steamId = await resolveSteamId(profile, apiKey);
    const rawGames = await fetchOwnedGames(steamId, apiKey);
    if (!rawGames.length) {
      return res.status(404).json({
        error: "No public owned-game data came back for that profile. The profile and game details may be private.",
      });
    }

    const reportGames = writeReportFiles(rawGames.map(normalizeReportGame));
    res.json({
      source: "steam-web-api",
      steamId,
      games: reportGames.map(normalizeGame),
      summary: buildSummary(reportGames),
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not import that Steam profile." });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, reportDir, hasSteamApiKey: Boolean(process.env.STEAM_API_KEY) });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Steam Wrapped preview running at http://localhost:${port}`);
  });
}

module.exports = app;
