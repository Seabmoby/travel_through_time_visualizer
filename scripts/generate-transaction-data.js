#!/usr/bin/env node
/**
 * Transaction Data Generator Script
 * Generates parking transaction (revenue) data for 37 San Francisco neighborhoods
 * and featured blockfaces with support for Total statistic
 */

const fs = require('fs');
const path = require('path');

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
    days: 90,
    start: '2023-01-01',
    interval: 15,
    output: 'src/data/transactions.json',
    blockfaceOutput: 'src/data/blockface-transactions.json'
};

for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    if (key === 'days') options.days = parseInt(value, 10);
    else if (key === 'start') options.start = value;
    else if (key === 'interval') options.interval = parseInt(value, 10);
    else if (key === 'output') options.output = value;
    else if (key === 'blockfaceOutput') options.blockfaceOutput = value;
}

// Neighborhood definitions with categories
const NEIGHBORHOODS = [
    // Commercial/Business Districts (High Capacity)
    { id: 'downtown-civic-center', name: 'Downtown/Civic Center', totalSpaces: 2500, category: 'commercial', color: '#e74c3c' },
    { id: 'financial-district', name: 'Financial District', totalSpaces: 2200, category: 'commercial', color: '#c0392b' },
    { id: 'south-of-market', name: 'South of Market', totalSpaces: 2000, category: 'commercial', color: '#d35400' },
    { id: 'chinatown', name: 'Chinatown', totalSpaces: 1000, category: 'commercial', color: '#e67e22' },

    // Mixed-Use Urban (Medium-High Capacity)
    { id: 'mission', name: 'Mission', totalSpaces: 1500, category: 'entertainment', color: '#2ecc71' },
    { id: 'marina', name: 'Marina', totalSpaces: 1200, category: 'residential_urban', color: '#3498db' },
    { id: 'castro-upper-market', name: 'Castro/Upper Market', totalSpaces: 1100, category: 'entertainment', color: '#9b59b6' },
    { id: 'north-beach', name: 'North Beach', totalSpaces: 1000, category: 'entertainment', color: '#1abc9c' },
    { id: 'pacific-heights', name: 'Pacific Heights', totalSpaces: 900, category: 'residential_urban', color: '#2980b9' },
    { id: 'nob-hill', name: 'Nob Hill', totalSpaces: 850, category: 'residential_urban', color: '#8e44ad' },
    { id: 'russian-hill', name: 'Russian Hill', totalSpaces: 800, category: 'residential_urban', color: '#16a085' },
    { id: 'haight-ashbury', name: 'Haight Ashbury', totalSpaces: 750, category: 'entertainment', color: '#f39c12' },

    // Residential (Medium Capacity)
    { id: 'inner-richmond', name: 'Inner Richmond', totalSpaces: 600, category: 'residential_urban', color: '#27ae60' },
    { id: 'inner-sunset', name: 'Inner Sunset', totalSpaces: 600, category: 'residential_urban', color: '#2c3e50' },
    { id: 'outer-richmond', name: 'Outer Richmond', totalSpaces: 550, category: 'residential_suburban', color: '#1e8449' },
    { id: 'outer-sunset', name: 'Outer Sunset', totalSpaces: 550, category: 'residential_suburban', color: '#145a32' },
    { id: 'potrero-hill', name: 'Potrero Hill', totalSpaces: 500, category: 'residential_urban', color: '#117a65' },
    { id: 'noe-valley', name: 'Noe Valley', totalSpaces: 500, category: 'residential_urban', color: '#0e6655' },
    { id: 'bernal-heights', name: 'Bernal Heights', totalSpaces: 450, category: 'residential_suburban', color: '#148f77' },
    { id: 'glen-park', name: 'Glen Park', totalSpaces: 400, category: 'residential_suburban', color: '#17a589' },
    { id: 'western-addition', name: 'Western Addition', totalSpaces: 650, category: 'residential_urban', color: '#d68910' },

    // Suburban Residential (Medium-Low Capacity)
    { id: 'bayview', name: 'Bayview', totalSpaces: 350, category: 'residential_suburban', color: '#6c3483' },
    { id: 'excelsior', name: 'Excelsior', totalSpaces: 350, category: 'residential_suburban', color: '#5b2c6f' },
    { id: 'outer-mission', name: 'Outer Mission', totalSpaces: 350, category: 'residential_suburban', color: '#4a235a' },
    { id: 'parkside', name: 'Parkside', totalSpaces: 400, category: 'residential_suburban', color: '#7d6608' },
    { id: 'lakeshore', name: 'Lakeshore', totalSpaces: 300, category: 'residential_suburban', color: '#9a7d0a' },
    { id: 'ocean-view', name: 'Ocean View', totalSpaces: 300, category: 'residential_suburban', color: '#7e5109' },
    { id: 'visitacion-valley', name: 'Visitacion Valley', totalSpaces: 300, category: 'residential_suburban', color: '#6e2c00' },
    { id: 'crocker-amazon', name: 'Crocker Amazon', totalSpaces: 300, category: 'residential_suburban', color: '#784212' },
    { id: 'diamond-heights', name: 'Diamond Heights', totalSpaces: 350, category: 'residential_suburban', color: '#873600' },
    { id: 'twin-peaks', name: 'Twin Peaks', totalSpaces: 250, category: 'residential_suburban', color: '#935116' },
    { id: 'west-of-twin-peaks', name: 'West of Twin Peaks', totalSpaces: 350, category: 'residential_suburban', color: '#a04000' },
    { id: 'presidio-heights', name: 'Presidio Heights', totalSpaces: 400, category: 'residential_urban', color: '#ba4a00' },
    { id: 'seacliff', name: 'Seacliff', totalSpaces: 200, category: 'residential_suburban', color: '#ca6f1e' },

    // Parks/Institutional (Low Capacity)
    { id: 'golden-gate-park', name: 'Golden Gate Park', totalSpaces: 150, category: 'park', color: '#196f3d' },
    { id: 'presidio', name: 'Presidio', totalSpaces: 200, category: 'park', color: '#1d8348' },
    { id: 'treasure-island-ybi', name: 'Treasure Island/YBI', totalSpaces: 100, category: 'residential_suburban', color: '#239b56' }
];

