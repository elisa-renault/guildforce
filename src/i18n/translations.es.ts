import { createLocaleTranslations } from './createLocaleTranslations';
import type { Translations } from './translations';
import { translationsEn } from './translations.en';

// Placeholder locale pack for progressive rollout; currently falls back to EN copy.
export const translationsEs: Translations = createLocaleTranslations(translationsEn, {
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


