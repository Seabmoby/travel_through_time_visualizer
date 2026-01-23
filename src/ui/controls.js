/**
 * Controls Module
 * Control panel UI components and event handling
 */

import { getAggregationTypes, DATE_PATTERNS, TIME_PATTERNS } from '../lib/time-utils.js';
import { getStatisticTypes } from '../lib/statistics.js';
import { getChartTypes, getHeatmapModes } from './chart.js';
import { createDateRangePicker } from './date-range-picker.js';
import { DATASET_TYPES } from '../lib/data-loader.js';
import { getColorSchemes } from './map.js';

// App version info
const APP_VERSION = '1.3.0';
const APP_VERSION_DATE = '2026-01-22';

// Embedded documentation content
const DOCS_CONTENT = `# Math for Displaying a Single Value per AOI

This document explains how a single value is calculated and displayed for each AOI (Area of Interest / neighborhood) on the map.

## Data Flow

### 1. Raw Data Structure

Each reading contains:
- \`timestamp\` - when the measurement was taken
- \`regionId\` - the neighborhood ID
- \`occupied\` - number of occupied parking spaces
- \`capacity\` - total parking capacity
- \`transactions\` - revenue amount (if transaction dataset)

### 2. Filtering Pipeline

\`\`\`
All Readings
    ↓
Time Range Filter (start date to end date)
    ↓
Day of Week Filter (optional: e.g., weekdays only)
    ↓
Hour Range Filter (optional: e.g., 9am-5pm only)
    ↓
Group by Neighborhood (regionId)
\`\`\`

### 3. Per-Reading Value Calculation

**For Occupancy:**
\`\`\`
occupancy% = (occupied / capacity) × 100
\`\`\`

**For Transactions:**
\`\`\`
value = transactions (raw dollar amount)
\`\`\`

### 4. Interval Bucketing + Statistical Aggregation

The map uses interval bucketing to stay synchronized with the chart:

\`\`\`
Filtered Readings
    ↓
Bucket by Interval (daily/weekly/monthly)
    ↓
Apply Statistic per Bucket
    ↓
Average across Buckets → Final Map Value
\`\`\`

| Statistic | Applied Per Bucket |
|-----------|-------------------|
| **Average** | Σ values / n |
| **Median** | Middle value when sorted |
| **Min** | min(values) |
| **Max** | max(values) |
| **Mode** | Most frequent value (rounded to 0.1) |
| **P25** | 25th percentile via linear interpolation |
| **P75** | 75th percentile via linear interpolation |
| **Total** | Σ values |
| **Actual** | Raw values (no aggregation) |

### The "Actual" Statistic

The **Actual** statistic bypasses aggregation and shows raw data values. Its behavior varies by series dimension:

**Day of Week series:**
- Creates a separate series for each specific date
- Example: Selecting "Monday" shows "Monday (2023-01-02)", "Monday (2023-01-09)", etc. as individual lines
- Useful for comparing the same weekday across different weeks

**Time of Day series:**
- Falls back to averaging since there's no single "actual" value per day
- Each time period still aggregates readings within that period

**AOI series:**
- Shows individual bucket values without cross-bucket aggregation
- The reference line still displays the average across buckets

**When to use Actual:**
- Investigating specific dates rather than patterns
- Comparing week-over-week performance for the same day
- Identifying outlier days that might be hidden by aggregation

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
\`\`\`
normalized = value / 100
\`\`\`

**Transactions** (dynamic scale):
\`\`\`
normalized = (value - minValue) / (maxValue - minValue)
\`\`\`

Where minValue and maxValue are computed from all neighborhoods' aggregated values.

### Color Interpolation

The normalized value (0-1) maps to a position in a 5-stop color scheme using linear interpolation:

\`\`\`
segment = floor(t × 4)           // Which of 4 segments (0-3)
segmentT = (t × 4) - segment     // Position within segment (0-1)
color = lerp(stops[segment], stops[segment+1], segmentT)
\`\`\`
`;

/**
 * Simple markdown to HTML converter
 * Handles: headers, bold, code blocks, inline code, lists, tables, paragraphs
 * @param {string} markdown - Markdown text
 * @returns {string} HTML string
 */
function markdownToHtml(markdown) {
    let html = markdown;

    // Escape HTML entities first (but preserve markdown syntax)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Tables
    html = html.replace(/^\|(.+)\|\s*\n\|[-:\s|]+\|\s*\n((?:\|.+\|\s*\n?)+)/gm, (match, header, body) => {
        const headers = header.split('|').map(h => h.trim()).filter(h => h);
        const rows = body.trim().split('\n').map(row =>
            row.split('|').map(cell => cell.trim()).filter(cell => cell)
        );

        let table = '<table><thead><tr>';
        headers.forEach(h => table += `<th>${h}</th>`);
        table += '</tr></thead><tbody>';
        rows.forEach(row => {
            table += '<tr>';
            row.forEach(cell => table += `<td>${cell}</td>`);
            table += '</tr>';
        });
        table += '</tbody></table>';
        return table;
    });

    // Headers (must come before bold processing)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold (**text**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Paragraphs (lines that aren't already wrapped)
    const lines = html.split('\n');
    const processed = [];
    let inPre = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('<pre>')) inPre = true;
        if (line.includes('</pre>')) inPre = false;

        if (inPre ||
            line.startsWith('<h') ||
            line.startsWith('<ul') ||
            line.startsWith('<li') ||
            line.startsWith('</') ||
            line.startsWith('<table') ||
            line.startsWith('<pre') ||
            line.trim() === '') {
            processed.push(line);
        } else {
            processed.push(`<p>${line}</p>`);
        }
    }

    return processed.join('\n');
}

/**
 * Create and show info modal with markdown content
 */
