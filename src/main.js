/**
 * Main Application Bootstrap
 * SF Parking Occupancy Time Visualizer
 */

import { loadParkingData, loadBlockfaceData, loadTransactionData, loadBlockfaceTransactionData, getAvailableTimeRange, DATASET_TYPES } from './lib/data-loader.js';
import { createControlPanel, DAY_OF_WEEK_OPTIONS, TIME_OF_DAY_OPTIONS } from './ui/controls.js';
import { createChart } from './ui/chart.js';
import { createMap } from './ui/map.js';
import { isInRange, bucketize, filterByDayOfWeek, filterByHourRange, getDayOfWeek, getHour } from './lib/time-utils.js';
import { calculate } from './lib/statistics.js';
import { loadSettings, saveSettings, resetSettings } from './lib/settings-storage.js';

// Mapbox configuration
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2Vhbm1paGFseWlucml4IiwiYSI6ImNtOXJxbXB4NjBiY2kya3BzMTU4NnViazYifQ.ETho0inPEn-sY6fyt3r5sA';
const MAPBOX_STYLE = 'mapbox://styles/seanmihalyinrix/cmkec8m9d007a01ssgt9xeot7';
const GEOJSON_URL = 'Resources/gn-san-francisco.geojson';

// Application State
const state = {
    // Independent dataset selection for AOI and blockface layers
    aoiDataset: 'occupancy', // 'occupancy' or 'transactions'
    blockfaceDataset: 'occupancy', // 'occupancy' or 'transactions'
    // Independent color scheme selection for AOI and blockface layers
    aoiColorScheme: 'viridis',
    blockfaceColorScheme: 'viridis',
    // Data stores for each dataset
    data: null, // occupancy data
    blockfaceData: null, // T029: Blockface data for chart integration
    transactionData: null, // transaction data
    blockfaceTransactionData: null, // blockface transaction data
    // Common state
    timeRange: { start: null, end: null },
    aggregation: 'daily',
    statistic: 'average',
    seriesDimension: {
        type: 'aoi',
        selected: ['sf-aggregate']
    },
    combinedView: false,
    datePattern: { type: 'all', days: [0, 1, 2, 3, 4, 5, 6] },
    timePattern: { type: 'all', ranges: [[0, 23]] },
    chart: {
        type: 'line',
        heatmapMode: null,
        precision: 1
    },
    // Map state
    map: {
        selectedNeighborhood: null,
        hoveredNeighborhood: null,
        isLoaded: false
    },
    // Layer visibility state
    layers: {
        aoiVisible: true,
        blockfaceVisible: false
    }
};

// Module references
let chart = null;
let controls = null;
let map = null;

// Debounce timer for settings save
let saveSettingsTimeout = null;

/**
 * Initialize the application
 */
async function init() {
    try {
        // Show loading state
        const chartContainer = document.getElementById('chart-container');
        const mapContainer = document.getElementById('map-container');

        // Load saved settings and apply to state
        const savedSettings = loadSettings();
        Object.assign(state, savedSettings);

        // Load parking data (occupancy)
        state.data = await loadParkingData();

        // Load blockface data (T033 - optional, for chart integration)
        state.blockfaceData = await loadBlockfaceData();

        // Load transaction data (optional, for revenue analysis)
        state.transactionData = await loadTransactionData();
        state.blockfaceTransactionData = await loadBlockfaceTransactionData();

        // Set default time range to first 7 days from dataset start
        const availableRange = getAvailableTimeRange(state.data.readings);
        state.timeRange = getDefaultTimeRange(availableRange);

        // Initialize chart
        chart = createChart(chartContainer);

        // Initialize map with saved settings
        map = createMap(mapContainer, {
            accessToken: MAPBOX_ACCESS_TOKEN,
            style: MAPBOX_STYLE,
            geojsonUrl: GEOJSON_URL,
            initialAoiVisible: state.layers.aoiVisible,
            initialBlockfaceVisible: state.layers.blockfaceVisible,
            initialAoiColorScheme: state.aoiColorScheme,
            initialBlockfaceColorScheme: state.blockfaceColorScheme,
            initialAoiDataset: state.aoiDataset,
            initialBlockfaceDataset: state.blockfaceDataset
        });

        // Wire up map events
        map.onNeighborhoodClick(handleNeighborhoodClick);
        map.onNeighborhoodHover(handleNeighborhoodHover);
        map.onBlockfaceClick(handleBlockfaceClick); // T024

        // Initialize controls
        const controlPanel = document.getElementById('control-panel');
        controls = createControlPanel(controlPanel, {
            regions: state.data.regions,
            timeRange: availableRange,
            initialState: state
        });

        // Wire up control changes
        controls.onChange(handleStateChange);
        controls.onReset(handleReset);

        // Initial render
        updateVisualization();
        updateMapVisualization();

        // Handle window resize
        setupResizeHandler();

    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError(error.message);
    }
}

/**
 * Get default time range (first 1 month from dataset start)
 */
function getDefaultTimeRange(availableRange) {
    const start = new Date(availableRange.start);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    // Clamp end to available range if needed
    const maxEnd = new Date(availableRange.end);
    if (end > maxEnd) {
        end.setTime(maxEnd.getTime());
    }

    return {
        start: availableRange.start,
        end: end.toISOString().split('T')[0]
    };
}

/**
 * Handle state changes from controls
 */
