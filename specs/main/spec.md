# Feature Specification: SF Parking Occupancy Time Visualizer

**Feature Branch**: `main`
**Created**: 2025-12-17
**Status**: Draft
**Input**: User description: "Generate a static set of data that would represent people occupying on-street parking spaces across San Francisco, with configurable time components including time range, aggregation buckets, statistics, precision, locations, chart types, date patterns, and time patterns."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Time Range Visualization (Priority: P1)

As a parking analyst, I want to select a time range and see parking occupancy data for San Francisco so that I can understand overall parking patterns.

**Why this priority**: This is the foundational capability. Without time range selection, no visualization is possible.

**Independent Test**: Load the app, select a date range (e.g., last 7 days), and see a chart displaying occupancy data for that period.

**Acceptance Scenarios**:

1. **Given** the app is loaded with default data, **When** I select a time range of "Last 7 days", **Then** I see a visualization showing occupancy data for those 7 days
2. **Given** a time range is selected, **When** I change to "Last 30 days", **Then** the visualization updates to show the expanded range within 100ms
3. **Given** no time range is selected, **When** the app loads, **Then** the default range starts at the beginning of the dataset (earliest available date) and spans 7 days forward
4. **Given** the app is loaded, **When** I click a preset button (1 Day, 1 Week, 2 Weeks, 1 Month, 3 Months, 6 Months, 1 Year), **Then** the time range updates immediately to that duration ending at latest available data

---

### User Story 2 - Time Aggregation Buckets (Priority: P1)

As a parking analyst, I want to change how data is aggregated over time (hourly, daily, weekly, monthly) so that I can see patterns at different granularities.

**Why this priority**: Aggregation is essential for meaningful visualization - raw data without bucketing is unusable.

**Independent Test**: Select a 30-day range, toggle between hourly/daily/weekly aggregation, observe chart updates with appropriate data points.

**Acceptance Scenarios**:

1. **Given** a 30-day time range, **When** I select "Daily" aggregation, **Then** I see ~30 data points on the chart
2. **Given** a 30-day time range, **When** I select "Hourly" aggregation, **Then** I see ~720 data points (30 × 24)
3. **Given** a 30-day time range, **When** I select "Weekly" aggregation, **Then** I see ~4-5 data points
4. **Given** an aggregation is selected, **When** I change aggregation, **Then** the chart re-renders within 100ms

---

### User Story 3 - Statistical Measures (Priority: P2)

As a parking analyst, I want to view different statistical measures (average, min, max, median, mode, percentiles) so that I can analyze the distribution of parking occupancy.

**Why this priority**: Statistics transform raw counts into actionable insights. Needed after basic visualization works.

**Independent Test**: With a time range and aggregation selected, toggle between average, median, and percentiles; verify different values appear.

**Acceptance Scenarios**:

1. **Given** data is displayed, **When** I select "Average", **Then** each data point shows the mean occupancy for that bucket
2. **Given** data is displayed, **When** I select "Median", **Then** each data point shows the 50th percentile
3. **Given** data is displayed, **When** I select "25th Percentile", **Then** values are lower than median
4. **Given** data is displayed, **When** I select multiple statistics, **Then** multiple series appear on the chart

---

### User Story 4 - Series Dimension Switching (Priority: P2)

As a parking analyst, I want to switch between different series dimensions (Areas of Interest, Days of the Week, Time of Day) so that I can analyze parking patterns from multiple perspectives.

**Why this priority**: Series switching enables comparative analysis across different dimensions, a key use case for parking data.

**Independent Test**: Switch series dimension from AOI to Day of Week, see chart update with 7 day-based series instead of location-based series.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** I select "Areas of Interest" as series dimension, **Then** I see series for each selected AOI (neighborhoods + "San Francisco" aggregate)
2. **Given** AOI series is active, **When** I select "Mission District", **Then** only Mission District data is shown
3. **Given** AOI series is active, **When** I add "SOMA" to selection, **Then** both AOIs appear as separate series
4. **Given** multiple AOIs are selected, **When** I deselect one, **Then** that AOI's series disappears within 100ms
5. **Given** no AOIs are selected, **When** I view the chart, **Then** "San Francisco" aggregate (all neighborhoods combined) is shown (default)
6. **Given** AOI series is active, **When** I toggle "Combined View", **Then** a single series shows weighted average by capacity across selected AOIs
7. **Given** the app is loaded, **When** I select "Day of Week" as series dimension, **Then** I see up to 7 series (Sunday through Saturday)
8. **Given** Day of Week series is active, **When** I select specific days, **Then** only those days appear as separate series
9. **Given** the app is loaded, **When** I select "Time of Day" as series dimension, **Then** I see 4 series: Morning (6am-12pm), Afternoon (12pm-6pm), Evening (6pm-12am), Night (12am-6am)

---

### User Story 5 - Date Pattern Filtering (Priority: P2)

As a parking analyst, I want to filter by date patterns (weekends only, specific days of week) so that I can analyze day-specific trends.

**Why this priority**: Day-of-week patterns are critical for parking policy decisions.

