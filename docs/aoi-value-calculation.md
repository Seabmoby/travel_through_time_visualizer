# Math for Displaying a Single Value per AOI

This document explains how a single value is calculated and displayed for each AOI (Area of Interest / neighborhood) on the map.

## Data Flow

### 1. Raw Data Structure

Each reading contains:
- `timestamp` - when the measurement was taken
- `regionId` - the neighborhood ID
- `occupied` - number of occupied parking spaces
- `capacity` - total parking capacity
- `transactions` - revenue amount (if transaction dataset)

### 2. Filtering Pipeline

```
All Readings
    ↓
Time Range Filter (start date to end date)
    ↓
Day of Week Filter (optional: e.g., weekdays only)
    ↓
Hour Range Filter (optional: e.g., 9am-5pm only)
    ↓
Group by Neighborhood (regionId)
```

### 3. Per-Reading Value Calculation

**For Occupancy:**
```
occupancy% = (occupied / capacity) × 100
```

**For Transactions:**
```
value = transactions (raw dollar amount)
```

### 4. Interval Bucketing + Statistical Aggregation

The map uses interval bucketing to stay synchronized with the chart:

```
Filtered Readings
    ↓
Bucket by Interval (daily/weekly/monthly)
    ↓
Apply Statistic per Bucket
    ↓
Average across Buckets → Final Map Value
```

| Statistic | Applied Per Bucket |
|-----------|-------------------|
| **Average** | `Σ values / n` |
| **Median** | Middle value when sorted |
| **Min** | `min(values)` |
| **Max** | `max(values)` |
| **Mode** | Most frequent value (rounded to 0.1) |
| **P25** | 25th percentile via linear interpolation |
| **P75** | 75th percentile via linear interpolation |
| **Total** | `Σ values` |

## How Map and Chart Stay Synchronized

The map and chart now use the same bucketing logic:

### Example: 1 Year Timespan with Monthly Interval and Max Statistic

**Chart behavior:**
- Groups readings into 12 monthly buckets
- Calculates max for each month
- Displays 12 data points on the time series

**Map behavior:**
- Groups readings into 12 monthly buckets
- Calculates max for each month (same as chart)
- Averages the 12 monthly max values → single color per neighborhood

The map essentially answers: **"What's the typical [statistic] value at this [interval] for this neighborhood?"**

### Reference Lines on Chart

The chart displays a horizontal dashed reference line for each series, showing the same aggregated value that appears on the map. This visually connects the map's single-value display with the chart's time series:

- **Line style**: Dashed, colored to match its series
- **Label**: Shows the aggregated value (e.g., "72.5%")
- **Position**: Horizontal line at the y-axis value

This allows users to see both the time series variation AND where the "typical" value falls.

### Why This Matters

| Settings | Old Behavior | New Behavior |
|----------|--------------|--------------|
| Monthly + Max | Single highest reading all year | Average of monthly peaks |
| Weekly + Median | Median of all readings | Average of weekly medians |
| Daily + Min | Single lowest reading | Average of daily minimums |

## Color Mapping

### Normalization

**Occupancy** (fixed 0-100% scale):
```
normalized = value / 100
```

**Transactions** (dynamic scale):
```
normalized = (value - minValue) / (maxValue - minValue)
```

Where `minValue` and `maxValue` are computed from all neighborhoods' aggregated values.

### Color Interpolation

The normalized value (0-1) maps to a position in a 5-stop color scheme using linear interpolation:

```
segment = floor(t × 4)           // Which of 4 segments (0-3)
segmentT = (t × 4) - segment     // Position within segment (0-1)
color = lerp(stops[segment], stops[segment+1], segmentT)
```
