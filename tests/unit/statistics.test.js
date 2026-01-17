/**
 * Statistics Module Unit Tests
 */

import { mean, min, max, median, mode, percentile, standardDeviation, calculate } from '../../src/lib/statistics.js';

describe('statistics.js', () => {

    // mean() tests
    describe('mean()', () => {
        it('should calculate mean of positive numbers', () => {
            expect(mean([1, 2, 3, 4, 5])).toBe(3);
        });

        it('should calculate mean with decimals', () => {
            expect(mean([10, 20, 30])).toBe(20);
        });

        it('should return 0 for empty array', () => {
            expect(mean([])).toBe(0);
        });

        it('should return 0 for null input', () => {
            expect(mean(null)).toBe(0);
        });

        it('should handle single value', () => {
            expect(mean([42])).toBe(42);
        });
    });

    // min() tests
    describe('min()', () => {
        it('should find minimum value', () => {
            expect(min([5, 3, 8, 1, 9])).toBe(1);
        });

        it('should handle negative numbers', () => {
            expect(min([-5, 3, -8, 1])).toBe(-8);
        });

        it('should return 0 for empty array', () => {
            expect(min([])).toBe(0);
        });

        it('should handle single value', () => {
            expect(min([42])).toBe(42);
        });
    });

    // max() tests
    describe('max()', () => {
        it('should find maximum value', () => {
            expect(max([5, 3, 8, 1, 9])).toBe(9);
        });

        it('should handle negative numbers', () => {
            expect(max([-5, -3, -8, -1])).toBe(-1);
        });

        it('should return 0 for empty array', () => {
            expect(max([])).toBe(0);
        });

        it('should handle single value', () => {
            expect(max([42])).toBe(42);
        });
    });

    // median() tests
    describe('median()', () => {
        it('should calculate median for odd count', () => {
            expect(median([1, 3, 5, 7, 9])).toBe(5);
        });

        it('should calculate median for even count', () => {
            expect(median([1, 3, 5, 7])).toBe(4);
        });

        it('should handle unsorted array', () => {
            expect(median([9, 1, 5, 3, 7])).toBe(5);
        });

        it('should return 0 for empty array', () => {
            expect(median([])).toBe(0);
        });

        it('should handle single value', () => {
            expect(median([42])).toBe(42);
        });

        it('should handle two values', () => {
            expect(median([10, 20])).toBe(15);
        });
    });

    // mode() tests
    describe('mode()', () => {
        it('should find most frequent value', () => {
            expect(mode([1, 2, 2, 3, 3, 3, 4])).toBe(3);
        });

        it('should handle all unique values', () => {
            const result = mode([1, 2, 3, 4, 5]);
            expect([1, 2, 3, 4, 5]).toContain(result);
        });

        it('should return 0 for empty array', () => {
            expect(mode([])).toBe(0);
        });

        it('should handle single value', () => {
            expect(mode([42])).toBe(42);
        });
    });

    // percentile() tests
    describe('percentile()', () => {
        it('should calculate 50th percentile (median)', () => {
            expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
        });

        it('should calculate 0th percentile (min)', () => {
            expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
        });

        it('should calculate 100th percentile (max)', () => {
            expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
        });

        it('should calculate 25th percentile', () => {
            expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 25)).toBeCloseTo(3.25, 1);
        });

        it('should calculate 75th percentile', () => {
            expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 75)).toBeCloseTo(7.75, 1);
        });

        it('should return 0 for empty array', () => {
            expect(percentile([], 50)).toBe(0);
        });

        it('should throw for invalid percentile', () => {
            expect(() => percentile([1, 2, 3], 101)).toThrow();
        });
    });

    // standardDeviation() tests
    describe('standardDeviation()', () => {
        it('should calculate standard deviation', () => {
            expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 0);
        });

        it('should return 0 for single value', () => {
            expect(standardDeviation([42])).toBe(0);
        });

        it('should return 0 for empty array', () => {
            expect(standardDeviation([])).toBe(0);
        });

        it('should return 0 for identical values', () => {
            expect(standardDeviation([5, 5, 5, 5])).toBe(0);
        });
    });

    // calculate() dispatcher tests
    describe('calculate()', () => {
        const testValues = [10, 20, 30, 40, 50];

        it('should dispatch to mean for "average"', () => {
            expect(calculate(testValues, 'average')).toBe(30);
        });

        it('should dispatch to mean for "mean"', () => {
            expect(calculate(testValues, 'mean')).toBe(30);
        });

        it('should dispatch to min for "min"', () => {
            expect(calculate(testValues, 'min')).toBe(10);
        });

        it('should dispatch to max for "max"', () => {
            expect(calculate(testValues, 'max')).toBe(50);
        });

        it('should dispatch to median for "median"', () => {
            expect(calculate(testValues, 'median')).toBe(30);
        });

        it('should dispatch to 25th percentile for "p25"', () => {
            expect(calculate(testValues, 'p25')).toBe(20);
        });

        it('should dispatch to 75th percentile for "p75"', () => {
            expect(calculate(testValues, 'p75')).toBe(40);
        });

        it('should fall back to mean for unknown type', () => {
            expect(calculate(testValues, 'unknown')).toBe(30);
        });
    });
});
