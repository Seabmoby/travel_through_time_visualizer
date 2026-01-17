# Quickstart: SF Parking Occupancy Time Visualizer

## Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge - latest version)
- Local HTTP server (any of the following):
  - Python 3: `python -m http.server`
  - Node.js: `npx serve`
  - VS Code: Live Server extension

## Setup

1. **Clone/download the repository**

2. **Start a local server** from the project root:

   ```bash
   # Option 1: Python
   python -m http.server 8000

   # Option 2: Node.js
   npx serve -p 8000

   # Option 3: VS Code Live Server
   # Right-click index.html → Open with Live Server
   ```

3. **Open in browser**: Navigate to `http://localhost:8000/src/`

## Project Structure

```
src/
├── index.html           # Main entry point (loads ECharts via CDN)
├── main.js              # Application bootstrap
├── styles.css           # All styles
├── lib/                 # Core logic (pure functions)
│   ├── statistics.js    # Statistical calculations
│   ├── time-utils.js    # Date/time utilities
│   └── data-loader.js   # Data loading
├── ui/                  # User interface
│   ├── controls.js      # Control panel
│   └── chart.js         # ECharts wrapper
└── data/
    └── parking-data.json # Sample data
```

## Dependencies

### ECharts (only external dependency)

ECharts is loaded via CDN in `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
```

No npm install or build step required.

### Why ECharts?

- Rich chart types including heatmaps and calendar views
- Built-in animations, tooltips, and zoom/pan
- Handles 50k+ data points at 60fps
- Excellent documentation
- Constitution v1.1.0 permits charting libraries for visualization-heavy features

## Development Workflow

### No Build Step Required

This project uses vanilla JavaScript with ES Modules. No bundler, transpiler, or package manager is required for development.

### Making Changes

1. Edit files directly in `src/`
2. Refresh browser to see changes
3. Check browser DevTools console for errors

### Testing

Open `tests/test-runner.html` in browser to run unit tests.

```bash
# Via local server (recommended)
# Navigate to http://localhost:8000/tests/test-runner.html
```

## Key Concepts

### Data Flow

```
User changes control
       ↓
Controls emit state change event
       ↓
main.js receives new state
       ↓
Data pipeline filters/aggregates
       ↓
chart.js builds ECharts option
       ↓
ECharts renders visualization
```

### State Management

All visualization parameters are stored in a single state object:

```javascript
const state = {
  timeRange: { start: "2024-01-01", end: "2024-01-31" },
  aggregation: "daily",
  statistic: "average",
  seriesDimension: {
    type: "aoi",  // "aoi" | "dayOfWeek" | "timeOfDay"
    selected: ["sf-aggregate"]  // AOI ids, day numbers, or period ids
  },
  datePattern: { type: "weekdays" },  // hidden when seriesDimension.type === "dayOfWeek"
  timePattern: { type: "all" },       // hidden when seriesDimension.type === "timeOfDay"
  chart: {
    type: "line",
    heatmapMode: null,
    precision: 1
  }
};
// Note: X-axis varies by series dimension:
// - aoi: time/dates (chronological)
// - dayOfWeek: hours (0-23 or 15-min intervals)
// - timeOfDay: days of week (Sun-Sat)
```

### Chart Types Available

| Type | Description |
|------|-------------|
| `line` | Connected points (default) |
| `bar` | Vertical bars |
| `area` | Filled area under line |
| `stacked-area` | Multiple series stacked |
| `heatmap` | Color-coded grid (3 modes below) |

### Heatmap Modes

| Mode | X-Axis | Y-Axis | Use Case |
|------|--------|--------|----------|
| `date-hour` | Hour (0-23) | Actual dates | Raw data over time |
| `day-hour` | Hour (0-23) | Day of week | Recurring patterns |
| `calendar` | Day of month | Week rows | Month overview |

## Common Tasks

### Adding a New Statistic

1. Add calculation to `src/lib/statistics.js`:
   ```javascript
   export function myNewStat(values) {
     // calculation
     return result;
   }
   ```

2. Add to `calculate()` switch statement
3. Add test in `tests/unit/statistics.test.js`
4. Add UI option in `src/ui/controls.js`

### Adding a New Region

Edit `src/data/parking-data.json`:

```json
{
  "regions": [
    { "id": "new-region", "name": "New Region", "color": "#ABC123", "totalSpaces": 500 }
  ],
  "readings": [
    { "timestamp": "...", "regionId": "new-region", "occupied": 250, "capacity": 500 }
  ]
}
```

### Customizing ECharts Options

Modify `src/ui/chart.js` to adjust ECharts configuration:

```javascript
// Example: Change animation duration
const option = {
  animation: true,
  animationDuration: 500,
  // ... rest of option
};
```

See [ECharts documentation](https://echarts.apache.org/en/option.html) for all available options.

## Performance Notes

### Target Metrics

| Metric | Target |
|--------|--------|
| Initial load | < 500ms |
| Control response | < 100ms |
| Chart frame rate | 60fps |

### ECharts Performance Tips

- Use `setOption()` with `notMerge: false` for efficient updates
- Enable `large: true` for datasets > 10,000 points
- Use `progressive` rendering for very large datasets
- Call `chart.resize()` only when container size actually changes

## Troubleshooting

### "ECharts is not defined" error

Ensure the CDN script tag is in `index.html` before your modules:

```html
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
<script type="module" src="main.js"></script>
```

### "Module not found" errors

Ensure you're running via HTTP server, not `file://` protocol.

### Chart not rendering

1. Check browser console for errors
2. Verify container element has non-zero dimensions
3. Verify `parking-data.json` loads (Network tab)
4. Check ECharts instance with `chart.getOption()`

### Slow performance

1. Try larger aggregation bucket (daily vs hourly)
2. Reduce time range
3. Select fewer regions
4. For heatmaps, use day-hour mode instead of date-hour for large ranges

## API Reference

See `specs/main/contracts/` for detailed module documentation:

- [statistics.js](./contracts/statistics.js.md) - Statistical calculations
- [time-utils.js](./contracts/time-utils.js.md) - Time filtering and bucketing
- [data-loader.js](./contracts/data-loader.js.md) - Data loading
- [chart.js](./contracts/chart.js.md) - ECharts wrapper
- [controls.js](./contracts/controls.js.md) - UI controls

## ECharts Resources

- [ECharts Examples](https://echarts.apache.org/examples/en/index.html)
- [ECharts Option Reference](https://echarts.apache.org/en/option.html)
- [Heatmap Examples](https://echarts.apache.org/examples/en/index.html#chart-type-heatmap)
- [Calendar Examples](https://echarts.apache.org/examples/en/index.html#chart-type-calendar)
