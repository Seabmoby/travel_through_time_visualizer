/**
 * Custom Date Range Picker Component
 * Dual-month calendar flyout with range selection
 */

/**
 * Create a date range picker
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Configuration options
 * @returns {Object} Date picker interface
 */
export function createDateRangePicker(container, options) {
    const {
        minDate,
        maxDate,
        startDate,
        endDate,
        onChange
    } = options;

    let state = {
        isOpen: false,
        selecting: 'start', // 'start' or 'end'
        tempStart: parseLocalDate(startDate),
        tempEnd: parseLocalDate(endDate),
        viewMonth: parseLocalDate(startDate) || new Date(),
        confirmedStart: parseLocalDate(startDate),
        confirmedEnd: parseLocalDate(endDate)
    };

    const minDateObj = parseLocalDate(minDate);
    const maxDateObj = parseLocalDate(maxDate);

    // Render initial HTML
    container.innerHTML = buildPickerHTML(state);

    // Get DOM references
    const trigger = container.querySelector('.date-picker-trigger');
    const flyout = container.querySelector('.date-picker-flyout');
    const prevBtn = container.querySelector('.calendar-nav-prev');
    const nextBtn = container.querySelector('.calendar-nav-next');
    const doneBtn = container.querySelector('.date-picker-done');
    const cancelBtn = container.querySelector('.date-picker-cancel');

    // Attach event listeners
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFlyout();
    });
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateMonth(-1);
    });
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateMonth(1);
    });
    doneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDoneClick();
    });
    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCancelClick();
    });

    // Prevent clicks inside flyout from bubbling to document
    flyout.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close on click outside (cancels selection)
    document.addEventListener('click', (e) => {
        if (state.isOpen && !container.contains(e.target)) {
            handleCancelClick();
        }
    });

    // Close on Escape (cancels selection)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.isOpen) {
            handleCancelClick();
        }
    });

    function toggleFlyout() {
        if (state.isOpen) {
            handleCancelClick();
        } else {
            openFlyout();
        }
    }

    function openFlyout() {
        state.isOpen = true;
        state.selecting = 'start';
        state.tempStart = state.confirmedStart;
        state.tempEnd = state.confirmedEnd;
        // Set view month to show the start date or current confirmed start
        if (state.confirmedStart) {
            state.viewMonth = new Date(state.confirmedStart);
        }

        // Position flyout relative to trigger
        positionFlyout();
        flyout.classList.add('open');
        renderCalendars();
        updateSelectionHint();
        updateActionButtons();
    }

    function positionFlyout() {
        const triggerRect = trigger.getBoundingClientRect();
        const flyoutWidth = 520; // Approximate width of dual calendar
        const flyoutHeight = 400; // Approximate height

        let left = triggerRect.left;
        let top = triggerRect.bottom + 4;

        // Keep within viewport horizontally
        if (left + flyoutWidth > window.innerWidth - 16) {
            left = window.innerWidth - flyoutWidth - 16;
        }
        if (left < 16) left = 16;

        // If not enough space below, position above
        if (top + flyoutHeight > window.innerHeight - 16) {
            top = triggerRect.top - flyoutHeight - 4;
            if (top < 16) top = 16;
        }

        flyout.style.position = 'fixed';
        flyout.style.left = `${left}px`;
        flyout.style.top = `${top}px`;
    }

    function closeFlyout() {
        state.isOpen = false;
        flyout.classList.remove('open');
    }

    function navigateMonth(delta) {
        state.viewMonth.setMonth(state.viewMonth.getMonth() + delta);
        renderCalendars();
    }

    function handleDayClick(dateStr) {
        const clickedDate = parseLocalDate(dateStr);

        if (state.selecting === 'start') {
            state.tempStart = clickedDate;
            state.tempEnd = null;
            state.selecting = 'end';
        } else {
            // If clicked date is before start, swap
            if (clickedDate < state.tempStart) {
                state.tempEnd = state.tempStart;
                state.tempStart = clickedDate;
            } else {
                state.tempEnd = clickedDate;
            }
            // Selection complete but NOT confirmed yet - user must click Done
        }

        renderCalendars();
        updateSelectionHint();
        updateActionButtons();
    }

    function handleDoneClick() {
        if (!state.tempStart || !state.tempEnd) return;

        // Confirm selection
        state.confirmedStart = state.tempStart;
        state.confirmedEnd = state.tempEnd;

        // Notify parent
        if (onChange) {
            onChange({
                start: formatDate(state.confirmedStart),
                end: formatDate(state.confirmedEnd)
            });
        }

        // Update trigger text and close
        updateTriggerText();
        closeFlyout();
    }

    function handleCancelClick() {
        // Reset temp selection to confirmed values
        state.tempStart = state.confirmedStart;
        state.tempEnd = state.confirmedEnd;
        state.selecting = 'start';
        closeFlyout();
    }

    function updateActionButtons() {
        const doneBtn = flyout.querySelector('.date-picker-done');
        if (doneBtn) {
            const canConfirm = state.tempStart && state.tempEnd;
            doneBtn.disabled = !canConfirm;
        }
    }

    function updateSelectionHint() {
        const hint = flyout.querySelector('.selection-hint');
        if (hint) {
            if (state.tempStart && state.tempEnd) {
                hint.textContent = 'Click Done to apply selection';
            } else if (state.selecting === 'start') {
                hint.textContent = 'Click to select start date';
            } else {
                hint.textContent = 'Click to select end date';
            }
        }
    }

    function updateTriggerText() {
        const triggerText = trigger.querySelector('.date-picker-text');
        if (triggerText && state.confirmedStart && state.confirmedEnd) {
            triggerText.textContent = `${formatDisplayDate(state.confirmedStart)} - ${formatDisplayDate(state.confirmedEnd)}`;
        }
    }

    function renderCalendars() {
        const calendarsContainer = flyout.querySelector('.calendars-container');
        if (!calendarsContainer) return;

        const leftMonth = new Date(state.viewMonth);
        const rightMonth = new Date(state.viewMonth);
        rightMonth.setMonth(rightMonth.getMonth() + 1);

        calendarsContainer.innerHTML = `
            ${buildCalendarMonth(leftMonth)}
            ${buildCalendarMonth(rightMonth)}
        `;

        // Update nav header
        const navTitle = flyout.querySelector('.calendar-nav-title');
        if (navTitle) {
            navTitle.textContent = `${formatMonthYear(leftMonth)} - ${formatMonthYear(rightMonth)}`;
        }

        // Attach day click handlers
        calendarsContainer.querySelectorAll('.calendar-day:not(.disabled):not(.empty)').forEach(day => {
            day.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering document click handler
                handleDayClick(day.dataset.date);
            });
            day.addEventListener('mouseenter', () => handleDayHover(day.dataset.date));
        });
    }

    function handleDayHover(dateStr) {
        if (state.selecting !== 'end' || !state.tempStart) return;

        const hoverDate = parseLocalDate(dateStr);
        const calendarsContainer = flyout.querySelector('.calendars-container');

        calendarsContainer.querySelectorAll('.calendar-day').forEach(day => {
            const dayDate = parseLocalDate(day.dataset.date);
            day.classList.remove('in-range-preview');

            if (state.tempStart && !state.tempEnd) {
                const rangeStart = hoverDate < state.tempStart ? hoverDate : state.tempStart;
                const rangeEnd = hoverDate < state.tempStart ? state.tempStart : hoverDate;

                if (dayDate > rangeStart && dayDate < rangeEnd) {
                    day.classList.add('in-range-preview');
                }
            }
        });
    }

    function buildCalendarMonth(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        let html = `
            <div class="calendar-month">
                <div class="calendar-month-title">${formatMonthYear(date)}</div>
                <div class="calendar-weekdays">
                    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>
                <div class="calendar-days">
        `;

        // Empty cells for days before first of month
        for (let i = 0; i < startDayOfWeek; i++) {
            html += `<span class="calendar-day empty"></span>`;
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dateStr = formatDate(currentDate);
            const classes = ['calendar-day'];

            // Check if disabled (outside min/max range)
            if (currentDate < minDateObj || currentDate > maxDateObj) {
                classes.push('disabled');
            }

            // Check if selected start
            if (state.tempStart && isSameDay(currentDate, state.tempStart)) {
                classes.push('selected', 'range-start');
            }

            // Check if selected end
            if (state.tempEnd && isSameDay(currentDate, state.tempEnd)) {
                classes.push('selected', 'range-end');
            }

            // Check if in range
            if (state.tempStart && state.tempEnd &&
                currentDate > state.tempStart && currentDate < state.tempEnd) {
                classes.push('in-range');
            }

            // Check if today
            if (isSameDay(currentDate, new Date())) {
                classes.push('today');
            }

            html += `<span class="${classes.join(' ')}" data-date="${dateStr}">${day}</span>`;
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    function buildPickerHTML(state) {
        const displayText = state.confirmedStart && state.confirmedEnd
            ? `${formatDisplayDate(state.confirmedStart)} - ${formatDisplayDate(state.confirmedEnd)}`
            : 'Select date range';

        return `
            <button type="button" class="date-picker-trigger">
                <svg class="date-picker-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                </svg>
                <span class="date-picker-text">${displayText}</span>
                <svg class="date-picker-chevron" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                </svg>
            </button>
            <div class="date-picker-flyout">
                <div class="calendar-nav">
                    <button type="button" class="calendar-nav-prev" aria-label="Previous month">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </button>
                    <span class="calendar-nav-title"></span>
                    <button type="button" class="calendar-nav-next" aria-label="Next month">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="calendars-container"></div>
                <div class="date-picker-footer">
                    <div class="selection-hint">Click to select start date</div>
                    <div class="date-picker-actions">
                        <button type="button" class="date-picker-cancel">Cancel</button>
                        <button type="button" class="date-picker-done" disabled>Done</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Initial render
    renderCalendars();
    updateTriggerText();

    // Public interface
    return {
        getValue() {
            return {
                start: state.confirmedStart ? formatDate(state.confirmedStart) : null,
                end: state.confirmedEnd ? formatDate(state.confirmedEnd) : null
            };
        },
        setValue(start, end) {
            state.confirmedStart = parseLocalDate(start);
            state.confirmedEnd = parseLocalDate(end);
            state.tempStart = state.confirmedStart;
            state.tempEnd = state.confirmedEnd;
            if (state.confirmedStart) {
                state.viewMonth = new Date(state.confirmedStart);
            }
            updateTriggerText();
            if (state.isOpen) {
                renderCalendars();
            }
        },
        close() {
            closeFlyout();
        }
    };
}

// Helper functions

/**
 * Parse a date string (YYYY-MM-DD) as local date, not UTC
 * This avoids the off-by-one day bug caused by timezone conversion
 */
function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatMonthYear(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}
