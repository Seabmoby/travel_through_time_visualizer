/**
 * Time Utilities Module
 * Date/time parsing, filtering, and bucketing functions
 */

/**
 * Parse date string to Date object
 * @param {string} dateString - ISO date string or YYYY-MM-DD
 * @returns {Date} Parsed date
 */
export function parseDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateString}`);
    }
    return date;
}

/**
 * Check if timestamp is within time range
 * @param {string} timestamp - ISO timestamp
 * @param {{start: string, end: string}} range - Date range (YYYY-MM-DD)
 * @returns {boolean} True if in range (inclusive)
 */
export function isInRange(timestamp, range) {
    const date = new Date(timestamp);
    const start = new Date(range.start);
    const end = new Date(range.end);

    // Set end to end of day
    end.setHours(23, 59, 59, 999);

    return date >= start && date <= end;
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 * @param {string} timestamp - ISO timestamp
 * @returns {number} Day of week
 */
export function getDayOfWeek(timestamp) {
    return new Date(timestamp).getDay();
}

/**
 * Get hour (0-23)
 * @param {string} timestamp - ISO timestamp
 * @returns {number} Hour
 */
export function getHour(timestamp) {
    return new Date(timestamp).getHours();
}

/**
 * Filter readings by day of week
 * @param {Array} readings - Array of reading objects
 * @param {number[]} days - Array of day numbers to include (0-6)
 * @returns {Array} Filtered readings
 */
export function filterByDayOfWeek(readings, days) {
    if (!days || days.length === 0 || days.length === 7) {
        return readings;
    }
    return readings.filter(r => days.includes(getDayOfWeek(r.timestamp)));
}

/**
 * Filter readings by hour ranges
 * @param {Array} readings - Array of reading objects
 * @param {Array<[number, number]>} ranges - Array of [startHour, endHour] tuples
 * @returns {Array} Filtered readings
 */
export function filterByHourRange(readings, ranges) {
    if (!ranges || ranges.length === 0) {
        return readings;
    }

    return readings.filter(r => {
        const hour = getHour(r.timestamp);
        return ranges.some(([start, end]) => hour >= start && hour <= end);
    });
}

/**
 * Get bucket key for a timestamp based on aggregation type
 * @param {string} timestamp - ISO timestamp
 * @param {string} aggregation - Bucket type (15min, hourly, daily, weekly, monthly)
 * @returns {string} Bucket key
 */
export function getBucketKey(timestamp, aggregation) {
    const date = new Date(timestamp);

    switch (aggregation) {
        case '15min': {
            const minutes = Math.floor(date.getMinutes() / 15) * 15;
            const padMonth = String(date.getMonth() + 1).padStart(2, '0');
            const padDate = String(date.getDate()).padStart(2, '0');
            const padHour = String(date.getHours()).padStart(2, '0');
            const padMin = String(minutes).padStart(2, '0');
            return `${date.getFullYear()}-${padMonth}-${padDate}T${padHour}:${padMin}`;
        }

        case 'hourly': {
            const padMonth = String(date.getMonth() + 1).padStart(2, '0');
            const padDate = String(date.getDate()).padStart(2, '0');
            const padHour = String(date.getHours()).padStart(2, '0');
            return `${date.getFullYear()}-${padMonth}-${padDate}T${padHour}:00`;
        }

        case 'daily': {
            const padMonth = String(date.getMonth() + 1).padStart(2, '0');
            const padDate = String(date.getDate()).padStart(2, '0');
            return `${date.getFullYear()}-${padMonth}-${padDate}`;
        }

        case 'weekly': {
            // Get Monday of the week - return valid ISO date format for ECharts
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date);
            monday.setDate(diff);
            const padMonth = String(monday.getMonth() + 1).padStart(2, '0');
            const padDate = String(monday.getDate()).padStart(2, '0');
            return `${monday.getFullYear()}-${padMonth}-${padDate}`;
        }

        case 'monthly': {
            // Return first day of month as valid ISO date for ECharts
            const padMonth = String(date.getMonth() + 1).padStart(2, '0');
            return `${date.getFullYear()}-${padMonth}-01`;
        }

        default:
            return getBucketKey(timestamp, 'daily');
    }
}

/**
 * Generate all bucket keys for a time range
 * @param {{start: string, end: string}} range - Date range
 * @param {string} aggregation - Bucket type
 * @returns {string[]} Array of bucket keys
 */
export function generateBucketRange(range, aggregation) {
    const keys = [];
    const start = new Date(range.start);
    const end = new Date(range.end);
    end.setHours(23, 59, 59, 999);

    const current = new Date(start);

    while (current <= end) {
        const key = getBucketKey(current.toISOString(), aggregation);
        if (!keys.includes(key)) {
            keys.push(key);
        }

        // Increment based on aggregation
        switch (aggregation) {
            case '15min':
                current.setMinutes(current.getMinutes() + 15);
                break;
            case 'hourly':
                current.setHours(current.getHours() + 1);
                break;
            case 'daily':
                current.setDate(current.getDate() + 1);
                break;
            case 'weekly':
                current.setDate(current.getDate() + 7);
                break;
            case 'monthly':
                current.setMonth(current.getMonth() + 1);
                break;
            default:
                current.setDate(current.getDate() + 1);
        }
    }

    return keys;
}

/**
 * Group readings into buckets by aggregation
 * @param {Array} readings - Array of reading objects
 * @param {string} aggregation - Bucket type
 * @returns {Map<string, Array>} Map of bucket key to readings
 */
export function bucketize(readings, aggregation) {
    const buckets = new Map();

    for (const reading of readings) {
        const key = getBucketKey(reading.timestamp, aggregation);

        if (!buckets.has(key)) {
            buckets.set(key, []);
        }
        buckets.get(key).push(reading);
    }

    return buckets;
}

/**
 * Preset time patterns
 */
export const TIME_PATTERNS = {
    all: { type: 'all', ranges: [[0, 23]] },
    morning: { type: 'morning', ranges: [[6, 11]] },
    afternoon: { type: 'afternoon', ranges: [[12, 17]] },
    evening: { type: 'evening', ranges: [[18, 23]] },
    night: { type: 'night', ranges: [[0, 5]] },
    peak: { type: 'peak', ranges: [[7, 9], [16, 19]] },
    offpeak: { type: 'offpeak', ranges: [[0, 6], [10, 15], [20, 23]] },
    business: { type: 'business', ranges: [[9, 17]] }
};

/**
 * Preset date patterns
 */
export const DATE_PATTERNS = {
    all: { type: 'all', days: [0, 1, 2, 3, 4, 5, 6] },
    weekdays: { type: 'weekdays', days: [1, 2, 3, 4, 5] },
    weekends: { type: 'weekends', days: [0, 6] }
};

/**
 * Get aggregation types
 * @returns {Array<{id: string, name: string}>}
 */
export function getAggregationTypes() {
    return [
        { id: '15min', name: '15 Minutes' },
        { id: 'hourly', name: 'Hourly' },
        { id: 'daily', name: 'Daily' },
        { id: 'weekly', name: 'Weekly' },
        { id: 'monthly', name: 'Monthly' }
    ];
}

/**
 * Format bucket key for display
 * @param {string} bucketKey - Bucket key
 * @param {string} aggregation - Aggregation type
 * @returns {string} Formatted display string
 */
export function formatBucketKey(bucketKey, aggregation) {
    switch (aggregation) {
        case '15min':
        case 'hourly':
            return bucketKey.replace('T', ' ');
        case 'daily':
            return bucketKey;
        case 'weekly':
            return `Week of ${bucketKey}`;
        case 'monthly': {
            const [year, month] = bucketKey.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        }
        default:
            return bucketKey;
    }
}