// Featured blockfaces with specific locations
const BLOCKFACES = [
    { id: 'market-powell', name: 'Market St @ Powell', segmentId: 'seg-001', aoiId: 'downtown-civic-center', capacity: 12, meterRate: 6.00 },
    { id: 'market-montgomery', name: 'Market St @ Montgomery', segmentId: 'seg-002', aoiId: 'financial-district', capacity: 10, meterRate: 6.00 },
    { id: 'mission-16th', name: 'Mission St @ 16th', segmentId: 'seg-003', aoiId: 'mission', capacity: 8, meterRate: 3.00 },
    { id: 'mission-24th', name: 'Mission St @ 24th', segmentId: 'seg-004', aoiId: 'mission', capacity: 10, meterRate: 3.00 },
    { id: 'castro-18th', name: 'Castro St @ 18th', segmentId: 'seg-005', aoiId: 'castro-upper-market', capacity: 6, meterRate: 4.00 },
    { id: 'haight-ashbury-corner', name: 'Haight St @ Ashbury', segmentId: 'seg-006', aoiId: 'haight-ashbury', capacity: 8, meterRate: 3.50 },
    { id: 'columbus-broadway', name: 'Columbus Ave @ Broadway', segmentId: 'seg-007', aoiId: 'north-beach', capacity: 7, meterRate: 4.00 },
    { id: 'grant-bush', name: 'Grant Ave @ Bush', segmentId: 'seg-008', aoiId: 'chinatown', capacity: 6, meterRate: 4.50 },
    { id: 'fillmore-union', name: 'Fillmore St @ Union', segmentId: 'seg-009', aoiId: 'marina', capacity: 9, meterRate: 3.00 },
    { id: 'clement-6th', name: 'Clement St @ 6th Ave', segmentId: 'seg-010', aoiId: 'inner-richmond', capacity: 8, meterRate: 2.50 },
    { id: 'irving-9th', name: 'Irving St @ 9th Ave', segmentId: 'seg-011', aoiId: 'inner-sunset', capacity: 10, meterRate: 2.50 },
    { id: 'chestnut-fillmore', name: 'Chestnut St @ Fillmore', segmentId: 'seg-012', aoiId: 'marina', capacity: 8, meterRate: 3.50 }
];

