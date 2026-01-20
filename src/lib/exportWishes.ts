import { MemberWish, ValidationStatus } from '@/types/guild';
import { getClassById, getSpecById, getRolesFromSpecs } from '@/data/wowClasses';
import { Language } from '@/i18n/translations';

// Localized class names
const classNames: Record<string, Record<Language, string>> = {
  warrior: { en: 'Warrior', fr: 'Guerrier' },
  paladin: { en: 'Paladin', fr: 'Paladin' },
  hunter: { en: 'Hunter', fr: 'Chasseur' },
  rogue: { en: 'Rogue', fr: 'Voleur' },
  priest: { en: 'Priest', fr: 'Prêtre' },
  shaman: { en: 'Shaman', fr: 'Chaman' },
  mage: { en: 'Mage', fr: 'Mage' },
  warlock: { en: 'Warlock', fr: 'Démoniste' },
  monk: { en: 'Monk', fr: 'Moine' },
  druid: { en: 'Druid', fr: 'Druide' },
  'demon-hunter': { en: 'Demon Hunter', fr: 'Chasseur de démons' },
  'death-knight': { en: 'Death Knight', fr: 'Chevalier de la mort' },
  evoker: { en: 'Evoker', fr: 'Évocateur' },
};

// Localized spec names
const specNames: Record<string, Record<Language, string>> = {
  // Warrior
  'warrior-arms': { en: 'Arms', fr: 'Armes' },
  'warrior-fury': { en: 'Fury', fr: 'Fureur' },
  'warrior-protection': { en: 'Protection', fr: 'Protection' },
  // Paladin
  'paladin-holy': { en: 'Holy', fr: 'Sacré' },
  'paladin-protection': { en: 'Protection', fr: 'Protection' },
  'paladin-retribution': { en: 'Retribution', fr: 'Vindicte' },
  // Hunter
  'hunter-beast-mastery': { en: 'Beast Mastery', fr: 'Maîtrise des bêtes' },
  'hunter-marksmanship': { en: 'Marksmanship', fr: 'Précision' },
  'hunter-survival': { en: 'Survival', fr: 'Survie' },
  'hunter-pack-leader': { en: 'Pack Leader', fr: 'Chef de meute' },
  // Rogue
  'rogue-assassination': { en: 'Assassination', fr: 'Assassinat' },
  'rogue-outlaw': { en: 'Outlaw', fr: 'Hors-la-loi' },
  'rogue-subtlety': { en: 'Subtlety', fr: 'Finesse' },
  // Priest
  'priest-discipline': { en: 'Discipline', fr: 'Discipline' },
  'priest-holy': { en: 'Holy', fr: 'Sacré' },
  'priest-shadow': { en: 'Shadow', fr: 'Ombre' },
  // Shaman
  'shaman-elemental': { en: 'Elemental', fr: 'Élémentaire' },
  'shaman-enhancement': { en: 'Enhancement', fr: 'Amélioration' },
  'shaman-restoration': { en: 'Restoration', fr: 'Restauration' },
  // Mage
  'mage-arcane': { en: 'Arcane', fr: 'Arcanes' },
  'mage-fire': { en: 'Fire', fr: 'Feu' },
  'mage-frost': { en: 'Frost', fr: 'Givre' },
  // Warlock
  'warlock-affliction': { en: 'Affliction', fr: 'Affliction' },
  'warlock-demonology': { en: 'Demonology', fr: 'Démonologie' },
  'warlock-destruction': { en: 'Destruction', fr: 'Destruction' },
  // Monk
  'monk-brewmaster': { en: 'Brewmaster', fr: 'Maître brasseur' },
  'monk-mistweaver': { en: 'Mistweaver', fr: 'Tisse-brume' },
  'monk-windwalker': { en: 'Windwalker', fr: 'Marche-vent' },
  // Druid
  'druid-balance': { en: 'Balance', fr: 'Équilibre' },
  'druid-feral': { en: 'Feral', fr: 'Féral' },
  'druid-guardian': { en: 'Guardian', fr: 'Gardien' },
  'druid-restoration': { en: 'Restoration', fr: 'Restauration' },
  'druid-elune': { en: 'Elune', fr: 'Elune' },
  // Demon Hunter
  'demon-hunter-havoc': { en: 'Havoc', fr: 'Dévastation' },
  'demon-hunter-vengeance': { en: 'Vengeance', fr: 'Vengeance' },
  'demon-hunter-devourer': { en: 'Devourer', fr: 'Dévoreur' },
  // Death Knight
  'death-knight-blood': { en: 'Blood', fr: 'Sang' },
  'death-knight-frost': { en: 'Frost', fr: 'Givre' },
  'death-knight-unholy': { en: 'Unholy', fr: 'Impie' },
  // Evoker
  'evoker-devastation': { en: 'Devastation', fr: 'Dévastation' },
  'evoker-preservation': { en: 'Preservation', fr: 'Préservation' },
  'evoker-augmentation': { en: 'Augmentation', fr: 'Augmentation' },
};

