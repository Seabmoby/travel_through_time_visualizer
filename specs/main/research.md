# Research: SF Parking Occupancy Time Visualizer

**Date**: 2025-12-17 | **Updated**: 2025-12-19
**Status**: Complete (Updated after clarification sessions)

## Technical Decisions

### 1. Charting Library

**Decision**: Apache ECharts

**Rationale**:
- Clarification session determined ECharts as the charting library
- Constitution Principle IV amended to permit charting libraries for visualization-heavy features
- ECharts provides all required chart types: line, bar, area, stacked area, and multiple heatmap modes
- Built-in support for animations, tooltips, zoom/pan, and responsive resizing
- Excellent documentation and active community
- ~1MB minified but provides extensive functionality that would require 10x code to replicate

**Alternatives Considered**:
- Native Canvas API: Rejected - would require excessive custom code for heatmaps and animations
- Chart.js: Good option but lacks built-in heatmap/calendar support
- D3.js: Powerful but too low-level; requires significant wrapper code
- Highcharts: Commercial license concerns

**Implementation Notes**:
- Load via CDN: `https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js`
- Use ES Module import when available
- Initialize with `echarts.init(container)`
- Use `setOption()` for reactive updates (meets <100ms requirement)

---

### 2. Data Storage Format

**Decision**: In-memory JavaScript objects with JSON structure

**Rationale**:
- Static data requirement (no backend)
- Constitution Principle I (Simplicity) - no database needed
- JSON is human-readable and easily modifiable
- Native JavaScript Date handling for time operations

**Alternatives Considered**:
- IndexedDB: Overkill for static demo data; adds complexity
- LocalStorage: 5MB limit, synchronous API, not needed
- SQLite (via sql.js): Heavy WASM dependency, unnecessary

**Data Structure**:
```javascript
{
  regions: [
    { id: "mission", name: "Mission District", color: "#2ECC71", totalSpaces: 1200 }
  ],
  readings: [
    { timestamp: "2024-01-15T08:00:00Z", regionId: "mission", occupied: 234, capacity: 300 }
  ]
}
```

---

### 3. Statistics Calculation Approach

**Decision**: Pure functions in dedicated statistics module

**Rationale**:
- Constitution Principle V (Testable Visualization Logic) requires separation from rendering
- Pure functions enable unit testing without DOM
- Calculations are the "foundation of value" per constitution

**Implementation Notes**:
- Module: `src/lib/statistics.js`
- Functions: `mean()`, `median()`, `mode()`, `percentile()`, `min()`, `max()`
- All functions accept array of numbers, return single number
- Percentile function accepts array + target percentile (0-100)

**Alternatives Considered**:
- External library (simple-statistics): Adds dependency; violates Principle I
- Inline calculations: Harder to test; violates Principle V

---

### 4. Time Manipulation Approach

**Decision**: Native JavaScript Date with utility functions

**Rationale**:
- Modern JS Date API is sufficient for this use case
- Constitution Principle IV requires browser-native approach (charting is the exception)
- Temporal API not yet widely available (2025 adoption still partial)

**Implementation Notes**:
- Module: `src/lib/time-utils.js`
- Functions: `bucketize()`, `filterByDayOfWeek()`, `filterByHourRange()`, `getDateRange()`
- Use ISO 8601 strings for serialization
- All calculations in UTC to avoid timezone issues in aggregation

**Alternatives Considered**:
- date-fns: Good lightweight option but adds dependency
- Luxon: Feature-rich but adds ~70KB; overkill
- Moment.js: Deprecated, heavy

---

### 5. UI Control Rendering

**Decision**: Native HTML elements with CSS custom properties

**Rationale**:
- Constitution Principle IV and II (UX First)
- Native `<select>`, `<input type="date">`, `<input type="checkbox">` are accessible by default
- CSS custom properties enable theming without preprocessor
- No framework overhead - ECharts is the only external dependency

**Implementation Notes**:
- Module: `src/ui/controls.js`
- Event delegation for efficient handling
- Debounce rapid changes (but still meet 100ms target)
- Use `<fieldset>` and `<legend>` for control grouping (accessibility)

**Alternatives Considered**:
- React/Vue components: Violates Principle IV; adds build complexity
- Web Components: Good option but adds complexity for limited benefit here
- Custom elements throughout: Native elements are more accessible

---

### 6. Static Data Generation Strategy

**Decision**: Pre-generated JSON file with realistic patterns

**Rationale**:
- Specification requires "static set of data"
- Realistic patterns more useful for testing visualizations
- Single file simplifies loading

**Data Characteristics**:
- Time span: 90 days of historical data
- Regions: 6 SF neighborhoods (Mission, SOMA, Marina, Richmond, Sunset, Downtown)
- Granularity: 15-minute readings (finest bucket requested)
- Patterns embedded:
  - Higher occupancy during weekday business hours
  - Lower occupancy on weekends
  - Peak at 11am-2pm (lunch) and 6pm-8pm (dinner)
  - Regional variation (Downtown higher than Sunset)