function showInfoModal() {
    // Check if modal already exists
    let overlay = document.querySelector('.modal-overlay');

    if (!overlay) {
        // Create modal structure
        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>How Values Are Calculated</h2>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    ${markdownToHtml(DOCS_CONTENT)}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Close handlers
        overlay.querySelector('.modal-close').addEventListener('click', () => {
            overlay.classList.remove('visible');
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('visible');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('visible')) {
                overlay.classList.remove('visible');
            }
        });
    }

    // Show modal
    overlay.classList.add('visible');
}

/**
 * Series Dimension Types
 */
export const SERIES_DIMENSIONS = {
    aoi: { id: 'aoi', name: 'Areas of Interest' },
    dayOfWeek: { id: 'dayOfWeek', name: 'Day of Week' },
    timeOfDay: { id: 'timeOfDay', name: 'Time of Day' }
};

/**
 * Day of Week options
 */
export const DAY_OF_WEEK_OPTIONS = [
    { id: 0, name: 'Sunday', abbrev: 'Sun', color: '#E74C3C' },
    { id: 1, name: 'Monday', abbrev: 'Mon', color: '#3498DB' },
    { id: 2, name: 'Tuesday', abbrev: 'Tue', color: '#2ECC71' },
    { id: 3, name: 'Wednesday', abbrev: 'Wed', color: '#9B59B6' },
    { id: 4, name: 'Thursday', abbrev: 'Thu', color: '#F39C12' },
    { id: 5, name: 'Friday', abbrev: 'Fri', color: '#1ABC9C' },
    { id: 6, name: 'Saturday', abbrev: 'Sat', color: '#E67E22' }
];

/**
 * Time of Day periods
 */
export const TIME_OF_DAY_OPTIONS = [
    { id: 'morning', name: 'Morning', abbrev: 'AM', start: 6, end: 12, color: '#F39C12' },
    { id: 'afternoon', name: 'Afternoon', abbrev: 'PM', start: 12, end: 18, color: '#E74C3C' },
    { id: 'evening', name: 'Evening', abbrev: 'Eve', start: 18, end: 24, color: '#9B59B6' },
    { id: 'night', name: 'Night', abbrev: 'Night', start: 0, end: 6, color: '#34495E' }
];

/**
 * Create control panel
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Configuration options
 * @returns {Object} Control panel interface
 */