const roleNames: Record<string, Record<Language, string>> = {
  tank: { en: 'Tank', fr: 'Tank' },
  healer: { en: 'Healer', fr: 'Soigneur' },
  dps: { en: 'DPS', fr: 'DPS' },
};

const statusNames: Record<string, Record<Language, string>> = {
  confirmed: { en: 'Confirmed', fr: 'Confirmé' },
  potential: { en: 'Undecided', fr: 'Indécis' },
  withdrawn: { en: 'Withdrawn', fr: 'Retrait' },
};

const validationNames: Record<ValidationStatus, Record<Language, string>> = {
  pending: { en: 'Pending', fr: 'En attente' },
  approved: { en: 'Approved', fr: 'Approuvé' },
  rejected: { en: 'Rejected', fr: 'Rejeté' },
};

interface ExportOptions {
  language: Language;
  rosterName: string;
  guildName: string;
}

function getLocalizedClassName(classId: string, lang: Language): string {
  const localized = classNames[classId]?.[lang];
  if (localized) return localized;
  const wowClass = getClassById(classId);
  return wowClass?.name?.[lang] ?? wowClass?.name?.en ?? classId;
}

function getLocalizedSpecName(specId: string, lang: Language): string {
  const localized = specNames[specId]?.[lang];
  if (localized) return localized;
  const spec = getSpecById(specId);
  return spec?.name?.[lang] ?? spec?.name?.en ?? specId;
}

function getLocalizedRoles(specIds: string[], lang: Language): string {
  const roles = getRolesFromSpecs(specIds);
  return roles.map(r => roleNames[r]?.[lang] || r).join(', ');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportWishesToCSV(members: MemberWish[], options: ExportOptions): void {
  const { language, rosterName, guildName } = options;
  const isFr = language === 'fr';

  // Find max wishes count
  const maxWishes = Math.max(...members.map(m => m.wishes.length), 0);
  if (maxWishes === 0) {
    return;
  }

  // Build headers
  const headers: string[] = [
    isFr ? 'Joueur' : 'Player',
    isFr ? 'Engagement' : 'Commitment',
  ];

  for (let i = 1; i <= maxWishes; i++) {
    const wishLabel = isFr ? `Vœu ${i}` : `Wish ${i}`;
    headers.push(
      `${wishLabel} - ${isFr ? 'Classe' : 'Class'}`,
      `${wishLabel} - ${isFr ? 'Spécialisations' : 'Specs'}`,
      `${wishLabel} - ${isFr ? 'Rôles' : 'Roles'}`,
      `${wishLabel} - ${isFr ? 'Commentaire' : 'Comment'}`,
      `${wishLabel} - ${isFr ? 'Validation' : 'Validation'}`
    );
  }

  // Build rows
  const rows: string[][] = [];

  for (const member of members) {
    const row: string[] = [
      escapeCSV(member.username),
      escapeCSV(statusNames[member.status]?.[language] || member.status),
    ];

    for (let i = 0; i < maxWishes; i++) {
      const wish = member.wishes.find(w => w.choice_index === i + 1);
      if (wish && wish.class_id) {
        row.push(
          escapeCSV(getLocalizedClassName(wish.class_id, language)),
          escapeCSV(wish.spec_ids?.map(s => getLocalizedSpecName(s, language)).join(', ') || ''),
          escapeCSV(getLocalizedRoles(wish.spec_ids || [], language)),
          escapeCSV(wish.comment || ''),
          escapeCSV(validationNames[wish.validation_status || 'pending']?.[language] || '')
        );
      } else {
        row.push('', '', '', '', '');
      }
    }

    rows.push(row);
  }

  // Build CSV content with BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Format filename
  const date = new Date().toISOString().split('T')[0];
  const safeGuildName = guildName.replace(/[^a-zA-Z0-9-_]/g, '-');
  const safeRosterName = rosterName.replace(/[^a-zA-Z0-9-_]/g, '-');
  const filename = `${safeGuildName}-${safeRosterName}-${isFr ? 'voeux' : 'wishes'}-${date}.csv`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
