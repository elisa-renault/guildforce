import { describe, expect, it } from 'vitest';

import {
  formatPercentValue,
  formatSignedPercentDelta,
  getDeltaColorClass,
} from '../adminDashboardMetrics';

describe('adminDashboardMetrics', () => {
  it('formats percent values with configured precision', () => {
    expect(formatPercentValue(65.4321, 1)).toBe('65.4%');
    expect(formatPercentValue(10, 0)).toBe('10%');
    expect(formatPercentValue(null)).toBe('-');
  });

  it('formats signed deltas with compact precision', () => {
    expect(formatSignedPercentDelta(12.34)).toBe('+12%');
    expect(formatSignedPercentDelta(1.24)).toBe('+1.2%');
    expect(formatSignedPercentDelta(-2.26)).toBe('-2.3%');
    expect(formatSignedPercentDelta(null)).toBeNull();
  });

  it('returns semantic color classes for delta values', () => {
    expect(getDeltaColorClass(3)).toBe('text-emerald-400');
    expect(getDeltaColorClass(-1)).toBe('text-red-400');
    expect(getDeltaColorClass(0)).toBe('text-muted-foreground');
    expect(getDeltaColorClass(null)).toBe('text-muted-foreground');
  });
});
