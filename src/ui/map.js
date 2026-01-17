/**
 * Map Module
 * Mapbox GL JS wrapper for SF neighborhood visualization
 */

// SF center coordinates
const SF_CENTER = [-122.4194, 37.7749];
const SF_ZOOM = 11;

// Blockface tileset configuration
const BLOCKFACE_TILESET = 'mapbox://seanmihalyinrix.rxk1qkqbpkdj';
const BLOCKFACE_SOURCE_LAYER = 'f1d474fc43d80d86dec8';

/**
 * Perceptually uniform color schemes for map visualization
 * Each scheme has color stops at positions 0, 0.25, 0.5, 0.75, 1
 */
const COLOR_SCHEMES = {
    viridis: {
        id: 'viridis',
        name: 'Viridis',
        description: 'Purple to green to yellow (colorblind-friendly)',
        stops: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725']
    },
    plasma: {
        id: 'plasma',
        name: 'Plasma',
        description: 'Purple to orange to yellow',
        stops: ['#0d0887', '#7e03a8', '#cc4778', '#f89540', '#f0f921']
    },
    inferno: {
        id: 'inferno',
        name: 'Inferno',
        description: 'Black to purple to orange to yellow',
        stops: ['#000004', '#57106e', '#bc3754', '#f98e09', '#fcffa4']
    },
    magma: {
        id: 'magma',
        name: 'Magma',
        description: 'Black to purple to pink to white',
        stops: ['#000004', '#51127c', '#b73779', '#fc8961', '#fcfdbf']
    },
    cividis: {
        id: 'cividis',
        name: 'Cividis',
        description: 'Blue to gray to yellow (colorblind-optimized)',
        stops: ['#00224e', '#3d4e67', '#7d7f7c', '#b8ae6f', '#fee838']
    },
    turbo: {
        id: 'turbo',
        name: 'Turbo',
        description: 'Rainbow-like with improved uniformity',
        stops: ['#30123b', '#4662d7', '#35aac3', '#a4d848', '#f9fb0e']
    },
    ylgnbu: {
        id: 'ylgnbu',
        name: 'YlGnBu',
        description: 'Yellow to green to blue',
        stops: ['#ffffd9', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494']
    },
    ylorrd: {
        id: 'ylorrd',
        name: 'YlOrRd',
        description: 'Yellow to orange to red',
        stops: ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026']
    },
    rdylgn: {
        id: 'rdylgn',
        name: 'RdYlGn',
        description: 'Red to yellow to green (traffic light)',
        stops: ['#d73027', '#fc8d59', '#fee08b', '#91cf60', '#1a9850']
    },
    blues: {
        id: 'blues',
        name: 'Blues',
        description: 'Light to dark blue',
        stops: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b']
    },
    spectral: {
        id: 'spectral',
        name: 'Spectral',
        description: 'Red to yellow to blue (diverging)',
        stops: ['#d53e4f', '#fc8d59', '#fee08b', '#99d594', '#3288bd']
    },
    pubugn: {
        id: 'pubugn',
        name: 'PuBuGn',
        description: 'Purple to blue to green',
        stops: ['#f6eff7', '#bdc9e1', '#67a9cf', '#1c9099', '#016c59']
    }
};

// Default color schemes for each layer
let aoiColorScheme = 'viridis';
let blockfaceColorScheme = 'viridis';

/**
 * Get color from a scheme based on normalized value (0-1)
 * @param {number} t - Normalized value between 0 and 1
 * @param {string} [schemeId] - Color scheme ID (defaults to aoiColorScheme)
 * @returns {string} Hex color
 */
function getSchemeColor(t, schemeId = aoiColorScheme) {
    const scheme = COLOR_SCHEMES[schemeId];
    if (!scheme) return '#888888';

    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    // Find which segment we're in (4 segments between 5 stops)
    const segment = Math.min(3, Math.floor(t * 4));
    const segmentT = (t * 4) - segment;

    return lerpColor(scheme.stops[segment], scheme.stops[segment + 1], segmentT);
}

/**
 * Get all available color schemes
 * @returns {Array} Array of scheme objects
 */
export function getColorSchemes() {
    return Object.values(COLOR_SCHEMES);
}

/**
 * Convert neighborhood display name to URL-safe ID
 * @param {string} name - Display name (e.g., "Downtown/Civic Center")
 * @returns {string} ID (e.g., "downtown-civic-center")
 */
function nameToId(name) {
    return name
        .toLowerCase()
        .replace(/[\/\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

/**
 * Convert occupancy value (0-100) to color using current scheme
 * @param {number} value - Occupancy percentage
 * @returns {string} Hex color
 */
function occupancyToColor(value, schemeId) {
    // Normalize 0-100 to 0-1
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    return getSchemeColor(normalized, schemeId);
}

/**
 * Convert transaction value to color based on min/max range using specified scheme
 * @param {number} value - Transaction dollar amount
 * @param {number} minValue - Minimum value in dataset
 * @param {number} maxValue - Maximum value in dataset
 * @param {string} [schemeId] - Color scheme ID
 * @returns {string} Hex color
 */
function transactionToColor(value, minValue, maxValue, schemeId) {
    if (maxValue === minValue) return getSchemeColor(0.5, schemeId); // Middle color if no range
    const normalized = (value - minValue) / (maxValue - minValue);
    return getSchemeColor(normalized, schemeId);
}

/**
 * Get abbreviated statistic label
 * @param {string} statistic - Statistic ID
 * @returns {string} Abbreviated label
 */
function getStatisticLabel(statistic) {
    const labels = {
        'actual': '',
        'average': 'avg',
        'median': 'med',
        'min': 'min',
        'max': 'max',
        'mode': 'mode',
        'p25': 'p25',
        'p75': 'p75',
        'total': 'total'
    };
    return labels[statistic] || statistic;
}

/**
 * Get full statistic name for legend
 * @param {string} statistic - Statistic ID
 * @returns {string} Full name
 */
function getStatisticName(statistic) {
    const names = {
        'actual': 'Actual',
        'average': 'Avg',
        'median': 'Median',
        'min': 'Min',
        'max': 'Max',
        'mode': 'Mode',
        'p25': 'P25',
        'p75': 'P75',
        'total': 'Total'
    };
    return names[statistic] || statistic;
}

/**
 * Format a value for display based on dataset type
 * @param {number} value - The value to format
 * @param {boolean} isTransactions - Whether this is transaction data
 * @param {string} [statistic] - Optional statistic to include as suffix
 * @returns {string} Formatted value string
 */
function formatValue(value, isTransactions, statistic) {
    if (value === null || value === undefined) return 'N/A';

    let formattedValue;
    if (isTransactions) {
        if (value >= 1000000) {
            formattedValue = '$' + (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            formattedValue = '$' + (value / 1000).toFixed(1) + 'K';
        } else {
            formattedValue = '$' + value.toFixed(0);
        }
    } else {
        formattedValue = value.toFixed(1) + '%';
    }

    // Add statistic suffix if provided
    if (statistic && statistic !== 'actual') {
        const label = getStatisticLabel(statistic);
        formattedValue += ' ' + label;
    }

    return formattedValue;
}

/**
 * Linear interpolation between two hex colors
 * @param {string} color1 - Start color (hex)
 * @param {string} color2 - End color (hex)
 * @param {number} t - Interpolation factor (0-1)
 * @returns {string} Interpolated hex color
 */
function lerpColor(color1, color2, t) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Build popup HTML for blockface hover (T014)
 * @param {Object} properties - Blockface feature properties from tileset
 * @param {string} schemeId - Color scheme to use
 * @param {string} datasetType - 'occupancy' or 'transactions'
 * @param {Object} [calculatedData] - Calculated data from time-series {value, name}
 * @param {string} [statistic] - Current statistic being displayed
 * @param {Object} [valueRange] - Value range for transactions {min, max}
 * @returns {string} HTML string
 */
function buildBlockfacePopupHtml(properties, schemeId, datasetType = 'occupancy', calculatedData = null, statistic = 'average', valueRange = { min: 0, max: 100 }) {
    const { segmentId, capacity, occupancy, meterId } = properties;
    const isTransactions = datasetType === 'transactions';

    // Use calculated data if available, otherwise fall back to tileset data
    const hasCalculatedData = calculatedData && typeof calculatedData.value === 'number';
    const displayName = (hasCalculatedData && calculatedData.name) || meterId || segmentId;

    let displayValue;
    let color;

    if (isTransactions) {
        if (hasCalculatedData) {
            displayValue = formatValue(calculatedData.value, true, statistic);
            color = transactionToColor(calculatedData.value, valueRange.min, valueRange.max, schemeId);
        } else {
            // No transaction data available for non-featured segments
            displayValue = 'N/A';
            color = '#666';
        }
    } else {
        // Occupancy
        if (hasCalculatedData) {
            displayValue = calculatedData.value.toFixed(1) + '%';
            color = occupancyToColor(calculatedData.value, schemeId);
        } else {
            // Fall back to tileset occupancy
            displayValue = typeof occupancy === 'number' ? occupancy.toFixed(1) + '%' : 'N/A';
            color = typeof occupancy === 'number' ? occupancyToColor(occupancy, schemeId) : '#666';
        }
    }

    // Add statistic label if not 'actual'
    const statLabel = statistic && statistic !== 'actual' ? ` (${getStatisticLabel(statistic)})` : '';

    // Show featured badge if has calculated data
    const featuredBadge = hasCalculatedData
        ? '<span style="background: #3498db; color: white; padding: 1px 4px; border-radius: 3px; font-size: 0.7em; margin-left: 4px;">FEATURED</span>'
        : '';

    return `
        <div class="popup-content">
            <div class="popup-name">${displayName}${featuredBadge}</div>
            <div class="popup-detail">Capacity: ${capacity ?? 'N/A'}</div>
            <div class="popup-value" style="color: ${color}; font-weight: bold;">
                ${displayValue}${statLabel}
            </div>
        </div>
    `;
}

/**
 * Create a new map instance
 * @param {HTMLElement} container - DOM element to render map into
 * @param {Object} config - Map configuration
 * @returns {Object} Map instance interface
 */
export function createMap(container, config) {
    if (!container) {
        throw new Error('Container not found');
    }

    if (typeof mapboxgl === 'undefined') {
        throw new Error('Mapbox GL JS not loaded');
    }

    const {
        accessToken,
        style,
        geojsonUrl,
        center = SF_CENTER,
        zoom = SF_ZOOM,
        minZoom = 10,
        maxZoom = 20,
        // Initial settings (applied when map loads)
        initialAoiVisible = true,
        initialBlockfaceVisible = false,
        initialAoiColorScheme = 'viridis',
        initialBlockfaceColorScheme = 'viridis',
        initialAoiDataset = 'occupancy',
        initialBlockfaceDataset = 'occupancy'
    } = config;

    // Set access token
    mapboxgl.accessToken = accessToken;

    // Create map instance
    const map = new mapboxgl.Map({
        container: container,
        style: style,
        center: center,
        zoom: zoom,
        minZoom: minZoom,
        maxZoom: maxZoom
    });

    // State
    let selectedNeighborhood = null;
    let hoveredNeighborhood = null;
    let neighborhoodData = new Map();
    let clickCallback = null;
    let hoverCallback = null;
    let isLoaded = false;
    let pendingData = null; // Neighborhood data received before map loaded
    let pendingBlockfaceData = null; // Blockface data received before map loaded
    let pendingBlockfaceOptions = null; // Blockface options received before map loaded

    // AOI layer state
    let aoiDatasetType = initialAoiDataset; // 'occupancy' or 'transactions'
    let aoiStatistic = 'average'; // 'average', 'total', 'min', 'max', etc.
    let aoiValueRange = { min: 0, max: 100 }; // For color scaling
    let aoiLayerVisible = initialAoiVisible;
    let aoiColorScheme = initialAoiColorScheme;

    // Blockface layer state
    let blockfaceDatasetType = initialBlockfaceDataset; // 'occupancy' or 'transactions'
    let blockfaceStatistic = 'average';
    let blockfaceValueRange = { min: 0, max: 100 };
    let blockfaceLayerVisible = initialBlockfaceVisible;
    let blockfaceColorScheme = initialBlockfaceColorScheme;
    let blockfaceData = new Map(); // segmentId -> calculated value
    let featuredSegmentIds = new Set(); // Track which segments have time-series data

    // Blockface state (T008)
    let hoveredBlockface = null;
    let blockfaceClickCallback = null;
    let blockfaceHoverCallback = null;

    // Create popup for hover tooltip
    const hoverPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'neighborhood-popup'
    });

    // Create popup for blockface hover tooltip
    const blockfacePopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'neighborhood-popup'
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add ARIA attributes for accessibility
    container.setAttribute('role', 'application');
    container.setAttribute('aria-label', 'San Francisco neighborhood map. Click a neighborhood to filter data.');
    container.setAttribute('tabindex', '0');

    // Add keyboard navigation
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && selectedNeighborhood) {
            // Deselect neighborhood on Escape
            if (clickCallback) {
                clickCallback(null);
            }
        }
    });

    // Load GeoJSON and create layers when map is ready
    map.on('load', async () => {
        try {
            // Load GeoJSON source
            const response = await fetch(geojsonUrl);
            if (!response.ok) {
                throw new Error(`Failed to load GeoJSON: ${response.status}`);
            }
            const geojson = await response.json();

            // Add source
            map.addSource('neighborhoods', {
                type: 'geojson',
                data: geojson
            });

            // Add fill layer for neighborhood polygons
            map.addLayer({
                id: 'neighborhood-fills',
                type: 'fill',
                source: 'neighborhoods',
                paint: {
                    'fill-color': '#cccccc',
                    'fill-opacity': 0.7
                }
            });

            // Add border layer
            map.addLayer({
                id: 'neighborhood-borders',
                type: 'line',
                source: 'neighborhoods',
                paint: {
                    'line-color': '#666666',
                    'line-width': 1
                }
            });

            // Add hover layer for neighborhood hover state
            map.addLayer({
                id: 'neighborhood-hover',
                type: 'fill',
                source: 'neighborhoods',
                paint: {
                    'fill-color': '#ffffff',
                    'fill-opacity': 0.3
                },
                filter: ['==', ['get', 'name'], '']
            });

            // Add highlight layer for selected neighborhood
            map.addLayer({
                id: 'neighborhood-highlight',
                type: 'line',
                source: 'neighborhoods',
                paint: {
                    'line-color': '#3498db',
                    'line-width': 3
                },
                filter: ['==', ['get', 'name'], '']
            });

            // T004: Add blockface tileset source
            map.addSource('blockfaces', {
                type: 'vector',
                url: BLOCKFACE_TILESET
            });

            // T005: Add blockface-lines layer (occupancy-based color interpolation)
            map.addLayer({
                id: 'blockface-lines',
                type: 'line',
                source: 'blockfaces',
                'source-layer': BLOCKFACE_SOURCE_LAYER,
                layout: {
                    'visibility': 'none'  // Hidden by default
                },
                paint: {
                    'line-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'occupancy'],
                        0, COLOR_SCHEMES[blockfaceColorScheme].stops[0],
                        25, COLOR_SCHEMES[blockfaceColorScheme].stops[1],
                        50, COLOR_SCHEMES[blockfaceColorScheme].stops[2],
                        75, COLOR_SCHEMES[blockfaceColorScheme].stops[3],
                        100, COLOR_SCHEMES[blockfaceColorScheme].stops[4]
                    ],
                    'line-width': [
                        'interpolate',
                        ['exponential', 1.25],
                        ['zoom'],
                        14, 4,
                        20, 14
                    ],
                    'line-opacity': 0.8
                }
            });

            // T006: Add blockface-hover layer (white highlight)
            map.addLayer({
                id: 'blockface-hover',
                type: 'line',
                source: 'blockfaces',
                'source-layer': BLOCKFACE_SOURCE_LAYER,
                layout: {
                    'visibility': 'none'
                },
                paint: {
                    'line-color': '#ffffff',
                    'line-width': [
                        'interpolate',
                        ['exponential', 1.25],
                        ['zoom'],
                        14, 6,
                        20, 18
                    ],
                    'line-opacity': 0.6
                },
                filter: ['==', ['get', 'segmentId'], '']
            });

            // T007: Add blockface-highlight layer (selection highlight)
            map.addLayer({
                id: 'blockface-highlight',
                type: 'line',
                source: 'blockfaces',
                'source-layer': BLOCKFACE_SOURCE_LAYER,
                layout: {
                    'visibility': 'none'
                },
                paint: {
                    'line-color': '#3498db',
                    'line-width': [
                        'interpolate',
                        ['exponential', 1.25],
                        ['zoom'],
                        14, 6,
                        20, 18
                    ]
                },
                filter: ['==', ['get', 'segmentId'], '']
            });

            // Set up click events
            map.on('click', 'neighborhood-fills', (e) => {
                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    const name = feature.properties.name;
                    const id = nameToId(name);
                    if (clickCallback) {
                        // Pass modifier key state for multi-select support
                        clickCallback(id, {
                            ctrlKey: e.originalEvent.ctrlKey || e.originalEvent.metaKey,
                            shiftKey: e.originalEvent.shiftKey
                        });
                    }
                }
            });

            // Helper function to build popup HTML
            function buildPopupHtml(name, id) {
                const data = neighborhoodData.get(id);
                const value = data ? data.value : null;
                const isTransactions = aoiDatasetType === 'transactions';
                const valueText = formatValue(value, isTransactions, aoiStatistic);
                let valueColor = '#666666';
                if (value !== null) {
                    valueColor = isTransactions
                        ? transactionToColor(value, aoiValueRange.min, aoiValueRange.max, aoiColorScheme)
                        : occupancyToColor(value, aoiColorScheme);
                }

                return `
                    <div class="popup-content">
                        <div class="popup-name">${name}</div>
                        <div class="popup-value" style="color: ${valueColor}; font-weight: bold;">
                            ${valueText}
                        </div>
                    </div>
                `;
            }

            // Set up hover events
            map.on('mouseenter', 'neighborhood-fills', (e) => {
                map.getCanvas().style.cursor = 'pointer';
            });

            // Update popup position and content on mouse move
            map.on('mousemove', 'neighborhood-fills', (e) => {
                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    const name = feature.properties.name;
                    const id = nameToId(name);

                    // Update popup position
                    hoverPopup.setLngLat(e.lngLat);

                    // Update content only if hovering a different neighborhood
                    if (hoveredNeighborhood !== id) {
                        hoveredNeighborhood = id;

                        // Update hover layer filter to show this neighborhood
                        map.setFilter('neighborhood-hover', ['==', ['get', 'name'], name]);

                        // Build and set popup HTML with colorized value
                        const popupHtml = buildPopupHtml(name, id);

                        hoverPopup
                            .setHTML(popupHtml)
                            .addTo(map);

                        if (hoverCallback) {
                            hoverCallback(id);
                        }
                    }
                }
            });

            map.on('mouseleave', 'neighborhood-fills', () => {
                map.getCanvas().style.cursor = '';
                hoveredNeighborhood = null;
                // Clear hover layer
                map.setFilter('neighborhood-hover', ['==', ['get', 'name'], '']);
                hoverPopup.remove();
                if (hoverCallback) {
                    hoverCallback(null);
                }
            });

            // T016: Blockface mouseenter event handler (cursor pointer)
            map.on('mouseenter', 'blockface-lines', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            // T017: Blockface mousemove event handler (update hover filter, show popup)
            map.on('mousemove', 'blockface-lines', (e) => {
                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    const segmentId = feature.properties.segmentId;

                    if (hoveredBlockface !== segmentId) {
                        hoveredBlockface = segmentId;
                        map.setFilter('blockface-hover', ['==', ['get', 'segmentId'], segmentId]);

                        // Get calculated data for this segment if available (featured blockfaces)
                        const calculatedData = blockfaceData.get(segmentId);

                        // Show popup with calculated data
                        const popupHtml = buildBlockfacePopupHtml(
                            feature.properties,
                            blockfaceColorScheme,
                            blockfaceDatasetType,
                            calculatedData,
                            blockfaceStatistic,
                            blockfaceValueRange
                        );
                        blockfacePopup
                            .setLngLat(e.lngLat)
                            .setHTML(popupHtml)
                            .addTo(map);

                        if (blockfaceHoverCallback) {
                            blockfaceHoverCallback(segmentId, feature.properties);
                        }
                    } else {
                        // Update popup position as mouse moves
                        blockfacePopup.setLngLat(e.lngLat);
                    }
                }
            });

            // T018: Blockface mouseleave event handler (clear hover, remove popup)
            map.on('mouseleave', 'blockface-lines', () => {
                map.getCanvas().style.cursor = '';
                hoveredBlockface = null;
                map.setFilter('blockface-hover', ['==', ['get', 'segmentId'], '']);
                blockfacePopup.remove();

                if (blockfaceHoverCallback) {
                    blockfaceHoverCallback(null);
                }
            });

            // T020: Add click event handler for blockface-lines layer
            map.on('click', 'blockface-lines', (e) => {
                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    const segmentId = feature.properties.segmentId;
                    const properties = feature.properties;

                    if (blockfaceClickCallback) {
                        blockfaceClickCallback(segmentId, properties, {
                            ctrlKey: e.originalEvent.ctrlKey || e.originalEvent.metaKey,
                            shiftKey: e.originalEvent.shiftKey
                        });
                    }
                }
            });

            isLoaded = true;

            // Apply initial layer visibility settings
            const aoiVisibility = aoiLayerVisible ? 'visible' : 'none';
            const blockfaceVisibility = blockfaceLayerVisible ? 'visible' : 'none';

            ['neighborhood-fills', 'neighborhood-borders', 'neighborhood-hover', 'neighborhood-highlight']
                .forEach(id => {
                    if (map.getLayer(id)) {
                        map.setLayoutProperty(id, 'visibility', aoiVisibility);
                    }
                });

            ['blockface-lines', 'blockface-hover', 'blockface-highlight']
                .forEach(id => {
                    if (map.getLayer(id)) {
                        map.setLayoutProperty(id, 'visibility', blockfaceVisibility);
                    }
                });

            // Apply any pending data that arrived before map loaded
            if (pendingData) {
                applyNeighborhoodColors(pendingData);
                pendingData = null;
            }

            // Apply blockface colors based on current dataset type
            // This ensures correct coloring (grey for non-featured when transactions selected)
            if (pendingBlockfaceData) {
                applyBlockfaceColors(pendingBlockfaceData);
                pendingBlockfaceData = null;
                pendingBlockfaceOptions = null;
            } else {
                // No pending data - apply empty data to set correct default coloring
                applyBlockfaceColors([]);
            }

            // Update legend with current state
            updateLegend();

        } catch (error) {
            console.error('Failed to load map layers:', error);
        }
    });

    /**
     * Update a single legend element
     * @param {HTMLElement} legend - Legend element
     * @param {string} datasetType - 'occupancy' or 'transactions'
     * @param {string} statistic - Statistic type
     * @param {Object} valueRange - {min, max} value range
     */
    function updateSingleLegend(legend, datasetType, statistic, valueRange, colorScheme) {
        if (!legend) return;

        const isTransactions = datasetType === 'transactions';
        const titleEl = legend.querySelector('.map-legend-title');
        const scaleEl = legend.querySelector('.map-legend-scale');
        const gradientEl = legend.querySelector('.map-legend-gradient');

        if (titleEl) {
            // Build title with statistic prefix (e.g., "Avg Revenue", "Total Revenue")
            const statName = getStatisticName(statistic);
            const dataName = isTransactions ? 'Revenue' : 'Occupancy';
            titleEl.textContent = statistic === 'actual' ? dataName : `${statName} ${dataName}`;
        }

        if (scaleEl) {
            const labels = scaleEl.querySelectorAll('span');
            if (labels.length >= 2) {
                if (isTransactions) {
                    // For transactions, show $ values without statistic suffix in scale
                    labels[0].textContent = formatValue(valueRange.min, true);
                    labels[1].textContent = formatValue(valueRange.max, true);
                } else {
                    labels[0].textContent = '0%';
                    labels[1].textContent = '100%';
                }
            }
        }

        // Update gradient to match layer's color scheme
        if (gradientEl) {
            const scheme = COLOR_SCHEMES[colorScheme];
            if (scheme) {
                const gradientStops = scheme.stops.map((color, i) => {
                    const percent = (i / (scheme.stops.length - 1)) * 100;
                    return `${color} ${percent}%`;
                }).join(', ');
                gradientEl.style.background = `linear-gradient(to right, ${gradientStops})`;
            }
        }
    }

    /**
     * Update both map legends based on current state
     */
    function updateLegend() {
        // Update AOI legend
        const aoiLegend = document.getElementById('aoi-legend');
        if (aoiLegend) {
            aoiLegend.style.display = aoiLayerVisible ? 'flex' : 'none';
            updateSingleLegend(aoiLegend, aoiDatasetType, aoiStatistic, aoiValueRange, aoiColorScheme);
        }

        // Update blockface legend
        const blockfaceLegend = document.getElementById('blockface-legend');
        if (blockfaceLegend) {
            blockfaceLegend.style.display = blockfaceLayerVisible ? 'flex' : 'none';
            updateSingleLegend(blockfaceLegend, blockfaceDatasetType, blockfaceStatistic, blockfaceValueRange, blockfaceColorScheme);
        }
    }

    /**
     * Apply blockface colors to the map using data-driven styling
     * Featured blockfaces use calculated values, others use tileset's static occupancy
     * Featured segments are shown with thicker lines for visibility
     * @param {Array} data - Blockface data array [{segmentId, value}, ...]
     */
    function applyBlockfaceColors(data) {
        if (!map.getLayer('blockface-lines')) return;

        const scheme = COLOR_SCHEMES[blockfaceColorScheme];
        if (!scheme) return;

        const isTransactions = blockfaceDatasetType === 'transactions';
        const noDataColor = '#999999'; // Grey for segments without data

        // If no dynamic data
        if (!data || data.length === 0) {
            if (isTransactions) {
                // Transactions selected but no data - all segments grey
                map.setPaintProperty('blockface-lines', 'line-color', noDataColor);
            } else {
                // Occupancy - use static tileset-based coloring
                map.setPaintProperty('blockface-lines', 'line-color', [
                    'interpolate',
                    ['linear'],
                    ['get', 'occupancy'],
                    0, scheme.stops[0],
                    25, scheme.stops[1],
                    50, scheme.stops[2],
                    75, scheme.stops[3],
                    100, scheme.stops[4]
                ]);
            }
            // Reset line width to default
            map.setPaintProperty('blockface-lines', 'line-width', [
                'interpolate',
                ['exponential', 1.25],
                ['zoom'],
                14, 4,
                20, 14
            ]);
            return;
        }

        // Build a case expression that checks for each featured segment
        const colorCaseExpr = ['case'];
        const widthCaseExpr = ['case'];

        for (const item of data) {
            // Add condition: if segmentId matches this item
            colorCaseExpr.push(['==', ['get', 'segmentId'], item.segmentId]);
            widthCaseExpr.push(['==', ['get', 'segmentId'], item.segmentId]);

            // Add result: the calculated color based on dataset type
            let color;
            if (isTransactions) {
                color = transactionToColor(item.value, blockfaceValueRange.min, blockfaceValueRange.max, blockfaceColorScheme);
            } else {
                color = occupancyToColor(item.value, blockfaceColorScheme);
            }
            colorCaseExpr.push(color);

            // Featured segments get thicker lines
            widthCaseExpr.push([
                'interpolate',
                ['exponential', 1.25],
                ['zoom'],
                14, 6,  // Thicker at low zoom
                20, 18  // Thicker at high zoom
            ]);
        }

        // Default fallback for non-featured segments
        if (isTransactions) {
            // Transactions: non-featured segments are grey (no transaction data)
            colorCaseExpr.push(noDataColor);
        } else {
            // Occupancy: use tileset's static occupancy for non-featured segments
            colorCaseExpr.push([
                'interpolate',
                ['linear'],
                ['get', 'occupancy'],
                0, scheme.stops[0],
                25, scheme.stops[1],
                50, scheme.stops[2],
                75, scheme.stops[3],
                100, scheme.stops[4]
            ]);
        }

        // Non-featured segments get thinner lines
        widthCaseExpr.push([
            'interpolate',
            ['exponential', 1.25],
            ['zoom'],
            14, 2,  // Thinner at low zoom
            20, 8   // Thinner at high zoom
        ]);

        map.setPaintProperty('blockface-lines', 'line-color', colorCaseExpr);
        map.setPaintProperty('blockface-lines', 'line-width', widthCaseExpr);
    }

    /**
     * Apply neighborhood colors to the map
     * @param {Array} data - Neighborhood data array
     */
    function applyNeighborhoodColors(data) {
        if (!map.getLayer('neighborhood-fills')) return;

        const isTransactions = aoiDatasetType === 'transactions';

        // Build match expression for data-driven styling
        const matchExpr = ['match', ['get', 'name']];

        for (const item of data) {
            matchExpr.push(item.name);
            const color = isTransactions
                ? transactionToColor(item.value, aoiValueRange.min, aoiValueRange.max, aoiColorScheme)
                : occupancyToColor(item.value, aoiColorScheme);
            matchExpr.push(color);
        }

        // Default color for neighborhoods without data
        matchExpr.push('#cccccc');

        map.setPaintProperty('neighborhood-fills', 'fill-color', matchExpr);
    }

    // Return map interface
    return {
        /**
         * Set neighborhood data and update fill colors
         * @param {Array<{id: string, name: string, value: number, color: string}>} data
         * @param {Object} options - Options including datasetType
         */
        setNeighborhoodData(data, options = {}) {
            neighborhoodData.clear();

            // Update AOI dataset type if provided
            if (options.datasetType) {
                aoiDatasetType = options.datasetType;
            }

            // Update AOI statistic if provided
            if (options.statistic) {
                aoiStatistic = options.statistic;
            }

            // Calculate AOI value range for color scaling
            const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
            if (values.length > 0) {
                if (aoiDatasetType === 'transactions') {
                    aoiValueRange = {
                        min: Math.min(...values),
                        max: Math.max(...values)
                    };
                } else {
                    // Occupancy is always 0-100%
                    aoiValueRange = { min: 0, max: 100 };
                }
            }

            for (const item of data) {
                // Store full item including assigned color for highlight styling
                neighborhoodData.set(item.id, item);
            }

            if (!isLoaded) {
                // Store for later when map loads
                pendingData = data;
                return;
            }

            applyNeighborhoodColors(data);

            // Update legend
            updateLegend();
        },

        /**
         * Set blockface data and update line colors dynamically
         * Featured blockfaces use calculated values, others use tileset's static occupancy
         * @param {Array<{segmentId: string, value: number}>} data - Blockface data
         * @param {Object} options - Options including datasetType, statistic
         */
        setBlockfaceData(data, options = {}) {
            blockfaceData.clear();

            // Update blockface dataset type if provided
            if (options.datasetType) {
                blockfaceDatasetType = options.datasetType;
            }

            // Update blockface statistic if provided
            if (options.statistic) {
                blockfaceStatistic = options.statistic;
            }

            // Calculate value range for color scaling (transactions need dynamic range)
            const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
            if (values.length > 0) {
                if (blockfaceDatasetType === 'transactions') {
                    blockfaceValueRange = {
                        min: Math.min(...values),
                        max: Math.max(...values)
                    };
                } else {
                    // Occupancy is always 0-100%
                    blockfaceValueRange = { min: 0, max: 100 };
                }
            }

            // Store data for popup display and track featured IDs
            featuredSegmentIds.clear();
            for (const item of data) {
                blockfaceData.set(item.segmentId, item);
                featuredSegmentIds.add(item.segmentId);
            }

            if (!isLoaded) {
                // Store for later when map loads
                pendingBlockfaceData = data;
                pendingBlockfaceOptions = options;
                return;
            }

            applyBlockfaceColors(data);

            // Update legend
            updateLegend();
        },

        /**
         * Set selected neighborhood highlight (supports single or multiple)
         * Uses each neighborhood's assigned color for the outline
         * @param {string|string[]|null} ids - Neighborhood ID(s) or null to clear
         */
        setSelectedNeighborhood(ids) {
            // Normalize to array
            const idArray = ids === null ? [] : (Array.isArray(ids) ? ids : [ids]);
            selectedNeighborhood = idArray.length === 1 ? idArray[0] : (idArray.length > 0 ? idArray : null);

            if (!isLoaded || !map.getLayer('neighborhood-highlight')) return;

            // Filter out sf-aggregate and empty values
            const validIds = idArray.filter(id => id && id !== 'sf-aggregate');

            if (validIds.length === 0) {
                // Clear highlight
                map.setFilter('neighborhood-highlight', ['==', ['get', 'name'], '']);
                // Reset to default color
                map.setPaintProperty('neighborhood-highlight', 'line-color', '#3498db');
            } else {
                // Build list of display names and colors for all selected IDs
                const nameColorMap = new Map();
                for (const id of validIds) {
                    const data = neighborhoodData.get(id);
                    if (data && data.name) {
                        nameColorMap.set(data.name, data.color || '#3498db');
                    } else {
                        // Try to find from GeoJSON source
                        const source = map.getSource('neighborhoods');
                        if (source && source._data) {
                            for (const feature of source._data.features) {
                                if (nameToId(feature.properties.name) === id) {
                                    // No color available from GeoJSON, use default
                                    nameColorMap.set(feature.properties.name, '#3498db');
                                    break;
                                }
                            }
                        }
                    }
                }

                const names = Array.from(nameColorMap.keys());

                if (names.length === 0) {
                    map.setFilter('neighborhood-highlight', ['==', ['get', 'name'], '']);
                    map.setPaintProperty('neighborhood-highlight', 'line-color', '#3498db');
                } else if (names.length === 1) {
                    map.setFilter('neighborhood-highlight', ['==', ['get', 'name'], names[0]]);
                    // Set line color to this neighborhood's assigned color
                    map.setPaintProperty('neighborhood-highlight', 'line-color', nameColorMap.get(names[0]));
                } else {
                    // Multiple selections: use 'in' filter
                    map.setFilter('neighborhood-highlight', ['in', ['get', 'name'], ['literal', names]]);

                    // Build match expression for data-driven line color
                    const colorMatchExpr = ['match', ['get', 'name']];
                    for (const [name, color] of nameColorMap) {
                        colorMatchExpr.push(name);
                        colorMatchExpr.push(color);
                    }
                    // Default fallback color
                    colorMatchExpr.push('#3498db');

                    map.setPaintProperty('neighborhood-highlight', 'line-color', colorMatchExpr);
                }
            }
        },

        /**
         * Register click callback
         * @param {Function} callback - Called with neighborhood ID on click
         */
        onNeighborhoodClick(callback) {
            clickCallback = callback;
        },

        /**
         * Register hover callback
         * @param {Function} callback - Called with ID on enter, null on leave
         */
        onNeighborhoodHover(callback) {
            hoverCallback = callback;
        },

        /**
         * Register blockface hover callback (T019)
         * @param {Function} callback - Called with (segmentId, properties) or (null) on leave
         */
        onBlockfaceHover(callback) {
            blockfaceHoverCallback = callback;
        },

        /**
         * Register blockface click callback (T021)
         * @param {Function} callback - Called with (segmentId, properties, modifiers)
         */
        onBlockfaceClick(callback) {
            blockfaceClickCallback = callback;
        },

        /**
         * Set selected blockface highlight (T022)
         * @param {string|string[]|null} ids - Segment ID(s) or null to clear
         */
        setSelectedBlockface(ids) {
            if (!isLoaded || !map.getLayer('blockface-highlight')) return;

            const idArray = ids === null ? [] : (Array.isArray(ids) ? ids : [ids]);

            if (idArray.length === 0) {
                map.setFilter('blockface-highlight', ['==', ['get', 'segmentId'], '']);
            } else if (idArray.length === 1) {
                map.setFilter('blockface-highlight', ['==', ['get', 'segmentId'], idArray[0]]);
            } else {
                map.setFilter('blockface-highlight', ['in', ['get', 'segmentId'], ['literal', idArray]]);
            }
        },

        /**
         * Set blockface layer dataset info for legend display
         * @param {Object} options - Dataset options
         * @param {string} options.datasetType - 'occupancy' or 'transactions'
         * @param {string} options.statistic - Statistic type
         * @param {Object} [options.valueRange] - Optional {min, max} for transactions
         */
        setBlockfaceDataInfo(options = {}) {
            if (options.datasetType) {
                blockfaceDatasetType = options.datasetType;
            }
            if (options.statistic) {
                blockfaceStatistic = options.statistic;
            }
            if (options.valueRange) {
                blockfaceValueRange = options.valueRange;
            } else if (blockfaceDatasetType === 'occupancy') {
                blockfaceValueRange = { min: 0, max: 100 };
            }

            // Update legend
            updateLegend();
        },

        /**
         * Set visibility for a map layer (T010)
         * @param {'aoi' | 'blockface'} layer - Layer to toggle
         * @param {boolean} visible - Visibility state
         */
        setLayerVisibility(layer, visible) {
            if (!isLoaded) return;

            const visibility = visible ? 'visible' : 'none';

            if (layer === 'aoi') {
                aoiLayerVisible = visible;
                ['neighborhood-fills', 'neighborhood-borders', 'neighborhood-hover', 'neighborhood-highlight']
                    .forEach(id => {
                        if (map.getLayer(id)) {
                            map.setLayoutProperty(id, 'visibility', visibility);
                        }
                    });
            } else if (layer === 'blockface') {
                blockfaceLayerVisible = visible;
                ['blockface-lines', 'blockface-hover', 'blockface-highlight']
                    .forEach(id => {
                        if (map.getLayer(id)) {
                            map.setLayoutProperty(id, 'visibility', visibility);
                        }
                    });
            }

            // Update legends to show/hide based on layer visibility
            updateLegend();
        },

        /**
         * Show loading overlay
         */
        showLoading() {
            let overlay = container.querySelector('.map-loading');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'map-loading';
                overlay.innerHTML = '<div class="loading-spinner"></div>';
                container.appendChild(overlay);
            }
            overlay.style.display = 'flex';
        },

        /**
         * Hide loading overlay
         */
        hideLoading() {
            const overlay = container.querySelector('.map-loading');
            if (overlay) {
                overlay.style.display = 'none';
            }
        },

        /**
         * Resize map to fit container
         */
        resize() {
            map.resize();
        },

        /**
         * Set the color scheme for a specific layer
         * @param {'aoi' | 'blockface'} layer - Layer to update
         * @param {string} schemeId - Color scheme ID (e.g., 'viridis', 'plasma')
         */
        setColorScheme(layer, schemeId) {
            if (!COLOR_SCHEMES[schemeId]) {
                console.warn(`Unknown color scheme: ${schemeId}`);
                return;
            }

            if (layer === 'aoi') {
                aoiColorScheme = schemeId;

                // Re-apply colors to neighborhoods if we have data
                if (neighborhoodData.size > 0 && isLoaded) {
                    const data = Array.from(neighborhoodData.values());
                    applyNeighborhoodColors(data);
                }
            } else if (layer === 'blockface') {
                blockfaceColorScheme = schemeId;

                // Re-apply blockface colors with new scheme
                if (isLoaded && map.getLayer('blockface-lines')) {
                    const data = Array.from(blockfaceData.values());
                    applyBlockfaceColors(data);
                }
            }

            // Update legend gradient
            updateLegend();
        },

        /**
         * Get current color scheme ID for a layer
         * @param {'aoi' | 'blockface'} layer - Layer to query
         * @returns {string} Current scheme ID
         */
        getColorScheme(layer) {
            return layer === 'blockface' ? blockfaceColorScheme : aoiColorScheme;
        },

        /**
         * Destroy map instance
         */
        destroy() {
            clickCallback = null;
            hoverCallback = null;
            neighborhoodData.clear();
            map.remove();
        },

        /**
         * Get underlying Mapbox instance
         * @returns {mapboxgl.Map}
         */
        getMapboxInstance() {
            return map;
        },

        /**
         * Check if map is loaded
         * @returns {boolean}
         */
        isReady() {
            return isLoaded;
        }
    };
}
