import { describe, expect, it } from 'vitest';

import { splitHeroTitleForEffect } from '@/lib/heroTitle';

describe('splitHeroTitleForEffect', () => {
  it('keeps the existing word-based split for space-separated titles', () => {
    expect(splitHeroTitleForEffect('Plan your raid roster for the next season')).toEqual({
      plain: 'Plan your',
      accent: 'raid roster for the next season',
    });
  });

  it('splits Traditional Chinese titles so gradient text still renders', () => {
    expect(splitHeroTitleForEffect('規劃下一個賽季的團隊副本名單')).toEqual({
      plain: '規劃下一個賽季的',
      accent: '團隊副本名單',
    });
  });

});
