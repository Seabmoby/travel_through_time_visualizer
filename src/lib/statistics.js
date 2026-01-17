/**
 * Statistics Module
 * Pure functions for statistical calculations
 */

/**
 * Calculate mean (average) of values
 * @param {number[]} values - Array of numbers
 * @returns {number} Mean value, or 0 if empty
 */
export function mean(values) {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}

/**
 * Calculate minimum value
 * @param {number[]} values - Array of numbers
 * @returns {number} Minimum value, or 0 if empty
 */
export function min(values) {
    if (!values || values.length === 0) return 0;
    return Math.min(...values);
}

/**
 * Calculate maximum value
 * @param {number[]} values - Array of numbers
 * @returns {number} Maximum value, or 0 if empty
 */
export function max(values) {
    if (!values || values.length === 0) return 0;
    return Math.max(...values);
}

/**
 * Calculate median value
 * @param {number[]} values - Array of numbers
 * @returns {number} Median value, or 0 if empty
 */
export function median(values) {
    if (!values || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

/**
 * Calculate mode (most frequent value)
 * For continuous data, rounds to 1 decimal place before counting
 * @param {number[]} values - Array of numbers
 * @returns {number} Mode value, or 0 if empty
 */
export function mode(values) {
    if (!values || values.length === 0) return 0;

    // Round to 1 decimal for grouping continuous values
    const counts = new Map();
    for (const val of values) {
        const rounded = Math.round(val * 10) / 10;
        counts.set(rounded, (counts.get(rounded) || 0) + 1);
    }

    let maxCount = 0;
    let modeValue = values[0];

    for (const [val, count] of counts) {
        if (count > maxCount) {
            maxCount = count;
            modeValue = val;
        }
    }

    return modeValue;
}

/**
 * Calculate percentile value
 * @param {number[]} values - Array of numbers
 * @param {number} p - Percentile (0-100)
 * @returns {number} Percentile value, or 0 if empty
 */
export function percentile(values, p) {
    if (!values || values.length === 0) return 0;
    if (p < 0 || p > 100) {
        throw new Error('Percentile must be between 0 and 100');
    }

    const sorted = [...values].sort((a, b) => a - b);

    if (p === 0) return sorted[0];
    if (p === 100) return sorted[sorted.length - 1];

    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;

    if (lower === upper) {
        return sorted[lower];
    }

    return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

/**
 * Calculate sum (total) of values
 * @param {number[]} values - Array of numbers
 * @returns {number} Sum of all values, or 0 if empty
 */
export function total(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate standard deviation
 * @param {number[]} values - Array of numbers
 * @returns {number} Standard deviation, or 0 if empty
 */
export function standardDeviation(values) {
    if (!values || values.length === 0) return 0;
    if (values.length === 1) return 0;

    const avg = mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquaredDiff = mean(squaredDiffs);

    return Math.sqrt(avgSquaredDiff);
}

/**
 * Dispatcher function to calculate any statistic by name
 * @param {number[]} values - Array of numbers
 * @param {string} statisticType - Type of statistic to calculate
 * @returns {number} Calculated value
 */
export function calculate(values, statisticType) {
    switch (statisticType) {
        case 'average':
        case 'mean':
            return mean(values);

        case 'min':
        case 'minimum':
            return min(values);

        case 'max':
        case 'maximum':
            return max(values);

        case 'median':
            return median(values);

        case 'mode':
            return mode(values);

        case 'p25':
        case 'percentile25':
            return percentile(values, 25);

        case 'p75':
        case 'percentile75':
            return percentile(values, 75);

        case 'p90':
        case 'percentile90':
            return percentile(values, 90);

        case 'stddev':
        case 'standardDeviation':
            return standardDeviation(values);

        case 'total':
        case 'sum':
            return total(values);

        default:
            console.warn(`Unknown statistic type: ${statisticType}, falling back to mean`);
            return mean(values);
    }
}

/**
 * Get list of available statistic types
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function getStatisticTypes() {
    return [
        { id: 'actual', name: 'Actual', description: 'Raw data values without aggregation' },
        { id: 'average', name: 'Average', description: 'Mean of all values in the bucket' },
        { id: 'median', name: 'Median', description: 'Middle value (50th percentile)' },
        { id: 'min', name: 'Minimum', description: 'Lowest value in the bucket' },
        { id: 'max', name: 'Maximum', description: 'Highest value in the bucket' },
        { id: 'mode', name: 'Mode', description: 'Most frequently occurring value' },
        { id: 'p25', name: '25th Percentile', description: '25% of values are below this' },
        { id: 'p75', name: '75th Percentile', description: '75% of values are below this' },
        { id: 'total', name: 'Total', description: 'Sum of all values in the bucket' }
    ];
}
