const state = {
  games: [],
  filter: "all",
  search: "",
  sort: "playtime",
  minimumHours: 0,
};

const elements = {
  snapshotLabel: document.getElementById("snapshotLabel"),
  heroStory: document.getElementById("heroStory"),
  heroStats: document.getElementById("heroStats"),
  heroVisual: document.getElementById("heroVisual"),
  metricGrid: document.getElementById("metricGrid"),
  topGamesList: document.getElementById("topGamesList"),
  storyStrip: document.getElementById("storyStrip"),
  resultCount: document.getElementById("resultCount"),
  libraryGrid: document.getElementById("libraryGrid"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  minimumHours: document.getElementById("minimumHours"),
  minimumHoursValue: document.getElementById("minimumHoursValue"),
  importForm: document.getElementById("importForm"),
  profileInput: document.getElementById("profileInput"),
  importButton: document.getElementById("importButton"),
  importStatus: document.getElementById("importStatus"),
  gameCardTemplate: document.getElementById("gameCardTemplate"),
};

function normalizeGame(game) {
  const minutes = Number(game.minutes ?? game["Playtime (minutes)"] ?? game.playtime_forever ?? 0);
  const hours = Number(game.hours ?? game["Playtime (hours)"] ?? minutes / 60);
  const appId = Number(game.appId ?? game.AppID ?? game.appid ?? 0);
  const lastPlayed = game.lastPlayed ?? game["Last Played"] ?? null;

  return {
    name: String(game.name ?? game.Name ?? "Unknown game"),
    appId,
    minutes,
    hours: Math.round(hours * 100) / 100,
    lastPlayed,
    lastPlayedDate: lastPlayed ? new Date(lastPlayed) : null,
    played: Boolean(game.played ?? game.Played ?? minutes > 0),
    art: appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg` : "",
  };
}

function number(value, maximumFractionDigits = 0) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits });
}

function formatHours(hours) {
  if (hours <= 0) {
    return "0h";
  }

  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))}m`;
  }

  return `${number(hours, hours < 10 ? 1 : 0)}h`;
}

function formatDate(value) {
  if (!value || Number.isNaN(value.getTime())) {
    return "Never";
  }

  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMonthYear(value) {
  if (!value || Number.isNaN(value.getTime())) {
    return "No activity";
  }

  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
}

function validDates(games) {
  return games.map((game) => game.lastPlayedDate).filter((date) => date && !Number.isNaN(date.getTime()));
}

function getStats(games) {
  const played = games.filter((game) => game.minutes > 0);
  const unplayed = games.length - played.length;
  const totalHours = played.reduce((sum, game) => sum + game.hours, 0);
  const topGame = played[0] ?? null;
  const dates = validDates(games);
  const latestDate = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
  const oldestDate = dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null;
  const recentYear = latestDate ? latestDate.getFullYear() : null;
  const playedInRecentYear = recentYear
    ? played.filter((game) => game.lastPlayedDate && game.lastPlayedDate.getFullYear() === recentYear).length
    : 0;
  const highCommitment = played.filter((game) => game.hours >= 50).length;
  const backlogRatio = games.length ? Math.round((unplayed / games.length) * 100) : 0;
  const topShare = topGame && totalHours ? Math.round((topGame.hours / totalHours) * 100) : 0;

  return {
    played,
    unplayed,
    totalHours,
    topGame,
    latestDate,
    oldestDate,
    recentYear,
    playedInRecentYear,
    highCommitment,
    backlogRatio,
    topShare,
  };
}

function imageElement(game, className) {
  const image = document.createElement("img");
  image.className = className;
  image.alt = game.name;
  image.loading = "lazy";
  if (game.art) {
    image.src = game.art;
  }
  image.addEventListener("error", () => {
    image.removeAttribute("src");
    image.classList.add("missing-art");
  });
  return image;
}

function renderHero(games) {
  const stats = getStats(games);
  const top = stats.topGame;
  const totalGames = games.length;

  elements.snapshotLabel.textContent = stats.latestDate
    ? `Last activity ${formatMonthYear(stats.latestDate)}`
    : `${number(totalGames)} games loaded`;

  if (!top) {
    elements.heroStory.textContent = "Your library is loaded, but there is no recorded playtime yet.";
    elements.heroVisual.dataset.label = "No top game yet";
    elements.heroStats.innerHTML = "";
    return;
  }

  elements.heroStory.textContent = `${top.name} leads the library with ${formatHours(top.hours)}, taking ${stats.topShare}% of all recorded playtime. ${number(stats.played.length)} games have seen action, while ${number(stats.unplayed)} are still waiting on the shelf.`;
  elements.heroVisual.style.backgroundImage = `linear-gradient(180deg, rgba(16, 17, 20, 0.02), rgba(16, 17, 20, 0.58)), url("${top.art}")`;
  elements.heroVisual.dataset.label = `${top.name}  |  ${formatHours(top.hours)}`;

  elements.heroStats.innerHTML = "";
  [
    ["Total hours", formatHours(stats.totalHours)],
    ["Played games", number(stats.played.length)],
    ["Latest session", formatMonthYear(stats.latestDate)],
  ].forEach(([label, value]) => {
    const node = document.createElement("div");
    node.className = "hero-stat";
    node.innerHTML = `<span></span><strong></strong>`;
    node.querySelector("span").textContent = label;
    node.querySelector("strong").textContent = value;
    elements.heroStats.appendChild(node);
  });
}

function renderMetrics(games) {
  const stats = getStats(games);
  const days = stats.totalHours / 24;
  const average = stats.played.length ? stats.totalHours / stats.played.length : 0;
  const metrics = [
    ["Library", number(games.length), `${number(stats.played.length)} played`],
    ["Total playtime", formatHours(stats.totalHours), `${number(days, 1)} days equivalent`],
    ["Most played", stats.topGame ? stats.topGame.name : "None", stats.topGame ? formatHours(stats.topGame.hours) : "0h"],
    ["Backlog", `${stats.backlogRatio}%`, `${number(stats.unplayed)} unplayed games`],
  ];

  elements.metricGrid.innerHTML = "";
  metrics.forEach(([label, value, detail]) => {
    const node = document.createElement("article");
    node.className = "metric";
    node.innerHTML = `<span></span><strong></strong><em></em>`;
    node.querySelector("span").textContent = label;
    node.querySelector("strong").textContent = value;
    node.querySelector("em").textContent = detail;
    elements.metricGrid.appendChild(node);
  });

  if (elements.minimumHours) {
    const maxHours = Math.max(100, Math.ceil((stats.topGame?.hours ?? 100) / 10) * 10);
    elements.minimumHours.max = String(maxHours);
  }
}

function renderTopGames(games) {
  const topGames = games.filter((game) => game.minutes > 0).slice(0, 7);
  elements.topGamesList.innerHTML = "";

  topGames.forEach((game, index) => {
    const row = document.createElement("div");
    row.className = "top-game-row";
    row.appendChild(imageElement(game, ""));

    const text = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = `${index + 1}. ${game.name}`;
    meta.textContent = `Last played ${formatDate(game.lastPlayedDate)}`;
    text.append(title, meta);

    const hours = document.createElement("b");
    hours.textContent = formatHours(game.hours);
    row.append(text, hours);
    elements.topGamesList.appendChild(row);
  });
}

function buildBuckets(games) {
  const buckets = [
    { label: "<1h", min: 0, max: 1, color: "#66c0f4" },
    { label: "1-5h", min: 1, max: 5, color: "#a4d65e" },
    { label: "5-20h", min: 5, max: 20, color: "#ffb000" },
    { label: "20-50h", min: 20, max: 50, color: "#ff6b6b" },
    { label: "50-100h", min: 50, max: 100, color: "#c4a7ff" },
    { label: "100h+", min: 100, max: Infinity, color: "#f4f2eb" },
  ];

  return buckets.map((bucket) => ({
    ...bucket,
    count: games.filter((game) => game.hours >= bucket.min && game.hours < bucket.max && game.minutes > 0).length,
  }));
}

function renderCharts(games) {
  const topChart = document.getElementById("topGamesChart");
  const bucketChart = document.getElementById("bucketChart");
  const topGames = games.filter((game) => game.minutes > 0).slice(0, 8);
  const maxHours = Math.max(...topGames.map((game) => game.hours), 1);
  const colors = ["#66c0f4", "#a4d65e", "#ffb000", "#ff6b6b"];

  topChart.innerHTML = "";
  topGames.forEach((game, index) => {
    const row = document.createElement("div");
    row.className = "bar-chart-row";
    row.style.setProperty("--bar-color", colors[index % colors.length]);
    row.style.setProperty("--bar-width", `${Math.max(5, (game.hours / maxHours) * 100)}%`);
    row.innerHTML = `
      <div class="bar-chart-label">
        <strong></strong>
        <span></span>
      </div>
      <div class="bar-chart-track"><i></i></div>
      <b></b>
    `;
    row.querySelector("strong").textContent = game.name;
    row.querySelector("span").textContent = `#${index + 1}`;
    row.querySelector("b").textContent = formatHours(game.hours);
    topChart.appendChild(row);
  });

  const buckets = buildBuckets(games);
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0) || 1;
  let start = 0;
  const segments = buckets
    .filter((bucket) => bucket.count > 0)
    .map((bucket) => {
      const end = start + (bucket.count / total) * 100;
      const segment = `${bucket.color} ${start}% ${end}%`;
      start = end;
      return segment;
    })
    .join(", ");

  bucketChart.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${segments});">
        <span>${total}</span>
        <small>played games</small>
      </div>
    </div>
    <div class="bucket-legend"></div>
  `;

  const legend = bucketChart.querySelector(".bucket-legend");
  buckets.forEach((bucket) => {
    const item = document.createElement("div");
    item.className = "bucket-item";
    item.style.setProperty("--bucket-color", bucket.color);
    item.innerHTML = `<span></span><strong></strong><em></em>`;
    item.querySelector("span").textContent = bucket.label;
    item.querySelector("strong").textContent = number(bucket.count);
    item.querySelector("em").textContent = `${Math.round((bucket.count / total) * 100)}%`;
    legend.appendChild(item);
  });
}

function renderStories(games) {
  const stats = getStats(games);
  const newest = stats.played
    .filter((game) => game.lastPlayedDate && !Number.isNaN(game.lastPlayedDate.getTime()))
    .sort((a, b) => b.lastPlayedDate - a.lastPlayedDate)[0];
  const oldestFavorite = stats.played
    .filter((game) => game.hours >= 10 && game.lastPlayedDate && !Number.isNaN(game.lastPlayedDate.getTime()))
    .sort((a, b) => a.lastPlayedDate - b.lastPlayedDate)[0];
  const recentYearLabel = stats.recentYear ? String(stats.recentYear) : "Recent";

  const stories = [
    {
      label: "Main character",
      title: stats.topGame ? stats.topGame.name : "No main yet",
      body: stats.topGame ? `${formatHours(stats.topGame.hours)} makes it the clear signature game.` : "No recorded playtime yet.",
    },
    {
      label: recentYearLabel,
      title: `${number(stats.playedInRecentYear)} games played`,
      body: stats.recentYear ? `That is the most recent activity year in this snapshot.` : "No last-played dates were available.",
    },
    {
      label: "Deep cuts",
      title: `${number(stats.highCommitment)} games over 50h`,
      body: oldestFavorite
        ? `${oldestFavorite.name} is the long-dormant favorite, last played ${formatDate(oldestFavorite.lastPlayedDate)}.`
        : "The library is wide, but the long-haul club is still forming.",
    },
  ];

  elements.storyStrip.innerHTML = "";
  stories.forEach((story) => {
    const node = document.createElement("article");
    node.className = "story-card";
    node.innerHTML = `<span></span><strong></strong><p></p>`;
    node.querySelector("span").textContent = story.label;
    node.querySelector("strong").textContent = story.title;
    node.querySelector("p").textContent = story.body;
    elements.storyStrip.appendChild(node);
  });
}

function applyFilters() {
  const search = state.search.trim().toLowerCase();
  let games = [...state.games];

  if (state.filter === "played") {
    games = games.filter((game) => game.minutes > 0);
  }

  if (state.filter === "unplayed") {
    games = games.filter((game) => game.minutes === 0);
  }

  if (search) {
    games = games.filter((game) => game.name.toLowerCase().includes(search));
  }

  games = games.filter((game) => game.hours >= state.minimumHours);

  games.sort((a, b) => {
    if (state.sort === "recent") {
      const aTime = a.lastPlayedDate && !Number.isNaN(a.lastPlayedDate.getTime()) ? a.lastPlayedDate.getTime() : 0;
      const bTime = b.lastPlayedDate && !Number.isNaN(b.lastPlayedDate.getTime()) ? b.lastPlayedDate.getTime() : 0;
      return bTime - aTime || b.minutes - a.minutes;
    }

    if (state.sort === "name") {
      return a.name.localeCompare(b.name);
    }

    if (state.sort === "unplayed") {
      return a.minutes - b.minutes || a.name.localeCompare(b.name);
    }

    return b.minutes - a.minutes || a.name.localeCompare(b.name);
  });

  return games;
}

function renderLibrary() {
  const filtered = applyFilters();
  elements.resultCount.textContent = `${number(filtered.length)} of ${number(state.games.length)} games`;
  elements.minimumHoursValue.textContent = `${state.minimumHours}h`;
  elements.libraryGrid.innerHTML = "";

  if (!filtered.length) {
    const node = document.createElement("div");
    node.className = "empty-state";
    node.textContent = "No games match the current filters.";
    elements.libraryGrid.appendChild(node);
    return;
  }

  const topHours = Math.max(...state.games.map((game) => game.hours), 1);
  const fragment = document.createDocumentFragment();

  filtered.forEach((game) => {
    const node = elements.gameCardTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector(".game-art");
    image.alt = game.name;
    image.src = game.art;
    image.addEventListener("error", () => {
      image.removeAttribute("src");
      image.classList.add("missing-art");
    });

    node.querySelector("h3").textContent = game.name;
    node.querySelector(".game-meta").textContent = `App ${game.appId || "unknown"}  |  ${formatDate(game.lastPlayedDate)}`;
    node.querySelector(".game-hours").textContent = formatHours(game.hours);
    node.querySelector(".bar span").style.width = `${Math.max(2, (game.hours / topHours) * 100)}%`;
    fragment.appendChild(node);
  });

  elements.libraryGrid.appendChild(fragment);
}

function renderDashboard() {
  const games = state.games;
  if (!games.length) {
    throw new Error("No report data found.");
  }

  renderHero(games);
  renderMetrics(games);
  renderTopGames(games);
  renderCharts(games);
  renderStories(games);
  renderLibrary();
}

function setImportStatus(message, tone = "neutral") {
  elements.importStatus.textContent = message;
  elements.importStatus.dataset.tone = tone;
}

async function importSteamProfile(event) {
  event.preventDefault();

  const profile = elements.profileInput.value.trim();
  if (!profile) {
    setImportStatus("Paste a Steam profile URL first.", "error");
    elements.profileInput.focus();
    return;
  }

  elements.importButton.disabled = true;
  setImportStatus("Fetching Steam library...", "loading");

  try {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `Import failed with ${response.status}.`);
    }

    state.games = (payload.games ?? []).map(normalizeGame).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
    state.filter = "all";
    state.search = "";
    state.sort = "playtime";
    state.minimumHours = 0;
    elements.searchInput.value = "";
    elements.sortSelect.value = "playtime";
    elements.minimumHours.value = "0";
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
    renderDashboard();
    const profileLabel = payload.steamId ? ` for ${payload.steamId}` : "";
    setImportStatus(`Imported ${number(state.games.length)} games${profileLabel}.`, "success");
  } catch (error) {
    setImportStatus(error.message || "Could not import this profile.", "error");
  } finally {
    elements.importButton.disabled = false;
  }
}

function bindControls() {
  elements.importForm.addEventListener("submit", importSteamProfile);

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderLibrary();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderLibrary();
  });

  elements.minimumHours.addEventListener("input", (event) => {
    state.minimumHours = Number(event.target.value);
    renderLibrary();
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
      renderLibrary();
    });
  });
}

function renderError(error) {
  elements.snapshotLabel.textContent = "No report loaded";
  const message = error?.message ?? "Unknown error";
  document.querySelector("main").innerHTML = `
    <section class="error-state">
      <h1>Steam Wrapped</h1>
      <p>${message}</p>
      <p>Generate data with <code>python src/main.py</code>, then run <code>npm start</code> inside <code>webapp</code>.</p>
    </section>
  `;
}

async function loadReport() {
  const response = await fetch("/api/report");
  if (!response.ok) {
    throw new Error(`Report API returned ${response.status}.`);
  }

  const report = await response.json();
  state.games = (report.games ?? []).map(normalizeGame).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
}

bindControls();
loadReport().then(renderDashboard).catch(renderError);
