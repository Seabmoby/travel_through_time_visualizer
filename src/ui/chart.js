/**
 * Chart Module
 * ECharts wrapper for visualization rendering
 */

/**
 * Create a new chart instance
 * @param {HTMLElement} container - Container element
 * @returns {ChartInstance} Chart wrapper object
 */
export function createChart(container) {
    if (!container) {
        throw new Error('Chart container element is required');
    }

    if (typeof echarts === 'undefined') {
        throw new Error('ECharts is not loaded. Make sure to include the ECharts script in your HTML.');
    }

    const instance = echarts.init(container);
    let currentConfig = {
        type: 'line',
        heatmapMode: null,
        precision: 1,
        animate: true,
        showLegend: true,
        showTooltip: true
    };
    let currentData = null;
    let containerEl = container;

    /**
     * Update chart with new data and configuration
     * @param {Object} data - Chart data
     * @param {Object} config - Chart configuration
     */
    function update(data, config = {}) {
        currentData = data;
        currentConfig = { ...currentConfig, ...config };

        const containerWidth = containerEl.offsetWidth;
        const option = buildOption(currentData, currentConfig, containerWidth);
        instance.setOption(option, { notMerge: true });
    }

    /**
     * Set chart type
     * @param {string} type - Chart type
     */
    function setChartType(type) {
        currentConfig.type = type;
        if (type !== 'heatmap') {
            currentConfig.heatmapMode = null;
        }
        if (currentData) {
            update(currentData, currentConfig);
        }
    }

    /**
     * Set heatmap mode
     * @param {string} mode - Heatmap mode
     */
    function setHeatmapMode(mode) {
        currentConfig.heatmapMode = mode;
        currentConfig.type = 'heatmap';
        if (currentData) {
            update(currentData, currentConfig);
        }
    }

    /**
     * Set precision for value display
     * @param {number} decimals - Decimal places (0-3)
     */
    function setPrecision(decimals) {
        currentConfig.precision = Math.max(0, Math.min(3, decimals));
        if (currentData) {
            update(currentData, currentConfig);
        }
    }

    /**
     * Resize chart to fit container
     */
    function resize() {
        instance.resize();
        // Rebuild option with updated label intervals for new width
        if (currentData) {
            const containerWidth = containerEl.offsetWidth;
            const option = buildOption(currentData, currentConfig, containerWidth);
            // Use notMerge: true to ensure xAxis configuration is fully replaced
            instance.setOption(option, { notMerge: true });
        }
    }

    /**
     * Show loading indicator
     */
    function showLoading() {
        instance.showLoading({
            text: 'Loading...',
            color: '#3498db',
            maskColor: 'rgba(255, 255, 255, 0.8)'
        });
    }

    /**
     * Hide loading indicator
     */
    function hideLoading() {
        instance.hideLoading();
    }

    /**
     * Dispose of chart instance
     */
    function destroy() {
        instance.dispose();
    }

    /**
     * Register click callback
     * @param {Function} callback - Click handler
     */
    function onDataPointClick(callback) {
        instance.on('click', (params) => {
            if (params.componentType === 'series') {
                callback({
                    seriesName: params.seriesName,
                    timestamp: params.data[0] || params.name,
                    value: params.data[1] || params.value
                });
            }
        });
    }

    return {
        update,
        setChartType,
        setHeatmapMode,
        setPrecision,
        resize,
        showLoading,
        hideLoading,
        destroy,
        onDataPointClick,
        getInstance: () => instance
    };
}

/**
 * Build ECharts option from data and config
 * @param {Object} data - Chart data
 * @param {Object} config - Chart configuration
 * @param {number} containerWidth - Container width in pixels
 * @returns {Object} ECharts option
 */
function buildOption(data, config, containerWidth = 800) {
    if (!data || !data.series || data.series.length === 0) {
        return buildEmptyOption();
    }

    if (config.type === 'heatmap') {
        return buildHeatmapOption(data, config);
    }

    return buildTimeSeriesOption(data, config, containerWidth);
}

/**
 * Build empty state option
 * @returns {Object} ECharts option
 */
function buildEmptyOption() {
    return {
        graphic: {
            type: 'text',
            left: 'center',
            top: 'center',
            style: {
                text: 'No data available for selected filters',
                fontSize: 16,
                fill: '#7f8c8d'
            }
        }
    };
}

/**
 * Build y-axis configuration based on data type
 * @param {Object} data - Chart data with yAxis configuration
 * @returns {Object} ECharts yAxis config
 */
