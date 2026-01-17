# Contract: chart.js

**Module**: `src/ui/chart.js`
**Purpose**: ECharts wrapper for visualization rendering
**Dependencies**: ECharts 5.x (loaded via CDN in index.html)

## Exports

### `createChart(container: HTMLElement): ChartInstance`

Create a new ECharts instance bound to a container element.

**Input**: HTML element to render chart into
**Output**: ChartInstance wrapper object

```javascript
const chart = createChart(document.getElementById('chart-container'));
```

---

### `ChartInstance.update(data: ChartData, config: ChartConfig): void`

Update chart with new data and/or configuration.

**Input**:
- `data`: Processed data series to display
- `config`: Chart configuration (type, precision, etc.)

**Effect**: Chart re-renders with new data/config (<100ms target)

```javascript
chart.update(
  {
    series: [
      { id: 'mission', name: 'Mission District', color: '#2ECC71', data: [...] }
    ],
    xAxis: { type: 'time', data: [...] }
  },
  { type: 'line', precision: 1, animate: true }
);
```

---

### `ChartInstance.setChartType(type: ChartType): void`

Change visualization type without changing data.

**Input**: Chart type string
**Effect**: Re-renders with new chart type

```javascript
chart.setChartType('bar');
chart.setChartType('heatmap-calendar');
```

---

### `ChartInstance.setHeatmapMode(mode: HeatmapMode): void`

When chart type is heatmap, set the dimension mode.

**Input**: Heatmap mode
**Effect**: Re-renders heatmap with new axes

```javascript
chart.setHeatmapMode('day-hour');    // Day of week × Hour
chart.setHeatmapMode('date-hour');   // Date × Hour
chart.setHeatmapMode('calendar');    // Calendar month view
```

---

### `ChartInstance.setPrecision(decimals: number): void`

Set decimal precision for displayed values.

**Input**: Number of decimal places (0-3)
**Effect**: Tooltips and labels update

```javascript
chart.setPrecision(2); // Show "85.34%"
```

---

### `ChartInstance.resize(): void`

Resize chart to fit container. Call when container size changes.

```javascript
window.addEventListener('resize', () => chart.resize());
```

---

### `ChartInstance.showLoading(): void`

Show loading indicator.

```javascript
chart.showLoading();
```

---

### `ChartInstance.hideLoading(): void`

Hide loading indicator.

```javascript
chart.hideLoading();
```

---

### `ChartInstance.destroy(): void`

Dispose of ECharts instance and clean up resources.

```javascript
chart.destroy();
```

---

### `ChartInstance.onDataPointClick(callback: (point: DataPoint) => void): void`

Register callback for data point click events.

**Input**: Callback function receiving clicked point info

```javascript
chart.onDataPointClick((point) => {
  console.log(`Clicked: ${point.seriesName} at ${point.timestamp}: ${point.value}`);
});
```

---

## Type Definitions

```typescript
type ChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'stacked-area'
  | 'heatmap';

type HeatmapMode =
  | 'date-hour'    // X=hour (0-23), Y=actual dates
  | 'day-hour'     // X=hour (0-23), Y=day of week (Mon-Sun)
  | 'calendar';    // GitHub-style calendar month view

interface ChartConfig {
  type: ChartType;
  heatmapMode?: HeatmapMode;  // Only when type is 'heatmap'
  precision: number;          // 0-3 decimal places
  animate: boolean;
  showLegend: boolean;
  showTooltip: boolean;
}

interface ChartData {
  series: ChartSeries[];
  xAxis?: AxisData;
  yAxis?: AxisData;
}

interface ChartSeries {
  id: string;
  name: string;
  color: string;
  data: DataPoint[];
}

interface DataPoint {
  timestamp: string;   // ISO 8601 for time series
  value: number;       // Calculated statistic value
  label?: string;      // Formatted display label
}

interface AxisData {
  type: 'time' | 'category' | 'value';
  data?: string[];     // For category axis
  name?: string;       // Axis label
}

// X-axis configuration varies by series dimension:
// - AOI series: x-axis = time/dates (chronological)
// - Day of Week series: x-axis = hours (0-23 or 15-min intervals)
// - Time of Day series: x-axis = days of week (Sun-Sat)
```

## ECharts Option Building

The module internally converts ChartData + ChartConfig to ECharts option:

### Line/Bar/Area Charts

```javascript
{
  tooltip: { trigger: 'axis' },
  legend: { data: series.map(s => s.name) },
  xAxis: { type: 'time' },
  yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
  series: series.map(s => ({
    name: s.name,
    type: 'line',  // or 'bar'
    data: s.data.map(d => [d.timestamp, d.value]),
    itemStyle: { color: s.color },
    areaStyle: config.type.includes('area') ? {} : undefined,
    stack: config.type === 'stacked-area' ? 'total' : undefined
  }))
}
```

### Heatmap (date×hour or day×hour)

```javascript
{
  tooltip: { position: 'top' },
  grid: { height: '70%', top: '10%' },
  xAxis: { type: 'category', data: hours },      // 0-23
  yAxis: { type: 'category', data: yLabels },    // dates or days
  visualMap: { min: 0, max: 100, calculable: true },
  series: [{
    type: 'heatmap',
    data: heatmapData,  // [[xIdx, yIdx, value], ...]
    label: { show: false }
  }]
}
```

### Calendar Heatmap

```javascript
{
  tooltip: { position: 'top' },
  visualMap: { min: 0, max: 100, calculable: true },
  calendar: {
    range: ['2024-01-01', '2024-03-31'],
    cellSize: ['auto', 20]
  },
  series: [{
    type: 'heatmap',
    coordinateSystem: 'calendar',
    data: calendarData  // [['2024-01-15', 85], ...]
  }]
}
```

## Performance Requirements

- `update()` MUST complete rendering within 100ms for 10,000 data points
- `setChartType()` MUST re-render within 100ms
- Use `notMerge: false` in setOption for efficient updates
- Dispose properly on destroy to prevent memory leaks

## Accessibility

- ECharts provides built-in ARIA support via `aria` option
- Enable with `aria: { enabled: true, decal: { show: true } }`
- Provide data table alternative for screen readers (separate module)

## Error Handling

- If container not found, throw `Error`
- If ECharts not loaded, throw `Error` with instructions
- Invalid chart type: fall back to 'line' with console warning
- Empty data: show "No data" message via ECharts graphic component