**File Size Estimate**:
- 90 days × 96 readings/day × 6 regions = ~51,840 records
- ~100 bytes/record = ~5MB JSON
- Acceptable for initial load; can lazy-load by region if needed

---

### 7. ECharts Chart Type Mapping

**Decision**: Map application chart types to ECharts series types

| App Chart Type | ECharts Series | Notes |
|---------------|----------------|-------|
| Line | `type: 'line'` | Default, smooth curves optional |
| Bar | `type: 'bar'` | Grouped for multiple series |
| Area | `type: 'line'` + `areaStyle: {}` | Fill under line |
| Stacked Area | `type: 'line'` + `areaStyle: {}` + `stack: 'total'` | Series stacked |
| Heatmap (date×hour) | `type: 'heatmap'` | X=hour, Y=date |
| Heatmap (day×hour) | `type: 'heatmap'` | X=hour, Y=day-of-week |
| Calendar Heatmap | `calendar` + `type: 'heatmap'` | GitHub-style |

**Rationale**:
- ECharts native support for all required visualizations
- Calendar component provides month view out of the box
- Heatmap supports custom color gradients

---

### 8. Project Structure

**Decision**: Single project, flat module structure

**Rationale**:
- Constitution Technical Standards specify single `src/` directory
- Minimal nesting per Principle I (Simplicity)

**Structure**:
```
src/
├── index.html           # Entry point
├── main.js              # Application bootstrap
├── styles.css           # All styles (CSS custom properties)
├── lib/
│   ├── statistics.js    # Pure calculation functions
│   ├── time-utils.js    # Date/time utilities
│   └── data-loader.js   # Load and parse static data
├── ui/
│   ├── controls.js      # Control panel rendering/events
│   └── chart.js         # ECharts wrapper/configuration
└── data/
    └── parking-data.json # Static sample data

tests/
├── unit/
│   ├── statistics.test.js
│   └── time-utils.test.js
└── test-runner.html
```

---

---

### 9. Series Dimension Switching (Added 2025-12-19)

**Decision**: Implement switchable series dimensions with horizontal tabs

**Rationale**:
- Clarification session determined users need to view data grouped by different dimensions
- Horizontal tabs provide always-visible, quick access switching
- Three dimensions cover key analytical perspectives: geographic (AOI), weekly patterns (Day of Week), daily patterns (Time of Day)

**Series Dimensions**:

| Dimension | Options | Description |
|-----------|---------|-------------|
| Areas of Interest (AOI) | 6 neighborhoods + "San Francisco" aggregate | Geographic grouping; default on load |
| Day of Week | Sunday through Saturday (7 series) | Weekly pattern analysis |
| Time of Day | Morning (6-12), Afternoon (12-18), Evening (18-24), Night (0-6) | Daily rhythm analysis |

**UI Implementation**:
- Horizontal tabs always visible above controls
- Active tab highlighted
- Switching triggers immediate chart update
- Redundant filters hidden (not disabled) when conflicting with active series

**Filter Visibility Rules**:
| Active Series | Hidden Filters |
|--------------|----------------|
| AOI | None |
| Day of Week | Date Pattern filter |
| Time of Day | Time Pattern filter |

**Default State**:
- Series dimension: AOI
- Selected AOI: "San Francisco" (aggregate of all neighborhoods)

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Which charting library? | ECharts (per clarification) |
| How to handle timezone? | All data stored/processed in UTC; display in local time |
| How to handle missing data points? | ECharts handles gaps automatically; show null |
| Max data points before degradation? | ECharts handles 50k+ points; test during implementation |
| Chart animation strategy? | ECharts built-in animations; configure duration |
| Heatmap modes? | All three: date×hour, day×hour, calendar month |
| Series dimension options? | AOI, Day of Week, Time of Day (2025-12-19 clarification) |
| Time of Day hour ranges? | 6-hour blocks: Morning 6-12, Afternoon 12-18, Evening 18-24, Night 0-6 |
| Series switcher UI? | Horizontal tabs, always visible |
| Default series dimension? | AOI with "San Francisco" aggregate |
| Redundant filter handling? | Hide entirely when conflicting with active series |
| DoW series x-axis? | Time of day (hours or 15-min intervals depending on aggregation bucket) |
| ToD series x-axis? | Days of week (Sun-Sat) |

## Performance Considerations

- **Initial Load**: Target < 500ms including data fetch and ECharts init (per SC-001)
- **Interaction Response**: Target < 100ms using ECharts `setOption()` (per FR-010, SC-002)
- **Rendering**: ECharts uses Canvas internally; handles 60fps
- **Data Filtering**: Pre-compute indexes by region/day-of-week if needed
- **Memory**: ~5MB for data + ECharts instance; monitor with DevTools

## Next Steps

1. Update data-model.md (already complete, unchanged)
2. Update contracts for ECharts-based chart.js module
3. Update quickstart.md with ECharts setup
4. Generate implementation tasks