**Independent Test**: Select "Weekends only" filter on a 30-day range, verify only Saturday/Sunday data appears.

**Acceptance Scenarios**:

1. **Given** a 30-day range, **When** I select "Weekends Only", **Then** only Saturday and Sunday data points appear
2. **Given** a 30-day range, **When** I select "Mon, Tue, Thu", **Then** only those days' data appears
3. **Given** a date pattern is active, **When** I clear it, **Then** all days' data reappears
4. **Given** "Weekdays Only" is selected, **When** I view aggregated stats, **Then** calculations exclude weekend data

---

### User Story 6 - Time Pattern Filtering (Priority: P3)

As a parking analyst, I want to filter by time-of-day patterns (mornings, peak hours, off-peak) so that I can analyze time-specific trends.

**Why this priority**: Time-of-day analysis is valuable but builds on date patterns.

**Independent Test**: Select "Morning (6am-12pm)" filter, verify only morning hours data appears.

**Acceptance Scenarios**:

1. **Given** hourly data, **When** I select "Morning (6am-12pm)", **Then** only 6am-12pm data appears
2. **Given** hourly data, **When** I select "Peak Hours (7-9am, 4-7pm)", **Then** only those hour ranges appear
3. **Given** a time pattern, **When** combined with a date pattern, **Then** both filters apply (e.g., weekday mornings only)
4. **Given** "Off-Peak" is selected, **When** viewing stats, **Then** calculations exclude peak hour data

---

### User Story 7 - Chart Type Selection (Priority: P3)

As a parking analyst, I want to switch between chart types (line, bar, area, heatmap) so that I can visualize data in the most appropriate format.

**Why this priority**: Multiple chart types enhance understanding but core line chart is sufficient for MVP.

**Independent Test**: With data displayed, toggle between line/bar/area charts; verify same data renders differently.

**Acceptance Scenarios**:

1. **Given** data is displayed as a line chart, **When** I select "Bar Chart", **Then** the same data renders as bars
2. **Given** multiple regions are selected, **When** I switch to "Stacked Area", **Then** regions stack visually
3. **Given** daily data for a month, **When** I select "Heatmap", **Then** a calendar-style heatmap appears
4. **Given** a chart type is selected, **When** I change other parameters, **Then** the chart type persists

---

### User Story 8 - Data Precision Control (Priority: P3)

As a parking analyst, I want to control the precision of displayed values (decimal places, rounding) so that I can present data appropriately for my audience.

**Why this priority**: Precision is a presentation detail, not core functionality.

**Independent Test**: Toggle precision from 0 to 2 decimal places, observe value labels update.

**Acceptance Scenarios**:

1. **Given** values are displayed, **When** I set precision to 0, **Then** values show as whole numbers (e.g., "85%")
2. **Given** values are displayed, **When** I set precision to 2, **Then** values show 2 decimals (e.g., "85.34%")
3. **Given** tooltips are shown, **When** precision changes, **Then** tooltip values update accordingly

---

### Edge Cases

- What happens when time range has no data? → Show empty state message, not broken chart
- What happens when all data points are identical? → Statistics (mode, percentiles) should still compute correctly
- How does system handle very large time ranges (years)? → Warn user, suggest larger aggregation
- What if selected AOIs have no overlap in time? → Show data for each AOI's available period with clear indication

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate static sample parking occupancy data for San Francisco
- **FR-002**: System MUST allow selection of time range (start date, end date)
- **FR-003**: System MUST support time aggregation buckets: 15-minute, hourly, daily, weekly, monthly
- **FR-004**: System MUST calculate statistics: actual (raw data), average, minimum, maximum, median, mode, 25th percentile, 75th percentile
- **FR-005**: System MUST support switchable series dimensions: Areas of Interest (AOI), Day of Week, and Time of Day
- **FR-005a**: AOI series MUST include SF neighborhoods (minimum 5) plus "San Francisco" as an aggregate representing all neighborhoods combined
- **FR-005b**: Day of Week series MUST include Sunday through Saturday (7 options)
- **FR-005c**: Time of Day series MUST include Morning (6am-12pm), Afternoon (12pm-6pm), Evening (6pm-12am), Night (12am-6am)
- **FR-005g**: When Day of Week series is active, the x-axis MUST show hourly intervals from 0:00 to 23:00 (24 data points per series, excluding 24:00 to avoid duplication at midnight)
- **FR-005h**: When Time of Day series is active, the x-axis MUST show days of week (Sunday through Saturday)
- **FR-005i**: When Day of Week series is active, selecting "Actual" statistic MUST show each specific day's hourly data; other statistics (average, median, etc.) MUST aggregate across all instances of each day of week within the selected time range (e.g., average of all Sundays at 9am)
- **FR-005d**: AOI series MUST support combined view option (weighted average by capacity)
- **FR-005e**: Series dimension switcher MUST be displayed as horizontal tabs (AOI | Day of Week | Time of Day), always visible
- **FR-005f**: System MUST hide redundant filters when they conflict with active series dimension (e.g., hide Date Pattern filter when Day of Week series is active; hide Time Pattern filter when Time of Day series is active)
- **FR-006**: System MUST support date pattern filters: weekdays, weekends, custom day selection
- **FR-007**: System MUST support time pattern filters: morning, afternoon, evening, peak hours, off-peak, custom hour ranges
- **FR-008**: System MUST support chart types: line, bar, area (stacked and non-stacked), heatmap (with selectable modes: date×hour grid, day-of-week×hour pattern, calendar month view)
- **FR-009**: System MUST allow precision control for displayed values (0-3 decimal places)
- **FR-010**: System MUST update visualization within 100ms of parameter change
- **FR-011**: System MUST provide sensible defaults for all parameters on initial load; default time range starts at beginning of dataset (earliest available date) and spans 7 days forward; default series dimension is AOI with "San Francisco" aggregate selected
- **FR-012**: System MUST provide preset time range buttons: 1 Day, 1 Week, 2 Weeks, 1 Month, 3 Months, 6 Months, 1 Year
- **FR-013**: System MUST display contextual help/info explaining: available data volume (90 days, 6 AOIs, ~52,000 readings), how aggregations are calculated, how combined AOI weighting works, and what each statistic measures
- **FR-014**: Date range picker MUST require explicit confirmation via "Done" button after selecting start and end dates before applying the selection

