# Data Model: SF Parking Occupancy Time Visualizer

**Date**: 2025-12-17 | **Updated**: 2025-12-19
**Status**: Complete

## Core Entities

### 1. AreaOfInterest (AOI)

Represents a San Francisco neighborhood or parking zone. Renamed from "Region" to "Areas of Interest (AOI)" per 2025-12-19 clarification.

```typescript
interface AreaOfInterest {
  id: string;           // Unique identifier (e.g., "mission", "soma", "sf-aggregate")
  name: string;         // Display name (e.g., "Mission District", "San Francisco")
  color: string;        // Hex color for chart series (e.g., "#4A90D9")
  totalSpaces: number;  // Total parking capacity in AOI
  isAggregate: boolean; // True for "San Francisco" which combines all neighborhoods
}
```

**Validation Rules**:
- `id`: Required, alphanumeric + hyphens, unique
- `name`: Required, 1-100 characters
- `color`: Required, valid hex color (#RRGGBB)
- `totalSpaces`: Required, positive integer
- `isAggregate`: Required, boolean

**Sample Data**:
```json
[
  { "id": "sf-aggregate", "name": "San Francisco", "color": "#34495E", "totalSpaces": 7600, "isAggregate": true },
  { "id": "downtown", "name": "Downtown/Financial", "color": "#E74C3C", "totalSpaces": 2500, "isAggregate": false },
  { "id": "soma", "name": "SOMA", "color": "#3498DB", "totalSpaces": 1800, "isAggregate": false },
  { "id": "mission", "name": "Mission District", "color": "#2ECC71", "totalSpaces": 1200, "isAggregate": false },
  { "id": "marina", "name": "Marina", "color": "#9B59B6", "totalSpaces": 800, "isAggregate": false },
  { "id": "richmond", "name": "Richmond", "color": "#F39C12", "totalSpaces": 600, "isAggregate": false },
  { "id": "sunset", "name": "Sunset", "color": "#1ABC9C", "totalSpaces": 700, "isAggregate": false }
]
```

**Note**: "San Francisco" is a virtual AOI computed by aggregating all neighborhood data using weighted average by capacity.

---

### 2. OccupancyReading

A single measurement of parking occupancy at a specific time and location.

```typescript
interface OccupancyReading {
  timestamp: string;    // ISO 8601 UTC (e.g., "2024-01-15T08:00:00Z")
  aoiId: string;        // Foreign key to AreaOfInterest.id
  occupied: number;     // Number of occupied spaces
  capacity: number;     // Total spaces available at that time (may vary)
}
```

**Validation Rules**:
- `timestamp`: Required, valid ISO 8601 format, UTC timezone
- `aoiId`: Required, must match existing AreaOfInterest.id (not including sf-aggregate)
- `occupied`: Required, non-negative integer, <= capacity
- `capacity`: Required, positive integer

**Derived Values** (computed, not stored):
- `occupancyRate`: `occupied / capacity` (0.0 to 1.0)
- `availableSpaces`: `capacity - occupied`

---

### 3. TimeRange

Defines the span of time for data visualization.

```typescript
interface TimeRange {
  start: string;  // ISO 8601 date (e.g., "2024-01-01")
  end: string;    // ISO 8601 date (e.g., "2024-01-31")
}
```

**Validation Rules**:
- `start`: Required, valid date, not in future
- `end`: Required, valid date, >= start
- Maximum span: 365 days (warn if exceeded)

---

### 4. AggregationBucket

Defines how data points are grouped over time.

```typescript
type AggregationBucket =
  | "15min"   // 15-minute intervals
  | "hourly"  // 1-hour intervals
  | "daily"   // 1-day intervals
  | "weekly"  // 1-week intervals (Monday start)
  | "monthly" // 1-month intervals

interface BucketConfig {
  type: AggregationBucket;
  alignTo: "start" | "end" | "center";  // Where timestamp represents in bucket
}
```

**Bucket Boundaries**:
- `15min`: :00, :15, :30, :45
- `hourly`: Top of hour (XX:00)
- `daily`: Midnight UTC (00:00:00Z)
- `weekly`: Monday 00:00:00Z
- `monthly`: 1st of month 00:00:00Z

---

### 5. StatisticType

Defines which statistical measure to calculate.

```typescript
type StatisticType =
  | "average"       // Arithmetic mean
  | "min"           // Minimum value
  | "max"           // Maximum value
  | "median"        // 50th percentile
  | "mode"          // Most frequent value
  | "p25"           // 25th percentile
  | "p75"           // 75th percentile

interface StatisticConfig {
  type: StatisticType;
  // Future: could add custom percentile support
}
```

---

### 6. DatePattern

Filters data by day-of-week patterns.

```typescript
interface DatePattern {
  type: "all" | "weekdays" | "weekends" | "custom";
  // Only used when type is "custom"
  days?: DayOfWeek[];
}

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0=Sunday, 6=Saturday
```

**Preset Patterns**:
- `all`: No filtering (all days)
- `weekdays`: Monday-Friday (days: [1,2,3,4,5])
- `weekends`: Saturday-Sunday (days: [0,6])
- `custom`: User-selected days

---

### 7. TimePattern

Filters data by time-of-day patterns.

```typescript
interface TimePattern {
  type: "all" | "morning" | "afternoon" | "evening" | "peak" | "offpeak" | "custom";
  // Only used when type is "custom"
  ranges?: HourRange[];
}

interface HourRange {
  start: number;  // 0-23
  end: number;    // 0-23 (exclusive, so 12 means up to 11:59)
}
```

**Preset Patterns**:
- `all`: No filtering (all hours)
- `morning`: 6:00-12:00
- `afternoon`: 12:00-18:00
- `evening`: 18:00-22:00
- `peak`: 7:00-9:00 AND 16:00-19:00
- `offpeak`: Inverse of peak hours
- `custom`: User-defined ranges

---

### 8. ChartConfig

Defines visualization settings.

```typescript
interface ChartConfig {
  type: ChartType;
  precision: number;        // Decimal places (0-3)
  showLegend: boolean;
  showTooltips: boolean;
  animate: boolean;
}

type ChartType =
  | "line"          // Connected points
  | "bar"           // Vertical bars
  | "area"          // Filled area under line
  | "stacked-area"  // Multiple series stacked
```

---

### 9. SeriesDimension (Added 2025-12-19)

Defines how chart series are grouped.

```typescript
type SeriesDimensionType = "aoi" | "dayOfWeek" | "timeOfDay";

interface SeriesDimension {
  type: SeriesDimensionType;
  // Selection within dimension (which items to show as series)
  selected: string[];  // AOI ids, day numbers (0-6), or time period ids
}

// Time of Day periods (fixed)
type TimeOfDayPeriod = "morning" | "afternoon" | "evening" | "night";

const TIME_OF_DAY_RANGES: Record<TimeOfDayPeriod, HourRange> = {
  morning: { start: 6, end: 12 },     // 6am - 12pm
  afternoon: { start: 12, end: 18 },  // 12pm - 6pm
  evening: { start: 18, end: 24 },    // 6pm - 12am
  night: { start: 0, end: 6 }         // 12am - 6am
};

// Day of Week (0 = Sunday, 6 = Saturday)
const DAY_OF_WEEK_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
```

**Behavior**:
- When `type` is "aoi": Series are grouped by selected AOIs; x-axis shows time/dates (chronological)
- When `type` is "dayOfWeek": Series are grouped by selected days (Sun-Sat); x-axis shows time of day (hours or 15-min intervals depending on aggregation)
- When `type` is "timeOfDay": Series are grouped by time periods (Morning, Afternoon, Evening, Night); x-axis shows days of week (Sun-Sat)

**Filter Visibility Rules**:
| SeriesDimensionType | Hidden Filters |
|---------------------|----------------|
| aoi | None |
| dayOfWeek | DatePattern filter (redundant) |
| timeOfDay | TimePattern filter (redundant) |

---

### 10. VisualizationState

Complete application state (all parameters).

```typescript
interface VisualizationState {
  timeRange: TimeRange;
  aggregation: AggregationBucket;
  statistic: StatisticType;
  seriesDimension: SeriesDimension;  // Added 2025-12-19
  datePattern: DatePattern;
  timePattern: TimePattern;
  chart: ChartConfig;
}
```

**Default State**:
```json
{
  "timeRange": { "start": "<dataset start>", "end": "<dataset start + 7 days>" },
  "aggregation": "daily",
  "statistic": "average",
  "seriesDimension": {
    "type": "aoi",
    "selected": ["sf-aggregate"]
  },
  "datePattern": { "type": "all" },
  "timePattern": { "type": "all" },
  "chart": {
    "type": "line",
    "precision": 1,
    "showLegend": true,
    "showTooltips": true,
    "animate": true
  }
}
```

**Note**: Default time range starts at beginning of dataset (earliest available date) and spans 7 days forward.

---

## Computed/Derived Entities

### AggregatedDataPoint

Result of applying aggregation and statistics to raw readings.

```typescript
interface AggregatedDataPoint {
  bucketStart: string;      // ISO 8601 timestamp
  bucketEnd: string;        // ISO 8601 timestamp
  seriesKey: string;        // AOI id, day number, or time period id
  value: number;            // Computed statistic (e.g., average occupancy rate)
  sampleCount: number;      // Number of raw readings in bucket
}
```

### ChartSeries

Data formatted for chart rendering.

```typescript
interface ChartSeries {
  seriesKey: string;        // Identifier within active dimension
  seriesName: string;       // Display name (e.g., "Mission District", "Monday", "Morning")
  color: string;
  points: ChartPoint[];
}

interface ChartPoint {
  x: number;      // Pixel position or timestamp
  y: number;      // Pixel position or value
  label: string;  // Formatted value for tooltip
  raw: AggregatedDataPoint;
}
```

---

## Data Flow

```
┌─────────────────┐
│ parking-data.json│  Static raw readings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  data-loader.js │  Parse, validate, index
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  time-utils.js  │  Apply TimeRange, DatePattern, TimePattern filters
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  time-utils.js  │  Bucketize by AggregationBucket
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ statistics.js   │  Calculate StatisticType per bucket
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   chart.js      │  Render to canvas
└─────────────────┘
```

---

## State Transitions

### Parameter Change Flow

1. User modifies control → `controls.js` emits event
2. Event handler updates `VisualizationState`
3. Data pipeline re-runs with new state
4. Chart re-renders with new data
5. Target: Complete cycle in < 100ms

### Valid State Combinations

| Aggregation | Recommended Max Range | Note |
|-------------|----------------------|------|
| 15min | 7 days | ~672 points/region |
| hourly | 30 days | ~720 points/region |
| daily | 365 days | ~365 points/region |
| weekly | 365 days | ~52 points/region |
| monthly | 365 days | ~12 points/region |

Warning shown if range × bucket produces > 10,000 points per region.
