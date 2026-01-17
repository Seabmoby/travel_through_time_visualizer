# Tasks: SF Parking Occupancy Time Visualizer

**Input**: Design documents from `/specs/main/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Generated**: 2025-12-19 (Updated with implementation status)

**Tests**: Unit tests for statistics.js and time-utils.js included per SC-004.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root per plan.md
- ECharts loaded via CDN in index.html
- ES Modules for all JavaScript files

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic file structure

- [x] T001 Create project directory structure: src/, src/lib/, src/ui/, src/data/, tests/unit/
- [x] T002 [P] Create src/index.html with ECharts CDN, basic HTML structure, chart container, and control panel container
- [x] T003 [P] Create src/styles.css with CSS custom properties for theming, control panel layout, and responsive chart container
- [x] T004 [P] Create src/main.js with ES module imports and application bootstrap stub
- [x] T005 [P] Create tests/test-runner.html basic browser test harness

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core modules that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Generate src/data/parking-data.json with 18 months of data, 6 AOIs, 15-min intervals, realistic patterns per plan.md
- [x] T007 [P] Implement src/lib/statistics.js with mean(), min(), max(), median(), mode(), percentile(), and calculate() per contract
- [x] T008 [P] Implement src/lib/time-utils.js with parseDate(), formatDate(), isInRange(), getDayOfWeek(), getHour() per contract
- [x] T009 [P] Implement bucketize() and getBucketKey() functions in src/lib/time-utils.js for all aggregation types (15min, hourly, daily, weekly, monthly)
- [x] T010 [P] Implement filterByDayOfWeek() and filterByHourRange() in src/lib/time-utils.js per contract
- [x] T011 Implement src/lib/data-loader.js with loadParkingData(), validateReading(), validateAOI(), getAvailableTimeRange() per contract
- [x] T012 Implement indexByAOI() and getReadingsInRange() in src/lib/data-loader.js per contract
- [x] T013 Create src/ui/chart.js with createChart() that initializes ECharts instance per contract
- [x] T014 Implement ChartInstance.update() in src/ui/chart.js for line chart type with series rendering
- [x] T015 Implement ChartInstance.resize(), showLoading(), hideLoading(), destroy() in src/ui/chart.js
- [x] T016 [P] Create tests/unit/statistics.test.js with tests for all statistical functions
- [x] T017 [P] Create tests/unit/time-utils.test.js with tests for date parsing, filtering, bucketing

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Basic Time Range Visualization (Priority: P1)

**Goal**: User can select a time range and see parking occupancy data displayed as a line chart

**Independent Test**: Load the app, select a date range (e.g., last 7 days), and see a chart displaying occupancy data for that period

### Implementation for User Story 1

- [x] T018 [US1] Create VisualizationState type definition in src/main.js with timeRange, aggregation, statistic defaults
- [x] T019 [US1] Implement data pipeline in src/main.js: load data → filter by range → bucketize → calculate stats → render
- [x] T020 [US1] Create src/ui/controls.js with createControlPanel() stub and state management per contract
- [x] T021 [US1] Implement time range date picker UI in src/ui/controls.js with dual-month calendar flyout
- [x] T022 [US1] Implement "Done" button confirmation for date range selection in src/ui/controls.js per FR-014
- [x] T023 [US1] Implement preset time range buttons (1D, 1W, 2W, 1M, 3M, 6M, 1Y) in src/ui/controls.js per FR-012
- [x] T024 [US1] Wire ControlPanel.onChange() to trigger data pipeline re-run in src/main.js
- [x] T025 [US1] Set default time range to dataset start + 7 days forward per FR-011 in src/main.js
- [x] T026 [US1] Add empty state message when time range has no data in src/ui/chart.js per edge case

**Checkpoint**: User Story 1 complete - basic time range visualization works independently

---

## Phase 4: User Story 2 - Time Aggregation Buckets (Priority: P1)

**Goal**: User can change data aggregation granularity (15min, hourly, daily, weekly, monthly)

**Independent Test**: Select a 30-day range, toggle between hourly/daily/weekly aggregation, observe chart updates with appropriate data points

### Implementation for User Story 2

- [x] T027 [US2] Add aggregation bucket selector UI (radio buttons) in src/ui/controls.js
- [x] T028 [US2] Integrate aggregation selection into VisualizationState in src/main.js
- [x] T029 [US2] Update data pipeline to use selected aggregation bucket in bucketize() call in src/main.js
- [x] T030 [US2] Add aggregation bucket to xAxis formatting in src/ui/chart.js (show appropriate date/time labels)
- [ ] T031 [US2] Add warning when data points exceed 10,000 (large range + fine aggregation) in src/ui/controls.js

**Checkpoint**: User Stories 1 AND 2 complete - time range + aggregation work together (MVP!)

---

## Phase 5: User Story 3 - Statistical Measures (Priority: P2)

**Goal**: User can view different statistical measures (average, min, max, median, mode, percentiles)

**Independent Test**: With a time range and aggregation selected, toggle between average, median, and percentiles; verify different values appear

### Implementation for User Story 3

- [x] T032 [US3] Add statistic type selector (dropdown) in src/ui/controls.js
- [x] T032a [US3] Add "Actual" statistic type to src/lib/statistics.js per FR-004 (raw data without aggregation)
- [ ] T033 [US3] Add "show multiple statistics" checkboxes in src/ui/controls.js per acceptance scenario 4
- [x] T034 [US3] Update data pipeline to calculate selected statistic(s) using statistics.js in src/main.js
- [x] T034a [US3] Implement "actual" vs aggregated statistics handling in Day of Week series per FR-005i
- [ ] T035 [US3] Support multiple statistics as multiple series in src/ui/chart.js
- [ ] T036 [US3] Add contextual help explaining what each statistic measures in src/ui/controls.js per FR-013

**Checkpoint**: Statistics selection works independently on top of time range and aggregation

---

## Phase 6: User Story 4 - Series Dimension Switching (Priority: P2)

**Goal**: User can switch between AOI, Day of Week, and Time of Day as the series grouping dimension

**Independent Test**: Switch series dimension from AOI to Day of Week, see chart update with 7 day-based series instead of location-based series

### Implementation for User Story 4

- [x] T037 [US4] Add horizontal series dimension tabs UI (AOI | Day of Week | Time of Day) in src/ui/controls.js per FR-005e
- [x] T038 [P] [US4] Implement AOI selector with "San Francisco" aggregate option in src/ui/controls.js
- [x] T039 [P] [US4] Add "Combined View" toggle for weighted average by capacity in src/ui/controls.js per FR-005d
- [x] T040 [P] [US4] Implement Day of Week selector (Sun-Sat checkboxes) in src/ui/controls.js
- [x] T041 [P] [US4] Implement Time of Day selector (Morning/Afternoon/Evening/Night checkboxes) in src/ui/controls.js per FR-005c
- [x] T042 [US4] Add SeriesDimension to VisualizationState in src/main.js
- [x] T043 [US4] Implement series grouping logic for AOI dimension in src/main.js data pipeline
- [x] T044 [US4] Implement series grouping logic for Day of Week dimension in src/main.js data pipeline (x-axis = hours per FR-005g)
- [x] T045 [US4] Implement series grouping logic for Time of Day dimension in src/main.js data pipeline (x-axis = days of week per FR-005h)
- [x] T046 [US4] Implement "San Francisco" aggregate calculation (weighted average by capacity) in src/main.js
- [x] T047 [US4] Implement filter visibility logic: hide Date Pattern when Day of Week active in src/ui/controls.js per FR-005f
- [x] T048 [US4] Implement filter visibility logic: hide Time Pattern when Time of Day active in src/ui/controls.js per FR-005f
- [x] T049 [US4] Set default series dimension to AOI with "San Francisco" selected per FR-011 in src/main.js

**Checkpoint**: Series dimension switching works - can analyze by AOI, Day of Week, or Time of Day

---

## Phase 7: User Story 5 - Date Pattern Filtering (Priority: P2)

**Goal**: User can filter data by day-of-week patterns (weekdays, weekends, custom days)

**Independent Test**: Select "Weekends only" filter on a 30-day range, verify only Saturday/Sunday data appears

### Implementation for User Story 5

- [x] T050 [US5] Add date pattern selector UI (All/Weekdays/Weekends/Custom radio buttons) in src/ui/controls.js
- [x] T051 [US5] Add custom day checkboxes (S M T W T F S) in src/ui/controls.js
- [x] T052 [US5] Add DatePattern to VisualizationState in src/main.js
- [x] T053 [US5] Integrate filterByDayOfWeek() into data pipeline in src/main.js
- [x] T054 [US5] Ensure Date Pattern filter is hidden when Day of Week series dimension is active in src/ui/controls.js

**Checkpoint**: Date pattern filtering works independently

---

## Phase 8: User Story 6 - Time Pattern Filtering (Priority: P3)

**Goal**: User can filter by time-of-day patterns (morning, afternoon, evening, peak, off-peak, custom)

**Independent Test**: Select "Morning (6am-12pm)" filter, verify only morning hours data appears

### Implementation for User Story 6

- [x] T055 [US6] Add time pattern selector UI (All/Morning/Afternoon/Evening/Peak/Off-peak/Custom radio buttons) in src/ui/controls.js
- [x] T056 [US6] Add custom hour range inputs for custom time pattern in src/ui/controls.js
- [x] T057 [US6] Add TimePattern to VisualizationState in src/main.js
- [x] T058 [US6] Integrate filterByHourRange() into data pipeline in src/main.js
- [x] T059 [US6] Ensure Time Pattern filter is hidden when Time of Day series dimension is active in src/ui/controls.js

**Checkpoint**: Time pattern filtering works independently

---

## Phase 9: User Story 7 - Chart Type Selection (Priority: P3)

**Goal**: User can switch between chart types (line, bar, area, stacked area, heatmap with 3 modes)

**Independent Test**: With data displayed, toggle between line/bar/area charts; verify same data renders differently

### Implementation for User Story 7

- [x] T060 [US7] Add chart type selector dropdown in src/ui/controls.js (Line, Bar, Area, Stacked Area, Heatmap)
- [x] T061 [US7] Implement ChartInstance.setChartType() for bar chart in src/ui/chart.js
- [x] T062 [US7] Implement ChartInstance.setChartType() for area chart in src/ui/chart.js
- [x] T063 [US7] Implement ChartInstance.setChartType() for stacked-area chart in src/ui/chart.js
- [x] T064 [US7] Add heatmap mode selector (Date×Hour, Day×Hour, Calendar) in src/ui/controls.js
- [x] T065 [US7] Implement heatmap date×hour mode in src/ui/chart.js per ECharts mapping in plan.md
- [x] T066 [US7] Implement heatmap day×hour mode in src/ui/chart.js per ECharts mapping in plan.md
- [x] T067 [US7] Implement heatmap calendar mode using ECharts calendar component in src/ui/chart.js
- [x] T068 [US7] Persist selected chart type across other parameter changes in src/main.js

**Checkpoint**: All chart types work - line, bar, area, stacked area, and 3 heatmap modes

---

## Phase 10: User Story 8 - Data Precision Control (Priority: P3)

**Goal**: User can control decimal precision (0-3 decimal places) for displayed values

**Independent Test**: Toggle precision from 0 to 2 decimal places, observe value labels update

### Implementation for User Story 8

- [x] T069 [US8] Add precision selector dropdown (0-3 decimal places) in src/ui/controls.js
- [x] T070 [US8] Implement ChartInstance.setPrecision() in src/ui/chart.js
- [x] T071 [US8] Update tooltip formatter to respect precision setting in src/ui/chart.js
- [x] T072 [US8] Update axis labels to respect precision setting in src/ui/chart.js

**Checkpoint**: Precision control works for tooltips and labels

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T073 [P] Add contextual help panel explaining data volume, aggregation methods, combined AOI weighting per FR-013 in src/ui/controls.js
- [ ] T074 [P] Add keyboard navigation support for all controls per accessibility requirements in src/ui/controls.js
- [x] T075 [P] Add ARIA labels for complex controls in src/ui/controls.js
- [x] T076 [P] Add window resize handler calling chart.resize() in src/main.js
- [x] T077 [P] Add loading indicator during initial data load in src/main.js
- [x] T078 [P] Implement ECharts ARIA support with aria: { enabled: true } in src/ui/chart.js
- [x] T079 Add error handling for data load failures in src/lib/data-loader.js
- [ ] T080 Performance validation: ensure <100ms response time for parameter changes per FR-010
- [ ] T081 Cross-browser testing: Chrome, Firefox, Safari, Edge (latest versions) per SC-006
- [ ] T082 Verify all acceptance scenarios from spec.md pass manually
- [ ] T083 Validate Lighthouse performance score > 90 per Constitution quality gates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2), builds on US1
- **User Stories 3-8 (Phases 5-10)**: Depend on Foundational (Phase 2), may build on previous stories
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: FOUNDATION - Must complete first. Time range visualization is required for all other stories.
- **User Story 2 (P1)**: Depends on US1 - Aggregation requires time range to be working.
- **User Story 3 (P2)**: Can start after US2 - Statistics require aggregated data.
- **User Story 4 (P2)**: Can start after US1 - Series switching is largely independent but needs chart working.
- **User Story 5 (P2)**: Can start after US1 - Date pattern filtering modifies the data pipeline.
- **User Story 6 (P3)**: Can start after US5 - Time pattern follows same pattern as date pattern.
- **User Story 7 (P3)**: Can start after US1 - Chart types only require basic chart to be working.
- **User Story 8 (P3)**: Can start after US1 - Precision is a display-only feature.

### Within Each User Story

- Models/utilities before UI components
- UI components before integration
- Core implementation before polish

### Parallel Opportunities

- T002, T003, T004, T005 can run in parallel (different files)
- T007, T008, T009, T010, T016, T017 can run in parallel (different functions/files)
- T011, T012 can run in parallel with T013, T014, T015 (data loader vs chart)
- Within User Story 4: T038, T039, T040, T041 can run in parallel (different selectors)
- T073-T078 can run in parallel (different polish concerns)

---

## Parallel Example: Foundational Phase

```bash
# Launch library implementations in parallel:
Task: "Implement src/lib/statistics.js with mean(), min(), max(), median(), mode(), percentile()"
Task: "Implement src/lib/time-utils.js with parseDate(), formatDate(), isInRange()"
Task: "Implement bucketize() and getBucketKey() in src/lib/time-utils.js"
Task: "Implement filterByDayOfWeek() and filterByHourRange() in src/lib/time-utils.js"
Task: "Create tests/unit/statistics.test.js"
Task: "Create tests/unit/time-utils.test.js"
```

---

## Parallel Example: User Story 4 UI

```bash
# Launch all series dimension selectors in parallel:
Task: "Implement AOI selector with San Francisco aggregate in src/ui/controls.js"
Task: "Add Combined View toggle in src/ui/controls.js"
Task: "Implement Day of Week selector in src/ui/controls.js"
Task: "Implement Time of Day selector in src/ui/controls.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Time Range)
4. Complete Phase 4: User Story 2 (Aggregation)
5. **STOP and VALIDATE**: Test time range + aggregation independently
6. Deploy/demo if ready - this is a functional MVP!