export function createControlPanel(container, options) {
    if (!container) {
        throw new Error('Control panel container is required');
    }

    const { regions, timeRange, initialState } = options;
    let state = { ...initialState };
    let changeCallback = null;
    let resetCallback = null;
    let dateRangePicker = null;

    // Render control panel
    container.innerHTML = buildControlPanelHTML(regions, timeRange, state);

    // Initialize date range picker
    const datePickerContainer = container.querySelector('#date-range-picker');
    if (datePickerContainer) {
        dateRangePicker = createDateRangePicker(datePickerContainer, {
            minDate: timeRange.start,
            maxDate: timeRange.end,
            startDate: state.timeRange?.start || timeRange.start,
            endDate: state.timeRange?.end || timeRange.end,
            onChange: (range) => {
                // Clear active preset when using calendar
                const presetButtons = container.querySelectorAll('.preset-btn');
                presetButtons.forEach(b => b.classList.remove('active'));
                handleChange({ timeRange: range });
            }
        });
    }

    // Attach event listeners
    attachEventListeners(container);

    /**
     * Handle state change and notify callback
     * @param {Object} changes - Changed properties
     */
    function handleChange(changes) {
        state = { ...state, ...changes };
        if (changeCallback) {
            changeCallback(changes);
        }
    }

    /**
     * Attach event listeners to controls
     */
    function attachEventListeners(container) {
        // AOI Dataset Selector Event Listener
        const aoiDatasetSelect = container.querySelector('#aoi-dataset-select');
        if (aoiDatasetSelect) {
            aoiDatasetSelect.addEventListener('change', (e) => {
                handleChange({ aoiDataset: e.target.value });
            });
        }

        // Blockface Dataset Selector Event Listener
        const blockfaceDatasetSelect = container.querySelector('#blockface-dataset-select');
        if (blockfaceDatasetSelect) {
            blockfaceDatasetSelect.addEventListener('change', (e) => {
                handleChange({ blockfaceDataset: e.target.value });
            });
        }

        // AOI Color Scheme Selector Event Listener
        const aoiColorSchemeSelect = container.querySelector('#aoi-color-scheme-select');
        if (aoiColorSchemeSelect) {
            aoiColorSchemeSelect.addEventListener('change', (e) => {
                handleChange({ aoiColorScheme: e.target.value });
            });
        }

        // Blockface Color Scheme Selector Event Listener
        const blockfaceColorSchemeSelect = container.querySelector('#blockface-color-scheme-select');
        if (blockfaceColorSchemeSelect) {
            blockfaceColorSchemeSelect.addEventListener('change', (e) => {
                handleChange({ blockfaceColorScheme: e.target.value });
            });
        }

        // Layer Toggle Event Listeners (T011)
        const aoiLayerToggle = container.querySelector('#layer-aoi');
        const blockfaceLayerToggle = container.querySelector('#layer-blockface');

        if (aoiLayerToggle) {
            aoiLayerToggle.addEventListener('change', (e) => {
                handleChange({
                    layers: {
                        ...state.layers,
                        aoiVisible: e.target.checked
                    }
                });
            });
        }

        if (blockfaceLayerToggle) {
            blockfaceLayerToggle.addEventListener('change', (e) => {
                handleChange({
                    layers: {
                        ...state.layers,
                        blockfaceVisible: e.target.checked
                    }
                });
            });
        }

        // Info Panel Toggle - opens modal with markdown docs
        const infoToggle = container.querySelector('#info-toggle');
        if (infoToggle) {
            infoToggle.addEventListener('click', () => {
                showInfoModal();
            });
        }

        // Preset Time Range Buttons
        const presetButtons = container.querySelectorAll('.preset-btn');

        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const days = parseInt(btn.dataset.days);
                const end = new Date(timeRange.end);
                const start = new Date(end);
                start.setDate(start.getDate() - days + 1);

                // Clamp to available range
                const minDate = new Date(timeRange.start);
                if (start < minDate) start.setTime(minDate.getTime());

                const startStr = start.toISOString().split('T')[0];
                const endStr = end.toISOString().split('T')[0];

                // Update the date range picker display
                if (dateRangePicker) {
                    dateRangePicker.setValue(startStr, endStr);
                }

                // Highlight active preset
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                handleChange({
                    timeRange: { start: startStr, end: endStr }
                });
            });
        });

        // Aggregation
        const aggregationInputs = container.querySelectorAll('input[name="aggregation"]');
        aggregationInputs.forEach(input => {
            input.addEventListener('change', () => {
                handleChange({ aggregation: input.value });
            });
        });

        // Statistics
        const statisticSelect = container.querySelector('#statistic-select');
        if (statisticSelect) {
            statisticSelect.addEventListener('change', () => {
                handleChange({ statistic: statisticSelect.value });
            });
        }

        // Series Dimension Tabs
        const seriesTabs = container.querySelectorAll('.series-tab');
        seriesTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const dimension = tab.dataset.dimension;

                // Update tab active state
                seriesTabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');

                // Update panel visibility
                container.querySelectorAll('.series-panel').forEach(panel => {
                    panel.classList.remove('active');
                });
                const activePanel = container.querySelector(`#panel-${dimension}`);
                if (activePanel) activePanel.classList.add('active');

                // Update filter visibility based on series dimension (FR-005f)
                const datePatternSection = container.querySelector('.date-pattern-section');
                const timePatternSection = container.querySelector('.time-pattern-section');

                if (datePatternSection) {
                    datePatternSection.style.display = dimension === 'dayOfWeek' ? 'none' : 'block';
                }
                if (timePatternSection) {
                    timePatternSection.style.display = dimension === 'timeOfDay' ? 'none' : 'block';
                }

                // Get current selection for this dimension
                let selected;
                if (dimension === 'aoi') {
                    selected = Array.from(container.querySelectorAll('input[name="aoi"]:checked')).map(cb => cb.value);
                    if (selected.length === 0) selected = ['sf-aggregate'];
                } else if (dimension === 'dayOfWeek') {
                    selected = Array.from(container.querySelectorAll('input[name="series-day"]:checked')).map(cb => parseInt(cb.value));
                    if (selected.length === 0) selected = [0, 1, 2, 3, 4, 5, 6];
                } else if (dimension === 'timeOfDay') {
                    selected = Array.from(container.querySelectorAll('input[name="series-time"]:checked')).map(cb => cb.value);
                    if (selected.length === 0) selected = ['morning', 'afternoon', 'evening', 'night'];
                }

                handleChange({
                    seriesDimension: {
                        type: dimension,
                        selected: selected
                    }
                });
            });
        });

        // AOI Checkboxes with multi-select support (Ctrl+Click, Shift+Click)
        // Attach events to labels for better click target area
        const aoiLabels = container.querySelectorAll('.neighborhood-item, .control-checkbox-group > .control-checkbox');
        const aoiCheckboxes = container.querySelectorAll('input[name="aoi"]');
        let lastClickedAOI = null; // Track last clicked for Shift+Click range selection

        // Get ordered list of all AOI checkbox values for range selection
        function getOrderedAOIs() {
            return Array.from(container.querySelectorAll('input[name="aoi"]')).map(cb => cb.value);
        }

        // Helper to trigger change handling
        function triggerAOIChange() {
            const selectedAOIs = Array.from(
                container.querySelectorAll('input[name="aoi"]:checked')
            ).map(cb => cb.value);

            // Ensure at least one is selected
            const selected = selectedAOIs.length > 0 ? selectedAOIs : ['sf-aggregate'];

            handleChange({
                seriesDimension: {
                    ...state.seriesDimension,
                    type: 'aoi',
                    selected: selected
                }
            });
        }

        aoiLabels.forEach(label => {
            const checkbox = label.querySelector('input[name="aoi"]');
            if (!checkbox) return;

            // Handle click on label for modifier key support
            label.addEventListener('click', (e) => {
                // Only handle if clicking on the label area, not the checkbox itself
                // (checkbox click will bubble up anyway)
                if (e.target === checkbox) return;

                const clickedId = checkbox.value;
                const currentSelected = state.seriesDimension?.selected || ['sf-aggregate'];

                e.preventDefault(); // Prevent default label->checkbox behavior, we'll handle it

                if (e.shiftKey && lastClickedAOI) {
                    // Shift+Click: Select range between last clicked and this one (inclusive)
                    const allAOIs = getOrderedAOIs();
                    const lastIndex = allAOIs.indexOf(lastClickedAOI);
                    const currentIndex = allAOIs.indexOf(clickedId);

                    if (lastIndex !== -1 && currentIndex !== -1) {
                        const startIdx = Math.min(lastIndex, currentIndex);
                        const endIdx = Math.max(lastIndex, currentIndex);
                        const rangeAOIs = allAOIs.slice(startIdx, endIdx + 1);

                        // Add range to existing selection (excluding sf-aggregate)
                        const newSelected = new Set(currentSelected.filter(id => id !== 'sf-aggregate'));
                        rangeAOIs.forEach(id => newSelected.add(id));

                        // Update checkboxes visually
                        aoiCheckboxes.forEach(cb => {
                            cb.checked = newSelected.has(cb.value);
                        });

                        triggerAOIChange();
                    }
                    // Update last clicked to current for next shift+click
                    lastClickedAOI = clickedId;
                } else if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Click: Toggle this item
                    checkbox.checked = !checkbox.checked;
                    lastClickedAOI = clickedId;
                    triggerAOIChange();
                } else {
                    // Regular click: Toggle checkbox
                    checkbox.checked = !checkbox.checked;
                    lastClickedAOI = clickedId;
                    triggerAOIChange();
                }
            });
        });

        // Also handle direct checkbox clicks (for keyboard/accessibility)
        aoiCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const clickedId = checkbox.value;
                const currentSelected = state.seriesDimension?.selected || ['sf-aggregate'];

                if (e.shiftKey && lastClickedAOI) {
                    // Shift+Click on checkbox: Select range
                    e.preventDefault();

                    const allAOIs = getOrderedAOIs();
                    const lastIndex = allAOIs.indexOf(lastClickedAOI);
                    const currentIndex = allAOIs.indexOf(clickedId);

                    if (lastIndex !== -1 && currentIndex !== -1) {
                        const startIdx = Math.min(lastIndex, currentIndex);
                        const endIdx = Math.max(lastIndex, currentIndex);
                        const rangeAOIs = allAOIs.slice(startIdx, endIdx + 1);

                        const newSelected = new Set(currentSelected.filter(id => id !== 'sf-aggregate'));
                        rangeAOIs.forEach(id => newSelected.add(id));

                        aoiCheckboxes.forEach(cb => {
                            cb.checked = newSelected.has(cb.value);
                        });

                        triggerAOIChange();
                    }
                    lastClickedAOI = clickedId;
                } else {
                    // Normal click or Ctrl+Click - let default behavior happen, just track
                    lastClickedAOI = clickedId;
                }
            });

            checkbox.addEventListener('change', () => {
                triggerAOIChange();
            });
        });

        // AOI Group Collapsible Headers
        const aoiGroupHeaders = container.querySelectorAll('.aoi-group-header');
        aoiGroupHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const group = header.closest('.aoi-group');
                const content = group.querySelector('.aoi-group-content');
                const chevron = header.querySelector('.aoi-group-chevron');
                const isExpanded = header.getAttribute('aria-expanded') === 'true';

                header.setAttribute('aria-expanded', !isExpanded);
                content.style.display = isExpanded ? 'none' : 'block';
                chevron.textContent = isExpanded ? '▶' : '▼';
            });
        });

        // Neighborhood Search Filter
        const neighborhoodSearch = container.querySelector('#neighborhood-search');
        if (neighborhoodSearch) {
            neighborhoodSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const items = container.querySelectorAll('.neighborhood-item');
                const groups = container.querySelectorAll('.aoi-group');

                items.forEach(item => {
                    const name = item.dataset.name || '';
                    item.style.display = query === '' || name.includes(query) ? '' : 'none';
                });

                // Show/hide groups based on visible items
                groups.forEach(group => {
                    const visibleItems = group.querySelectorAll('.neighborhood-item[style=""], .neighborhood-item:not([style])');
                    const hasVisibleItems = Array.from(visibleItems).some(item => item.style.display !== 'none');
                    group.style.display = hasVisibleItems ? '' : 'none';

                    // Expand groups with matches
                    if (query !== '' && hasVisibleItems) {
                        const header = group.querySelector('.aoi-group-header');
                        const content = group.querySelector('.aoi-group-content');
                        const chevron = header.querySelector('.aoi-group-chevron');
                        header.setAttribute('aria-expanded', 'true');
                        content.style.display = 'block';
                        chevron.textContent = '▼';
                    }
                });
            });
        }

        // Day of Week Checkboxes
        const daySeriesCheckboxes = container.querySelectorAll('input[name="series-day"]');
        daySeriesCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selectedDays = Array.from(
                    container.querySelectorAll('input[name="series-day"]:checked')
                ).map(cb => parseInt(cb.value));

                // Ensure at least one is selected
                const selected = selectedDays.length > 0 ? selectedDays : [0, 1, 2, 3, 4, 5, 6];

                handleChange({
                    seriesDimension: {
                        ...state.seriesDimension,
                        type: 'dayOfWeek',
                        selected: selected
                    }
                });
            });
        });

        // Quick Select Buttons for Day of Week
        const quickSelectBtns = container.querySelectorAll('.quick-select-btn');
        quickSelectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const select = btn.dataset.select;
                let days;

                if (select === 'all-days') {
                    days = [0, 1, 2, 3, 4, 5, 6];
                } else if (select === 'weekdays') {
                    days = [1, 2, 3, 4, 5];
                } else if (select === 'weekends') {
                    days = [0, 6];
                }

                // Update checkboxes
                daySeriesCheckboxes.forEach(cb => {
                    cb.checked = days.includes(parseInt(cb.value));
                });

                handleChange({
                    seriesDimension: {
                        ...state.seriesDimension,
                        type: 'dayOfWeek',
                        selected: days
                    }
                });
            });
        });

        // Time of Day Checkboxes
        const timeSeriesCheckboxes = container.querySelectorAll('input[name="series-time"]');
        timeSeriesCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selectedPeriods = Array.from(
                    container.querySelectorAll('input[name="series-time"]:checked')
                ).map(cb => cb.value);

                // Ensure at least one is selected
                const selected = selectedPeriods.length > 0 ? selectedPeriods : ['morning', 'afternoon', 'evening', 'night'];

                handleChange({
                    seriesDimension: {
                        ...state.seriesDimension,
                        type: 'timeOfDay',
                        selected: selected
                    }
                });
            });
        });

        // Combined View Toggle
        const combinedViewCheckbox = container.querySelector('#combined-view');
        if (combinedViewCheckbox) {
            combinedViewCheckbox.addEventListener('change', () => {
                handleChange({ combinedView: combinedViewCheckbox.checked });
            });
        }

        // Date Pattern
        const datePatternInputs = container.querySelectorAll('input[name="date-pattern"]');
        datePatternInputs.forEach(input => {
            input.addEventListener('change', () => {
                const pattern = DATE_PATTERNS[input.value] || DATE_PATTERNS.all;
                handleChange({ datePattern: pattern });
                toggleCustomDays(container, input.value === 'custom');
            });
        });

        // Custom Days
        const dayCheckboxes = container.querySelectorAll('input[name="day"]');
        dayCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selectedDays = Array.from(
                    container.querySelectorAll('input[name="day"]:checked')
                ).map(cb => parseInt(cb.value));
                handleChange({
                    datePattern: { type: 'custom', days: selectedDays }
                });
            });
        });

        // Time Pattern
        const timePatternInputs = container.querySelectorAll('input[name="time-pattern"]');
        timePatternInputs.forEach(input => {
            input.addEventListener('change', () => {
                const pattern = TIME_PATTERNS[input.value] || TIME_PATTERNS.all;
                handleChange({ timePattern: pattern });
                toggleCustomHours(container, input.value === 'custom');
            });
        });

        // Custom Hours
        const startHour = container.querySelector('#start-hour');
        const endHour = container.querySelector('#end-hour');
        if (startHour && endHour) {
            const updateCustomHours = () => {
                handleChange({
                    timePattern: {
                        type: 'custom',
                        ranges: [[parseInt(startHour.value), parseInt(endHour.value)]]
                    }
                });
            };
            startHour.addEventListener('change', updateCustomHours);
            endHour.addEventListener('change', updateCustomHours);
        }

        // Chart Type
        const chartTypeSelect = container.querySelector('#chart-type');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', () => {
                const type = chartTypeSelect.value;
                const isHeatmap = type === 'heatmap';
                toggleHeatmapMode(container, isHeatmap);
                handleChange({
                    chart: {
                        ...state.chart,
                        type: type,
                        heatmapMode: isHeatmap ? 'date-hour' : null
                    }
                });
            });
        }

        // Heatmap Mode
        const heatmapModeSelect = container.querySelector('#heatmap-mode');
        if (heatmapModeSelect) {
            heatmapModeSelect.addEventListener('change', () => {
                handleChange({
                    chart: {
                        ...state.chart,
                        heatmapMode: heatmapModeSelect.value
                    }
                });
            });
        }

        // Precision
        const precisionInput = container.querySelector('#precision');
        if (precisionInput) {
            precisionInput.addEventListener('change', () => {
                handleChange({
                    chart: {
                        ...state.chart,
                        precision: parseInt(precisionInput.value)
                    }
                });
            });
        }

        // Reset Settings Button
        const resetBtn = container.querySelector('#reset-settings-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (resetCallback) {
                    resetCallback();
                }
            });
        }
    }

    /**
     * Toggle custom days visibility
     */
    function toggleCustomDays(container, show) {
        const customDays = container.querySelector('.custom-days');
        if (customDays) {
            customDays.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Toggle custom hours visibility
     */
    function toggleCustomHours(container, show) {
        const customHours = container.querySelector('.custom-hours');
        if (customHours) {
            customHours.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Toggle heatmap mode visibility
     */
    function toggleHeatmapMode(container, show) {
        const heatmapModeGroup = container.querySelector('.heatmap-mode-group');
        if (heatmapModeGroup) {
            heatmapModeGroup.style.display = show ? 'block' : 'none';
        }
    }

    return {
        onChange(callback) {
            changeCallback = callback;
        },
        onReset(callback) {
            resetCallback = callback;
        },
        getState() {
            return { ...state };
        },
        setState(newState) {
            state = { ...state, ...newState };
            // Update UI to reflect new state
            updateControlsUI(container, state, dateRangePicker);
        },
        /**
         * Update layer toggle UI to match state (T013)
         * @param {Object} layers - Layer visibility state
         */
        setLayerState(layers) {
            const aoiToggle = container.querySelector('#layer-aoi');
            const blockfaceToggle = container.querySelector('#layer-blockface');

            if (aoiToggle) aoiToggle.checked = layers.aoiVisible;
            if (blockfaceToggle) blockfaceToggle.checked = layers.blockfaceVisible;
        }
    };
}

/**
 * Neighborhood category definitions for grouping
 */
const NEIGHBORHOOD_CATEGORIES = {
    commercial: { name: 'Commercial Districts', order: 1 },
    entertainment: { name: 'Entertainment/Mixed', order: 2 },
    residential_urban: { name: 'Urban Residential', order: 3 },
    residential_suburban: { name: 'Suburban Residential', order: 4 },
    park: { name: 'Parks/Institutional', order: 5 }
};

/**
 * Build grouped neighborhood HTML
 * @param {Array} regions - Region definitions with category
 * @param {Array} selectedAOIs - Currently selected AOI IDs
 * @returns {string} HTML string
 */
function buildNeighborhoodGroups(regions, selectedAOIs) {
    // Group regions by category
    const groups = {};
    for (const region of regions) {
        const category = region.category || 'residential_urban';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(region);
    }

    // Sort groups by defined order
    const sortedCategories = Object.keys(groups).sort((a, b) => {
        const orderA = NEIGHBORHOOD_CATEGORIES[a]?.order || 99;
        const orderB = NEIGHBORHOOD_CATEGORIES[b]?.order || 99;
        return orderA - orderB;
    });

    // Build HTML for each group
    return sortedCategories.map(category => {
        const categoryInfo = NEIGHBORHOOD_CATEGORIES[category] || { name: category };
        const neighborhoods = groups[category];

        return `
            <div class="aoi-group" data-category="${category}">
                <button type="button" class="aoi-group-header" aria-expanded="true">
                    <span class="aoi-group-title">${categoryInfo.name}</span>
                    <span class="aoi-group-count">(${neighborhoods.length})</span>
                    <span class="aoi-group-chevron">▼</span>
                </button>
                <div class="aoi-group-content">
                    <div class="control-checkbox-group">
                        ${neighborhoods.map(aoi => `
                            <label class="control-checkbox neighborhood-item" data-name="${aoi.name.toLowerCase()}">
                                <input type="checkbox" name="aoi" value="${aoi.id}"
                                    ${selectedAOIs.includes(aoi.id) ? 'checked' : ''}>
                                <span style="color: ${aoi.color}">${aoi.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Build control panel HTML
 * @param {Array} regions - Region definitions
 * @param {Object} timeRange - Available time range
 * @param {Object} state - Initial state
 * @returns {string} HTML string
 */
function buildControlPanelHTML(regions, timeRange, state) {
    const aggregationTypes = getAggregationTypes();
    const statisticTypes = getStatisticTypes();
    const chartTypes = getChartTypes();
    const heatmapModes = getHeatmapModes();

    // Add San Francisco aggregate to regions if not present
    const allAOIs = [
        { id: 'sf-aggregate', name: 'San Francisco', color: '#34495E', isAggregate: true },
        ...regions.map(r => ({ ...r, isAggregate: false }))
    ];

    // Determine active series dimension
    const seriesDimension = state.seriesDimension?.type || 'aoi';
    const selectedAOIs = state.seriesDimension?.selected || ['sf-aggregate'];
    const selectedDays = state.seriesDimension?.selectedDays || [0, 1, 2, 3, 4, 5, 6];
    const selectedTimePeriods = state.seriesDimension?.selectedTimePeriods || ['morning', 'afternoon', 'evening', 'night'];

    return `
        <!-- Map Layers with Dataset and Color Scheme Selection -->
        <div class="control-section" role="group" aria-labelledby="layer-section-title">
            <h3 class="control-section-title" id="layer-section-title">Map Layers</h3>
            <div class="layer-toggles">
                <!-- AOI Layer -->
                <div class="layer-row">
                    <label class="layer-toggle">
                        <input type="checkbox" id="layer-aoi" ${state.layers?.aoiVisible ? 'checked' : ''}
                               aria-describedby="layer-aoi-desc">
                        <span class="layer-toggle-label">AOIs</span>
                    </label>
                    <div class="layer-options">
                        <select id="aoi-dataset-select" class="layer-select" title="AOI Dataset">
                            ${Object.values(DATASET_TYPES).map(type => `
                                <option value="${type.id}" ${state.aoiDataset === type.id ? 'selected' : ''}>
                                    ${type.name}
                                </option>
                            `).join('')}
                        </select>
                        <select id="aoi-color-scheme-select" class="layer-select layer-color-select" title="AOI Color Scheme">
                            ${getColorSchemes().map(scheme => `
                                <option value="${scheme.id}" ${state.aoiColorScheme === scheme.id ? 'selected' : ''}>
                                    ${scheme.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <!-- Blockface Layer -->
                <div class="layer-row">
                    <label class="layer-toggle">
                        <input type="checkbox" id="layer-blockface" ${state.layers?.blockfaceVisible ? 'checked' : ''}
                               aria-describedby="layer-blockface-desc">
                        <span class="layer-toggle-label">Segments</span>
                    </label>
                    <div class="layer-options">
                        <select id="blockface-dataset-select" class="layer-select" title="Blockface Dataset">
                            ${Object.values(DATASET_TYPES).map(type => `
                                <option value="${type.id}" ${state.blockfaceDataset === type.id ? 'selected' : ''}>
                                    ${type.name}
                                </option>
                            `).join('')}
                        </select>
                        <select id="blockface-color-scheme-select" class="layer-select layer-color-select" title="Blockface Color Scheme">
                            ${getColorSchemes().map(scheme => `
                                <option value="${scheme.id}" ${state.blockfaceColorScheme === scheme.id ? 'selected' : ''}>
                                    ${scheme.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Info Panel -->
        <div class="control-section info-panel">
            <h3 class="control-section-title">
                About This Data
                <button type="button" class="info-toggle" id="info-toggle" aria-label="Show calculation details">?</button>
            </h3>
        </div>

        <!-- Time Range -->
        <div class="control-section">
            <h3 class="control-section-title">Time Range</h3>
            <div class="preset-buttons" id="preset-buttons">
                <button type="button" class="preset-btn" data-days="1">1D</button>
                <button type="button" class="preset-btn" data-days="7">1W</button>
                <button type="button" class="preset-btn" data-days="14">2W</button>
                <button type="button" class="preset-btn active" data-days="30">1M</button>
                <button type="button" class="preset-btn" data-days="90">3M</button>
                <button type="button" class="preset-btn" data-days="180">6M</button>
                <button type="button" class="preset-btn" data-days="365">1Y</button>
            </div>
            <div class="control-group">
                <label class="control-label">Date Range</label>
                <div id="date-range-picker" class="date-picker-container"></div>
            </div>
        </div>

        <!-- Aggregation -->
        <div class="control-section">
            <h3 class="control-section-title">Aggregation</h3>
            <div class="control-radio-group">
                ${aggregationTypes.map(type => `
                    <label class="control-radio">
                        <input type="radio" name="aggregation" value="${type.id}"
                            ${state.aggregation === type.id ? 'checked' : ''}>
                        ${type.name}
                    </label>
                `).join('')}
            </div>
        </div>

        <!-- Statistics -->
        <div class="control-section">
            <h3 class="control-section-title">Statistic</h3>
            <div class="control-group">
                <select id="statistic-select" class="control-select">
                    ${statisticTypes.map(type => `
                        <option value="${type.id}" ${state.statistic === type.id ? 'selected' : ''}>
                            ${type.name}
                        </option>
                    `).join('')}
                </select>
            </div>
        </div>

        <!-- Series Dimension Tabs -->
        <div class="control-section series-dimension-section">
            <h3 class="control-section-title">Series By</h3>
            <div class="series-dimension-tabs" role="tablist" aria-label="Series dimension selection">
                <button type="button" class="series-tab ${seriesDimension === 'aoi' ? 'active' : ''}"
                    role="tab" aria-selected="${seriesDimension === 'aoi'}"
                    data-dimension="aoi" id="tab-aoi" aria-controls="panel-aoi">
                    AOI
                </button>
                <button type="button" class="series-tab ${seriesDimension === 'dayOfWeek' ? 'active' : ''}"
                    role="tab" aria-selected="${seriesDimension === 'dayOfWeek'}"
                    data-dimension="dayOfWeek" id="tab-dayOfWeek" aria-controls="panel-dayOfWeek">
                    Day of Week
                </button>
                <button type="button" class="series-tab ${seriesDimension === 'timeOfDay' ? 'active' : ''}"
                    role="tab" aria-selected="${seriesDimension === 'timeOfDay'}"
                    data-dimension="timeOfDay" id="tab-timeOfDay" aria-controls="panel-timeOfDay">
                    Time of Day
                </button>
            </div>

            <!-- AOI Panel -->
            <div class="series-panel ${seriesDimension === 'aoi' ? 'active' : ''}"
                id="panel-aoi" role="tabpanel" aria-labelledby="tab-aoi">
                <!-- Search filter for neighborhoods -->
                <div class="control-group" style="margin-bottom: 8px;">
                    <input type="text" id="neighborhood-search" class="control-input" placeholder="Search neighborhoods...">
                </div>
                <!-- San Francisco aggregate -->
                <div class="control-checkbox-group" style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border);">
                    <label class="control-checkbox">
                        <input type="checkbox" name="aoi" value="sf-aggregate"
                            ${selectedAOIs.includes('sf-aggregate') ? 'checked' : ''}>
                        <span style="color: #34495E; font-weight: 600;">San Francisco (All)</span>
                    </label>
                </div>
                <!-- Grouped neighborhoods -->
                <div class="aoi-groups" style="max-height: 300px; overflow-y: auto;">
                    ${buildNeighborhoodGroups(regions, selectedAOIs)}
                </div>
                <div class="control-group" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border);">
                    <label class="control-checkbox">
                        <input type="checkbox" id="combined-view" ${state.combinedView ? 'checked' : ''}>
                        <span>Combined View</span>
                        <small style="display: block; color: var(--color-text-muted); font-size: 0.75rem; margin-left: 20px;">Merge selected AOIs (weighted by capacity)</small>
                    </label>
                </div>
            </div>

            <!-- Day of Week Panel -->
            <div class="series-panel ${seriesDimension === 'dayOfWeek' ? 'active' : ''}"
                id="panel-dayOfWeek" role="tabpanel" aria-labelledby="tab-dayOfWeek">
                <div class="control-checkbox-group horizontal">
                    ${DAY_OF_WEEK_OPTIONS.map(day => `
                        <label class="control-checkbox">
                            <input type="checkbox" name="series-day" value="${day.id}"
                                ${selectedDays.includes(day.id) ? 'checked' : ''}>
                            <span style="color: ${day.color}">${day.abbrev}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="quick-select-buttons" style="margin-top: 8px;">
                    <button type="button" class="quick-select-btn" data-select="all-days">All</button>
                    <button type="button" class="quick-select-btn" data-select="weekdays">Weekdays</button>
                    <button type="button" class="quick-select-btn" data-select="weekends">Weekends</button>
                </div>
            </div>

            <!-- Time of Day Panel -->
            <div class="series-panel ${seriesDimension === 'timeOfDay' ? 'active' : ''}"
                id="panel-timeOfDay" role="tabpanel" aria-labelledby="tab-timeOfDay">
                <div class="control-checkbox-group">
                    ${TIME_OF_DAY_OPTIONS.map(period => `
                        <label class="control-checkbox">
                            <input type="checkbox" name="series-time" value="${period.id}"
                                ${selectedTimePeriods.includes(period.id) ? 'checked' : ''}>
                            <span style="color: ${period.color}">${period.name}</span>
                            <small style="color: var(--color-text-muted); font-size: 0.75rem;">
                                (${period.start === 0 ? '12am' : period.start === 12 ? '12pm' : period.start > 12 ? (period.start - 12) + 'pm' : period.start + 'am'}-${period.end === 12 ? '12pm' : period.end === 24 ? '12am' : period.end > 12 ? (period.end - 12) + 'pm' : period.end + 'am'})
                            </small>
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Date Pattern (hidden when Day of Week series is active) -->
        <div class="control-section date-pattern-section" style="display: ${seriesDimension === 'dayOfWeek' ? 'none' : 'block'};">
            <h3 class="control-section-title">Date Filter</h3>
            <div class="control-radio-group">
                <label class="control-radio">
                    <input type="radio" name="date-pattern" value="all"
                        ${state.datePattern?.type === 'all' ? 'checked' : ''}>
                    All Days
                </label>
                <label class="control-radio">
                    <input type="radio" name="date-pattern" value="weekdays"
                        ${state.datePattern?.type === 'weekdays' ? 'checked' : ''}>
                    Weekdays
                </label>
                <label class="control-radio">
                    <input type="radio" name="date-pattern" value="weekends"
                        ${state.datePattern?.type === 'weekends' ? 'checked' : ''}>
                    Weekends
                </label>
                <label class="control-radio">
                    <input type="radio" name="date-pattern" value="custom"
                        ${state.datePattern?.type === 'custom' ? 'checked' : ''}>
                    Custom
                </label>
            </div>
            <div class="custom-days control-checkbox-group horizontal" style="display: ${state.datePattern?.type === 'custom' ? 'flex' : 'none'}; margin-top: 8px;">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => `
                    <label class="control-checkbox">
                        <input type="checkbox" name="day" value="${i}"
                            ${state.datePattern?.days?.includes(i) ? 'checked' : ''}>
                        ${day}
                    </label>
                `).join('')}
            </div>
        </div>

        <!-- Time Pattern (hidden when Time of Day series is active) -->
        <div class="control-section time-pattern-section" style="display: ${seriesDimension === 'timeOfDay' ? 'none' : 'block'};">
            <h3 class="control-section-title">Time Filter</h3>
            <div class="control-radio-group">
                <label class="control-radio">
                    <input type="radio" name="time-pattern" value="all"
                        ${state.timePattern?.type === 'all' ? 'checked' : ''}>
                    All Hours
                </label>
                <label class="control-radio">
                    <input type="radio" name="time-pattern" value="morning"
                        ${state.timePattern?.type === 'morning' ? 'checked' : ''}>
                    Morning (6am-12pm)
                </label>
                <label class="control-radio">
                    <input type="radio" name="time-pattern" value="afternoon"
                        ${state.timePattern?.type === 'afternoon' ? 'checked' : ''}>
                    Afternoon (12pm-6pm)
                </label>
                <label class="control-radio">
                    <input type="radio" name="time-pattern" value="evening"
                        ${state.timePattern?.type === 'evening' ? 'checked' : ''}>
                    Evening (6pm-12am)
                </label>
                <label class="control-radio">
                    <input type="radio" name="time-pattern" value="peak"
                        ${state.timePattern?.type === 'peak' ? 'checked' : ''}>
                    Peak Hours
                </label>
                <label class="control-radio">
                    <input type="radio" name="time-pattern" value="custom"
                        ${state.timePattern?.type === 'custom' ? 'checked' : ''}>
                    Custom
                </label>
            </div>
            <div class="custom-hours" style="display: ${state.timePattern?.type === 'custom' ? 'flex' : 'none'}; gap: 8px; margin-top: 8px;">
                <div class="control-group" style="flex: 1;">
                    <label class="control-label" for="start-hour">From</label>
                    <select id="start-hour" class="control-select">
                        ${Array.from({length: 24}, (_, i) => `
                            <option value="${i}" ${state.timePattern?.ranges?.[0]?.[0] === i ? 'selected' : ''}>
                                ${i.toString().padStart(2, '0')}:00
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="control-group" style="flex: 1;">
                    <label class="control-label" for="end-hour">To</label>
                    <select id="end-hour" class="control-select">
                        ${Array.from({length: 24}, (_, i) => `
                            <option value="${i}" ${state.timePattern?.ranges?.[0]?.[1] === i ? 'selected' : ''}>
                                ${i.toString().padStart(2, '0')}:00
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        </div>

        <!-- Chart Type -->
        <div class="control-section">
            <h3 class="control-section-title">Chart Type</h3>
            <div class="control-group">
                <select id="chart-type" class="control-select">
                    ${chartTypes.map(type => `
                        <option value="${type.id}" ${state.chart?.type === type.id ? 'selected' : ''}>
                            ${type.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="heatmap-mode-group control-group" style="display: ${state.chart?.type === 'heatmap' ? 'block' : 'none'};">
                <label class="control-label" for="heatmap-mode">Heatmap Mode</label>
                <select id="heatmap-mode" class="control-select">
                    ${heatmapModes.map(mode => `
                        <option value="${mode.id}" ${state.chart?.heatmapMode === mode.id ? 'selected' : ''}>
                            ${mode.name}
                        </option>
                    `).join('')}
                </select>
            </div>
        </div>

        <!-- Precision -->
        <div class="control-section">
            <h3 class="control-section-title">Display</h3>
            <div class="control-group">
                <label class="control-label" for="precision">Decimal Precision</label>
                <select id="precision" class="control-select">
                    <option value="0" ${state.chart?.precision === 0 ? 'selected' : ''}>0 decimals</option>
                    <option value="1" ${state.chart?.precision === 1 ? 'selected' : ''}>1 decimal</option>
                    <option value="2" ${state.chart?.precision === 2 ? 'selected' : ''}>2 decimals</option>
                    <option value="3" ${state.chart?.precision === 3 ? 'selected' : ''}>3 decimals</option>
                </select>
            </div>
        </div>

        <!-- Reset Settings -->
        <div class="control-section reset-section">
            <button type="button" id="reset-settings-btn" class="reset-btn">
                Reset All Settings
            </button>
        </div>

        <!-- Version Label -->
        <div class="version-label">
            v${APP_VERSION} (${APP_VERSION_DATE})
        </div>
    `;
}

/**
 * Update controls UI to reflect state
 * @param {HTMLElement} container - Container element
 * @param {Object} state - Current state
 * @param {Object} dateRangePicker - Date range picker instance
 */
function updateControlsUI(container, state, dateRangePicker) {
    // Update date range picker
    if (dateRangePicker && state.timeRange) {
        dateRangePicker.setValue(state.timeRange.start, state.timeRange.end);
    }

    // Update aggregation
    const aggInput = container.querySelector(`input[name="aggregation"][value="${state.aggregation}"]`);
    if (aggInput) aggInput.checked = true;

    // Update statistic
    const statSelect = container.querySelector('#statistic-select');
    if (statSelect) statSelect.value = state.statistic;

    // Update regions (legacy)
    container.querySelectorAll('input[name="region"]').forEach(cb => {
        cb.checked = state.regions?.includes(cb.value);
    });

    // Update AOI checkboxes based on seriesDimension
    if (state.seriesDimension?.type === 'aoi') {
        const selectedAOIs = state.seriesDimension.selected || [];
        container.querySelectorAll('input[name="aoi"]').forEach(cb => {
            cb.checked = selectedAOIs.includes(cb.value);
        });
    }

    // Update chart type
    const chartType = container.querySelector('#chart-type');
    if (chartType && state.chart) chartType.value = state.chart.type;
}
