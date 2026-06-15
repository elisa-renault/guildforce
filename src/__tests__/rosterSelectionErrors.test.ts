import { describe, expect, it } from 'vitest';

import {
  getRosterSelectionErrorKind,
  getRosterSelectionErrorMessage,
} from '@/lib/rosterSelectionErrors';

describe('rosterSelectionErrors', () => {
  it('maps expected RPC errors to stable categories', () => {
    expect(getRosterSelectionErrorKind({ code: '42501', message: 'Not authorized' })).toBe('unauthorized');
    expect(getRosterSelectionErrorKind({ code: '25006', message: 'Inactive season' })).toBe('inactiveSeason');
    expect(getRosterSelectionErrorKind({ code: '22023', message: 'Invalid target' })).toBe('invalidTarget');
    expect(getRosterSelectionErrorKind({ code: 'P0002', message: 'Roster not found' })).toBe('notFound');
  });

  it('returns localized user-facing messages with generic fallback', () => {
    expect(getRosterSelectionErrorMessage({ code: '25006' }, 'fr', 'Fallback')).toContain('saison active');
    expect(getRosterSelectionErrorMessage({ code: '22023' }, 'en', 'Fallback')).toContain('target');
    expect(getRosterSelectionErrorMessage({ code: '99999' }, 'fr', 'Fallback')).toBe('Fallback');
  });
});