function buildYAxisConfig(data) {
    const yAxisName = data.yAxis?.name || 'Occupancy %';
    const isTransactions = yAxisName.includes('Revenue') || yAxisName.includes('$');

    if (isTransactions) {
        return {
            type: 'value',
            name: yAxisName,
            nameLocation: 'middle',
            nameGap: 55,
            min: 0,
            axisLabel: {
                formatter: (value) => {
                    if (value >= 1000000) {
                        return '$' + (value / 1000000).toFixed(1) + 'M';
                    } else if (value >= 1000) {
                        return '$' + (value / 1000).toFixed(1) + 'K';
                    }
                    return '$' + value.toFixed(0);
                }
            }
        };
    }

    // Default: Occupancy percentage
    return {
        type: 'value',
        name: yAxisName,
        nameLocation: 'middle',
        nameGap: 45,
        min: 0,
        max: 100,
        axisLabel: {
            formatter: '{value}%'
        }
    };
}

/**
 * Build time series chart option (line, bar, area)
 * @param {Object} data - Chart data
 * @param {Object} config - Chart configuration
 * @param {number} containerWidth - Container width in pixels
 * @returns {Object} ECharts option
 */
function buildTimeSeriesOption(data, config, containerWidth = 800) {
    const precision = config.precision;
    const yAxisName = data.yAxis?.name || 'Occupancy %';
    const isTransactions = yAxisName.includes('Revenue') || yAxisName.includes('$');
    const formatter = isTransactions
        ? (value) => '$' + value.toFixed(precision)
        : (value) => value.toFixed(precision) + '%';

    // Check if using category x-axis (for Day of Week or Time of Day series)
    const isCategoryAxis = data.xAxis && data.xAxis.type === 'category';

    // Build title configuration
    const titleConfig = config.title ? {
        text: config.title,
        left: 'center',
        top: 5,
        textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#2c3e50'
        }
    } : undefined;

    const series = data.series.map(s => {
        const seriesConfig = {
            name: s.name,
            type: config.type === 'bar' ? 'bar' : 'line',
            data: isCategoryAxis
                ? s.data.map(d => d.value) // Category axis: just values
                : s.data.map(d => [d.timestamp, d.value]), // Time axis: [timestamp, value]
            itemStyle: { color: s.color },
            smooth: config.type === 'line',
            areaStyle: (config.type === 'area' || config.type === 'stacked-area') ? {
                opacity: 0.3
            } : undefined,
            stack: config.type === 'stacked-area' ? 'total' : undefined,
            emphasis: {
                focus: 'series'
            }
        };

        // Add reference line (markLine) if referenceValue is provided
        if (typeof s.referenceValue === 'number' && s.data.length > 1) {
            seriesConfig.markLine = {
                silent: true,
                symbol: 'none',
                lineStyle: {
                    color: s.color,
                    type: 'dashed',
                    width: 2,
                    opacity: 0.7
                },
                label: {
                    show: true,
                    position: 'insideEndTop',
                    formatter: () => formatter(s.referenceValue),
                    color: s.color,
                    fontSize: 10,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    padding: [2, 4],
                    borderRadius: 2
                },
                data: [
                    { yAxis: s.referenceValue }
                ]
            };
        }

        return seriesConfig;
    });

    // Calculate dynamic label interval based on container width
    const chartWidth = containerWidth - 100; // Account for grid margins
    const labelWidth = 80; // Approximate width per label in pixels
    const maxLabels = Math.max(3, Math.floor(chartWidth / labelWidth)); // Minimum 3 labels

    // Build x-axis configuration
    let xAxisConfig;
    if (isCategoryAxis) {
        const dataLength = data.xAxis.data.length;
        const categoryInterval = dataLength <= maxLabels ? 0 : Math.ceil(dataLength / maxLabels) - 1;
        xAxisConfig = {
            type: 'category',
            data: data.xAxis.data,
            name: data.xAxis.name || '',
            nameLocation: 'middle',
            nameGap: 35,
            axisLabel: {
                interval: categoryInterval,
                rotate: dataLength > maxLabels ? 45 : 0,
                showMinLabel: true, // Always show first label
                showMaxLabel: true  // Always show last label
            }
        };
    } else {
        // For time axis, calculate appropriate settings based on data density and available width
        const dataPoints = data.series[0]?.data?.length || 0;

        // Determine ideal number of labels:
        // - Don't show more labels than we have data points
        // - Don't show more labels than can fit in the width
        // - Show enough labels to be useful (minimum 3)
        const idealLabels = Math.max(3, Math.min(dataPoints, maxLabels));

        // Calculate the data interval to set appropriate minInterval
        const points = data.series[0]?.data || [];
        let minInterval = undefined;
        if (points.length >= 2) {
            // Detect data granularity from first two points
            const first = new Date(points[0].timestamp).getTime();
            const second = new Date(points[1].timestamp).getTime();
            const dataInterval = second - first;

            // Calculate minInterval based on how many labels can fit
            // If we can show all points, use data interval; otherwise scale up
            if (dataPoints <= maxLabels) {
                minInterval = dataInterval;
            } else {
                // Scale interval to fit maxLabels
                const totalRange = new Date(points[points.length - 1].timestamp).getTime() - first;
                minInterval = Math.ceil(totalRange / maxLabels);
            }
        }

        xAxisConfig = {
            type: 'time',
            splitNumber: idealLabels,
            minInterval: minInterval,
            axisLabel: {
                formatter: getTimeAxisFormatter(data),
                hideOverlap: true, // Let ECharts hide overlapping labels as a fallback
                showMinLabel: true, // Always show first label
                showMaxLabel: true  // Always show last label
            }
        };
    }

    // Calculate top offset based on title and legend
    const hasTitle = !!titleConfig;
    const hasLegend = config.showLegend && data.series.length > 1;
    let gridTop = 40;
    if (hasTitle && hasLegend) gridTop = 80;
    else if (hasTitle) gridTop = 50;
    else if (hasLegend) gridTop = 60;

    return {
        title: titleConfig,
        tooltip: {
            trigger: 'axis',
            show: config.showTooltip,
            formatter: (params) => {
                if (!Array.isArray(params)) params = [params];
                let result = params[0].axisValueLabel + '<br/>';
                params.forEach(p => {
                    const value = typeof p.value === 'object' ? p.value[1] : p.value;
                    result += `${p.marker} ${p.seriesName}: ${formatter(value)}<br/>`;
                });
                return result;
            }
        },
        legend: {
            show: hasLegend,
            data: data.series.map(s => s.name),
            top: hasTitle ? 30 : 10,
            type: data.series.length > 10 ? 'scroll' : 'plain' // Scrollable legend for many series
        },
        grid: {
            left: 60,
            right: 40,
            top: gridTop,
            bottom: isCategoryAxis ? 80 : 60
        },
        xAxis: xAxisConfig,
        yAxis: buildYAxisConfig(data),
        series,
        animation: config.animate,
        animationDuration: 300,
        aria: {
            enabled: true,
            decal: { show: true }
        }
    };
}

