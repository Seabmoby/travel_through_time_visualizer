/**
 * Time Utils Module Unit Tests
 */

import {
    parseDate,
    isInRange,
    getDayOfWeek,
    getHour,
    filterByDayOfWeek,
    filterByHourRange,
    getBucketKey,
    generateBucketRange,
    bucketize
} from '../../src/lib/time-utils.js';

describe('time-utils.js', () => {

    // parseDate() tests
    describe('parseDate()', () => {
        it('should parse ISO date string', () => {
            const date = parseDate('2024-01-15T10:30:00.000Z');
            expect(date instanceof Date).toBeTruthy();
            expect(date.getFullYear()).toBe(2024);
        });

        it('should parse date-only string', () => {
            const date = parseDate('2024-01-15');
            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(0); // January
            expect(date.getDate()).toBe(15);
        });

        it('should throw for invalid date', () => {
            expect(() => parseDate('not-a-date')).toThrow();
        });
    });

    // isInRange() tests
    describe('isInRange()', () => {
        const range = { start: '2024-01-01', end: '2024-01-31' };

        it('should return true for date in range', () => {
            expect(isInRange('2024-01-15T12:00:00Z', range)).toBeTruthy();
        });

        it('should return true for start date', () => {
            expect(isInRange('2024-01-01T00:00:00Z', range)).toBeTruthy();
        });

        it('should return true for end date', () => {
            expect(isInRange('2024-01-31T23:59:59Z', range)).toBeTruthy();
        });

        it('should return false for date before range', () => {
            expect(isInRange('2023-12-31T23:59:59Z', range)).toBeFalsy();
        });

        it('should return false for date after range', () => {
            expect(isInRange('2024-02-01T00:00:00Z', range)).toBeFalsy();
        });
    });

    // getDayOfWeek() tests
    describe('getDayOfWeek()', () => {
        it('should return 0 for Sunday', () => {
            // 2024-01-07 is a Sunday
            expect(getDayOfWeek('2024-01-07T12:00:00Z')).toBe(0);
        });

        it('should return 1 for Monday', () => {
            // 2024-01-08 is a Monday
            expect(getDayOfWeek('2024-01-08T12:00:00Z')).toBe(1);
        });

        it('should return 6 for Saturday', () => {
            // 2024-01-06 is a Saturday
            expect(getDayOfWeek('2024-01-06T12:00:00Z')).toBe(6);
        });
    });

    // getHour() tests
    describe('getHour()', () => {
        it('should return hour from timestamp', () => {
            expect(getHour('2024-01-15T14:30:00')).toBe(14);
        });

        it('should return 0 for midnight', () => {
            expect(getHour('2024-01-15T00:00:00')).toBe(0);
        });

        it('should return 23 for 11pm', () => {
            expect(getHour('2024-01-15T23:59:59')).toBe(23);
        });
    });

    // filterByDayOfWeek() tests
    describe('filterByDayOfWeek()', () => {
        const readings = [
            { timestamp: '2024-01-06T12:00:00Z', value: 1 }, // Saturday
            { timestamp: '2024-01-07T12:00:00Z', value: 2 }, // Sunday
            { timestamp: '2024-01-08T12:00:00Z', value: 3 }, // Monday
            { timestamp: '2024-01-09T12:00:00Z', value: 4 }, // Tuesday
        ];

        it('should filter for weekends (0, 6)', () => {
            const result = filterByDayOfWeek(readings, [0, 6]);
            expect(result).toHaveLength(2);
        });

        it('should filter for weekdays', () => {
            const result = filterByDayOfWeek(readings, [1, 2, 3, 4, 5]);
            expect(result).toHaveLength(2);
        });

        it('should return all for empty days array', () => {
            const result = filterByDayOfWeek(readings, []);
            expect(result).toHaveLength(4);
        });

        it('should return all for all days', () => {
            const result = filterByDayOfWeek(readings, [0, 1, 2, 3, 4, 5, 6]);
            expect(result).toHaveLength(4);
        });
    });

    // filterByHourRange() tests
    describe('filterByHourRange()', () => {
        const readings = [
            { timestamp: '2024-01-15T06:00:00', value: 1 },
            { timestamp: '2024-01-15T12:00:00', value: 2 },
            { timestamp: '2024-01-15T18:00:00', value: 3 },
            { timestamp: '2024-01-15T23:00:00', value: 4 },
        ];

        it('should filter for morning hours', () => {
            const result = filterByHourRange(readings, [[6, 11]]);
            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(1);
        });

        it('should filter for multiple ranges', () => {
            const result = filterByHourRange(readings, [[6, 8], [17, 19]]);
            expect(result).toHaveLength(2);
        });

        it('should return all for empty ranges', () => {
            const result = filterByHourRange(readings, []);
            expect(result).toHaveLength(4);
        });
    });

    // getBucketKey() tests
    describe('getBucketKey()', () => {
        const timestamp = '2024-01-15T14:37:22.000Z';

        it('should bucket to 15min', () => {
            const key = getBucketKey(timestamp, '15min');
            expect(key).toContain('14:30');
        });

        it('should bucket to hourly', () => {
            const key = getBucketKey(timestamp, 'hourly');
            expect(key).toContain('14:00');
        });

        it('should bucket to daily', () => {
            const key = getBucketKey(timestamp, 'daily');
            expect(key).toBe('2024-01-15');
        });

        it('should bucket to monthly', () => {
            const key = getBucketKey(timestamp, 'monthly');
            expect(key).toBe('2024-01-01');
        });
    });

    // generateBucketRange() tests
    describe('generateBucketRange()', () => {
        it('should generate daily buckets', () => {
            const range = { start: '2024-01-01', end: '2024-01-03' };
            const keys = generateBucketRange(range, 'daily');
            expect(keys).toHaveLength(3);
            expect(keys).toContain('2024-01-01');
            expect(keys).toContain('2024-01-02');
            expect(keys).toContain('2024-01-03');
        });

        it('should generate monthly buckets', () => {
            const range = { start: '2024-01-15', end: '2024-03-15' };
            const keys = generateBucketRange(range, 'monthly');
            expect(keys).toHaveLength(3);
            expect(keys).toContain('2024-01-01');
            expect(keys).toContain('2024-02-01');
            expect(keys).toContain('2024-03-01');
        });
    });

    // bucketize() tests
    describe('bucketize()', () => {
        const readings = [
            { timestamp: '2024-01-15T10:00:00Z', value: 10 },
            { timestamp: '2024-01-15T10:30:00Z', value: 20 },
            { timestamp: '2024-01-15T11:00:00Z', value: 30 },
            { timestamp: '2024-01-16T10:00:00Z', value: 40 },
        ];

        it('should bucket by hour', () => {
            const buckets = bucketize(readings, 'hourly');
            expect(buckets.size).toBe(3);
        });

        it('should bucket by day', () => {
            const buckets = bucketize(readings, 'daily');
            expect(buckets.size).toBe(2);
        });

        it('should group readings in same bucket', () => {
            const buckets = bucketize(readings, 'daily');
            const jan15 = buckets.get('2024-01-15');
            expect(jan15).toHaveLength(3);
        });
    });
});