function handleStateChange(changes) {
    Object.assign(state, changes);

    // Debounced save to localStorage (100ms)
    clearTimeout(saveSettingsTimeout);
    saveSettingsTimeout = setTimeout(() => {
        saveSettings(state);
    }, 100);

    // Handle AOI dataset changes
    if ('aoiDataset' in changes) {
        // AOI dataset changed - update map and chart if AOI is selected
        updateMapVisualization();
        if (state.seriesDimension.type !== 'blockface') {
            updateVisualization();
        }
        return;
    }

    // Handle blockface dataset changes
    if ('blockfaceDataset' in changes) {
        // Update blockface layer colors with new dataset
        updateMapVisualization();
        // Blockface dataset changed - update chart if blockface is selected
        if (state.seriesDimension.type === 'blockface') {
            updateVisualization();
        }
        return;
    }

    // Handle AOI color scheme changes
    if ('aoiColorScheme' in changes) {
        if (map) {
            map.setColorScheme('aoi', state.aoiColorScheme);
        }
        return;
    }

    // Handle blockface color scheme changes
    if ('blockfaceColorScheme' in changes) {
        if (map) {
            map.setColorScheme('blockface', state.blockfaceColorScheme);
        }
        return;
    }

    // Handle layer visibility changes (T012)
    if ('layers' in changes) {
        if (map) {
            map.setLayerVisibility('aoi', state.layers.aoiVisible);
            map.setLayerVisibility('blockface', state.layers.blockfaceVisible);
        }
    }

    // Update chart
    updateVisualization();

    // Update map colors when relevant settings change
    if ('timeRange' in changes ||
        'aggregation' in changes ||
        'statistic' in changes ||
        'datePattern' in changes ||
        'timePattern' in changes) {
        updateMapVisualization();
    }

    // Handle AOI selection changes for map highlight
    if ('seriesDimension' in changes && changes.seriesDimension.type === 'aoi') {
        const selected = changes.seriesDimension.selected;
        // Filter out sf-aggregate for highlight purposes
        const validSelections = selected.filter(id => id !== 'sf-aggregate');

        if (validSelections.length > 0) {
            // Highlight all selected neighborhoods
            state.map.selectedNeighborhood = validSelections.length === 1 ? validSelections[0] : validSelections;
            if (map) map.setSelectedNeighborhood(validSelections);
        } else {
            state.map.selectedNeighborhood = null;
            if (map) map.setSelectedNeighborhood(null);
        }
    }
}

/**
 * Handle neighborhood selection from map click
 * @param {string} neighborhoodId - Clicked neighborhood ID
 * @param {Object} modifiers - Modifier key states { ctrlKey, shiftKey }
 */
function handleNeighborhoodClick(neighborhoodId, modifiers = {}) {
    const { ctrlKey = false } = modifiers;
    const currentSelected = state.seriesDimension.selected || [];

    if (ctrlKey) {
        // Ctrl+Click: Toggle this neighborhood in/out of selection
        let newSelected;
        if (currentSelected.includes(neighborhoodId)) {
            // Remove from selection
            newSelected = currentSelected.filter(id => id !== neighborhoodId);
            // If nothing selected, fall back to aggregate
            if (newSelected.length === 0) {
                newSelected = ['sf-aggregate'];
            }
        } else {
            // Add to selection, removing sf-aggregate if present
            newSelected = currentSelected.filter(id => id !== 'sf-aggregate');
            newSelected.push(neighborhoodId);
        }

        state.seriesDimension = {
            type: 'aoi',
            selected: newSelected
        };

        // Update map selection state (array for multiple)
        const validSelections = newSelected.filter(id => id !== 'sf-aggregate');
        state.map.selectedNeighborhood = validSelections.length > 0 ? validSelections : null;

    } else {
        // Regular click: Single select or toggle off
        // If clicking already selected neighborhood (and it's the only one), deselect
        if (currentSelected.length === 1 && currentSelected[0] === neighborhoodId) {
            neighborhoodId = null;
        }

        // Update map selection state
        state.map.selectedNeighborhood = neighborhoodId;

        // Update chart series dimension to match
        if (neighborhoodId === null) {
            // Reset to aggregate view
            state.seriesDimension = {
                type: 'aoi',
                selected: ['sf-aggregate']
            };
        } else {
            // Filter to single neighborhood
            state.seriesDimension = {
                type: 'aoi',
                selected: [neighborhoodId]
            };
        }
    }

    // Update visuals
    const validSelections = state.seriesDimension.selected.filter(id => id !== 'sf-aggregate');
    if (map) map.setSelectedNeighborhood(validSelections.length > 0 ? validSelections : null);
    updateVisualization();

    // Sync controls (update AOI checkboxes)
    if (controls) {
        controls.setState({
            seriesDimension: state.seriesDimension
        });
    }
}

/**
 * Handle neighborhood hover for tooltip display
 * @param {string|null} neighborhoodId - Hovered neighborhood ID or null
 */
function handleNeighborhoodHover(neighborhoodId) {
    state.map.hoveredNeighborhood = neighborhoodId;
    // Tooltip display handled internally by map module
}

/**
 * Handle reset settings action
 * Clears saved settings and reloads the page with defaults
 */
function handleReset() {
    resetSettings();
    window.location.reload();
}

