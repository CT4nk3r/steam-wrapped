const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS) from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to render the Steam Wrapped page
app.get('/', (req, res) => {
    try {
        // Read JSON data
        const gamesData = JSON.parse(fs.readFileSync('../data/games_data.json', 'utf8'));
        const topGamesChartData = JSON.parse(fs.readFileSync('../data/top_games_chart.json', 'utf8'));
        const playtimeDistChartData = JSON.parse(fs.readFileSync('../data/playtime_distribution.json', 'utf8'));

        // Calculate summary stats
        const totalGames = gamesData.length;
        const totalPlaytimeHours = gamesData.reduce((sum, game) => sum + game['Playtime (hours)'], 0).toFixed(2);
        const mostPlayedGame = gamesData.length > 0 ? gamesData[0].Name : "No games played";
        const mostPlayedTime = gamesData.length > 0 ? gamesData[0]['Playtime (hours)'].toFixed(2) : 0;

        // Prepare table rows data
        const tableRows = gamesData.map(row => ({
            name: row.Name,
            appId: row.AppID,
            playtime: row['Playtime (hours)'].toFixed(2),
            lastPlayed: row['Last Played'] ? row['Last Played'].split('T')[0] : 'Never'
        }));

        // Render the page with the data
        res.render('index', {
            totalGames,
            totalPlaytimeHours,
            mostPlayedGame,
            mostPlayedTime,
            tableRows,
            topGamesChartData: JSON.stringify(topGamesChartData),
            playtimeDistChartData: JSON.stringify(playtimeDistChartData),
            gamesData: JSON.stringify(gamesData)
        });
    } catch (error) {
        console.error('Error loading data:', error);
        res.status(500).send('Error loading Steam Wrapped data. Please ensure the data files exist in the data/ directory.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});