// Hourly patterns by category (for occupancy)
const HOURLY_PATTERN = {
    commercial: {
        0: 0.15, 1: 0.10, 2: 0.08, 3: 0.06, 4: 0.05, 5: 0.08,
        6: 0.20, 7: 0.45, 8: 0.70, 9: 0.85, 10: 0.95, 11: 0.98,
        12: 0.95, 13: 0.92, 14: 0.90, 15: 0.88, 16: 0.80, 17: 0.65,
        18: 0.45, 19: 0.35, 20: 0.28, 21: 0.22, 22: 0.18, 23: 0.15
    },
    entertainment: {
        0: 0.40, 1: 0.25, 2: 0.15, 3: 0.10, 4: 0.08, 5: 0.08,
        6: 0.10, 7: 0.15, 8: 0.25, 9: 0.35, 10: 0.45, 11: 0.55,
        12: 0.60, 13: 0.55, 14: 0.50, 15: 0.50, 16: 0.55, 17: 0.60,
        18: 0.70, 19: 0.82, 20: 0.92, 21: 0.95, 22: 0.85, 23: 0.60
    },
    residential_urban: {
        0: 0.85, 1: 0.88, 2: 0.90, 3: 0.90, 4: 0.88, 5: 0.82,
        6: 0.75, 7: 0.60, 8: 0.50, 9: 0.40, 10: 0.35, 11: 0.35,
        12: 0.38, 13: 0.40, 14: 0.42, 15: 0.45, 16: 0.55, 17: 0.65,
        18: 0.75, 19: 0.82, 20: 0.85, 21: 0.88, 22: 0.88, 23: 0.85
    },
    residential_suburban: {
        0: 0.92, 1: 0.94, 2: 0.95, 3: 0.95, 4: 0.94, 5: 0.88,
        6: 0.80, 7: 0.68, 8: 0.58, 9: 0.50, 10: 0.48, 11: 0.48,
        12: 0.50, 13: 0.50, 14: 0.52, 15: 0.55, 16: 0.62, 17: 0.72,
        18: 0.82, 19: 0.88, 20: 0.90, 21: 0.92, 22: 0.92, 23: 0.92
    },
    park: {
        0: 0.05, 1: 0.03, 2: 0.02, 3: 0.02, 4: 0.02, 5: 0.05,
        6: 0.10, 7: 0.20, 8: 0.35, 9: 0.50, 10: 0.65, 11: 0.75,
        12: 0.80, 13: 0.80, 14: 0.75, 15: 0.70, 16: 0.60, 17: 0.50,
        18: 0.40, 19: 0.30, 20: 0.20, 21: 0.12, 22: 0.08, 23: 0.05
    }
};

// Day of week patterns by category
const DAY_PATTERN = {
    commercial: { 0: 0.30, 1: 1.00, 2: 1.00, 3: 1.00, 4: 1.00, 5: 0.95, 6: 0.35 },
    entertainment: { 0: 0.85, 1: 0.55, 2: 0.58, 3: 0.62, 4: 0.72, 5: 1.00, 6: 0.95 },
    residential_urban: { 0: 0.90, 1: 0.85, 2: 0.85, 3: 0.85, 4: 0.85, 5: 0.88, 6: 0.92 },
    residential_suburban: { 0: 0.95, 1: 0.88, 2: 0.88, 3: 0.88, 4: 0.88, 5: 0.90, 6: 0.95 },
    park: { 0: 1.00, 1: 0.40, 2: 0.42, 3: 0.45, 4: 0.50, 5: 0.65, 6: 0.95 }
};

// Base hourly transaction rates by category ($ per hour per occupied space)
const TRANSACTION_RATE = {
    commercial: 5.00,
    entertainment: 4.00,
    residential_urban: 3.00,
    residential_suburban: 2.00,
    park: 2.50
};