/**
 * Build heatmap chart option
 * @param {Object} data - Chart data
 * @param {Object} config - Chart configuration
 * @returns {Object} ECharts option
 */
function buildHeatmapOption(data, config) {
    if (config.heatmapMode === 'calendar') {
        return buildCalendarHeatmapOption(data, config);
    }

    const heatmapData = transformToHeatmapData(data, config);
    const precision = config.precision;

    // Build title configuration
    const titleConfig = config.title ? {
        text: config.title,
        left: 'center',
        top: 5,
        textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#2c3e50'
        }
    } : undefined;

    return {
        title: titleConfig,
        tooltip: {
            show: config.showTooltip,
            position: 'top',
            formatter: (params) => {
                const value = params.value[2];
                return `${params.name}<br/>Occupancy: ${value.toFixed(precision)}%`;
            }
        },
        grid: {
            left: 80,
            right: 40,
            top: titleConfig ? 50 : 40,
            bottom: 80
        },
        xAxis: {
            type: 'category',
            data: heatmapData.xLabels,
            name: 'Hour',
            nameLocation: 'middle',
            nameGap: 35,
            splitArea: { show: true }
        },
        yAxis: {
            type: 'category',
            data: heatmapData.yLabels,
            name: config.heatmapMode === 'day-hour' ? 'Day' : 'Date',
            splitArea: { show: true }
        },
        visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 10,
            inRange: {
                color: ['#2ecc71', '#f1c40f', '#e74c3c']
            }
        },
        series: [{
            type: 'heatmap',
            data: heatmapData.data,
            label: {
                show: false
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }],
        animation: config.animate,
        aria: {
            enabled: true
        }
    };
}

/**
 * Build calendar heatmap option
 * @param {Object} data - Chart data
 * @param {Object} config - Chart configuration
 * @returns {Object} ECharts option
 */
