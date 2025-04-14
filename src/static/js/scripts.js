$(document).ready(function() {
    // Log to confirm jQuery is loaded
    console.log("jQuery loaded:", typeof $ !== "undefined");

    // Initialize Flatpickr date range picker with default to last 1 month
    try {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);

        flatpickr("#date_range", {
            mode: "range",
            dateFormat: "Y-m-d",
            defaultDate: [lastMonth, today],
            onChange: function(selectedDates) {
                if (selectedDates.length === 2) {
                    filterData(selectedDates[0], selectedDates[1]);
                }
            }
        });
        console.log("Flatpickr initialized with default range:", lastMonth.toISOString().split('T')[0], "to", today.toISOString().split('T')[0]);
        // Trigger initial filter with default range
        filterData(lastMonth, today);
    } catch (e) {
        console.error("Error initializing Flatpickr:", e);
    }

    // Initialize DataTable
    try {
        const table = $('#gamesTable').DataTable({
            responsive: true,
            pageLength: 10,
            order: [[2, 'desc']]  // Sort by Playtime (Hours) descending
        });
        console.log("DataTable initialized");
    } catch (e) {
        console.error("Error initializing DataTable:", e);
    }

    // Store chart instances to destroy them before re-rendering
    let topGamesChartInstance = null;
    let playtimeDistChartInstance = null;

    // Load initial charts using inlined data
    loadChart('topGamesChart', topGamesChartData, chart => topGamesChartInstance = chart, 'topGamesChartError');
    loadChart('playtimeDistChart', playtimeDistChartData, chart => playtimeDistChartInstance = chart, 'playtimeDistChartError');

    // Function to load Chart.js charts
    function loadChart(canvasId, chartData, setChartInstance, errorElementId) {
        const canvas = document.getElementById(canvasId);
        const errorElement = document.getElementById(errorElementId);
        if (!canvas) {
            console.error(`Canvas element ${canvasId} not found`);
            if (errorElement) errorElement.style.display = 'block';
            return;
        }

        try {
            if (!chartData || Object.keys(chartData).length === 0) {
                throw new Error(`Chart data for ${canvasId} is empty or invalid`);
            }
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, chartData);
            setChartInstance(chart);
            console.log(`Chart ${canvasId} loaded successfully`);
            if (errorElement) errorElement.style.display = 'none';
        } catch (error) {
            console.error(`Error loading chart ${canvasId}:`, error);
            if (errorElement) errorElement.style.display = 'block';
        }
    }

    // Function to filter data by date range
    function filterData(startDate, endDate) {
        try {
            const data = gamesData;
            if (!data || !Array.isArray(data)) {
                throw new Error("Games data is empty or invalid");
            }

            const filteredData = data.filter(row => {
                if (!row['Last Played']) return false;
                const lastPlayed = new Date(row['Last Played'].split('T')[0]);
                return lastPlayed >= startDate && lastPlayed <= endDate;
            });
            console.log("Filtered data length:", filteredData.length);

            // Update table
            const table = $('#gamesTable').DataTable();
            table.clear();
            filteredData.forEach(row => {
                table.row.add([
                    row.Name,
                    row.AppID,
                    row['Playtime (hours)'].toFixed(2),
                    row['Last Played'] ? row['Last Played'].split('T')[0] : 'Never'
                ]);
            });
            table.draw();
            console.log("Table updated with filtered data");

            // Update top games chart
            const top10 = filteredData.slice(0, 10);
            const topGamesConfig = {
                type: 'bar',
                data: {
                    labels: top10.map(row => row.Name),
                    datasets: [{
                        label: 'Playtime (Hours)',
                        data: top10.map(row => row['Playtime (hours)']),
                        backgroundColor: '#6b8e23',
                        hoverBackgroundColor: '#8ab92d'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Top 10 Games by Playtime' },
                        legend: { display: false }
                    },
                    scales: {
                        y: { title: { display: true, text: 'Playtime (Hours)' } }
                    }
                }
            };
            const topGamesCanvas = document.getElementById('topGamesChart');
            const topGamesError = document.getElementById('topGamesChartError');
            if (topGamesCanvas) {
                if (topGamesChartInstance) {
                    topGamesChartInstance.destroy();
                }
                topGamesChartInstance = new Chart(topGamesCanvas.getContext('2d'), topGamesConfig);
                console.log("Top Games chart updated");
                if (topGamesError) topGamesError.style.display = 'none';
            } else {
                console.error("Top Games canvas not found");
                if (topGamesError) topGamesError.style.display = 'block';
            }

            // Update playtime distribution chart
            const playtimeHours = filteredData.map(row => row['Playtime (hours)']);
            const maxHours = Math.max(...playtimeHours, 1); // Avoid division by zero
            const binSize = maxHours / 20; // 20 bins
            const bins = Array(20).fill(0);
            playtimeHours.forEach(hours => {
                const binIndex = Math.min(Math.floor(hours / binSize), 19);
                bins[binIndex]++;
            });
            const binLabels = Array.from({ length: 20 }, (_, i) => `${(i * binSize).toFixed(1)}-${((i + 1) * binSize).toFixed(1)}`);
            const playtimeDistConfig = {
                type: 'bar',
                data: {
                    labels: binLabels,
                    datasets: [{
                        label: 'Number of Games',
                        data: bins,
                        backgroundColor: '#4682b4',
                        hoverBackgroundColor: '#5a9bd4'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Playtime Distribution' },
                        legend: { display: false }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Playtime (Hours)' } },
                        y: { title: { display: true, text: 'Number of Games' } }
                    }
                }
            };
            const playtimeDistCanvas = document.getElementById('playtimeDistChart');
            const playtimeDistError = document.getElementById('playtimeDistChartError');
            if (playtimeDistCanvas) {
                if (playtimeDistChartInstance) {
                    playtimeDistChartInstance.destroy();
                }
                playtimeDistChartInstance = new Chart(playtimeDistCanvas.getContext('2d'), playtimeDistConfig);
                console.log("Playtime Distribution chart updated");
                if (playtimeDistError) playtimeDistError.style.display = 'none';
            } else {
                console.error("Playtime Distribution canvas not found");
                if (playtimeDistError) playtimeDistError.style.display = 'block';
            }
        } catch (error) {
            console.error('Error filtering data:', error);
        }
    }
});