/**
 * Handle blockface click selection (T023, T031, T032)
 * @param {string} segmentId - Clicked blockface segment ID
 * @param {Object} properties - Blockface properties from tileset
 * @param {Object} modifiers - Modifier key states { ctrlKey, shiftKey }
 */
function handleBlockfaceClick(segmentId, properties, modifiers = {}) {
    // Highlight the selected blockface
    if (map) {
        map.setSelectedBlockface(segmentId);
    }

    // Determine segment name from properties
    const segmentName = properties.meterId || properties.segmentId || segmentId;

    // Get the active blockface dataset based on selection
    const { blockfaceData } = getActiveData('blockface');

    // Check if this is a featured blockface with time-series data
    // Try to match by segmentId first, then by other properties
    let blockfaceInfo = null;
    if (blockfaceData && blockfaceData.blockfaceMap) {
        // Try direct segmentId match
        blockfaceInfo = blockfaceData.blockfaceMap.get(segmentId);

        // If not found, try matching by meterId or other properties
        if (!blockfaceInfo && properties.meterId) {
            blockfaceInfo = blockfaceData.blockfaceMap.get(properties.meterId);
        }

        // Try to find by name match if we have the segment name
        if (!blockfaceInfo && blockfaceData.blockfaces) {
            blockfaceInfo = blockfaceData.blockfaces.find(bf =>
                bf.segmentId === segmentId ||
                bf.name === segmentName ||
                bf.id === segmentId
            );
        }
    }

    if (blockfaceInfo) {
        // Featured blockface - update chart to show this segment's time-series data
        state.seriesDimension = {
            type: 'blockface',
            selected: [blockfaceInfo.id],
            segmentId: segmentId,
            segmentName: blockfaceInfo.name
        };
    } else {
        // Non-featured blockface - show current occupancy as single data point
        state.seriesDimension = {
            type: 'blockface',
            selected: [],
            segmentId: segmentId,
            segmentName: segmentName,
            // Store current properties for display
            currentData: {
                occupancy: properties.occupancy,
                capacity: properties.capacity,
                transactions: properties.transactions || 0
            }
        };
    }

    updateVisualization();

    // Sync controls
    if (controls) {
        controls.setState({ seriesDimension: state.seriesDimension });
    }
}

/**
 * Update map colors based on current data and filters
 */
function updateMapVisualization() {
    if (!state.data || !map) return;

    try {
        // Calculate values for each neighborhood using current filters
        const neighborhoodData = calculateNeighborhoodOccupancy();
        const datasetType = state.aoiDataset; // AOI dataset for map
        map.setNeighborhoodData(neighborhoodData, {
            datasetType,
            statistic: state.statistic
        });

        // Calculate values for featured blockfaces using current filters
        const blockfaceOccupancy = calculateBlockfaceOccupancy();
        map.setBlockfaceData(blockfaceOccupancy, {
            datasetType: state.blockfaceDataset,
            statistic: state.statistic
        });

    } catch (error) {
        console.error('Failed to update map visualization:', error);
    }
}

/**
 * Calculate values for all featured blockfaces based on current state and dataset
 * Uses interval bucketing: first applies statistic per bucket, then averages across buckets
 * This keeps the map synchronized with what the chart displays
 * @returns {Array<{segmentId: string, name: string, value: number}>}
 */
function calculateBlockfaceOccupancy() {
    const results = [];
    const { blockfaceData, datasetType } = getActiveData('blockface');

    if (!blockfaceData || !blockfaceData.readings || !blockfaceData.blockfaces) {
        return results;
    }

    const isTransactions = datasetType.id === 'transactions';
    let readings = blockfaceData.readings;

    // Apply same filters as chart
    readings = readings.filter(r =>
        isInRange(r.timestamp, state.timeRange)
    );

    if (state.datePattern.type !== 'all') {
        readings = filterByDayOfWeek(readings, state.datePattern.days);
    }

    if (state.timePattern.type !== 'all') {
        readings = filterByHourRange(readings, state.timePattern.ranges);
    }

    // Calculate values for each featured blockface
    for (const blockface of blockfaceData.blockfaces) {
        const blockfaceReadings = readings.filter(r => r.blockfaceId === blockface.id);

        if (blockfaceReadings.length === 0) {
            // Use base occupancy from blockface metadata if no readings match
            results.push({
                segmentId: blockface.segmentId,
                name: blockface.name,
                value: blockface.baseOccupancy || 0
            });
            continue;
        }

        // Bucket readings by current aggregation interval
        const buckets = bucketize(blockfaceReadings, state.aggregation);
        const bucketStats = [];

        // Calculate statistic for each bucket
        for (const [, bucketReadings] of buckets) {
            let values;
            if (isTransactions) {
                values = bucketReadings.map(r => r.transactions || 0);
            } else {
                values = bucketReadings.map(r =>
                    r.capacity > 0 ? (r.occupied / r.capacity) * 100 : 0
                );
            }

            const bucketValue = calculate(values, state.statistic);
            bucketStats.push(bucketValue);
        }

        // Average across all buckets for the final map value
        const finalValue = bucketStats.length > 0
            ? bucketStats.reduce((a, b) => a + b, 0) / bucketStats.length
            : 0;

        results.push({
            segmentId: blockface.segmentId,
            name: blockface.name,
            value: finalValue
        });
    }

    return results;
}

