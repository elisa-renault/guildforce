import { createLocaleTranslations } from './createLocaleTranslations';
import type { Translations } from './translations';
import { translationsEn } from './translations.en';

export const translationsZhCn: Translations = createLocaleTranslations(translationsEn, {
  dashboard: {
    selectedValidatedView: '\u5df2\u9a8c\u8bc1\u9635\u5bb9',
    selectedValidatedSubtitle: '\u4ec5\u663e\u793a\u5df2\u786e\u8ba4\u3001\u5df2\u5165\u9009\u9635\u5bb9\u3001\u4e14\u81f3\u5c11\u6709\u4e00\u4e2a\u5df2\u901a\u8fc7\u5fd7\u613f\u7684\u6210\u5458\u3002',
    selectedValidatedSummary: '\u5df2\u786e\u8ba4 | \u5df2\u5165\u9009 | \u5df2\u901a\u8fc7\u5fd7\u613f',
    selectedValidatedEmpty: '\u8be5\u9635\u5bb9\u4e2d\u6ca1\u6709\u5df2\u5165\u9009\u4e14\u62e5\u6709\u5df2\u901a\u8fc7\u5fd7\u613f\u7684\u6210\u5458\u3002',
    selectedValidatedEmptyDescription: '\u6b64\u89c6\u56fe\u4ec5\u663e\u793a\u5df2\u786e\u8ba4\u3001\u5df2\u5165\u9009\u9635\u5bb9\u3001\u4e14\u81f3\u5c11\u6709\u4e00\u4e2a\u5df2\u901a\u8fc7\u5fd7\u613f\u7684\u6210\u5458\u3002',
    selectedValidatedMembersCount: '{{count}}\u540d\u6210\u5458',
    selectedValidatedWishesTotal: '{{count}}\u4e2a\u5df2\u901a\u8fc7\u5fd7\u613f',
    selectedValidatedShowPrimary: '\u4ec5\u663e\u793a\u7b2c\u4e00\u4e2a\u5df2\u901a\u8fc7\u5fd7\u613f',
    selectedValidatedShowAll: '\u663e\u793a\u6240\u6709\u5df2\u901a\u8fc7\u5fd7\u613f',
    selectedValidatedGroupTanks: '\u5766\u514b',
    selectedValidatedGroupHealers: '\u6cbb\u7597',
    selectedValidatedGroupMelee: '\u8fd1\u6218',
    selectedValidatedGroupRanged: '\u8fdc\u7a0b',
    approvedWishSingular: '1\u4e2a\u5df2\u901a\u8fc7\u5fd7\u613f',
    approvedWishPlural: '{{count}}\u4e2a\u5df2\u901a\u8fc7\u5fd7\u613f',
    firstApprovedWish: '\u7b2c\u4e00\u4e2a\u5df2\u901a\u8fc7\u5fd7\u613f',
  },
});

