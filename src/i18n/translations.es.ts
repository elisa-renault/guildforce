import { createLocaleTranslations } from './createLocaleTranslations';
import type { Translations } from './translations';
import { translationsEn } from './translations.en';

// Placeholder locale pack for progressive rollout; currently falls back to EN copy.
export const translationsEs: Translations = createLocaleTranslations(translationsEn, {
  home: {
    subtitle: 'Planifica tu roster de banda para la próxima temporada',
  },
  commandPalette: {
    title: 'Paleta de comandos',
    open: 'Buscar o ir a...',
    placeholder: 'Buscar páginas, hermandades, miembros, encuestas...',
    placeholderInGuild: 'Buscar en {guild}, acciones, miembros, encuestas...',
    loading: 'Buscando...',
    loadingHint: 'Buscando en los espacios a los que tienes acceso.',
    searchUnavailable: 'Búsqueda no disponible. Solo se muestran accesos locales.',
    emptyTitle: 'Sin resultados',
    emptyDescription: 'Prueba con una página, miembro, hermandad, encuesta, roster o acción.',
    usedCount: 'Usado {count} veces',
    groups: {
      recent: 'Reciente',
      actions: 'Acciones',
      pages: 'Páginas',
      guilds: 'Hermandades',
      members: 'Miembros',
      rosters: 'Rosters',
      polls: 'Encuestas',
    },
    actions: {
      createPoll: 'Crear encuesta',
      openRoster: 'Ir al roster',
      editWishes: 'Editar mis deseos',
      openSettings: 'Abrir ajustes',
      syncMembers: 'Sincronizar miembros',
      openProfile: 'Abrir mi perfil',
      openAdmin: 'Abrir administración',
    },
    actionSubtitles: {
      openProfile: 'Perfil, personajes y preferencias',
      openAdmin: 'Usuarios, hermandades, moderación y contenido',
      syncMembers: 'Abre los ajustes de sincronización Battle.net',
    },
    pageSubtitles: {
      guilds: 'Cambiar o gestionar tus workspaces de hermandad',
      profile: 'Personajes, Battle.net y cuenta',
      admin: 'Back office operativo',
    },
    badges: {
      main: 'Main',
      linked: 'Vinculado',
      notLinked: 'Sin vincular',
    },
    keyboard: {
      navigate: 'Navegar',
      open: 'Abrir',
      close: 'Cerrar',
    },
  },
  dashboard: {
    selectedValidatedView: 'Selecci\u00f3n validada',
    selectedValidatedSubtitle: 'Miembros confirmados, seleccionados para el roster, con al menos un deseo aprobado.',
    selectedValidatedSummary: 'Confirmados | Seleccionado/a | Deseos aprobados',
    selectedValidatedEmpty: 'No hay miembros seleccionados con deseos aprobados en este roster.',
    selectedValidatedEmptyDescription: 'Esta vista muestra solo miembros confirmados, seleccionados para el roster y con al menos un deseo aprobado.',
    selectedValidatedMembersCount: '{{count}} miembros',
    selectedValidatedWishesTotal: '{{count}} deseos aprobados',
    selectedValidatedShowPrimary: 'Solo el 1er deseo aprobado',
    selectedValidatedShowAll: 'Mostrar todos los deseos aprobados',
    selectedValidatedGroupTanks: 'Tanks',
    selectedValidatedGroupHealers: 'Heals',
    selectedValidatedGroupMelee: 'Melee',
    selectedValidatedGroupRanged: 'Distancia',
    approvedWishSingular: '1 deseo aprobado',
    approvedWishPlural: '{{count}} deseos aprobados',
    firstApprovedWish: '1er deseo aprobado',
  },
  wishes: {
    rosterDecision: {
      selected: 'Seleccionado/a',
      bench: 'Suplente',
      notSelected: 'No seleccionado/a',
      undecided: 'Indeciso/a',
    },
  },
});

