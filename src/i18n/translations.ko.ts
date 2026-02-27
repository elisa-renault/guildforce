import { createLocaleTranslations } from './createLocaleTranslations';
import type { Translations } from './translations';
import { translationsEn } from './translations.en';

export const translationsKo: Translations = createLocaleTranslations(translationsEn, {
  dashboard: {
    selectedValidatedView: '\uac80\uc99d\ub41c \uc120\ud0dd',
    selectedValidatedSubtitle: '\ud655\uc815 \uc0c1\ud0dc\uc774\uba70 \ub85c\uc2a4\ud130\uc5d0 \uc120\ubc1c\ub418\uc5c8\uace0, \uc2b9\uc778\ub41c \ud76c\ub9dd\uc774 \ud558\ub098 \uc774\uc0c1 \uc788\ub294 \uba64\ubc84\ub9cc \ud45c\uc2dc\ud569\ub2c8\ub2e4.',
    selectedValidatedSummary: '\ud655\uc815 | \uc120\ubc1c\ub428 | \uc2b9\uc778\ub41c \ud76c\ub9dd',
    selectedValidatedEmpty: '\uc774 \ub85c\uc2a4\ud130\uc5d0\ub294 \uc2b9\uc778\ub41c \ud76c\ub9dd\uc774 \uc788\ub294 \uc120\ubc1c \uba64\ubc84\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.',
    selectedValidatedEmptyDescription: '\uc774 \ubcf4\uae30\ub294 \ud655\uc815 \uc0c1\ud0dc\uc774\uace0 \ub85c\uc2a4\ud130\uc5d0 \uc120\ubc1c\ub418\uc5c8\uc73c\uba70 \uc2b9\uc778\ub41c \ud76c\ub9dd\uc774 \ud558\ub098 \uc774\uc0c1 \uc788\ub294 \uba64\ubc84\ub9cc \ubcf4\uc5ec\uc90d\ub2c8\ub2e4.',
    selectedValidatedMembersCount: '{{count}}\uba85',
    selectedValidatedWishesTotal: '\uc2b9\uc778\ub41c \ud76c\ub9dd {{count}}\uac1c',
    selectedValidatedShowPrimary: '\uccab \uc2b9\uc778 \ud76c\ub9dd\ub9cc',
    selectedValidatedShowAll: '\ubaa8\ub4e0 \uc2b9\uc778 \ud76c\ub9dd \ubcf4\uae30',
    selectedValidatedGroupTanks: '\ud0f1\ucee4',
    selectedValidatedGroupHealers: '\ud790\ub7ec',
    selectedValidatedGroupMelee: '\uadfc\uc811',
    selectedValidatedGroupRanged: '\uc6d0\uac70\ub9ac',
    approvedWishSingular: '\uc2b9\uc778\ub41c \ud76c\ub9dd 1\uac1c',
    approvedWishPlural: '\uc2b9\uc778\ub41c \ud76c\ub9dd {{count}}\uac1c',
    firstApprovedWish: '\uccab \uc2b9\uc778 \ud76c\ub9dd',
  },
});

