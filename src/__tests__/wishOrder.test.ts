import { describe, expect, it } from 'vitest';

import { moveSpecOrder, resolveSpecOrder } from '@/lib/wishOrder';

describe('resolveSpecOrder', () => {
  it('returns spec_order first and appends remaining specs sorted', () => {
    const result = resolveSpecOrder(['spec-b', 'spec-a', 'spec-c'], ['spec-c', 'spec-a']);
    expect(result).toEqual(['spec-c', 'spec-a', 'spec-b']);
  });

  it('falls back to sorting by spec id when no order is provided', () => {
    const result = resolveSpecOrder(['spec-b', 'spec-a']);
    expect(result).toEqual(['spec-a', 'spec-b']);
  });

  it('ignores unknown spec ids in the order list', () => {
    const result = resolveSpecOrder(['spec-a'], ['spec-x', 'spec-a']);
    expect(result).toEqual(['spec-a']);
  });
});

describe('moveSpecOrder', () => {
  it('moves a spec up or down', () => {
    expect(moveSpecOrder(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveSpecOrder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('returns the same order for out-of-bounds moves', () => {
    expect(moveSpecOrder(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
    expect(moveSpecOrder(['a', 'b'], 1, 3)).toEqual(['a', 'b']);
  });
});