### Key Entities

- **TimeRange**: Start date, end date, defines the span of data to visualize
- **AggregationBucket**: Granularity of data grouping (15min, hourly, daily, weekly, monthly)
- **Statistic**: Type of calculation (avg, min, max, median, mode, percentiles)
- **SeriesDimension**: The dimension used for chart series grouping (AOI, Day of Week, Time of Day)
- **AreaOfInterest (AOI)**: SF neighborhood/zone identifier with name and geographic bounds; includes "San Francisco" as aggregate of all neighborhoods
- **DatePattern**: Day-of-week filter configuration (bitmask or day list)
- **TimePattern**: Hour-of-day filter configuration (hour ranges)
- **ChartConfig**: Chart type, precision, styling options
- **OccupancyDataPoint**: Timestamp, AOI identifier, raw occupancy count, capacity

## Clarifications

### Session 2025-12-19

- Q: When DoW series is active, what should the x-axis show? → A: Hourly intervals from 0:00 to 23:00 (24 points, not inclusive of midnight-to-midnight to avoid duplication)
- Q: How should statistics work for Day of Week series? → A: "Actual" shows each specific day's hourly data; other statistics (avg, median, etc.) aggregate across all instances of that day (e.g., average of all Sundays)
- Q: When Time of Day series is active, what should the x-axis show? → A: Days of week (Sun-Sat)
- Q: Which additional series dimensions beyond AOI and Day of Week? → A: Hour of Day (grouped: Morning, Afternoon, Evening, Night = 4 series)
- Q: What hour ranges define each Time of Day period? → A: Morning 6-12, Afternoon 12-18, Evening 18-24, Night 0-6 (equal 6-hour blocks)
- Q: Which series dimension should be active by default on load? → A: Areas of Interest (AOI), showing San Francisco aggregate
- Q: How should the UI present the series dimension switcher? → A: Horizontal tabs (AOI | Day of Week | Time of Day) - always visible
- Q: Should redundant filters be hidden when they conflict with active series? → A: Yes, hide redundant filters entirely (e.g., hide Date Pattern when Day of Week is series)

### Session 2025-12-17

- Q: Which charting library to use? → A: ECharts
- Q: How to handle ECharts vs Constitution Principle IV conflict? → A: Amend Constitution to allow charting libraries specifically
- Q: Should heatmap be included in supported chart types? → A: Yes, add heatmap to FR-008
- Q: What heatmap dimensions to support? → A: All modes (date×hour, day-of-week×hour, calendar month) - tool is for visual exploration
- Q: How should combined AOI view aggregate data? → A: Weighted average by capacity (larger parking areas contribute more)
- Q: Which preset time ranges for one-click selection? → A: 1 Day, 1 Week, 2 Weeks, 1 Month, 3 Months, 6 Months, 1 Year
- Q: Should app show explanatory details for options? → A: Yes, include info on data volume, aggregation methods, and how each option works
- Q: What time span should the generated data cover? → A: 1.5 years (18 months, ~548 days)
- Q: How should the date range picker UI work? → A: Single calendar flyout with dual-month display, click to select start then end date, larger calendar size
- Q: What should be the default time range on initial load? → A: Beginning of the dataset's time range (earliest available date) through 7 days forward
- Q: How should date range selection be confirmed? → A: User clicks start date, clicks end date, then clicks a "Done" button to apply the selection

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User can load app and see meaningful parking visualization within 500ms
- **SC-002**: All parameter changes reflect visually within 100ms
- **SC-003**: User can configure all 7 dimension types (range, bucket, stat, region, date pattern, time pattern, chart type) without page reload
- **SC-004**: Statistics calculations are mathematically correct (verified by unit tests)
- **SC-005**: Chart remains responsive (60fps) with up to 10,000 data points displayed
- **SC-006**: App functions without JavaScript errors in Chrome, Firefox, Safari, Edge (latest versions)
