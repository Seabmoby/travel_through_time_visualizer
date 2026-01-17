# Contract: controls.js

**Module**: `src/ui/controls.js`
**Purpose**: UI control panel rendering and event handling
**Dependencies**: None (uses native DOM APIs)

## Exports

### `createControlPanel(container: HTMLElement, state: VisualizationState): ControlPanel`

Create control panel UI and bind to container.

**Input**:
- `container`: HTML element to render controls into
- `state`: Initial visualization state

**Output**: ControlPanel instance

```javascript
const controls = createControlPanel(
  document.getElementById('controls'),
  initialState
);
```

---

### `ControlPanel.onChange(callback: (state: VisualizationState) => void): void`

Register callback for state changes.

**Input**: Callback function receiving updated state

```javascript
controls.onChange((newState) => {
  updateVisualization(newState);
});
```

---

### `ControlPanel.setState(state: VisualizationState): void`

Update control panel to reflect new state.

**Input**: New visualization state
**Effect**: Controls update to match state

```javascript
controls.setState(newState);
```

---

### `ControlPanel.getState(): VisualizationState`

Get current state from controls.

**Output**: Current VisualizationState

```javascript
const currentState = controls.getState();
```

---

### `ControlPanel.setAOIs(aois: AreaOfInterest[]): void`

Set available Areas of Interest for filtering.

**Input**: Array of AreaOfInterest objects (including "San Francisco" aggregate)
**Effect**: AOI selector updates with options

```javascript
controls.setAOIs(data.aois);
```

---

### `ControlPanel.setTimeRange(range: TimeRange): void`

Set available time range bounds.

**Input**: TimeRange with min/max available dates
**Effect**: Date pickers constrained to valid range

```javascript
controls.setTimeRange({
  start: "2024-01-01",
  end: "2024-03-31"
});
```

---

### `ControlPanel.disable(): void`

Disable all controls (e.g., during loading).

```javascript
controls.disable();
```

---

### `ControlPanel.enable(): void`

Re-enable all controls.

```javascript
controls.enable();
```

---

### `ControlPanel.destroy(): void`

Clean up control panel and event listeners.

```javascript
controls.destroy();
```

---

---

### `ControlPanel.setSeriesDimension(type: SeriesDimensionType): void`

Switch the active series dimension and update UI accordingly.

**Input**: SeriesDimensionType ("aoi" | "dayOfWeek" | "timeOfDay")
**Effect**:
- Active tab updates
- Dimension-specific selector appears
- Conflicting filters are hidden

```javascript
controls.setSeriesDimension("dayOfWeek");
```

---

## Type Definitions

```typescript
interface VisualizationState {
  timeRange: TimeRange;
  aggregation: AggregationBucket;
  statistic: StatisticType;
  seriesDimension: SeriesDimension;
  datePattern: DatePattern;
  timePattern: TimePattern;
  chart: ChartConfig;
}

type SeriesDimensionType = "aoi" | "dayOfWeek" | "timeOfDay";

interface SeriesDimension {
  type: SeriesDimensionType;
  selected: string[];  // AOI ids, day numbers, or time period ids
}

interface TimeRange {
  start: string;
  end: string;
}

type AggregationBucket = "15min" | "hourly" | "daily" | "weekly" | "monthly";
type StatisticType = "average" | "min" | "max" | "median" | "mode" | "p25" | "p75";

interface DatePattern {
  type: "all" | "weekdays" | "weekends" | "custom";
  days?: number[];  // 0-6, Sunday=0
}

interface TimePattern {
  type: "all" | "morning" | "afternoon" | "evening" | "peak" | "offpeak" | "custom";
  ranges?: HourRange[];
}

interface HourRange {
  start: number;  // 0-23
  end: number;    // 0-23
}

interface ChartConfig {
  type: ChartType;
  precision: number;
  showLegend: boolean;
  showTooltips: boolean;
  animate: boolean;
}

type ChartType = "line" | "bar" | "area" | "stacked-area";

interface AreaOfInterest {
  id: string;
  name: string;
  color: string;
  totalSpaces: number;
  isAggregate: boolean;
}
```