// Turnover multiplier by hour (higher turnover = more transactions per space)
const TURNOVER_MULTIPLIER = {
    commercial: {
        0: 0.1, 1: 0.05, 2: 0.02, 3: 0.02, 4: 0.02, 5: 0.05,
        6: 0.3, 7: 0.6, 8: 1.0, 9: 1.2, 10: 1.3, 11: 1.4,
        12: 1.5, 13: 1.4, 14: 1.3, 15: 1.2, 16: 1.1, 17: 0.9,
        18: 0.5, 19: 0.3, 20: 0.2, 21: 0.15, 22: 0.12, 23: 0.1
    },
    entertainment: {
        0: 0.4, 1: 0.2, 2: 0.1, 3: 0.05, 4: 0.02, 5: 0.02,
        6: 0.05, 7: 0.1, 8: 0.2, 9: 0.3, 10: 0.5, 11: 0.7,
        12: 0.9, 13: 0.8, 14: 0.7, 15: 0.7, 16: 0.8, 17: 1.0,
        18: 1.2, 19: 1.4, 20: 1.5, 21: 1.4, 22: 1.0, 23: 0.6
    },
    residential_urban: {
        0: 0.1, 1: 0.05, 2: 0.02, 3: 0.02, 4: 0.02, 5: 0.05,
        6: 0.1, 7: 0.2, 8: 0.4, 9: 0.6, 10: 0.8, 11: 0.9,
        12: 1.0, 13: 0.9, 14: 0.8, 15: 0.7, 16: 0.6, 17: 0.5,
        18: 0.4, 19: 0.3, 20: 0.2, 21: 0.15, 22: 0.12, 23: 0.1
    },
    residential_suburban: {
        0: 0.05, 1: 0.02, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
        6: 0.05, 7: 0.1, 8: 0.2, 9: 0.3, 10: 0.4, 11: 0.5,
        12: 0.6, 13: 0.5, 14: 0.4, 15: 0.4, 16: 0.3, 17: 0.3,
        18: 0.2, 19: 0.15, 20: 0.1, 21: 0.08, 22: 0.06, 23: 0.05
    },
    park: {
        0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
        6: 0.1, 7: 0.2, 8: 0.5, 9: 0.8, 10: 1.0, 11: 1.2,
        12: 1.3, 13: 1.2, 14: 1.1, 15: 1.0, 16: 0.8, 17: 0.6,
        18: 0.4, 19: 0.2, 20: 0.1, 21: 0.05, 22: 0.03, 23: 0.02
    }
};

// Seeded random for reproducibility
let seed = 54321; // Different seed from occupancy for independent variation
function seededRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
}

/**
 * Calculate occupancy for a neighborhood at a specific time
 */
function calculateOccupancy(neighborhood, timestamp) {
    const category = neighborhood.category;
    const hour = timestamp.getUTCHours();
    const dayOfWeek = timestamp.getUTCDay();

    const hourMultiplier = HOURLY_PATTERN[category][hour];
    const dayMultiplier = DAY_PATTERN[category][dayOfWeek];

    const neighborhoodSeed = neighborhood.id.charCodeAt(0) + neighborhood.id.charCodeAt(neighborhood.id.length - 1);
    const baseRate = 0.55 + ((neighborhoodSeed % 100) / 500);

    let rate = baseRate * hourMultiplier * dayMultiplier;
    rate += (seededRandom() - 0.5) * 0.16;
    rate = Math.max(0.05, Math.min(0.98, rate));

    return Math.round(rate * neighborhood.totalSpaces);
}

/**
 * Calculate transactions for a neighborhood at a specific time
 * Returns dollar amount for the time interval
 */
function calculateNeighborhoodTransactions(neighborhood, occupied, timestamp) {
    const category = neighborhood.category;
    const hour = timestamp.getUTCHours();

    const baseRate = TRANSACTION_RATE[category];
    const turnover = TURNOVER_MULTIPLIER[category][hour];
    const intervalHours = options.interval / 60;

    // Transaction = occupied spaces * rate * turnover * time fraction
    let amount = occupied * baseRate * turnover * intervalHours;

    // Add realistic noise (+-15%)
    amount *= (1 + (seededRandom() - 0.5) * 0.30);

    return Math.round(amount * 100) / 100;
}

/**
 * Calculate blockface occupancy
 */
function calculateBlockfaceOccupancy(blockface, timestamp) {
    const neighborhood = NEIGHBORHOODS.find(n => n.id === blockface.aoiId);
    if (!neighborhood) return Math.floor(blockface.capacity * 0.5);

    const category = neighborhood.category;
    const hour = timestamp.getUTCHours();
    const dayOfWeek = timestamp.getUTCDay();

    const hourMultiplier = HOURLY_PATTERN[category][hour];
    const dayMultiplier = DAY_PATTERN[category][dayOfWeek];

    // Blockfaces have more variation than neighborhoods
    let rate = 0.60 * hourMultiplier * dayMultiplier;
    rate += (seededRandom() - 0.5) * 0.25;
    rate = Math.max(0, Math.min(1, rate));

    return Math.round(rate * blockface.capacity);
}

