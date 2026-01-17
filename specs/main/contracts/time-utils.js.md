# Contract: time-utils.js

**Module**: `src/lib/time-utils.js`
**Purpose**: Date/time utilities for filtering and bucketing
**Dependencies**: None

## Exports

### `parseDate(dateStr: string): Date`

Parse ISO 8601 date string to Date object.

**Input**: ISO 8601 string (date or datetime)
**Output**: JavaScript Date object in UTC

```javascript
parseDate("2024-01-15")           // => Date(2024-01-15T00:00:00Z)
parseDate("2024-01-15T08:30:00Z") // => Date(2024-01-15T08:30:00Z)
```

---

### `formatDate(date: Date, format: string): string`

Format Date object to string.

**Input**:
- `date`: JavaScript Date
- `format`: Format string (`"iso"`, `"date"`, `"time"`, `"datetime"`)

**Output**: Formatted string

```javascript
formatDate(date, "iso")      // => "2024-01-15T08:30:00Z"
formatDate(date, "date")     // => "2024-01-15"
formatDate(date, "time")     // => "08:30"
formatDate(date, "datetime") // => "Jan 15, 2024 8:30 AM"
```

---

### `isInRange(timestamp: string, range: TimeRange): boolean`

Check if timestamp falls within time range (inclusive).

**Input**:
- `timestamp`: ISO 8601 string
- `range`: `{ start: string, end: string }`

**Output**: Boolean

```javascript
isInRange("2024-01-15", { start: "2024-01-01", end: "2024-01-31" }) // => true
isInRange("2024-02-01", { start: "2024-01-01", end: "2024-01-31" }) // => false
```

---

### `filterByDayOfWeek(readings: OccupancyReading[], days: number[]): OccupancyReading[]`

Filter readings to only include specified days of week.

**Input**:
- `readings`: Array of OccupancyReading objects
- `days`: Array of day numbers (0=Sunday, 6=Saturday)

**Output**: Filtered array (new array, input unchanged)

```javascript
filterByDayOfWeek(readings, [1, 2, 3, 4, 5]) // Weekdays only
filterByDayOfWeek(readings, [0, 6])          // Weekends only
filterByDayOfWeek(readings, [1, 3])          // Mon & Wed only
```

---

### `filterByHourRange(readings: OccupancyReading[], ranges: HourRange[]): OccupancyReading[]`

Filter readings to only include specified hour ranges.

**Input**:
- `readings`: Array of OccupancyReading objects
- `ranges`: Array of `{ start: number, end: number }` (hours 0-23, end is exclusive)

**Output**: Filtered array (new array, input unchanged)

```javascript
filterByHourRange(readings, [{ start: 6, end: 12 }])                    // Morning
filterByHourRange(readings, [{ start: 7, end: 9 }, { start: 16, end: 19 }]) // Peak hours
```

---

### `getBucketKey(timestamp: string, bucket: AggregationBucket): string`

Get the bucket identifier for a timestamp.

**Input**:
- `timestamp`: ISO 8601 string
- `bucket`: `"15min"`, `"hourly"`, `"daily"`, `"weekly"`, `"monthly"`

**Output**: Bucket identifier string (start of bucket in ISO format)

```javascript
getBucketKey("2024-01-15T08:37:00Z", "15min")   // => "2024-01-15T08:30:00Z"
getBucketKey("2024-01-15T08:37:00Z", "hourly")  // => "2024-01-15T08:00:00Z"
getBucketKey("2024-01-15T08:37:00Z", "daily")   // => "2024-01-15T00:00:00Z"
getBucketKey("2024-01-15T08:37:00Z", "weekly")  // => "2024-01-15T00:00:00Z" (Monday)
getBucketKey("2024-01-15T08:37:00Z", "monthly") // => "2024-01-01T00:00:00Z"
```

---

### `bucketize(readings: OccupancyReading[], bucket: AggregationBucket): Map<string, OccupancyReading[]>`

Group readings into time buckets.

**Input**:
- `readings`: Array of OccupancyReading objects
- `bucket`: Aggregation bucket type

**Output**: Map where key is bucket identifier, value is array of readings in that bucket

```javascript
const buckets = bucketize(readings, "daily");
// Map {
//   "2024-01-15T00:00:00Z" => [reading1, reading2, ...],
//   "2024-01-16T00:00:00Z" => [reading3, reading4, ...],
//   ...
// }
```

---

### `generateBucketRange(range: TimeRange, bucket: AggregationBucket): string[]`

Generate all bucket keys for a time range (including empty buckets).

**Input**:
- `range`: Time range with start and end dates
- `bucket`: Aggregation bucket type

**Output**: Array of bucket key strings in chronological order

```javascript
generateBucketRange({ start: "2024-01-01", end: "2024-01-03" }, "daily")
// => ["2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z", "2024-01-03T00:00:00Z"]
```

---

### `getDayOfWeek(timestamp: string): number`

Get day of week for a timestamp.

**Input**: ISO 8601 string
**Output**: Day number (0=Sunday, 6=Saturday)

```javascript
getDayOfWeek("2024-01-15T08:00:00Z") // => 1 (Monday)
```

---

### `getHour(timestamp: string): number`

Get hour of day for a timestamp.

**Input**: ISO 8601 string
**Output**: Hour (0-23)

```javascript
getHour("2024-01-15T08:30:00Z") // => 8
```

---

## Type Definitions

```typescript
interface TimeRange {
  start: string;  // ISO 8601 date
  end: string;    // ISO 8601 date
}

interface HourRange {
  start: number;  // 0-23
  end: number;    // 0-23 (exclusive)
}

type AggregationBucket = "15min" | "hourly" | "daily" | "weekly" | "monthly";

interface OccupancyReading {
  timestamp: string;
  regionId: string;
  occupied: number;
  capacity: number;
}
```

## Error Handling

- Invalid date strings throw `Error`
- Invalid bucket types throw `Error`
- Empty readings arrays return empty results (not errors)

## Performance Requirements

- All filter functions MUST handle 100,000+ readings efficiently
- No input mutation (return new arrays/objects)
- Bucket operations SHOULD be O(n)
