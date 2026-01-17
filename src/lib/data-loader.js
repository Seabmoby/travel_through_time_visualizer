/**
 * Data Loader Module
 * Handles loading and validation of parking data
 */

const DATA_URL = 'data/neighborhoods.json';
const BLOCKFACE_DATA_URL = 'data/blockfaces.json';
const TRANSACTIONS_URL = 'data/transactions.json';
const BLOCKFACE_TRANSACTIONS_URL = 'data/blockface-transactions.json';

/**
 * Dataset types
 */
export const DATASET_TYPES = {
    occupancy: {
        id: 'occupancy',
        name: 'Occupancy',
        description: 'Parking space utilization percentage',
        valueField: 'occupied',
        unit: '%',
        yAxisName: 'Occupancy %',
        defaultStatistic: 'average'
    },
    transactions: {
        id: 'transactions',
        name: 'Transactions',
        description: 'Parking revenue from paid spaces',
        valueField: 'transactions',
        unit: '$',
        yAxisName: 'Revenue ($)',
        defaultStatistic: 'total'
    }
};

/**
 * Load parking data from JSON file
 * @returns {Promise<{regions: Array, readings: Array}>}
 */
export async function loadParkingData() {
    try {
        const response = await fetch(DATA_URL);

        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }

        // Get response as text first to validate completeness
        const text = await response.text();

        // Sanity check for truncated responses (~25MB expected)
        if (!text || text.length < 1000) {
            throw new Error('Data file appears incomplete or empty. Please refresh the page or clear your browser cache.');
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            // Provide helpful message for truncated JSON
            if (parseError.message.includes('end of JSON')) {
                throw new Error('Data file was partially downloaded. Please refresh the page or clear your browser cache and try again.');
            }
            throw new Error(`Invalid data format: ${parseError.message}`);
        }

        // Validate structure
        if (!data.regions || !Array.isArray(data.regions)) {
            throw new Error('Invalid data: missing regions array');
        }

        if (!data.readings || !Array.isArray(data.readings)) {
            throw new Error('Invalid data: missing readings array');
        }

        // Validate readings
        const validReadings = data.readings.filter(validateReading);

        if (validReadings.length === 0) {
            throw new Error('No valid readings found in data');
        }

        return {
            regions: data.regions,
            readings: validReadings
        };

    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to load parking data. Make sure you are running via HTTP server.');
        }
        throw error;
    }
}

/**
 * Validate a single reading object
 * @param {Object} reading - Reading to validate
 * @returns {boolean} True if valid
 */
export function validateReading(reading) {
    if (!reading || typeof reading !== 'object') {
        return false;
    }

    // Required fields
    if (!reading.timestamp || typeof reading.timestamp !== 'string') {
        return false;
    }

    if (!reading.regionId || typeof reading.regionId !== 'string') {
        return false;
    }

    if (typeof reading.occupied !== 'number' || reading.occupied < 0) {
        return false;
    }

    if (typeof reading.capacity !== 'number' || reading.capacity <= 0) {
        return false;
    }

    // Validate timestamp is parseable
    const date = new Date(reading.timestamp);
    if (isNaN(date.getTime())) {
        return false;
    }

    // Occupied should not exceed capacity
    if (reading.occupied > reading.capacity) {
        return false;
    }

    return true;
}

/**
 * Get available time range from readings
 * @param {Array} readings - Array of reading objects
 * @returns {{start: string, end: string}} Date strings (YYYY-MM-DD)
 */
export function getAvailableTimeRange(readings) {
    if (!readings || readings.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        return { start: today, end: today };
    }

    let minDate = new Date(readings[0].timestamp);
    let maxDate = new Date(readings[0].timestamp);

    for (const reading of readings) {
        const date = new Date(reading.timestamp);
        if (date < minDate) minDate = date;
        if (date > maxDate) maxDate = date;
    }

    return {
        start: minDate.toISOString().split('T')[0],
        end: maxDate.toISOString().split('T')[0]
    };
}

/**
 * Get unique region IDs from readings
 * @param {Array} readings - Array of reading objects
 * @returns {Array<string>} Unique region IDs
 */
export function getUniqueRegions(readings) {
    const regionSet = new Set();
    for (const reading of readings) {
        if (reading.regionId) {
            regionSet.add(reading.regionId);
        }
    }
    return Array.from(regionSet);
}

/**
 * Load blockface data from JSON file (T028)
 * @returns {Promise<{blockfaces: Array, readings: Array}|null>}
 */
