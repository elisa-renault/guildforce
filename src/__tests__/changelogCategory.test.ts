import { describe, expect, it } from 'vitest';

import { getChangelogCategory } from '@/lib/changelogCategory';

describe('getChangelogCategory', () => {
  it('treats feature-pack titles as features even if content mentions fixes', () => {
    expect(getChangelogCategory(
      'Poll Results and Access Overhaul',
      'Several response recovery and protection fixes prevent accidental poll response loss.',
    )).toBe('Feature');
  });

  it('does not classify old mixed improvement releases as bugfixes only because the title contains fix', () => {
    expect(getChangelogCategory(
      'First Alpha Release - Fix & Improvements',
      'Initial release with fixes and improvements.',
    )).toBe('Update');
  });

  it('classifies explicit bugfix titles as bugfixes', () => {
    expect(getChangelogCategory('Bugfix: Poll response recovery', '')).toBe('Bugfix');
    expect(getChangelogCategory('Fixes to CD plans, templates, setups and navigation', '')).toBe('Bugfix');
  });

  it('classifies translation and UX release titles as features', () => {
    expect(getChangelogCategory('Translations, Polls & UX', 'Fixed copy and improved polls.')).toBe('Feature');
  });
});
