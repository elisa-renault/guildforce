import { createLocaleTranslations } from './createLocaleTranslations';
import type { Translations } from './translations';
import { translationsEn } from './translations.en';

// Placeholder locale pack for progressive rollout; currently falls back to EN copy.
export const translationsPtBr: Translations = createLocaleTranslations(translationsEn, {
  commandPalette: {
    title: 'Paleta de comandos',
    open: 'Buscar ou ir para...',
    placeholder: 'Buscar páginas, guildas, membros, enquetes...',
    placeholderInGuild: 'Buscar em {guild}, ações, membros, enquetes...',
    loading: 'Buscando...',
    loadingHint: 'Buscando nos espaços que você pode acessar.',
    searchUnavailable: 'Busca indisponível. Mostrando apenas atalhos locais.',
    emptyTitle: 'Nenhum resultado',
    emptyDescription: 'Tente uma página, membro, guilda, enquete, roster ou ação.',
    usedCount: 'Usado {count} vezes',
    groups: {
      recent: 'Recentes',
      actions: 'Ações',
      pages: 'Páginas',
      guilds: 'Guildas',
      members: 'Membros',
      rosters: 'Rosters',
      polls: 'Enquetes',
    },
    actions: {
      createPoll: 'Criar enquete',
      openRoster: 'Ir para o roster',
      editWishes: 'Editar meus desejos',
      openSettings: 'Abrir configurações',
      syncMembers: 'Sincronizar membros',
      openProfile: 'Abrir meu perfil',
      openAdmin: 'Abrir admin',
    },
    actionSubtitles: {
      openProfile: 'Perfil, personagens e preferências',
      openAdmin: 'Usuários, guildas, moderação e conteúdo',
      syncMembers: 'Abre as configurações Battle.net desta guilda',
    },
    pageSubtitles: {
      guilds: 'Alternar ou gerenciar workspaces de guilda',
      profile: 'Personagens, Battle.net e conta',
      admin: 'Back office operacional',
    },
    badges: {
      main: 'Main',
      linked: 'Vinculado',
      notLinked: 'Não vinculado',
    },
    keyboard: {
      navigate: 'Navegar',
      open: 'Abrir',
      close: 'Fechar',
    },
  },
  dashboard: {
    selectedValidatedView: 'Sele\u00e7\u00e3o validada',
    selectedValidatedSubtitle: 'Membros confirmados, selecionados para o roster, com pelo menos um desejo aprovado.',
    selectedValidatedSummary: 'Confirmados | Selecionado(a) | Desejos aprovados',
    selectedValidatedEmpty: 'Nenhum membro selecionado com desejos aprovados neste roster.',
    selectedValidatedEmptyDescription: 'Esta visualiza\u00e7\u00e3o mostra apenas membros confirmados, selecionados para o roster e com pelo menos um desejo aprovado.',
    selectedValidatedMembersCount: '{{count}} membros',
    selectedValidatedWishesTotal: '{{count}} desejos aprovados',
    selectedValidatedShowPrimary: 'Somente o 1\u00ba desejo aprovado',
    selectedValidatedShowAll: 'Mostrar todos os desejos aprovados',
    selectedValidatedGroupTanks: 'Tanks',
    selectedValidatedGroupHealers: 'Healers',
    selectedValidatedGroupMelee: 'Corpo a corpo',
    selectedValidatedGroupRanged: '\u00c0 dist\u00e2ncia',
    approvedWishSingular: '1 desejo aprovado',
    approvedWishPlural: '{{count}} desejos aprovados',
    firstApprovedWish: '1\u00ba desejo aprovado',
  },
  wishes: {
    rosterDecision: {
      selected: 'Selecionado(a)',
      bench: 'Reserva',
      notSelected: 'N\u00e3o selecionado(a)',
      undecided: 'Indeciso(a)',
    },
  },
});