### Incremental Delivery

1. Complete Setup + Foundational + US1 + US2 → **MVP Ready** (Time + Aggregation)
2. Add User Story 3 (Statistics) → Enhanced analysis
3. Add User Story 4 (Series Switching) → Multi-perspective analysis (AOI/Day/Time)
4. Add User Story 5 (Date Patterns) → Day-of-week filtering
5. Add User Story 6-8 (Time Patterns, Chart Types, Precision) → Full feature set
6. Polish phase → Production ready

### Suggested MVP Scope

**User Stories 1 + 2** provide a functional parking visualization tool:
- Time range selection with presets and "Done" confirmation
- Aggregation bucket switching (15min to monthly)
- Default line chart with occupancy data
- San Francisco aggregate view

This MVP validates core functionality before adding statistical analysis and multi-dimension switching.

---

## Summary

| Metric | Count | Completed |
|--------|-------|-----------|
| Total Tasks | 85 | 76 (89%) |
| Setup Tasks | 5 | 5 |
| Foundational Tasks | 12 | 12 |
| User Story 1 (P1) | 9 | 9 |
| User Story 2 (P1) | 5 | 4 |
| User Story 3 (P2) | 7 | 4 |
| User Story 4 (P2) | 13 | 13 |
| User Story 5 (P2) | 5 | 5 |
| User Story 6 (P3) | 5 | 5 |
| User Story 7 (P3) | 9 | 9 |
| User Story 8 (P3) | 4 | 4 |
| Polish Tasks | 11 | 6 |

**Remaining Tasks**: T031, T033, T035, T036, T074, T080, T081, T082, T083

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Performance requirement: <100ms for all parameter changes (FR-010)
- Initial load requirement: <500ms (SC-001)
- ECharts documentation: https://echarts.apache.org/en/option.html
