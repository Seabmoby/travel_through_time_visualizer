# Contract: data-loader.js

**Module**: `src/lib/data-loader.js`
**Purpose**: Load and parse static parking data
**Dependencies**: None (uses fetch API)

## Exports

### `loadParkingData(url?: string): Promise<ParkingData>`

Load parking data from JSON file.

**Input**: Optional URL to data file (defaults to `./data/parking-data.json`)
**Output**: Promise resolving to ParkingData object

```javascript
const data = await loadParkingData();
// {
//   regions: [...],
//   readings: [...],
//   metadata: { ... }
// }
```

---

### `validateReading(reading: object): OccupancyReading`

Validate and normalize a single reading.

**Input**: Raw reading object from JSON
**Output**: Validated OccupancyReading object
**Throws**: Error if validation fails

```javascript
validateReading({
  timestamp: "2024-01-15T08:00:00Z",
  regionId: "mission",
  occupied: 150,
  capacity: 200
}); // => validated reading

validateReading({
  timestamp: "invalid",
  regionId: "mission",
  occupied: 150,
  capacity: 200
}); // => throws Error
```

---

### `validateRegion(region: object): Region`

Validate and normalize a single region.

**Input**: Raw region object from JSON
**Output**: Validated Region object
**Throws**: Error if validation fails

```javascript
validateRegion({
  id: "mission",
  name: "Mission District",
  color: "#2ECC71",
  totalSpaces: 1200
}); // => validated region
```

---

### `getReadingsForRegion(data: ParkingData, regionId: string): OccupancyReading[]`

Get all readings for a specific region.

**Input**:
- `data`: Loaded ParkingData
- `regionId`: Region identifier

**Output**: Array of readings (empty if region not found)

```javascript
const missionReadings = getReadingsForRegion(data, "mission");
```

---

### `getReadingsInRange(data: ParkingData, range: TimeRange): OccupancyReading[]`

Get all readings within a time range.

**Input**:
- `data`: Loaded ParkingData
- `range`: TimeRange object

**Output**: Array of readings within range

```javascript
const readings = getReadingsInRange(data, {
  start: "2024-01-01",
  end: "2024-01-31"
});
```

---

### `getAvailableTimeRange(data: ParkingData): TimeRange`

Get the full time range covered by the data.

**Input**: Loaded ParkingData
**Output**: TimeRange from earliest to latest reading

```javascript
getAvailableTimeRange(data);
// => { start: "2024-01-01", end: "2024-03-31" }
```

---

### `indexByRegion(readings: OccupancyReading[]): Map<string, OccupancyReading[]>`

Create an index of readings by region for faster access.

**Input**: Array of readings
**Output**: Map keyed by regionId

```javascript
const index = indexByRegion(data.readings);
const missionReadings = index.get("mission");
```

---

## Type Definitions

```typescript
interface ParkingData {
  regions: Region[];
  readings: OccupancyReading[];
  metadata: DataMetadata;
}

interface DataMetadata {
  generatedAt: string;      // ISO 8601 timestamp
  sourceDescription: string;
  readingInterval: string;  // e.g., "15min"
  coverage: TimeRange;
}

interface Region {
  id: string;
  name: string;
  color: string;
  totalSpaces: number;
}

interface OccupancyReading {
  timestamp: string;
  regionId: string;
  occupied: number;
  capacity: number;
}

interface TimeRange {
  start: string;
  end: string;
}
```

## Data File Format

Expected structure of `parking-data.json`:

```json
{
  "metadata": {
    "generatedAt": "2024-01-15T00:00:00Z",
    "sourceDescription": "Simulated SF parking occupancy data",
    "readingInterval": "15min",
    "coverage": {
      "start": "2024-01-01",
      "end": "2024-03-31"
    }
  },
  "regions": [
    {
      "id": "downtown",
      "name": "Downtown/Financial",
      "color": "#E74C3C",
      "totalSpaces": 2500
    }
  ],
  "readings": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "regionId": "downtown",
      "occupied": 125,
      "capacity": 2500
    }
  ]
}
```

## Error Handling

- Network errors: Reject promise with descriptive error
- Parse errors: Reject promise with line/position info
- Validation errors: Reject promise listing all invalid items

## Performance Requirements

- Initial load MUST complete in < 500ms for 50,000 readings
- Create index on load for O(1) region lookups
- Lazy parsing acceptable for very large files