/**
 * Calculate values for all neighborhoods based on current state and dataset
 * Uses interval bucketing: first applies statistic per bucket, then averages across buckets
 * This keeps the map synchronized with what the chart displays
 * @returns {Array<{id: string, name: string, value: number, color: string}>}
 */
function calculateNeighborhoodOccupancy() {
    const results = [];
    const { data, datasetType } = getActiveData('aoi'); // Always use AOI dataset for map

    if (!data || !data.readings) return results;

    let readings = data.readings;
    const isTransactions = datasetType.id === 'transactions';

    // Apply same filters as chart
    readings = readings.filter(r =>
        isInRange(r.timestamp, state.timeRange)
    );

    if (state.datePattern.type !== 'all' && state.seriesDimension.type !== 'dayOfWeek') {
        readings = filterByDayOfWeek(readings, state.datePattern.days);
    }

    if (state.timePattern.type !== 'all' && state.seriesDimension.type !== 'timeOfDay') {
        readings = filterByHourRange(readings, state.timePattern.ranges);
    }

    // Calculate values for each neighborhood
    for (const region of data.regions) {
        const regionReadings = readings.filter(r => r.regionId === region.id);

        if (regionReadings.length === 0) {
            results.push({ id: region.id, name: region.name, value: 0, color: region.color });
            continue;
        }

        // Bucket readings by current aggregation interval
        const buckets = bucketize(regionReadings, state.aggregation);
        const bucketStats = [];

        // Calculate statistic for each bucket
        for (const [, bucketReadings] of buckets) {
            let values;
            if (isTransactions) {
                values = bucketReadings.map(r => r.transactions);
            } else {
                values = bucketReadings.map(r => (r.occupied / r.capacity) * 100);
            }

            const bucketValue = calculate(values, state.statistic);
            bucketStats.push(bucketValue);
        }

        // Average across all buckets for the final map value
        const finalValue = bucketStats.length > 0
            ? bucketStats.reduce((a, b) => a + b, 0) / bucketStats.length
            : 0;

        results.push({
            id: region.id,
            name: region.name,
            value: finalValue,
            color: region.color
        });
    }

    return results;
}

/**
 * Get active data based on layer type and its dataset selection
 * @param {string} layerType - 'aoi' or 'blockface'
 * @returns {{data: Object, blockfaceData: Object, datasetType: Object}}
 */
function getActiveData(layerType = 'aoi') {
    const isBlockface = layerType === 'blockface';
    const datasetId = isBlockface ? state.blockfaceDataset : state.aoiDataset;
    const datasetType = DATASET_TYPES[datasetId] || DATASET_TYPES.occupancy;

    if (datasetId === 'transactions') {
        return {
            data: state.transactionData,
            // blockfaceData now contains transactions field, use it for both datasets
            blockfaceData: state.blockfaceData,
            datasetType
        };
    }

    return {
        data: state.data,
        blockfaceData: state.blockfaceData,
        datasetType: DATASET_TYPES.occupancy
    };
}

/**
 * Get the active dataset type for the current series dimension
 * @returns {Object} Dataset type configuration
 */
function getActiveDatasetType() {
    const isBlockface = state.seriesDimension.type === 'blockface';
    const datasetId = isBlockface ? state.blockfaceDataset : state.aoiDataset;
    return DATASET_TYPES[datasetId] || DATASET_TYPES.occupancy;
}

/**
 * Generate chart title based on current selection
 * @returns {string} Chart title
 */
function getChartTitle() {
    const dimensionType = state.seriesDimension.type;
    const selected = state.seriesDimension.selected || [];
    const layerType = dimensionType === 'blockface' ? 'blockface' : 'aoi';
    const { data, datasetType } = getActiveData(layerType);
    const datasetLabel = datasetType.name;

    if (dimensionType === 'blockface') {
        // For blockface, use segmentName if available
        if (state.seriesDimension.segmentName) {
            return `${state.seriesDimension.segmentName} - ${datasetLabel}`;
        }
        // Fallback to segment ID
        if (state.seriesDimension.segmentId) {
            return `Segment: ${state.seriesDimension.segmentId} - ${datasetLabel}`;
        }
        return `Block Segment - ${datasetLabel}`;
    }

    if (dimensionType === 'aoi') {
        if (selected.length === 0) {
            return `Parking ${datasetLabel}`;
        }
        if (selected.length === 1) {
            if (selected[0] === 'sf-aggregate') {
                return `San Francisco - ${datasetLabel}`;
            }
            // Find the region name
            const region = data?.regions?.find(r => r.id === selected[0]);
            return region ? `${region.name} - ${datasetLabel}` : selected[0];
        }
        if (selected.length <= 3) {
            // Show up to 3 names
            const names = selected.map(id => {
                if (id === 'sf-aggregate') return 'SF';
                const region = data?.regions?.find(r => r.id === id);
                return region ? region.name : id;
            });
            return `${names.join(', ')} - ${datasetLabel}`;
        }
        // More than 3 selected
        return `${selected.length} Neighborhoods - ${datasetLabel}`;
    }

    if (dimensionType === 'dayOfWeek') {
        return `${datasetLabel} by Day of Week`;
    }

    if (dimensionType === 'timeOfDay') {
        return `${datasetLabel} by Time of Day`;
    }

    return `Parking ${datasetLabel}`;
}

/**
 * Run data pipeline and update chart
 */
