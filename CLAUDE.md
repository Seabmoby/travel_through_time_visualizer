# Time Visualizer Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-15

## Active Technologies

- JavaScript ES2020+ + ECharts 5.x (main)
- Mapbox GL JS 3.x via CDN (map visualization)
- Mapbox Vector Tileset for blockfaces (implemented)

## Project Structure

```text
src/
├── index.html           # Entry point, ECharts + Mapbox CDN scripts
├── main.js              # Application bootstrap, orchestration, map-chart sync
├── styles.css           # All styles with CSS custom properties, split-screen layout
├── lib/
│   ├── statistics.js    # Pure statistical calculation functions
│   ├── time-utils.js    # Date/time utilities
│   └── data-loader.js   # JSON loading and validation
├── ui/
│   ├── controls.js      # Control panel rendering/events
│   ├── chart.js         # ECharts wrapper/configuration
│   ├── map.js           # Mapbox GL JS wrapper (new)
│   └── date-range-picker.js  # Date selection component
└── data/
    ├── parking-data.json    # Original 6-region data (archived)
    ├── neighborhoods.json   # 37-neighborhood SF data
    └── blockfaces.json      # Featured blockface time-series data

scripts/
└── generate-neighborhood-data.js  # Data generation utility

Resources/
├── gn-san-francisco.geojson   # SF neighborhood boundaries
└── Mapbox_gl_js_details.env   # Mapbox configuration

tests/
├── unit/
│   ├── statistics.test.js
│   └── time-utils.test.js
└── test-runner.html
```

## Commands

npm test; npm run lint

## Code Style

JavaScript: Follow standard conventions
- ES2020+ features permitted
- ES Modules for code organization
- Pure functions for calculation logic (testable without DOM)
- CSS custom properties for theming

## Recent Changes

- main: Added blockface layer with tileset integration, hover/click interactions
- main: Added layer toggle controls for AOI and Blockface visibility
- main: Added Mapbox GL JS map integration for SF neighborhoods
- main: Added JavaScript ES2020+ + ECharts 5.x

<!-- MANUAL ADDITIONS START -->
## Feature-Specific Notes

### SF Parking Occupancy Time Visualizer (main)

- **Charting**: ECharts 5.x via CDN (constitution-approved exception)
- **Mapping**: Mapbox GL JS 3.x via CDN (constitution-approved exception)
- **Data**: Static JSON (~25MB, 90 days x 37 neighborhoods x 96 readings/day)
- **Performance**: <500ms initial load, <100ms parameter updates, 60fps
- **Layout**: Split-screen with map (left) and chart+controls (right)
- **Series Dimensions**: AOI (default), Day of Week, Time of Day
  - AOI: x-axis = time/dates
  - Day of Week: x-axis = hours (time of day)
  - Time of Day: x-axis = days of week (Sun-Sat)

### Mapbox Map Integration

- **Access Token**: Stored in Resources/Mapbox_gl_js_details.env
- **Style**: Custom Mapbox style for SF visualization
- **GeoJSON**: 37 SF neighborhoods from gn-san-francisco.geojson
- **Interaction**: Click neighborhood to filter chart; colors reflect occupancy
- **Sync**: Map and chart share state; changes in controls update both

### Blockface Layer Integration (implemented)

- **Tileset**: `seanmihalyinrix.rxk1qkqbpkdj` (sf_segments)
- **Source Layer**: `f1d474fc43d80d86dec8`
- **Properties**: segmentId, meterId, capacity, occupancy, occupancyBin, classification
- **Layer Toggle**: Map Layers control with independent AOI/Blockface checkboxes
- **Hover**: Popup shows segment ID, capacity, and occupancy percentage
- **Click**: Highlights selected blockface; featured blocks show chart data
- **Layers**: blockface-lines (colored by occupancy), blockface-hover, blockface-highlight
- **Data**: Tileset provides static occupancy colors; blockfaces.json for time-series

### Constitution Principles

1. Simplicity First (YAGNI) - minimal dependencies
2. User Experience First - <100ms feedback
3. Performance & Responsiveness - 60fps target
4. Browser-Native Development - vanilla JS + ECharts exception
5. Testable Visualization Logic - pure functions for calculations
<!-- MANUAL ADDITIONS END -->
