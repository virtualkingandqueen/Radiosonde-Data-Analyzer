// Map configuration
const mapStyles = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    light: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://openttopomap.org">OpenTopoMap</a>'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
};

// Global variables
let map;
let flightData = [];
let mapLayer;
let altitudeChart, speedChart, velocityChart, directionChart;
let activeSondes = new Set();
let currentDirectoryHandle = null;
let refreshInterval;
let isAutoRefreshEnabled = false;
let fileHandlesCache = new Map();

// Initialize the application
function init() {
    initMap();
    createCharts();
    setupEventListeners();
}

// Initialize map with dark theme
function initMap() {
    map = L.map('map').setView([44.4987, 26.1979], 10);
    setMapStyle('dark');

    // Add scale control
    L.control.scale({
        metric: true,
        imperial: false
    }).addTo(map);
}

// Set map style
function setMapStyle(style) {
    if (mapLayer) {
        map.removeLayer(mapLayer);
    }

    mapLayer = L.tileLayer(mapStyles[style].url, {
        attribution: mapStyles[style].attribution,
        maxZoom: 18
    }).addTo(map);

    // Update active button state
    document.querySelectorAll('.map-style-btn').forEach(btn => {
        if (btn.dataset.style === style) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Generate consistent color for each sonde based on its name
function generateColorFromName(name) {
    // Simple hash function to generate consistent number from name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to generate HSL values
    const hue = Math.abs(hash % 360);
    const saturation = 70 + Math.abs(hash % 30); // 70-100%
    const lightness = 50 + Math.abs(hash % 20); // 50-70%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Create all charts
function createCharts() {
    // Altitude chart
    const altCtx = document.getElementById('altitudeChart').getContext('2d');
    altitudeChart = new Chart(altCtx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Altitude vs Time',
                    color: '#e0e0e0'
                },
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time (minutes from launch)',
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Altitude (m)',
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });

    // Speed chart
    const speedCtx = document.getElementById('speedChart').getContext('2d');
    speedChart = new Chart(speedCtx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Horizontal Speed vs Time',
                    color: '#e0e0e0'
                },
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time (minutes from launch)',
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Horizontal Speed (km/h)',
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });

    // Vertical velocity chart
    const velocityCtx = document.getElementById('velocityChart').getContext('2d');
    velocityChart = new Chart(velocityCtx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Vertical Velocity vs Time',
                    color: '#e0e0e0'
                },
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time (minutes from launch)',
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Vertical Velocity (m/s)',
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });

    // Direction chart
    const directionCtx = document.getElementById('directionChart').getContext('2d');
    directionChart = new Chart(directionCtx, {
        type: 'scatter',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Direction Analysis',
                    color: '#e0e0e0'
                },
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time (minutes from launch)',
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    type: 'linear',
                    min: 0,
                    max: 360,
                    title: {
                        display: true,
                        text: 'Direction (°)',
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // File input handler
    document.getElementById('logFiles').addEventListener('click', async (e) => {
        e.preventDefault();
        await selectDirectory();
    });

    // Map style buttons
    document.querySelectorAll('.map-style-btn').forEach(btn => {
        btn.addEventListener('click', () => setMapStyle(btn.dataset.style));
    });
}

// Select directory using the File System Access API
async function selectDirectory() {
    try {
        // Check if the File System Access API is supported
        if (!window.showDirectoryPicker) {
            alert('Your browser does not support the File System Access API. Please use Chrome, Edge, or another modern browser.');
            return;
        }

        // Request directory access
        currentDirectoryHandle = await window.showDirectoryPicker();

        // Clear any existing refresh interval
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        // Process initial load
        await processDirectory();

        // Start auto-refresh every second
        refreshInterval = setInterval(async () => {
            await processDirectory(true);
        }, 1000);

        isAutoRefreshEnabled = true;
        console.log('Auto-refresh enabled');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error selecting directory:', error);
        }
    }
}