## Control Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Series Dimension Tabs (always visible)                          │
│ ┌──────────────┬──────────────┬──────────────┐                  │
│ │ ● AOI        │ ○ Day of Week│ ○ Time of Day│                  │
│ └──────────────┴──────────────┴──────────────┘                  │
├─────────────────────────────────────────────────────────────────┤
│ Time Range                                                       │
│ ┌──────────────┐  ┌──────────────┐                              │
│ │ Start Date   │  │ End Date     │  [Quick: 1D|1W|2W|1M|3M|6M|1Y]│
│ └──────────────┘  └──────────────┘  [Done]                      │
├─────────────────────────────────────────────────────────────────┤
│ Aggregation                                                      │
│ ○ 15min  ○ Hourly  ● Daily  ○ Weekly  ○ Monthly                │
├─────────────────────────────────────────────────────────────────┤
│ Statistic                                                        │
│ [Average ▼]  □ Show multiple: □ Min □ Max □ Median             │
├─────────────────────────────────────────────────────────────────┤
│ [AOI Selector - shown when AOI tab active]                      │
│ ☑ San Francisco (All)  □ Downtown  □ SOMA  □ Mission  □ Marina │
│ □ Richmond  □ Sunset  [Combined View toggle]                    │
├─────────────────────────────────────────────────────────────────┤
│ [Day Selector - shown when Day of Week tab active]             │
│ □ Sun  □ Mon  □ Tue  □ Wed  □ Thu  □ Fri  □ Sat               │
├─────────────────────────────────────────────────────────────────┤
│ [Time Period Selector - shown when Time of Day tab active]     │
│ □ Morning (6am-12pm)  □ Afternoon (12pm-6pm)                   │
│ □ Evening (6pm-12am)  □ Night (12am-6am)                       │
├─────────────────────────────────────────────────────────────────┤
│ Date Pattern  [HIDDEN when Day of Week series active]          │
│ ○ All  ○ Weekdays  ○ Weekends  ○ Custom: □S □M □T □W □T □F □S │
├─────────────────────────────────────────────────────────────────┤
│ Time Pattern  [HIDDEN when Time of Day series active]          │
│ ○ All  ○ Morning  ○ Afternoon  ○ Evening  ○ Peak  ○ Off-peak   │
├─────────────────────────────────────────────────────────────────┤
│ Chart Options                                                    │
│ Type: [Line ▼]  Precision: [1 ▼]  □ Legend  □ Tooltips         │
└─────────────────────────────────────────────────────────────────┘
```

## Filter Visibility Logic

| Active Series Tab | Visible Sections | Hidden Sections |
|-------------------|------------------|-----------------|
| AOI | AOI Selector, Date Pattern, Time Pattern | Day Selector, Time Period Selector |
| Day of Week | Day Selector, Time Pattern | AOI Selector, Date Pattern, Time Period Selector |
| Time of Day | Time Period Selector, Date Pattern | AOI Selector, Day Selector, Time Pattern |

## Events

### Change Events
- Emit `change` event when any control is modified
- Debounce rapid changes (50ms) for performance
- Batch multiple simultaneous changes into single event

### Validation
- Prevent invalid states (e.g., start > end date)
- Show inline validation messages
- Disable submit until valid

## Accessibility Requirements

- All controls have associated labels (`<label for>`)
- Fieldsets with legends for grouped controls
- Keyboard navigable (Tab order logical)
- Focus visible indicators
- ARIA labels for complex controls
- Screen reader announcements for state changes

## Performance Requirements

- Control panel render < 50ms
- State change emission < 10ms
- Use event delegation (single listener on container)
- Minimize DOM queries (cache element references)