export async function loadBlockfaceData() {
    try {
        // Add cache-busting to ensure fresh data after regeneration
        const cacheBuster = `?v=${Date.now()}`;
        const response = await fetch(BLOCKFACE_DATA_URL + cacheBuster);

        if (!response.ok) {
            // Blockface data is optional - return null if not found
            console.warn('Blockface data not available:', response.status);
            return null;
        }

        const data = await response.json();

        // Validate structure
        if (!data.blockfaces || !Array.isArray(data.blockfaces)) {
            console.warn('Invalid blockface data: missing blockfaces array');
            return null;
        }

        if (!data.readings || !Array.isArray(data.readings)) {
            console.warn('Invalid blockface data: missing readings array');
            return null;
        }

        // Log loaded data for debugging
        console.log(`Loaded blockface data: ${data.blockfaces.length} blockfaces, ${data.readings.length} readings`);
        if (data.readings.length > 0) {
            const hasTransactions = 'transactions' in data.readings[0];
            console.log(`  Date range: ${data.meta?.startDate || 'unknown'} to ${data.meta?.endDate || 'unknown'}`);
            console.log(`  Has transactions: ${hasTransactions}`);
        }

        // Create lookup map from segmentId to blockface info
        const blockfaceMap = new Map();
        for (const bf of data.blockfaces) {
            blockfaceMap.set(bf.segmentId, bf);
        }

        return {
            blockfaces: data.blockfaces,
            readings: data.readings,
            blockfaceMap
        };

    } catch (error) {
        console.warn('Failed to load blockface data:', error.message);
        return null;
    }
}

/**
 * Load transaction data from JSON file
 * @returns {Promise<{regions: Array, readings: Array, summary: Object}|null>}
 */
export async function loadTransactionData() {
    try {
        const response = await fetch(TRANSACTIONS_URL);

        if (!response.ok) {
            console.warn('Transaction data not available:', response.status);
            return null;
        }

        const text = await response.text();

        if (!text || text.length < 1000) {
            throw new Error('Transaction data file appears incomplete');
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            throw new Error(`Invalid transaction data format: ${parseError.message}`);
        }

        // Validate structure
        if (!data.regions || !Array.isArray(data.regions)) {
            throw new Error('Invalid data: missing regions array');
        }

        if (!data.readings || !Array.isArray(data.readings)) {
            throw new Error('Invalid data: missing readings array');
        }

        // Validate transaction readings
        const validReadings = data.readings.filter(validateTransactionReading);

        if (validReadings.length === 0) {
            throw new Error('No valid transaction readings found');
        }

        return {
            regions: data.regions,
            readings: validReadings,
            summary: data.summary || null,
            meta: data.meta || null
        };

    } catch (error) {
        console.warn('Failed to load transaction data:', error.message);
        return null;
    }
}

/**
 * Load blockface transaction data from JSON file
 * @returns {Promise<{blockfaces: Array, readings: Array}|null>}
 */
export async function loadBlockfaceTransactionData() {
    try {
        const response = await fetch(BLOCKFACE_TRANSACTIONS_URL);

        if (!response.ok) {
            console.warn('Blockface transaction data not available:', response.status);
            return null;
        }

        const data = await response.json();

        if (!data.blockfaces || !Array.isArray(data.blockfaces)) {
            console.warn('Invalid blockface transaction data: missing blockfaces array');
            return null;
        }

        if (!data.readings || !Array.isArray(data.readings)) {
            console.warn('Invalid blockface transaction data: missing readings array');
            return null;
        }

        // Create lookup map from blockface ID
        const blockfaceMap = new Map();
        for (const bf of data.blockfaces) {
            blockfaceMap.set(bf.id, bf);
            // Also map by segmentId for tileset integration
            if (bf.segmentId) {
                blockfaceMap.set(bf.segmentId, bf);
            }
        }

        return {
            blockfaces: data.blockfaces,
            readings: data.readings,
            blockfaceMap,
            summary: data.summary || null
        };

    } catch (error) {
        console.warn('Failed to load blockface transaction data:', error.message);
        return null;
    }
}

/**
 * Validate a transaction reading object
 * @param {Object} reading - Reading to validate
 * @returns {boolean} True if valid
 */
export function validateTransactionReading(reading) {
    if (!reading || typeof reading !== 'object') {
        return false;
    }

    if (!reading.timestamp || typeof reading.timestamp !== 'string') {
        return false;
    }

    if (!reading.regionId || typeof reading.regionId !== 'string') {
        return false;
    }

    if (typeof reading.transactions !== 'number' || reading.transactions < 0) {
        return false;
    }

    // Validate timestamp is parseable
    const date = new Date(reading.timestamp);
    if (isNaN(date.getTime())) {
        return false;
    }

    return true;
}
