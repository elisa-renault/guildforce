import { createLocaleTranslations } from './createLocaleTranslations';
import type { Translations } from './translations';
import { translationsEn } from './translations.en';

export const translationsKo: Translations = createLocaleTranslations(translationsEn, {
  commandPalette: {
    title: '명령 팔레트',
    open: '검색 또는 이동...',
    placeholder: '페이지, 길드, 멤버, 투표 검색...',
    placeholderInGuild: '{guild}, 작업, 멤버, 투표 검색...',
    loading: '검색 중...',
    loadingHint: '접근 가능한 공간에서 검색 중입니다.',
    searchUnavailable: '검색 서비스를 사용할 수 없습니다. 로컬 바로가기만 표시됩니다.',
    emptyTitle: '결과 없음',
    emptyDescription: '페이지, 멤버, 길드, 투표, 로스터 또는 작업 이름을 입력해 보세요.',
    usedCount: '{count}회 사용',
    groups: {
      recent: '최근',
      actions: '작업',
      pages: '페이지',
      guilds: '길드',
      members: '멤버',
      rosters: '로스터',
      polls: '투표',
    },
    actions: {
      createPoll: '투표 만들기',
      openRoster: '로스터로 이동',
      editWishes: '내 희망 수정',
      openSettings: '설정 열기',
      syncMembers: '멤버 캐시 동기화',
      openProfile: '내 프로필 열기',
      openAdmin: '관리 열기',
    },
    actionSubtitles: {
      openProfile: '프로필, 캐릭터, 환경설정',
      openAdmin: '사용자, 길드, 모더레이션, 콘텐츠 도구',
      syncMembers: '이 길드의 Battle.net 동기화 설정 열기',
    },
    pageSubtitles: {
      guilds: '길드 워크스페이스 전환 또는 관리',
      profile: '캐릭터, Battle.net, 계정',
      admin: '운영 백오피스',
    },
    badges: {
      main: 'Main',
      linked: '연결됨',
      notLinked: '미연결',
    },
    keyboard: {
      navigate: '이동',
      open: '열기',
      close: '닫기',
    },
  },
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