// Process directory (initial load or refresh)
async function processDirectory(isRefresh = false) {
    if (!currentDirectoryHandle) return;

    let hasNewData = false;

    try {
        // Get all files in the directory
        const files = [];
        for await (const entry of currentDirectoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.log')) {
                files.push(entry);
            }
        }

        // Process each file
        for (const fileHandle of files) {
            try {
                const file = await fileHandle.getFile();
                const lastModified = file.lastModified;
                const cachedFile = fileHandlesCache.get(file.name);

                // Skip if file hasn't changed since last check
                if (isRefresh && cachedFile && cachedFile.lastModified === lastModified) {
                    continue;
                }

                // Read and process the file
                const content = await file.text();
                const flight = parseLogFile(content, file.name);

                if (flight) {
                    // Store file metadata in cache
                    fileHandlesCache.set(file.name, {
                        lastModified: lastModified,
                        flightId: flight.id
                    });

                    // Check if this flight already exists
                    const existingFlightIndex = flightData.findIndex(f => f.filename === flight.filename);

                    if (existingFlightIndex === -1) {
                        // New flight
                        flightData.push(flight);
                        activeSondes.add(flight.id);
                        hasNewData = true;
                        console.log(`New flight detected: ${flight.filename}`);
                    } else {
                        // Existing flight - check if it has new data
                        const existingFlight = flightData[existingFlightIndex];

                        // Store the active state before updating
                        const wasActive = activeSondes.has(existingFlight.id);

                        // Calculate content hash to detect actual changes
                        const contentHash = await hashContent(content);

                        // Check if we have a cached hash for this file
                        const cachedHash = cachedFile ? cachedFile.contentHash : null;

                        // Update if content has changed or if we have more data points
                        if (contentHash !== cachedHash || flight.points.length > existingFlight.points.length) {
                            // Update the flight with new data but preserve the ID
                            flight.id = existingFlight.id; // Keep the same ID
                            flightData[existingFlightIndex] = flight;

                            // Restore the active state
                            if (wasActive) {
                                activeSondes.add(flight.id);
                            }

                            // Update cache with new hash
                            fileHandlesCache.set(file.name, {
                                lastModified: lastModified,
                                flightId: flight.id,
                                contentHash: contentHash
                            });

                            hasNewData = true;
                            console.log(`Flight updated: ${flight.filename} (${flight.points.length} points)`);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing file ${fileHandle.name}:`, error);
            }
        }

        // Only update UI if we have new data
        if (hasNewData || !isRefresh) {
            updateSondesList();
            updateMap();
            updateCharts();
            updateStats();
        }
    } catch (error) {
        console.error('Error processing directory:', error);
    }
}

// Simple hash function to detect content changes
async function hashContent(content) {
    // Use a simple hash to detect content changes
    let hash = 0;
    if (content.length === 0) return hash;

    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    return hash;
}

// Parse log file content
function parseLogFile(content, filename) {
    const lines = content.split('\n').filter(line => line.trim());
    const points = [];
    // Generate a consistent ID based on filename instead of random
    const id = generateIdFromFilename(filename);
    const name = filename.replace('.log', '');

    lines.forEach(line => {
        const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| Lat: ([\d.-]+), Lon: ([\d.-]+), Alt: ([\d.-]+) m, vH: ([\d.-]+) km\/h, vV: ([\d.-]+) m\/s, Dir: ([\d.-]+)/);

        if (match) {
            const [, timestamp, lat, lon, alt, vH, vV, dir] = match;
            points.push({
                timestamp: new Date(timestamp),
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                altitude: parseFloat(alt),
                horizontalVelocity: parseFloat(vH),
                verticalVelocity: parseFloat(vV),
                direction: parseFloat(dir)
            });
        }
    });

    if (points.length === 0) return null;

    // Generate a consistent color for this sonde based on its name
    const color = generateColorFromName(name);

    return {
        id: id,
        filename: name,
        points: points,
        launchTime: points[0].timestamp,
        maxAltitude: Math.max(...points.map(p => p.altitude)),
        maxSpeed: Math.max(...points.map(p => p.horizontalVelocity)),
        duration: (points[points.length - 1].timestamp - points[0].timestamp) / 1000 / 60, // minutes
        color: color
    };
}

// Generate consistent ID based on filename instead of random
function generateIdFromFilename(filename) {
    // Simple hash function to generate consistent ID from filename
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
        const char = filename.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return 'flight_' + Math.abs(hash).toString(16);
}

// Update sondes list in sidebar
function updateSondesList() {
    const container = document.getElementById('sondesContainer');

    if (flightData.length === 0) {
        container.innerHTML = '<div class="no-sondes">No sondes loaded yet</div>';
        return;
    }

    container.innerHTML = '';

    flightData.forEach(flight => {
        const isActive = activeSondes.has(flight.id);
        const sondeElement = document.createElement('div');
        sondeElement.className = `sonde-item ${isActive ? 'active' : ''}`;
        sondeElement.dataset.id = flight.id;

        sondeElement.innerHTML = `
            <div class="sonde-color" style="background-color: ${flight.color}"></div>
            <div class="sonde-info">
                <div class="sonde-name">${flight.filename}</div>
                <div class="sonde-details">
                    <span>${flight.launchTime.toLocaleDateString()}</span>
                    <span>${flight.points.length} points</span>
                </div>
            </div>
            <div class="sonde-toggle">
                <i class="fas ${isActive ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </div>
        `;

        sondeElement.addEventListener('click', () => toggleSonde(flight.id));
        container.appendChild(sondeElement);
    });
}

// Toggle sonde visibility
function toggleSonde(id) {
    if (activeSondes.has(id)) {
        activeSondes.delete(id);
    } else {
        activeSondes.add(id);
    }

    updateSondesList();
    updateMap();
    updateCharts();
}

// Update map with flight paths
function updateMap() {
    // Clear existing layers except base layer
    map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    const bounds = [];

    flightData.forEach(flight => {
        if (!activeSondes.has(flight.id)) return;

        const coordinates = flight.points.map(p => [p.lat, p.lon]);
        bounds.push(...coordinates);

        // Create polyline
        const polyline = L.polyline(coordinates, {
            color: flight.color,
            weight: 3,
            opacity: 0.8
        }).addTo(map);

        // Add markers for start and end
        const startMarker = L.circleMarker([flight.points[0].lat, flight.points[0].lon], {
            color: flight.color,
            fillColor: flight.color,
            fillOpacity: 0.8,
            radius: 6
        }).addTo(map);

        const endMarker = L.circleMarker([flight.points[flight.points.length - 1].lat,
            flight.points[flight.points.length - 1].lon
        ], {
            color: flight.color,
            fillColor: 'white',
            fillOpacity: 0.8,
            radius: 8
        }).addTo(map);

        // Add interactive points along the path
        flight.points.forEach((point, index) => {
            if (index % Math.ceil(flight.points.length / 20) === 0) {
                L.circleMarker([point.lat, point.lon], {
                    color: flight.color,
                    fillColor: flight.color,
                    fillOpacity: 0.6,
                    radius: 3
                }).bindPopup(`
                    <div style="color: #333;">
                        <strong>${flight.filename}</strong><br>
                        <strong>Time:</strong> ${point.timestamp.toLocaleString()}<br>
                        <strong>Altitude:</strong> ${point.altitude.toFixed(1)} m<br>
                        <strong>H. Speed:</strong> ${point.horizontalVelocity.toFixed(1)} km/h<br>
                        <strong>V. Speed:</strong> ${point.verticalVelocity.toFixed(1)} m/s<br>
                        <strong>Direction:</strong> ${point.direction.toFixed(1)}°
                    </div>
                `).addTo(map);
            }
        });

        // Add flight info popup to start marker
        startMarker.bindPopup(`
            <div style="color: #333;">
                <strong>${flight.filename}</strong><br>
                <strong>Launch:</strong> ${flight.launchTime.toLocaleString()}<br>
                <strong>Color:</strong> <span style="color: ${flight.color}">■</span><br>
                <strong>Max Altitude:</strong> ${flight.maxAltitude.toFixed(1)} m<br>
                <strong>Duration:</strong> ${flight.duration.toFixed(1)} min<br>
                <strong>Points:</strong> ${flight.points.length}
            </div>
        `);
    });

    // Fit map to show all active flights
    if (bounds.length > 0) {
        map.fitBounds(bounds, {
            padding: [20, 20]
        });
    }
}

// Update all charts
function updateCharts() {
    const altDatasets = [];
    const speedDatasets = [];
    const velocityDatasets = [];
    const directionDatasets = [];

    flightData.forEach((flight, index) => {
        if (!activeSondes.has(flight.id)) return;

        const startTime = flight.points[0].timestamp;

        const altData = flight.points.map(point => ({
            x: (point.timestamp - startTime) / 1000 / 60,
            y: point.altitude
        }));

        const speedData = flight.points.map(point => ({
            x: (point.timestamp - startTime) / 1000 / 60,
            y: point.horizontalVelocity
        }));

        const velocityData = flight.points.map(point => ({
            x: (point.timestamp - startTime) / 1000 / 60,
            y: point.verticalVelocity
        }));

        const directionData = flight.points.map(point => ({
            x: (point.timestamp - startTime) / 1000 / 60,
            y: point.direction
        }));

        altDatasets.push({
            label: flight.filename,
            data: altData,
            borderColor: flight.color,
            backgroundColor: flight.color + '40',
            borderWidth: 2,
            fill: false,
            pointRadius: 1,
            pointHoverRadius: 4
        });

        speedDatasets.push({
            label: flight.filename,
            data: speedData,
            borderColor: flight.color,
            backgroundColor: flight.color + '40',
            borderWidth: 2,
            fill: false,
            pointRadius: 1,
            pointHoverRadius: 4
        });

        velocityDatasets.push({
            label: flight.filename,
            data: velocityData,
            borderColor: flight.color,
            backgroundColor: flight.color + '40',
            borderWidth: 2,
            fill: false,
            pointRadius: 1,
            pointHoverRadius: 4
        });

        directionDatasets.push({
            label: flight.filename,
            data: directionData,
            borderColor: flight.color,
            backgroundColor: flight.color + '40',
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5
        });
    });

    altitudeChart.data.datasets = altDatasets;
    speedChart.data.datasets = speedDatasets;
    velocityChart.data.datasets = velocityDatasets;
    directionChart.data.datasets = directionDatasets;

    altitudeChart.update();
    speedChart.update();
    velocityChart.update();
    directionChart.update();
}

// Update statistics
function updateStats() {
    const activeFlights = flightData.filter(f => activeSondes.has(f.id));
    const total = activeFlights.length;

    if (total === 0) {
        document.getElementById('totalFlights').textContent = '0';
        document.getElementById('maxAltitude').textContent = '0 m';
        document.getElementById('avgDuration').textContent = '0 min';
        document.getElementById('maxSpeed').textContent = '0 km/h';
        return;
    }

    const maxAlt = Math.max(...activeFlights.map(f => f.maxAltitude));
    const maxSpeed = Math.max(...activeFlights.map(f => f.maxSpeed));
    const avgDuration = activeFlights.reduce((sum, f) => sum + f.duration, 0) / total;

    document.getElementById('totalFlights').textContent = total;
    document.getElementById('maxAltitude').textContent = maxAlt.toFixed(1) + ' m';
    document.getElementById('avgDuration').textContent = avgDuration.toFixed(1) + ' min';
    document.getElementById('maxSpeed').textContent = maxSpeed.toFixed(1) + ' km/h';
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);