/**
 * Calculate blockface transactions
 */
function calculateBlockfaceTransactions(blockface, occupied, timestamp) {
    const hour = timestamp.getUTCHours();
    const neighborhood = NEIGHBORHOODS.find(n => n.id === blockface.aoiId);
    const category = neighborhood ? neighborhood.category : 'residential_urban';

    const turnover = TURNOVER_MULTIPLIER[category][hour];
    const intervalHours = options.interval / 60;

    // Use the blockface's specific meter rate
    let amount = occupied * blockface.meterRate * turnover * intervalHours;
    amount *= (1 + (seededRandom() - 0.5) * 0.20);

    return Math.round(amount * 100) / 100;
}

/**
 * Generate neighborhood-level transaction readings
 */
function generateNeighborhoodReadings() {
    const readings = [];
    const startDate = new Date(options.start + 'T00:00:00.000Z');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + options.days);

    const intervalMs = options.interval * 60 * 1000;
    let currentTime = new Date(startDate);
    let readingCount = 0;

    console.log(`Generating neighborhood data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    while (currentTime < endDate) {
        for (const neighborhood of NEIGHBORHOODS) {
            const occupied = calculateOccupancy(neighborhood, currentTime);
            const transactions = calculateNeighborhoodTransactions(neighborhood, occupied, currentTime);

            readings.push({
                timestamp: currentTime.toISOString(),
                regionId: neighborhood.id,
                transactions: transactions,
                occupied: occupied,
                capacity: neighborhood.totalSpaces
            });
            readingCount++;
        }

        currentTime = new Date(currentTime.getTime() + intervalMs);

        if (readingCount % 100000 === 0) {
            console.log(`Generated ${readingCount.toLocaleString()} neighborhood readings...`);
        }
    }

    return readings;
}

/**
 * Generate blockface-level transaction readings
 */
function generateBlockfaceReadings() {
    const readings = [];
    const startDate = new Date(options.start + 'T00:00:00.000Z');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + options.days);

    const intervalMs = options.interval * 60 * 1000;
    let currentTime = new Date(startDate);

    console.log(`Generating blockface data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    while (currentTime < endDate) {
        for (const blockface of BLOCKFACES) {
            const occupied = calculateBlockfaceOccupancy(blockface, currentTime);
            const transactions = calculateBlockfaceTransactions(blockface, occupied, currentTime);

            readings.push({
                timestamp: currentTime.toISOString(),
                blockfaceId: blockface.id,
                transactions: transactions,
                occupied: occupied,
                capacity: blockface.capacity
            });
        }
        currentTime = new Date(currentTime.getTime() + intervalMs);
    }

    console.log(`Generated ${readings.length.toLocaleString()} blockface readings`);
    return readings;
}

/**
 * Generate regions array for output
 */
function generateRegions() {
    return NEIGHBORHOODS.map(n => ({
        id: n.id,
        name: n.name,
        color: n.color,
        totalSpaces: n.totalSpaces,
        category: n.category
    }));
}

/**
 * Generate blockfaces array for output
 */
function generateBlockfaceMeta() {
    return BLOCKFACES.map(b => ({
        id: b.id,
        name: b.name,
        segmentId: b.segmentId,
        aoiId: b.aoiId,
        capacity: b.capacity,
        meterRate: b.meterRate
    }));
}

/**
 * Calculate summary statistics for the dataset
 */
function calculateSummary(readings, field = 'transactions') {
    const values = readings.map(r => r[field]);
    const sorted = [...values].sort((a, b) => a - b);

    return {
        total: values.reduce((a, b) => a + b, 0),
        count: values.length,
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p90: sorted[Math.floor(sorted.length * 0.90)]
    };
}

/**
 * Validate output data
 */
function validateData(data) {
    const errors = [];

    if (data.regions.length !== 37) {
        errors.push(`Expected 37 regions, got ${data.regions.length}`);
    }

    const regionIds = new Set(data.regions.map(r => r.id));
    for (const reading of data.readings.slice(0, 1000)) {
        if (!regionIds.has(reading.regionId)) {
            errors.push(`Invalid regionId: ${reading.regionId}`);
        }
        if (reading.transactions < 0) {
            errors.push(`Negative transactions: ${reading.transactions}`);
        }
    }

    return errors;
}

