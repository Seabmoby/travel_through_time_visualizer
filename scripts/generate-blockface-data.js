#!/usr/bin/env node
/**
 * Generate blockface time-series data from SF segment GeoJSON
 *
 * Selects representative parking segments and generates realistic
 * occupancy readings correlated with baseline occupancy.
 *
 * Usage: node scripts/generate-blockface-data.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Number of featured blockfaces to select (reduced for manageable file size)
  targetBlockfaceCount: 50,

  // Date range for time-series (must match neighborhoods.json: 2023-01-01 to 2023-03-31)
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-03-31'),

  // Readings per day (15-minute intervals)
  readingsPerDay: 96,

  // Minimum capacity to be considered for featured
  minCapacity: 5,

  // Selection quotas by classification (reduced proportionally)
  classificationQuotas: {
    'Paid Parking': 20,
    'Loading Zone': 10,
    'Free for Non-Residents': 10,
    'Residential Permit': 5,
    'Other Permits': 3,
    'Currently No Parking': 2
  }
};

// Paths
const SEGMENTS_PATH = path.join(__dirname, '../Resources/sf_segments_fixed.geojson');
const NEIGHBORHOODS_PATH = path.join(__dirname, '../Resources/gn-san-francisco.geojson');
const REGIONS_PATH = path.join(__dirname, '../src/data/neighborhoods.json');
const OUTPUT_PATH = path.join(__dirname, '../src/data/blockfaces.json');

/**
 * Point-in-polygon using ray casting algorithm
 */
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if point is in any polygon of a MultiPolygon or Polygon
 */
function pointInGeometry(point, geometry) {
  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(poly => pointInPolygon(point, poly[0]));
  }
  return false;
}

/**
 * Get centroid of a LineString
 */
function getLineCentroid(coordinates) {
  const sumX = coordinates.reduce((sum, c) => sum + c[0], 0);
  const sumY = coordinates.reduce((sum, c) => sum + c[1], 0);
  return [sumX / coordinates.length, sumY / coordinates.length];
}

/**
 * Map segment to neighborhood
 */
function findNeighborhood(segment, neighborhoods) {
  const centroid = getLineCentroid(segment.geometry.coordinates);

  for (const hood of neighborhoods.features) {
    if (pointInGeometry(centroid, hood.geometry)) {
      return hood.properties.name;
    }
  }
  return null;
}

/**
 * Convert neighborhood name to region ID
 */