function buildCalendarHeatmapOption(data, config) {
    // Aggregate to daily values
    const dailyData = aggregateToDaily(data);
    const dates = dailyData.map(d => d[0]);
    const range = [dates[0], dates[dates.length - 1]];
    const precision = config.precision;

    // Build title configuration
    const titleConfig = config.title ? {
        text: config.title,
        left: 'center',
        top: 5,
        textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#2c3e50'
        }
    } : undefined;

    return {
        title: titleConfig,
        tooltip: {
            show: config.showTooltip,
            formatter: (params) => {
                const value = params.value[1];
                return `${params.value[0]}<br/>Occupancy: ${value.toFixed(precision)}%`;
            }
        },
        visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 10,
            inRange: {
                color: ['#2ecc71', '#f1c40f', '#e74c3c']
            }
        },
        calendar: {
            range: range,
            cellSize: ['auto', 20],
            left: 60,
            right: 40,
            top: titleConfig ? 50 : 40,
            orient: 'horizontal',
            dayLabel: {
                firstDay: 1,
                nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            },
            monthLabel: {
                nameMap: 'en'
            },
            yearLabel: {
                show: true
            }
        },
        series: [{
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: dailyData
        }],
        animation: config.animate,
        aria: {
            enabled: true
        }
    };
}

/**
 * Transform series data to heatmap format
 * @param {Object} data - Chart data
 * @param {Object} config - Chart configuration
 * @returns {Object} Heatmap data
 */
function transformToHeatmapData(data, config) {
    const hours = Array.from({ length: 24 }, (_, i) =>
        i.toString().padStart(2, '0') + ':00'
    );

    if (config.heatmapMode === 'day-hour') {
        return transformToDayHourHeatmap(data, hours);
    }

    return transformToDateHourHeatmap(data, hours);
}

/**
 * Transform to day-of-week × hour heatmap
 * @param {Object} data - Chart data
 * @param {string[]} hours - Hour labels
 * @returns {Object} Heatmap data
 */
function transformToDayHourHeatmap(data, hours) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grid = Array(7).fill(null).map(() =>
        Array(24).fill(null).map(() => ({ sum: 0, count: 0 }))
    );

    // Aggregate first series (or combine all)
    const series = data.series[0];
    for (const point of series.data) {
        const date = new Date(point.timestamp);
        const dayIdx = date.getDay();
        const hourIdx = date.getHours();
        grid[dayIdx][hourIdx].sum += point.value;
        grid[dayIdx][hourIdx].count++;
    }

    const heatmapData = [];
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            const cell = grid[d][h];
            const value = cell.count > 0 ? cell.sum / cell.count : 0;
            heatmapData.push([h, d, value]);
        }
    }

    return {
        xLabels: hours,
        yLabels: days,
        data: heatmapData
    };
}

/**
 * Transform to date × hour heatmap
 * @param {Object} data - Chart data
 * @param {string[]} hours - Hour labels
 * @returns {Object} Heatmap data
 */
function transformToDateHourHeatmap(data, hours) {
    const dateMap = new Map();

    // Aggregate first series
    const series = data.series[0];
    for (const point of series.data) {
        const date = new Date(point.timestamp);
        const dateKey = date.toISOString().split('T')[0];
        const hourIdx = date.getHours();

        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, Array(24).fill(null).map(() => ({ sum: 0, count: 0 })));
        }

        dateMap.get(dateKey)[hourIdx].sum += point.value;
        dateMap.get(dateKey)[hourIdx].count++;
    }

    const dates = Array.from(dateMap.keys()).sort();
    const heatmapData = [];

    dates.forEach((dateKey, dateIdx) => {
        const hourData = dateMap.get(dateKey);
        for (let h = 0; h < 24; h++) {
            const cell = hourData[h];
            const value = cell.count > 0 ? cell.sum / cell.count : 0;
            heatmapData.push([h, dateIdx, value]);
        }
    });

    return {
        xLabels: hours,
        yLabels: dates,
        data: heatmapData
    };
}

/**
 * Aggregate data to daily values
 * @param {Object} data - Chart data
 * @returns {Array} Calendar data [[date, value], ...]
 */
function aggregateToDaily(data) {
    const dailyMap = new Map();

    for (const series of data.series) {
        for (const point of series.data) {
            const dateKey = point.timestamp.split('T')[0];

            if (!dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, { sum: 0, count: 0 });
            }

            dailyMap.get(dateKey).sum += point.value;
            dailyMap.get(dateKey).count++;
        }
    }

    const result = [];
    for (const [date, data] of dailyMap) {
        result.push([date, data.sum / data.count]);
    }

    return result.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Get appropriate time axis formatter based on data range and granularity
 * @param {Object} data - Chart data
 * @returns {Function|string} Formatter
 */