function updateVisualization() {
    if (!state.data || !chart) return;

    try {
        chart.showLoading();

        // Run data pipeline
        const processedData = runDataPipeline();

        // Build chart configuration
        const chartConfig = {
            type: state.chart.type,
            heatmapMode: state.chart.heatmapMode,
            precision: state.chart.precision,
            animate: true,
            showLegend: true,
            showTooltip: true,
            title: getChartTitle()
        };

        // Update chart
        chart.update(processedData, chartConfig);
        chart.hideLoading();

    } catch (error) {
        console.error('Failed to update visualization:', error);
        chart.hideLoading();
    }
}

/**
 * Data processing pipeline
 * @returns {Object} Processed data for chart
 */
function runDataPipeline() {
    const dimensionType = state.seriesDimension.type;
    const layerType = dimensionType === 'blockface' ? 'blockface' : 'aoi';
    const { data, datasetType } = getActiveData(layerType);

    if (!data || !data.readings) {
        return { series: [], xAxis: { type: 'time' }, yAxis: { type: 'value', name: datasetType.yAxisName } };
    }

    let readings = data.readings;

    // 1. Filter by time range
    readings = readings.filter(r =>
        isInRange(r.timestamp, state.timeRange)
    );

    // 2. Filter by date pattern (skip if Day of Week is series dimension)
    if (state.datePattern.type !== 'all' && state.seriesDimension.type !== 'dayOfWeek') {
        readings = filterByDayOfWeek(readings, state.datePattern.days);
    }

    // 3. Filter by time pattern (skip if Time of Day is series dimension)
    if (state.timePattern.type !== 'all' && state.seriesDimension.type !== 'timeOfDay') {
        readings = filterByHourRange(readings, state.timePattern.ranges);
    }

    // 4. Process based on series dimension
    const series = [];
    const selected = state.seriesDimension.selected || [];

    if (dimensionType === 'aoi') {
        // AOI (Areas of Interest) series dimension
        series.push(...processAOISeries(readings, selected, data, datasetType));
    } else if (dimensionType === 'dayOfWeek') {
        // Day of Week series dimension
        series.push(...processDayOfWeekSeries(readings, selected, datasetType));
    } else if (dimensionType === 'timeOfDay') {
        // Time of Day series dimension
        series.push(...processTimeOfDaySeries(readings, selected, datasetType));
    } else if (dimensionType === 'blockface') {
        // T030: Blockface series dimension
        series.push(...processBlockfaceSeries(selected, datasetType));
    }

    // Determine x-axis type based on series dimension
    let xAxisConfig = { type: 'time' };

    if (dimensionType === 'dayOfWeek' && series.length > 0 && series[0].xAxisType === 'hour') {
        // Day of Week series uses hourly x-axis (0:00 - 23:00)
        xAxisConfig = {
            type: 'category',
            data: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`),
            name: 'Hour of Day'
        };
    } else if (dimensionType === 'timeOfDay') {
        // Time of Day uses day-of-week x-axis
        xAxisConfig = {
            type: 'category',
            data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            name: 'Day of Week'
        };
    }

    return {
        series,
        xAxis: xAxisConfig,
        yAxis: { type: 'value', name: datasetType.yAxisName }
    };
}

/**
 * Process AOI series dimension
 * @param {Array} readings - Filtered readings
 * @param {Array} selectedAOIs - Selected AOI IDs
 * @param {Object} data - Active dataset
 * @param {Object} datasetType - Dataset type configuration
 * @returns {Array} Chart series
 */
function processAOISeries(readings, selectedAOIs, data, datasetType) {
    const series = [];
    const isTransactions = datasetType.id === 'transactions';

    // Handle combined view
    if (state.combinedView && selectedAOIs.length > 1 && !selectedAOIs.includes('sf-aggregate')) {
        return [createCombinedSeries(readings, selectedAOIs, datasetType)];
    }

    for (const aoiId of selectedAOIs) {
        let aoiReadings;
        let aoiInfo;

        if (aoiId === 'sf-aggregate') {
            // San Francisco aggregate: use all readings
            aoiReadings = readings;
            aoiInfo = { id: 'sf-aggregate', name: 'San Francisco', color: '#34495E' };

            const buckets = bucketize(aoiReadings, state.aggregation);
            const dataPoints = [];

            for (const [bucketKey, bucketReadings] of buckets) {
                if (isTransactions) {
                    // For transactions: calculate based on selected statistic
                    const values = bucketReadings.map(r => r.transactions);
                    const statValue = calculate(values, state.statistic);
                    dataPoints.push({ timestamp: bucketKey, value: statValue });
                } else {
                    // For occupancy: weighted average or selected statistic
                    let totalOccupied = 0;
                    let totalCapacity = 0;

                    for (const r of bucketReadings) {
                        totalOccupied += r.occupied;
                        totalCapacity += r.capacity;
                    }

                    const weightedRate = totalCapacity > 0
                        ? (totalOccupied / totalCapacity) * 100
                        : 0;

                    // For non-average statistics, use individual rates
                    if (state.statistic !== 'average') {
                        const values = bucketReadings.map(r =>
                            (r.occupied / r.capacity) * 100
                        );
                        const statValue = calculate(values, state.statistic);
                        dataPoints.push({ timestamp: bucketKey, value: statValue });
                    } else {
                        dataPoints.push({ timestamp: bucketKey, value: weightedRate });
                    }
                }
            }

            dataPoints.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            // Calculate reference value (average of bucket statistics - same as map display)
            const referenceValue = dataPoints.length > 0
                ? dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length
                : 0;

            series.push({
                id: aoiId,
                name: aoiInfo.name,
                color: aoiInfo.color,
                data: dataPoints,
                referenceValue
            });
        } else {
            // Individual AOI
            aoiReadings = readings.filter(r => r.regionId === aoiId);
            aoiInfo = data.regions.find(r => r.id === aoiId);

            if (!aoiInfo) continue;

            const buckets = bucketize(aoiReadings, state.aggregation);
            const dataPoints = [];

            for (const [bucketKey, bucketReadings] of buckets) {
                let statValue;
                if (isTransactions) {
                    // For transactions: use raw transaction values
                    const values = bucketReadings.map(r => r.transactions);
                    statValue = calculate(values, state.statistic);
                } else {
                    // For occupancy: calculate percentage
                    const values = bucketReadings.map(r =>
                        (r.occupied / r.capacity) * 100
                    );
                    statValue = calculate(values, state.statistic);
                }
                dataPoints.push({ timestamp: bucketKey, value: statValue });
            }

            dataPoints.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            // Calculate reference value (average of bucket statistics - same as map display)
            const referenceValue = dataPoints.length > 0
                ? dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length
                : 0;

            series.push({
                id: aoiId,
                name: aoiInfo.name,
                color: aoiInfo.color,
                data: dataPoints,
                referenceValue
            });
        }
    }

    return series;
}

/**
 * Process Day of Week series dimension
 * X-axis shows hourly intervals (0:00-23:00)
 * - "actual" statistic: shows each specific day's hourly data
 * - other statistics: aggregate across all instances of each day (e.g., avg of all Sundays at 9am)
 * @param {Array} readings - Filtered readings
 * @param {Array} selectedDays - Selected day numbers (0-6)
 * @param {Object} datasetType - Dataset type configuration
 * @returns {Array} Chart series
 */
function processDayOfWeekSeries(readings, selectedDays, datasetType) {
    const series = [];
    const isActual = state.statistic === 'actual';
    const isTransactions = datasetType.id === 'transactions';

    for (const dayNum of selectedDays) {
        const dayOption = DAY_OF_WEEK_OPTIONS.find(d => d.id === dayNum);
        if (!dayOption) continue;

        // Filter readings for this day of week
        const dayReadings = readings.filter(r => {
            const date = new Date(r.timestamp);
            return date.getUTCDay() === dayNum;
        });

        if (dayReadings.length === 0) continue;

        if (isActual) {
            // "Actual" mode: show each specific date's hourly data as separate series
            // Group readings by date
            const dateGroups = new Map();
            for (const r of dayReadings) {
                const date = new Date(r.timestamp);
                const dateKey = date.toISOString().split('T')[0];
                if (!dateGroups.has(dateKey)) {
                    dateGroups.set(dateKey, []);
                }
                dateGroups.get(dateKey).push(r);
            }

            // Create a series for each specific date
            for (const [dateKey, dateReadings] of dateGroups) {
                const dataPoints = [];

                // Group by hour
                const hourlyGroups = new Map();
                for (const r of dateReadings) {
                    const date = new Date(r.timestamp);
                    const hour = date.getUTCHours();
                    if (!hourlyGroups.has(hour)) {
                        hourlyGroups.set(hour, []);
                    }
                    hourlyGroups.get(hour).push(r);
                }

                // Calculate average for each hour (aggregate 15-min readings)
                for (let hour = 0; hour < 24; hour++) {
                    const hourReadings = hourlyGroups.get(hour) || [];
                    if (hourReadings.length > 0) {
                        let avgValue;
                        if (isTransactions) {
                            const values = hourReadings.map(r => r.transactions);
                            avgValue = values.reduce((a, b) => a + b, 0) / values.length;
                        } else {
                            const values = hourReadings.map(r => (r.occupied / r.capacity) * 100);
                            avgValue = values.reduce((a, b) => a + b, 0) / values.length;
                        }
                        dataPoints.push({ hour, value: avgValue });
                    }
                }

                dataPoints.sort((a, b) => a.hour - b.hour);

                // Calculate reference value (average of hourly values)
                const referenceValue = dataPoints.length > 0
                    ? dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length
                    : 0;

                series.push({
                    id: `day-${dayNum}-${dateKey}`,
                    name: `${dayOption.name} (${dateKey})`,
                    color: dayOption.color,
                    data: dataPoints,
                    xAxisType: 'hour', // Flag for chart to use category axis
                    referenceValue
                });
            }
        } else {
            // Aggregated mode: calculate statistic across all instances of this day at each hour
            // Group all readings by hour across all weeks
            const hourlyAggregates = new Map();

            for (const r of dayReadings) {
                const date = new Date(r.timestamp);
                const hour = date.getUTCHours();
                if (!hourlyAggregates.has(hour)) {
                    hourlyAggregates.set(hour, []);
                }
                if (isTransactions) {
                    hourlyAggregates.get(hour).push(r.transactions);
                } else {
                    hourlyAggregates.get(hour).push((r.occupied / r.capacity) * 100);
                }
            }

            const dataPoints = [];
            for (let hour = 0; hour < 24; hour++) {
                const values = hourlyAggregates.get(hour) || [];
                if (values.length > 0) {
                    const statValue = calculate(values, state.statistic);
                    dataPoints.push({ hour, value: statValue });
                }
            }

            dataPoints.sort((a, b) => a.hour - b.hour);

            // Calculate reference value (average of hourly values)
            const referenceValue = dataPoints.length > 0
                ? dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length
                : 0;

            series.push({
                id: `day-${dayNum}`,
                name: dayOption.name,
                color: dayOption.color,
                data: dataPoints,
                xAxisType: 'hour', // Flag for chart to use category axis
                referenceValue
            });
        }
    }

    return series;
}

/**
 * Process Time of Day series dimension
 * X-axis shows days of week (Sun-Sat)
 * Each time period (Morning, Afternoon, etc.) becomes a series
 * @param {Array} readings - Filtered readings
 * @param {Array} selectedPeriods - Selected period IDs
 * @param {Object} datasetType - Dataset type configuration
 * @returns {Array} Chart series
 */
function processTimeOfDaySeries(readings, selectedPeriods, datasetType) {
    const series = [];
    const isActual = state.statistic === 'actual';
    const isTransactions = datasetType.id === 'transactions';

    for (const periodId of selectedPeriods) {
        const periodOption = TIME_OF_DAY_OPTIONS.find(p => p.id === periodId);
        if (!periodOption) continue;

        // Filter readings for this time period
        const periodReadings = readings.filter(r => {
            const date = new Date(r.timestamp);
            const hour = date.getUTCHours();

            // Handle overnight periods (night: 0-6)
            if (periodOption.start < periodOption.end) {
                return hour >= periodOption.start && hour < periodOption.end;
            } else {
                // Should not happen with current periods but handle just in case
                return hour >= periodOption.start || hour < periodOption.end;
            }
        });

        if (periodReadings.length === 0) continue;

        // Group readings by day of week
        const dayAggregates = new Map();
        for (let day = 0; day < 7; day++) {
            dayAggregates.set(day, []);
        }

        for (const r of periodReadings) {
            const date = new Date(r.timestamp);
            const dayOfWeek = date.getUTCDay();
            if (isTransactions) {
                dayAggregates.get(dayOfWeek).push(r.transactions);
            } else {
                dayAggregates.get(dayOfWeek).push((r.occupied / r.capacity) * 100);
            }
        }

        const dataPoints = [];
        for (let day = 0; day < 7; day++) {
            const values = dayAggregates.get(day) || [];
            if (values.length > 0) {
                // For Time of Day, use average for 'actual' since there's no single "actual" per day
                const statValue = isActual
                    ? values.reduce((a, b) => a + b, 0) / values.length
                    : calculate(values, state.statistic);
                dataPoints.push({ dayOfWeek: day, value: statValue });
            } else {
                dataPoints.push({ dayOfWeek: day, value: 0 });
            }
        }

        // Calculate reference value (average of daily values)
        const referenceValue = dataPoints.length > 0
            ? dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length
            : 0;

        series.push({
            id: `time-${periodId}`,
            name: periodOption.name,
            color: periodOption.color,
            data: dataPoints,
            xAxisType: 'dayOfWeek', // Flag for chart to use day-of-week category axis
            referenceValue
        });
    }

    return series;
}

/**
 * Create combined series from multiple AOIs (weighted by capacity)
 * @param {Array} readings - Filtered readings
 * @param {Array} selectedAOIs - Selected AOI IDs
 * @param {Object} datasetType - Dataset type configuration
 * @returns {Object} Combined series
 */
function createCombinedSeries(readings, selectedAOIs, datasetType) {
    const filteredReadings = readings.filter(r => selectedAOIs.includes(r.regionId));
    const buckets = bucketize(filteredReadings, state.aggregation);
    const dataPoints = [];
    const isTransactions = datasetType.id === 'transactions';

    for (const [bucketKey, bucketReadings] of buckets) {
        if (isTransactions) {
            // For transactions: aggregate using selected statistic
            const values = bucketReadings.map(r => r.transactions);
            const statValue = calculate(values, state.statistic);
            dataPoints.push({ timestamp: bucketKey, value: statValue });
        } else {
            // For occupancy: weighted average
            let totalOccupied = 0;
            let totalCapacity = 0;

            for (const r of bucketReadings) {
                totalOccupied += r.occupied;
                totalCapacity += r.capacity;
            }

            const weightedRate = totalCapacity > 0
                ? (totalOccupied / totalCapacity) * 100
                : 0;

            if (state.statistic !== 'average') {
                const values = bucketReadings.map(r =>
                    (r.occupied / r.capacity) * 100
                );
                const statValue = calculate(values, state.statistic);
                dataPoints.push({ timestamp: bucketKey, value: statValue });
            } else {
                dataPoints.push({ timestamp: bucketKey, value: weightedRate });
            }
        }
    }

    dataPoints.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Calculate reference value (average of bucket statistics)
    const referenceValue = dataPoints.length > 0
        ? dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length
        : 0;

    return {
        id: 'combined',
        name: isTransactions ? 'Combined AOIs (Total)' : 'Combined AOIs (Weighted)',
        color: '#3498db',
        data: dataPoints,
        referenceValue
    };
}

/**
 * Process blockface series dimension (T030)
 * @param {Array} selectedBlockfaceIds - Selected blockface IDs
 * @param {Object} datasetType - Dataset type configuration
 * @returns {Array} Chart series
 */
function processBlockfaceSeries(selectedBlockfaceIds, datasetType) {
    const series = [];
    // Get the correct blockface dataset based on selection (transactions or occupancy)
    const { blockfaceData } = getActiveData('blockface');
    const isTransactions = datasetType.id === 'transactions';

    // Check if we have featured blockface data with time-series readings
    if (blockfaceData && blockfaceData.readings && blockfaceData.readings.length > 0 && selectedBlockfaceIds.length > 0) {
        for (const blockfaceId of selectedBlockfaceIds) {
            // Find blockface info - try by id first, then by segmentId
            let blockfaceInfo = blockfaceData.blockfaces.find(bf => bf.id === blockfaceId);
            if (!blockfaceInfo) {
                blockfaceInfo = blockfaceData.blockfaces.find(bf => bf.segmentId === blockfaceId);
            }
            if (!blockfaceInfo) continue;

            // Filter readings for this blockface
            let readings = blockfaceData.readings.filter(r => r.blockfaceId === blockfaceInfo.id);

            // Apply time range filter
            readings = readings.filter(r => isInRange(r.timestamp, state.timeRange));

            // Apply date pattern filter
            if (state.datePattern.type !== 'all') {
                readings = filterByDayOfWeek(readings, state.datePattern.days);
            }

            // Apply time pattern filter
            if (state.timePattern.type !== 'all') {
                readings = filterByHourRange(readings, state.timePattern.ranges);
            }

            if (readings.length === 0) continue;

            // Bucketize and calculate statistics
            const buckets = bucketize(readings, state.aggregation);
            const dataPoints = [];

            for (const [bucketKey, bucketReadings] of buckets) {
                let statValue;
                if (isTransactions) {
                    // Transaction readings have 'transactions' field
                    const values = bucketReadings.map(r => r.transactions || 0);
                    statValue = calculate(values, state.statistic);
                } else {
                    // Occupancy readings have 'occupied' and 'capacity' fields
                    const values = bucketReadings.map(r => {
                        if (typeof r.occupied === 'number' && typeof r.capacity === 'number' && r.capacity > 0) {
                            return (r.occupied / r.capacity) * 100;
                        }
                        return 0;
                    });
                    statValue = calculate(values, state.statistic);
                }
                dataPoints.push({ timestamp: bucketKey, value: statValue });
            }

            dataPoints.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

            // Calculate reference value (average of bucket statistics)
            const referenceValue = dataPoints.length > 0
                ? dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length
                : 0;

            series.push({
                id: blockfaceInfo.id,
                name: blockfaceInfo.name,
                color: blockfaceInfo.color || '#3498db',
                data: dataPoints,
                referenceValue
            });
        }
    }

    // Handle non-featured blockface (show current data from tileset)
    if (series.length === 0 && state.seriesDimension.currentData) {
        const currentData = state.seriesDimension.currentData;
        const segmentName = state.seriesDimension.segmentName || 'Segment';

        // Create a single data point with current timestamp
        const now = new Date().toISOString();
        let value = 0;
        if (isTransactions) {
            value = currentData.transactions || 0;
        } else if (typeof currentData.occupancy === 'number') {
            value = currentData.occupancy;
        }

        series.push({
            id: state.seriesDimension.segmentId,
            name: `${segmentName} (Current)`,
            color: '#3498db',
            data: [{ timestamp: now, value: value }],
            referenceValue: value // Single point, reference is the value itself
        });
    }

    return series;
}

/**
 * Set up window resize handler
 */
function setupResizeHandler() {
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (chart) {
                chart.resize();
            }
            // Resize map
            if (map) {
                map.resize();
            }
        }, 100);
    });

    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) {
        resizeObserver.observe(chartContainer);
    }

    // Observe map container
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
        resizeObserver.observe(mapContainer);
    }

    // Set up panel resizer drag functionality
    setupPanelResizer();
}

/**
 * Set up draggable panel resizer between map and chart
 */
function setupPanelResizer() {
    const resizer = document.getElementById('panel-resizer');
    const mapPanel = document.getElementById('map-panel');
    const chartPanel = document.getElementById('chart-panel');
    const appMain = document.querySelector('.app-main');

    if (!resizer || !mapPanel || !chartPanel || !appMain) return;

    let isResizing = false;
    let startX = 0;
    let startMapWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startMapWidth = mapPanel.offsetWidth;

        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const dx = e.clientX - startX;
        const containerWidth = appMain.offsetWidth;
        const resizerWidth = resizer.offsetWidth;

        // Calculate new map width
        let newMapWidth = startMapWidth + dx;

        // Enforce min/max constraints
        const minMapWidth = 200;
        const minChartWidth = 400;
        const maxMapWidth = containerWidth - resizerWidth - minChartWidth;

        newMapWidth = Math.max(minMapWidth, Math.min(maxMapWidth, newMapWidth));

        // Apply widths using flex-basis
        const mapPercent = (newMapWidth / containerWidth) * 100;
        const chartPercent = ((containerWidth - newMapWidth - resizerWidth) / containerWidth) * 100;

        mapPanel.style.flex = `0 0 ${mapPercent}%`;
        chartPanel.style.flex = `0 0 ${chartPercent}%`;

        // Trigger resize for map and chart
        if (map) map.resize();
        if (chart) chart.resize();
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

/**
 * Show error message
 */
function showError(message) {
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div class="error-message">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for testing
export { state, updateVisualization, runDataPipeline, updateMapVisualization };