function neighborhoodToRegionId(name) {
  if (!name) return 'other';
  return name.toLowerCase()
    .replace(/[\/\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Generate street name from meter ID (simulated)
 */
function generateStreetName(meterId, classification) {
  // Common SF street names for variety
  const streets = [
    'Market St', 'Mission St', 'Valencia St', 'Geary Blvd', 'Van Ness Ave',
    'Fillmore St', 'Divisadero St', 'California St', 'Bush St', 'Sutter St',
    'Post St', 'Kearny St', 'Montgomery St', 'Sansome St', 'Battery St',
    'Columbus Ave', 'Broadway', 'Grant Ave', 'Stockton St', 'Powell St',
    'Irving St', 'Judah St', 'Taraval St', 'Clement St', 'Balboa St',
    'Haight St', 'Castro St', 'Church St', '24th St', '16th St'
  ];

  // Use meterId to deterministically pick a street
  const hash = parseInt(meterId.slice(-4), 10) || 0;
  const streetIndex = hash % streets.length;
  const blockNum = (hash % 30) * 100 + (hash % 100);

  return `${blockNum} ${streets[streetIndex]}`;
}

/**
 * Generate time-of-day occupancy multiplier
 * Peak hours: 10am-2pm, 5pm-8pm for commercial areas
 */
function getTimeMultiplier(hour, classification) {
  // Base pattern for commercial/paid parking
  const commercialPattern = [
    0.15, 0.10, 0.08, 0.08, 0.10, 0.15, // 12am-6am: very low
    0.25, 0.45, 0.65, 0.85, 0.95, 1.00, // 6am-12pm: ramping up
    1.00, 0.95, 0.85, 0.75, 0.80, 0.90, // 12pm-6pm: lunch peak, afternoon
    0.95, 1.00, 0.90, 0.70, 0.50, 0.30  // 6pm-12am: evening peak, decline
  ];

  // Residential pattern - more evening focused
  const residentialPattern = [
    0.85, 0.90, 0.92, 0.90, 0.85, 0.75, // 12am-6am: high overnight
    0.60, 0.45, 0.35, 0.30, 0.30, 0.35, // 6am-12pm: people leave
    0.40, 0.45, 0.50, 0.55, 0.65, 0.75, // 12pm-6pm: gradually return
    0.85, 0.90, 0.92, 0.93, 0.92, 0.88  // 6pm-12am: evening high
  ];

  // Loading zone - business hours heavy
  const loadingPattern = [
    0.05, 0.05, 0.05, 0.05, 0.10, 0.20, // 12am-6am: nearly empty
    0.45, 0.75, 0.90, 0.95, 0.95, 0.90, // 6am-12pm: busy delivery
    0.85, 0.80, 0.85, 0.90, 0.75, 0.50, // 12pm-6pm: afternoon deliveries
    0.30, 0.15, 0.10, 0.08, 0.05, 0.05  // 6pm-12am: quiet
  ];

  let pattern;
  switch (classification) {
    case 'Residential Permit':
    case 'Free for Non-Residents':
      pattern = residentialPattern;
      break;
    case 'Loading Zone':
      pattern = loadingPattern;
      break;
    default:
      pattern = commercialPattern;
  }

  return pattern[hour];
}

/**
 * Generate day-of-week multiplier
 */
function getDayMultiplier(dayOfWeek, classification) {
  // 0 = Sunday, 6 = Saturday
  const commercialPattern = [0.50, 0.95, 1.00, 1.00, 1.00, 1.00, 0.65];
  const residentialPattern = [0.95, 0.85, 0.85, 0.85, 0.85, 0.88, 0.92];
  const loadingPattern = [0.10, 0.95, 1.00, 1.00, 1.00, 0.90, 0.15];

  let pattern;
  switch (classification) {
    case 'Residential Permit':
    case 'Free for Non-Residents':
      pattern = residentialPattern;
      break;
    case 'Loading Zone':
      pattern = loadingPattern;
      break;
    default:
      pattern = commercialPattern;
  }

  return pattern[dayOfWeek];
}

/**
 * Seeded random number generator for reproducibility
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate occupancy reading with realistic variance
 */
function generateOccupancy(baseOccupancy, capacity, hour, dayOfWeek, classification, seed) {
  const timeMultiplier = getTimeMultiplier(hour, classification);
  const dayMultiplier = getDayMultiplier(dayOfWeek, classification);

  // Base occupancy adjusted by time patterns
  let adjusted = (baseOccupancy / 100) * timeMultiplier * dayMultiplier;

  // Add random noise (-10% to +10%)
  const noise = (seededRandom(seed) - 0.5) * 0.2;
  adjusted = Math.max(0, Math.min(1, adjusted + noise));

  // Convert to occupied count
  const occupied = Math.round(adjusted * capacity);
  return Math.max(0, Math.min(capacity, occupied));
}

/**
 * Generate transaction value correlated with occupancy turnover
 * Higher turnover (moderate occupancy with frequent changes) = more transactions
 * @param {number} occupancy - Current occupancy percentage (0-100)
 * @param {number} capacity - Total parking capacity
 * @param {number} hour - Hour of day (0-23)
 * @param {string} classification - Parking classification type
 * @param {number} seed - Random seed
 * @returns {number} Transaction amount in dollars
 */
function generateTransactions(occupancy, capacity, hour, classification, seed) {
  // Base rate per space per 15-min interval
  // Paid parking has higher rates, loading zones have lower turnover
  let baseRate;
  switch (classification) {
    case 'Paid Parking':
      baseRate = 2.50; // $2.50 per space per 15 min at peak
      break;
    case 'Loading Zone':
      baseRate = 0.50; // Lower rate, commercial use
      break;
    case 'Residential Permit':
      baseRate = 0.25; // Very low, mostly permit-based
      break;
    default:
      baseRate = 1.00; // Default rate
  }

  // Turnover factor: moderate occupancy (40-70%) has highest turnover
  // Very low or very high occupancy = less turnover = fewer transactions
  const occupancyNorm = occupancy / 100;
  const turnoverFactor = 4 * occupancyNorm * (1 - occupancyNorm); // Peaks at 50%

  // Time-of-day pricing multiplier (surge pricing during peak hours)
  let timePricing = 1.0;
  if (hour >= 9 && hour <= 11) timePricing = 1.5;  // Morning peak
  else if (hour >= 12 && hour <= 14) timePricing = 1.3; // Lunch
  else if (hour >= 17 && hour <= 19) timePricing = 1.4; // Evening peak
  else if (hour >= 22 || hour <= 5) timePricing = 0.5; // Night discount

  // Calculate base transaction value
  let transactions = baseRate * capacity * turnoverFactor * timePricing;

  // Add random variance (-20% to +20%)
  const noise = (seededRandom(seed + 1000) - 0.5) * 0.4;
  transactions = transactions * (1 + noise);

  // Round to cents
  return Math.max(0, Math.round(transactions * 100) / 100);
}

/**
 * Select representative blockfaces from segments
 */
function selectBlockfaces(segments, neighborhoods) {
  console.log(`Processing ${segments.features.length} segments...`);

  // Filter to segments with sufficient capacity
  const candidates = segments.features.filter(f =>
    f.properties.capacity >= CONFIG.minCapacity
  );
  console.log(`Found ${candidates.length} candidates with capacity >= ${CONFIG.minCapacity}`);

  // Group by classification
  const byClassification = {};
  candidates.forEach(seg => {
    const cls = seg.properties.classification;
    if (!byClassification[cls]) byClassification[cls] = [];
    byClassification[cls].push(seg);
  });

  console.log('Candidates by classification:');
  Object.entries(byClassification).forEach(([cls, segs]) => {
    console.log(`  ${cls}: ${segs.length}`);
  });

  // Select from each classification according to quotas
  const selected = [];
  const usedMeterIds = new Set();

  Object.entries(CONFIG.classificationQuotas).forEach(([cls, quota]) => {
    const pool = byClassification[cls] || [];

    // Sort by capacity (prefer higher capacity for visibility)
    const sorted = [...pool].sort((a, b) => b.properties.capacity - a.properties.capacity);

    let count = 0;
    for (const seg of sorted) {
      if (count >= quota) break;

      // Skip if we already have this meter (avoid duplicates)
      if (usedMeterIds.has(seg.properties.meterId)) continue;

      // Find neighborhood
      const neighborhood = findNeighborhood(seg, neighborhoods);
      if (!neighborhood) continue;

      usedMeterIds.add(seg.properties.meterId);

      selected.push({
        segment: seg,
        neighborhood
      });
      count++;
    }

    console.log(`  Selected ${count}/${quota} for ${cls}`);
  });

  return selected;
}

/**
 * Generate time-series readings for a blockface
 */
function generateReadings(blockface, startDate, endDate) {
  const readings = [];
  const { segment, neighborhood } = blockface;
  const { capacity, occupancy, classification, segmentId } = segment.properties;

  const current = new Date(startDate);
  let readingIndex = 0;

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    // Generate 96 readings for this day (15-minute intervals)
    for (let interval = 0; interval < CONFIG.readingsPerDay; interval++) {
      const hour = Math.floor(interval / 4);
      const minute = (interval % 4) * 15;

      const timestamp = new Date(current);
      timestamp.setHours(hour, minute, 0, 0);

      // Seed for reproducible randomness
      const seed = readingIndex + parseInt(segmentId.slice(0, 8), 16);

      const occupied = generateOccupancy(
        occupancy,
        capacity,
        hour,
        dayOfWeek,
        classification,
        seed
      );

      // Calculate occupancy percentage for transaction generation
      const occupancyPercent = capacity > 0 ? (occupied / capacity) * 100 : 0;

      // Generate correlated transaction data
      const transactions = generateTransactions(
        occupancyPercent,
        capacity,
        hour,
        classification,
        seed
      );

      readings.push({
        timestamp: timestamp.toISOString(),
        blockfaceId: segmentId,
        occupied,
        capacity,
        transactions
      });

      readingIndex++;
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return readings;
}

/**
 * Main generation function
 */
async function main() {
  console.log('Loading data files...');

  // Load source data
  const segments = JSON.parse(fs.readFileSync(SEGMENTS_PATH, 'utf8'));
  const neighborhoods = JSON.parse(fs.readFileSync(NEIGHBORHOODS_PATH, 'utf8'));
  const regions = JSON.parse(fs.readFileSync(REGIONS_PATH, 'utf8'));

  console.log(`Loaded ${segments.features.length} segments`);
  console.log(`Loaded ${neighborhoods.features.length} neighborhoods`);

  // Build region color map
  const regionColors = {};
  regions.regions.forEach(r => {
    regionColors[r.id] = r.color;
  });

  // Select representative blockfaces
  const selectedBlockfaces = selectBlockfaces(segments, neighborhoods);
  console.log(`\nSelected ${selectedBlockfaces.length} blockfaces`);

  // Build blockface metadata
  const blockfaces = selectedBlockfaces.map(({ segment, neighborhood }) => {
    const regionId = neighborhoodToRegionId(neighborhood);
    return {
      id: segment.properties.segmentId,
      name: generateStreetName(segment.properties.meterId, segment.properties.classification),
      segmentId: segment.properties.segmentId,
      meterId: segment.properties.meterId,
      aoiId: regionId,
      aoiName: neighborhood,
      classification: segment.properties.classification,
      capacity: segment.properties.capacity,
      baseOccupancy: segment.properties.occupancy,
      color: regionColors[regionId] || '#666666'
    };
  });

  // Generate time-series readings
  console.log('\nGenerating time-series readings...');
  const { startDate, endDate } = CONFIG;
  const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (${dayCount} days)`);
  console.log(`Readings per blockface: ${dayCount * CONFIG.readingsPerDay}`);

  let allReadings = [];
  let processedCount = 0;

  for (const blockface of selectedBlockfaces) {
    const readings = generateReadings(blockface, startDate, endDate);
    allReadings = allReadings.concat(readings);

    processedCount++;
    if (processedCount % 25 === 0) {
      console.log(`  Processed ${processedCount}/${selectedBlockfaces.length} blockfaces...`);
    }
  }

  console.log(`Generated ${allReadings.length.toLocaleString()} total readings`);

  // Build output
  const output = {
    blockfaces,
    readings: allReadings,
    meta: {
      generated: new Date().toISOString().split('T')[0],
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      blockfaceCount: blockfaces.length,
      readingsPerDay: CONFIG.readingsPerDay,
      totalReadings: allReadings.length,
      sourceFile: 'sf_segments_fixed.geojson',
      description: 'Time-series parking occupancy data for featured SF blockfaces'
    }
  };

  // Write output
  console.log(`\nWriting to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`Output file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Summary by classification
  console.log('\nBlockfaces by classification:');
  const byClass = {};
  blockfaces.forEach(bf => {
    byClass[bf.classification] = (byClass[bf.classification] || 0) + 1;
  });
  Object.entries(byClass).forEach(([cls, count]) => {
    console.log(`  ${cls}: ${count}`);
  });

  // Summary by neighborhood
  console.log('\nBlockfaces by neighborhood:');
  const byHood = {};
  blockfaces.forEach(bf => {
    byHood[bf.aoiName] = (byHood[bf.aoiName] || 0) + 1;
  });
  Object.entries(byHood)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([hood, count]) => {
      console.log(`  ${hood}: ${count}`);
    });

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
