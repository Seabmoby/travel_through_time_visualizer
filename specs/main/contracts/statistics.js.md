# Contract: statistics.js

**Module**: `src/lib/statistics.js`
**Purpose**: Pure functions for statistical calculations
**Dependencies**: None

## Exports

### `mean(values: number[]): number`

Calculate arithmetic mean of an array of numbers.

**Input**: Array of numbers (can be empty)
**Output**: Mean value, or `NaN` if array is empty

```javascript
mean([1, 2, 3, 4, 5]) // => 3
mean([10, 20])        // => 15
mean([])              // => NaN
```

---

### `min(values: number[]): number`

Find minimum value in array.

**Input**: Array of numbers
**Output**: Minimum value, or `Infinity` if array is empty

```javascript
min([3, 1, 4, 1, 5]) // => 1
min([100])           // => 100
min([])              // => Infinity
```

---

### `max(values: number[]): number`

Find maximum value in array.

**Input**: Array of numbers
**Output**: Maximum value, or `-Infinity` if array is empty

```javascript
max([3, 1, 4, 1, 5]) // => 5
max([100])           // => 100
max([])              // => -Infinity
```

---

### `median(values: number[]): number`

Calculate median (50th percentile) of array.

**Input**: Array of numbers
**Output**: Median value, or `NaN` if array is empty

**Notes**:
- For even-length arrays, returns average of two middle values
- Does not modify input array

```javascript
median([1, 2, 3, 4, 5])    // => 3
median([1, 2, 3, 4])       // => 2.5
median([7])                // => 7
median([])                 // => NaN
```

---

### `mode(values: number[]): number`

Find most frequently occurring value.

**Input**: Array of numbers
**Output**: Mode value, or `NaN` if array is empty

**Notes**:
- If multiple modes exist, returns the first one encountered
- For continuous data, consider rounding before calling

```javascript
mode([1, 2, 2, 3, 3, 3]) // => 3
mode([1, 1, 2, 2])       // => 1 (first mode)
mode([1, 2, 3])          // => 1 (all equal frequency)
mode([])                 // => NaN
```

---

### `percentile(values: number[], p: number): number`

Calculate p-th percentile of array.

**Input**:
- `values`: Array of numbers
- `p`: Percentile (0-100)

**Output**: Percentile value, or `NaN` if array is empty

**Notes**:
- Uses linear interpolation between data points
- `p=50` is equivalent to `median()`

```javascript
percentile([1, 2, 3, 4, 5], 25)  // => 2
percentile([1, 2, 3, 4, 5], 50)  // => 3
percentile([1, 2, 3, 4, 5], 75)  // => 4
percentile([1, 2, 3, 4, 5], 0)   // => 1
percentile([1, 2, 3, 4, 5], 100) // => 5
percentile([], 50)               // => NaN
```

---

### `calculate(values: number[], type: StatisticType): number`

Convenience function to calculate any supported statistic.

**Input**:
- `values`: Array of numbers
- `type`: One of `"average"`, `"min"`, `"max"`, `"median"`, `"mode"`, `"p25"`, `"p75"`

**Output**: Calculated statistic value

```javascript
calculate([1, 2, 3, 4, 5], "average") // => 3
calculate([1, 2, 3, 4, 5], "p25")     // => 2
calculate([1, 2, 3, 4, 5], "p75")     // => 4
```

---

## Type Definitions

```typescript
type StatisticType = "average" | "min" | "max" | "median" | "mode" | "p25" | "p75";
```

## Error Handling

- Empty arrays return `NaN`, `Infinity`, or `-Infinity` as documented
- Invalid `type` in `calculate()` throws `Error`
- Non-numeric values in array throw `TypeError`

## Performance Requirements

- All functions MUST handle arrays of 100,000+ elements
- No array mutations (return new values only)
- O(n) or O(n log n) complexity maximum
