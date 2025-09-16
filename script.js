class RadiosondeDashboard {
    constructor() {
        this.sondes = new Map();
        this.activeSondes = new Set();
        this.map = null;
        this.charts = {};
        this.colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
            '#10ac84', '#ee5253', '#0abde3', '#006ba6', '#f368e0'
        ];

        this.initializeMap();
        this.setupEventListeners();
        this.setDefaultDates();

        // Load sample data for demonstration
        this.loadSampleData();
    }

    initializeMap() {
        // Initialize map centered on Bucharest
        this.map = L.map('map').setView([44.4268, 26.1025], 10);

        // Add dark theme tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
    }

    setupEventListeners() {
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.loadSondeFiles(e.target.files);
        });

        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.setQuickTimeRange(e.target.value);
        });

        document.getElementById('refreshData').addEventListener('click', () => {
            this.updateVisualization();
        });

        document.getElementById('exportData').addEventListener('click', () => {
            this.exportToCSV();
        });

        document.getElementById('startDate').addEventListener('change', () => {
            this.updateVisualization();
        });

        document.getElementById('endDate').addEventListener('change', () => {
            this.updateVisualization();
        });
    }

    setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    }

    setQuickTimeRange(days) {
        const endDate = new Date();
        const startDate = new Date();

        if (days !== 'all') {
            startDate.setDate(endDate.getDate() - parseInt(days));
            document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        } else {
            document.getElementById('startDate').value = '';
        }

        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        this.updateVisualization();
    }

    async loadSondeFiles(files) {
        this.showLoading(true);
        this.sondes.clear();
        this.activeSondes.clear();

        const logFiles = Array.from(files).filter(file => file.name.endsWith('.log'));

        for (const file of logFiles) {
            try {
                const content = await this.readFile(file);
                const sondeId = file.name.replace('.log', '');
                const data = this.parseLogFile(content, sondeId);

                if (data.length > 0) {
                    this.sondes.set(sondeId, data);
                    this.activeSondes.add(sondeId);
                }
            } catch (error) {
                console.error(`Error loading ${file.name}:`, error);
            }
        }

        this.createSondeList();
        this.updateVisualization();
        this.showLoading(false);
    }

    loadSampleData() {
        // For demonstration purposes, load the sample data
        const sampleContent = `2025-09-15 14:16:38 | Lat: 44.48800, Lon: 26.24694, Alt: 4014.2 m, vH: 27.0 km/h, vV: 3.3 m/s, Dir: 120.3
2025-09-15 14:16:57 | Lat: 44.48762, Lon: 26.24836, Alt: 4090.3 m, vH: 19.4 km/h, vV: 3.9 m/s, Dir: 100.4
2025-09-15 14:17:11 | Lat: 44.48731, Lon: 26.24938, Alt: 4153.8 m, vH: 29.9 km/h, vV: 4.6 m/s, Dir: 97.8
2025-09-15 14:17:28 | Lat: 44.48686, Lon: 26.25068, Alt: 4236.3 m, vH: 21.6 km/h, vV: 5.8 m/s, Dir: 110.5
2025-09-15 14:17:34 | Lat: 44.48662, Lon: 26.25113, Alt: 4262.6 m, vH: 28.8 km/h, vV: 3.5 m/s, Dir: 119.9
2025-09-15 14:17:39 | Lat: 44.48645, Lon: 26.25159, Alt: 4284.1 m, vH: 25.9 km/h, vV: 3.7 m/s, Dir: 112.7
2025-09-15 14:17:40 | Lat: 44.48642, Lon: 26.25168, Alt: 4288.8 m, vH: 27.0 km/h, vV: 5.7 m/s, Dir: 116.7
2025-09-15 14:17:44 | Lat: 44.48629, Lon: 26.25204, Alt: 4308.4 m, vH: 29.9 km/h, vV: 4.3 m/s, Dir: 116.2
2025-09-15 14:17:45 | Lat: 44.48625, Lon: 26.25213, Alt: 4312.0 m, vH: 30.2 km/h, vV: 2.9 m/s, Dir: 119.8
2025-09-15 14:17:46 | Lat: 44.48621, Lon: 26.25222, Alt: 4314.9 m, vH: 30.6 km/h, vV: 3.0 m/s, Dir: 120.6
2025-09-15 14:19:11 | Lat: 44.48467, Lon: 26.26067, Alt: 4601.3 m, vH: 31.3 km/h, vV: 3.8 m/s, Dir: 99.9
2025-09-15 14:19:18 | Lat: 44.48455, Lon: 26.26140, Alt: 4625.3 m, vH: 32.4 km/h, vV: 2.1 m/s, Dir: 103.3
2025-09-15 14:19:20 | Lat: 44.48450, Lon: 26.26164, Alt: 4631.2 m, vH: 36.0 km/h, vV: 3.2 m/s, Dir: 104.7
2025-09-15 14:19:21 | Lat: 44.48448, Lon: 26.26176, Alt: 4634.2 m, vH: 37.4 km/h, vV: 2.8 m/s, Dir: 105.7
2025-09-15 14:21:45 | Lat: 44.48015, Lon: 26.27641, Alt: 5176.8 m, vH: 44.6 km/h, vV: 4.3 m/s, Dir: 123.9
2025-09-15 14:21:46 | Lat: 44.48009, Lon: 26.27654, Alt: 5180.7 m, vH: 43.2 km/h, vV: 3.7 m/s, Dir: 121.8
2025-09-15 14:21:47 | Lat: 44.48004, Lon: 26.27666, Alt: 5184.3 m, vH: 41.4 km/h, vV: 3.4 m/s, Dir: 122.3
2025-09-15 14:21:48 | Lat: 44.47998, Lon: 26.27678, Alt: 5188.2 m, vH: 40.7 km/h, vV: 4.3 m/s, Dir: 124.5
2025-09-15 14:21:49 | Lat: 44.47992, Lon: 26.27690, Alt: 5192.0 m, vH: 39.6 km/h, vV: 3.6 m/s, Dir: 128.3
2025-09-15 14:21:50 | Lat: 44.47986, Lon: 26.27700, Alt: 5195.8 m, vH: 39.6 km/h, vV: 3.9 m/s, Dir: 131.1
2025-09-15 14:21:51 | Lat: 44.47979, Lon: 26.27711, Alt: 5199.6 m, vH: 41.0 km/h, vV: 3.9 m/s, Dir: 128.7
2025-09-15 14:22:05 | Lat: 44.47903, Lon: 26.27894, Alt: 5259.0 m, vH: 41.0 km/h, vV: 3.8 m/s, Dir: 115.4
2025-09-15 14:22:23 | Lat: 44.47817, Lon: 26.28120, Alt: 5355.9 m, vH: 37.4 km/h, vV: 6.3 m/s, Dir: 103.0
2025-09-15 14:22:28 | Lat: 44.47803, Lon: 26.28183, Alt: 5382.5 m, vH: 37.1 km/h, vV: 3.9 m/s, Dir: 109.8
2025-09-15 14:22:29 | Lat: 44.47800, Lon: 26.28196, Alt: 5387.4 m, vH: 40.0 km/h, vV: 6.0 m/s, Dir: 111.3
2025-09-15 14:22:30 | Lat: 44.47796, Lon: 26.28209, Alt: 5392.2 m, vH: 41.0 km/h, vV: 3.7 m/s, Dir: 113.8
2025-09-15 14:22:31 | Lat: 44.47791, Lon: 26.28222, Alt: 5396.5 m, vH: 40.0 km/h, vV: 4.9 m/s, Dir: 116.4
2025-09-15 14:22:32 | Lat: 44.47787, Lon: 26.28234, Alt: 5401.8 m, vH: 36.4 km/h, vV: 5.8 m/s, Dir: 114.4
2025-09-15 14:22:36 | Lat: 44.47776, Lon: 26.28279, Alt: 5423.5 m, vH: 38.2 km/h, vV: 7.0 m/s, Dir: 100.6`;

        const sondeId = "SAMPLE";
        const data = this.parseLogFile(sampleContent, sondeId);

        if (data.length > 0) {
            this.sondes.set(sondeId, data);
            this.activeSondes.add(sondeId);
            this.createSondeList();
            this.updateVisualization();
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    parseLogFile(content, sondeId) {
        const lines = content.trim().split('\n');
        const data = [];

        for (const line of lines) {
            const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| Lat: ([-\d.]+), Lon: ([-\d.]+), Alt: ([-\d.]+) m, vH: ([-\d.]+) km\/h, vV: ([-\d.]+) m\/s, Dir: ([-\d.]+)/);

            if (match) {
                data.push({
                    sondeId: sondeId,
                    timestamp: new Date(match[1]),
                    lat: parseFloat(match[2]),
                    lon: parseFloat(match[3]),
                    alt: parseFloat(match[4]),
                    vH: parseFloat(match[5]),
                    vV: parseFloat(match[6]),
                    dir: parseFloat(match[7])
                });
            }
        }

        return data.sort((a, b) => a.timestamp - b.timestamp);
    }

    createSondeList() {
        const container = document.getElementById('sondeList');
        container.innerHTML = '';

        Array.from(this.sondes.keys()).forEach((sondeId, index) => {
            const color = this.colors[index % this.colors.length];
            const item = document.createElement('div');
            item.className = 'sonde-item';
            item.dataset.sondeId = sondeId;

            item.innerHTML = `
                <input type="checkbox" class="sonde-checkbox" id="sonde-${sondeId}"
                       ${this.activeSondes.has(sondeId) ? 'checked' : ''}>
                <div class="sonde-color" style="background-color: ${color}"></div>
                <label for="sonde-${sondeId}">${sondeId}</label>
            `;

            const checkbox = item.querySelector('.sonde-checkbox');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activeSondes.add(sondeId);
                } else {
                    this.activeSondes.delete(sondeId);
                }
                this.updateVisualization();
            });

            container.appendChild(item);
        });
    }

    getFilteredData() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;

        const filteredData = new Map();

        for (const [sondeId, data] of this.sondes.entries()) {
            if (!this.activeSondes.has(sondeId)) continue;

            const filtered = data.filter(point => {
                if (start && point.timestamp < start) return false;
                if (end && point.timestamp > end) return false;
                return true;
            });

            if (filtered.length > 0) {
                filteredData.set(sondeId, filtered);
            }
        }

        return filteredData;
    }

    updateVisualization() {
        const filteredData = this.getFilteredData();
        this.updateMap(filteredData);
        this.updateCharts(filteredData);
        this.updateStats(filteredData);
    }

    updateMap(data) {
        // Clear existing layers except base tile layer
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                this.map.removeLayer(layer);
            }
        });

        const bounds = [];

        Array.from(data.entries()).forEach(([sondeId, points], index) => {
            const color = this.colors[index % this.colors.length];
            const coords = points.map(p => [p.lat, p.lon]);
            bounds.push(...coords);

            // Draw trajectory
            const trajectory = L.polyline(coords, {
                color: color,
                weight: 3,
                opacity: 0.8
            }).addTo(this.map);

            trajectory.bindPopup(`<b>${sondeId}</b><br>Points: ${points.length}`);

            // Add start marker
            if (points.length > 0) {
                const start = points[0];
                L.marker([start.lat, start.lon], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                        iconSize: [16, 16]
                    })
                }).bindPopup(`<b>${sondeId}</b> - Start<br>Alt: ${start.alt.toFixed(1)}m`).addTo(this.map);

                // Add end marker
                const end = points[points.length - 1];
                L.marker([end.lat, end.lon], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(255,255,255,0.5);"></div>`,
                        iconSize: [22, 22]
                    })
                }).bindPopup(`<b>${sondeId}</b> - End<br>Alt: ${end.alt.toFixed(1)}m`).addTo(this.map);
            }
        });

        // Fit map to bounds
        if (bounds.length > 0) {
            this.map.fitBounds(bounds, {
                padding: [20, 20]
            });
        }
    }

    updateCharts(data) {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });

        const datasets = {
            altitude: [],
            speed: [],
            verticalSpeed: [],
            direction: []
        };

        Array.from(data.entries()).forEach(([sondeId, points], index) => {
            const color = this.colors[index % this.colors.length];

            datasets.altitude.push({
                label: sondeId,
                data: points.map(p => ({
                    x: p.timestamp,
                    y: p.alt
                })),
                borderColor: color,
                backgroundColor: color + '20',
                fill: false,
                tension: 0.4,
                pointRadius: 0
            });

            datasets.speed.push({
                label: sondeId,
                data: points.map(p => ({
                    x: p.timestamp,
                    y: p.vH
                })),
                borderColor: color,
                backgroundColor: color + '20',
                fill: false,
                tension: 0.4,
                pointRadius: 0
            });

            datasets.verticalSpeed.push({
                label: sondeId,
                data: points.map(p => ({
                    x: p.timestamp,
                    y: p.vV
                })),
                borderColor: color,
                backgroundColor: color + '20',
                fill: false,
                tension: 0.4,
                pointRadius: 0
            });

            datasets.direction.push({
                label: sondeId,
                data: points.map(p => ({
                    x: p.timestamp,
                    y: p.dir
                })),
                borderColor: color,
                backgroundColor: color + '20',
                fill: false,
                tension: 0.4,
                pointRadius: 0
            });
        });

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e0e6ed'
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    ticks: {
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    }
                }
            }
        };

        this.charts.altitude = new Chart(document.getElementById('altitudeChart'), {
            type: 'line',
            data: {
                datasets: datasets.altitude
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        ...chartOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Altitude (m)',
                            color: '#a0a0a0'
                        }
                    }
                }
            }
        });

        this.charts.speed = new Chart(document.getElementById('speedChart'), {
            type: 'line',
            data: {
                datasets: datasets.speed
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        ...chartOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Speed (km/h)',
                            color: '#a0a0a0'
                        }
                    }
                }
            }
        });

        this.charts.verticalSpeed = new Chart(document.getElementById('verticalSpeedChart'), {
            type: 'line',
            data: {
                datasets: datasets.verticalSpeed
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        ...chartOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Vertical Speed (m/s)',
                            color: '#a0a0a0'
                        }
                    }
                }
            }
        });

        this.charts.direction = new Chart(document.getElementById('directionChart'), {
            type: 'line',
            data: {
                datasets: datasets.direction
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        ...chartOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Direction (°)',
                            color: '#a0a0a0'
                        },
                        min: 0,
                        max: 360
                    }
                }
            }
        });
    }

    updateStats(data) {
        const allPoints = Array.from(data.values()).flat();
        const statCards = document.querySelectorAll('.stat-card .stat-value');

        if (allPoints.length === 0) {
            statCards[0].textContent = '0';
            statCards[1].textContent = '0';
            statCards[2].textContent = '0 m';
            statCards[3].textContent = '0 km/h';
            return;
        }

        const maxAlt = Math.max(...allPoints.map(p => p.alt));
        const maxSpeed = Math.max(...allPoints.map(p => p.vH));

        statCards[0].textContent = data.size;
        statCards[1].textContent = allPoints.length;
        statCards[2].textContent = `${maxAlt.toFixed(0)} m`;
        statCards[3].textContent = `${maxSpeed.toFixed(1)} km/h`;
    }

    exportToCSV() {
        const data = this.getFilteredData();
        if (data.size === 0) {
            alert('No data to export');
            return;
        }

        let csvContent = 'Sonde ID,Timestamp,Latitude,Longitude,Altitude (m),Horizontal Speed (km/h),Vertical Speed (m/s),Direction (°)\n';

        for (const [sondeId, points] of data.entries()) {
            for (const point of points) {
                csvContent += `${sondeId},${point.timestamp.toISOString()},${point.lat},${point.lon},${point.alt},${point.vH},${point.vV},${point.dir}\n`;
            }
        }

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'radiosonde_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RadiosondeDashboard();
});