function getTimeAxisFormatter(data) {
    if (!data.series || data.series.length === 0) return '{yyyy}-{MM}-{dd}';

    const points = data.series[0].data;
    if (points.length < 2) return '{yyyy}-{MM}-{dd}';

    const first = new Date(points[0].timestamp);
    const last = new Date(points[points.length - 1].timestamp);
    const range = last - first;
    const days = range / (1000 * 60 * 60 * 24);

    // Also check data granularity (interval between first two points)
    const second = new Date(points[1].timestamp);
    const dataInterval = second - first;
    const hoursInterval = dataInterval / (1000 * 60 * 60);

    // If data is sub-hourly (e.g., 15-min intervals), include time in format
    if (hoursInterval < 1) {
        if (days <= 1) {
            return '{HH}:{mm}';
        } else if (days <= 3) {
            return '{MM}-{dd} {HH}:{mm}';
        } else {
            return '{MM}-{dd}';
        }
    }

    // If data is hourly, show hours for shorter ranges
    if (hoursInterval <= 1) {
        if (days <= 1) {
            return '{HH}:00';
        } else if (days <= 7) {
            return '{MM}-{dd} {HH}:00';
        } else {
            return '{MM}-{dd}';
        }
    }

    // Daily or longer intervals
    if (days <= 7) {
        return '{MM}-{dd}';
    } else if (days <= 90) {
        return '{MM}-{dd}';
    } else {
        return '{yyyy}-{MM}';
    }
}

/**
 * Calculate time axis interval settings based on data and available space
 * @param {number} dataPoints - Number of data points
 * @param {number} maxLabels - Maximum number of labels that fit
 * @param {Object} data - Chart data
 * @returns {Object} Axis interval configuration (minInterval, splitNumber)
 */
function calculateTimeAxisInterval(dataPoints, maxLabels, data) {
    if (!data.series || data.series.length === 0 || dataPoints < 2) {
        return { splitNumber: Math.max(2, maxLabels) };
    }

    const points = data.series[0].data;
    const first = new Date(points[0].timestamp);
    const last = new Date(points[points.length - 1].timestamp);
    const range = last - first;
    const days = range / (1000 * 60 * 60 * 24);

    // Calculate minimum interval in milliseconds based on maxLabels
    const rawMinInterval = range / maxLabels;

    // Round up to nice intervals
    const HOUR = 3600000;
    const DAY = 86400000;
    const WEEK = 604800000;
    const MONTH = 2592000000; // ~30 days

    let interval;
    if (days <= 1) {
        // For single day, use hour-based intervals
        if (rawMinInterval <= HOUR) interval = HOUR;
        else if (rawMinInterval <= 2 * HOUR) interval = 2 * HOUR;
        else if (rawMinInterval <= 4 * HOUR) interval = 4 * HOUR;
        else interval = 6 * HOUR;
    } else if (days <= 7) {
        // For a week, use hour or day intervals
        if (rawMinInterval <= 6 * HOUR) interval = 6 * HOUR;
        else if (rawMinInterval <= 12 * HOUR) interval = 12 * HOUR;
        else interval = DAY;
    } else if (days <= 30) {
        // For a month, use day intervals
        if (rawMinInterval <= DAY) interval = DAY;
        else if (rawMinInterval <= 2 * DAY) interval = 2 * DAY;
        else if (rawMinInterval <= 5 * DAY) interval = 5 * DAY;
        else interval = WEEK;
    } else if (days <= 90) {
        // For 3 months, use day or week intervals
        if (rawMinInterval <= 2 * DAY) interval = 2 * DAY;
        else if (rawMinInterval <= WEEK) interval = WEEK;
        else interval = 2 * WEEK;
    } else {
        // For longer ranges, use week or month intervals
        if (rawMinInterval <= WEEK) interval = WEEK;
        else if (rawMinInterval <= 2 * WEEK) interval = 2 * WEEK;
        else interval = MONTH;
    }

    // Calculate splitNumber based on the interval we chose
    const splitNumber = Math.max(2, Math.min(maxLabels, Math.floor(range / interval)));

    return { minInterval: interval, splitNumber };
}

/**
 * Get available chart types
 * @returns {Array<{id: string, name: string}>}
 */
export function getChartTypes() {
    return [
        { id: 'line', name: 'Line Chart' },
        { id: 'bar', name: 'Bar Chart' },
        { id: 'area', name: 'Area Chart' },
        { id: 'stacked-area', name: 'Stacked Area' },
        { id: 'heatmap', name: 'Heatmap' }
    ];
}

/**
 * Get available heatmap modes
 * @returns {Array<{id: string, name: string}>}
 */
export function getHeatmapModes() {
    return [
        { id: 'date-hour', name: 'Date × Hour' },
        { id: 'day-hour', name: 'Day of Week × Hour' },
        { id: 'calendar', name: 'Calendar View' }
    ];
}
