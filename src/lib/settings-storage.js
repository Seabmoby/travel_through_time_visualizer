/**
 * Settings Storage Module
 * Handles persistence of user settings to localStorage
 */

const STORAGE_KEY = 'timeVisualizer.settings.v1';

/**
 * Default settings - matches initial state in main.js
 */
const DEFAULT_SETTINGS = {
    aoiDataset: 'occupancy',
    blockfaceDataset: 'occupancy',
    aoiColorScheme: 'viridis',
    blockfaceColorScheme: 'viridis',
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
    layers: {
        aoiVisible: true,
        blockfaceVisible: false
    }
};

/**
 * Get default settings object
 * @returns {Object} Copy of default settings
 */
export function getDefaultSettings() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 * @returns {boolean} True if save succeeded
 */
export function saveSettings(settings) {
    try {
        // Extract only persistable settings
        const toSave = {
            aoiDataset: settings.aoiDataset,
            blockfaceDataset: settings.blockfaceDataset,
            aoiColorScheme: settings.aoiColorScheme,
            blockfaceColorScheme: settings.blockfaceColorScheme,
            aggregation: settings.aggregation,
            statistic: settings.statistic,
            seriesDimension: settings.seriesDimension,
            combinedView: settings.combinedView,
            datePattern: settings.datePattern,
            timePattern: settings.timePattern,
            chart: settings.chart,
            layers: settings.layers
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        return true;
    } catch (error) {
        console.warn('Failed to save settings:', error.message);
        return false;
    }
}

/**
 * Load settings from localStorage
 * Merges with defaults to handle missing keys from older versions
 * @returns {Object} Settings object (defaults if none saved or on error)
 */
export function loadSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return getDefaultSettings();
        }

        const parsed = JSON.parse(stored);

        // Deep merge with defaults to handle missing keys
        return deepMerge(getDefaultSettings(), parsed);
    } catch (error) {
        console.warn('Failed to load settings:', error.message);
        return getDefaultSettings();
    }
}

/**
 * Reset settings to defaults (clears localStorage)
 * @returns {Object} Default settings
 */
export function resetSettings() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to clear settings:', error.message);
    }
    return getDefaultSettings();
}

/**
 * Check if settings have been saved before
 * @returns {boolean} True if settings exist in localStorage
 */
export function hasStoredSettings() {
    try {
        return localStorage.getItem(STORAGE_KEY) !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Deep merge two objects (target is modified)
 * @param {Object} target - Target object (defaults)
 * @param {Object} source - Source object (saved settings)
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (source[key] !== null &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key]) &&
                target[key] !== null &&
                typeof target[key] === 'object' &&
                !Array.isArray(target[key])) {
                // Recursively merge objects
                deepMerge(target[key], source[key]);
            } else {
                // Overwrite with source value
                target[key] = source[key];
            }
        }
    }
    return target;
}