/**
 * Main execution
 */
function main() {
    console.log('Starting transaction data generation...');
    console.log('Options:', options);

    // Generate neighborhood data
    const regions = generateRegions();
    const neighborhoodReadings = generateNeighborhoodReadings();
    const neighborhoodSummary = calculateSummary(neighborhoodReadings);

    const neighborhoodData = {
        meta: {
            generated: new Date().toISOString(),
            dataType: 'transactions',
            description: 'Parking transaction (revenue) data for SF neighborhoods',
            startDate: options.start,
            days: options.days,
            intervalMinutes: options.interval,
            supportedStatistics: ['total', 'average', 'median', 'min', 'max', 'mode', 'p25', 'p75']
        },
        summary: {
            totalRevenue: Math.round(neighborhoodSummary.total * 100) / 100,
            readingCount: neighborhoodSummary.count,
            averagePerReading: Math.round(neighborhoodSummary.mean * 100) / 100,
            medianPerReading: Math.round(neighborhoodSummary.median * 100) / 100,
            minPerReading: neighborhoodSummary.min,
            maxPerReading: Math.round(neighborhoodSummary.max * 100) / 100
        },
        regions,
        readings: neighborhoodReadings
    };

    // Validate
    console.log('Validating neighborhood data...');
    const errors = validateData(neighborhoodData);
    if (errors.length > 0) {
        console.error('Validation errors:', errors);
        process.exit(1);
    }

    // Generate blockface data
    const blockfaces = generateBlockfaceMeta();
    const blockfaceReadings = generateBlockfaceReadings();
    const blockfaceSummary = calculateSummary(blockfaceReadings);

    const blockfaceData = {
        meta: {
            generated: new Date().toISOString(),
            dataType: 'transactions',
            description: 'Parking transaction data for featured SF blockfaces',
            startDate: options.start,
            days: options.days,
            intervalMinutes: options.interval,
            supportedStatistics: ['total', 'average', 'median', 'min', 'max', 'mode', 'p25', 'p75']
        },
        summary: {
            totalRevenue: Math.round(blockfaceSummary.total * 100) / 100,
            readingCount: blockfaceSummary.count,
            averagePerReading: Math.round(blockfaceSummary.mean * 100) / 100
        },
        blockfaces,
        readings: blockfaceReadings
    };

    // Write neighborhood output
    const neighborhoodOutputPath = path.resolve(process.cwd(), options.output);
    const neighborhoodOutputDir = path.dirname(neighborhoodOutputPath);
    if (!fs.existsSync(neighborhoodOutputDir)) {
        fs.mkdirSync(neighborhoodOutputDir, { recursive: true });
    }
    console.log(`Writing neighborhood data to ${neighborhoodOutputPath}...`);
    fs.writeFileSync(neighborhoodOutputPath, JSON.stringify(neighborhoodData, null, 2));

    // Write blockface output
    const blockfaceOutputPath = path.resolve(process.cwd(), options.blockfaceOutput);
    console.log(`Writing blockface data to ${blockfaceOutputPath}...`);
    fs.writeFileSync(blockfaceOutputPath, JSON.stringify(blockfaceData, null, 2));

    // Stats
    const neighborhoodStats = fs.statSync(neighborhoodOutputPath);
    const blockfaceStats = fs.statSync(blockfaceOutputPath);

    console.log(`\nGeneration complete!`);
    console.log(`\nNeighborhood Data:`);
    console.log(`  Regions: ${regions.length}`);
    console.log(`  Readings: ${neighborhoodReadings.length.toLocaleString()}`);
    console.log(`  Total Revenue: $${neighborhoodSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  File size: ${(neighborhoodStats.size / (1024 * 1024)).toFixed(2)} MB`);

    console.log(`\nBlockface Data:`);
    console.log(`  Blockfaces: ${blockfaces.length}`);
    console.log(`  Readings: ${blockfaceReadings.length.toLocaleString()}`);
    console.log(`  Total Revenue: $${blockfaceSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  File size: ${(blockfaceStats.size / (1024 * 1024)).toFixed(2)} MB`);
}

main();
