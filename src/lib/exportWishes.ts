import { getLocalizedClassName, getLocalizedSpecName, getRolesFromSpecs } from '@/data/wowClasses';
import { interpolateMessage } from '@/i18n/format';
import { Language, Translations } from '@/i18n/translations';
import { MemberWish, ValidationStatus } from '@/types/guild';

type LocalizedValue = { en: string; fr: string } & Partial<Record<Language, string>>;

const roleNames: Record<string, LocalizedValue> = {
  tank: { en: 'Tank', fr: 'Tank' },
  healer: { en: 'Healer', fr: 'Soigneur' },
  dps: { en: 'DPS', fr: 'DPS' },
};

const statusNames: Record<string, LocalizedValue> = {
  confirmed: { en: 'Confirmed', fr: 'Confirme' },
  potential: { en: 'Undecided', fr: 'Indecis' },
  withdrawn: { en: 'Withdrawn', fr: 'Retrait' },
};

const validationNames: Record<ValidationStatus, LocalizedValue> = {
  pending: { en: 'Pending', fr: 'En attente' },
  approved: { en: 'Approved', fr: 'Approuve' },
  rejected: { en: 'Rejected', fr: 'Rejete' },
};

interface ExportOptions {
  language: Language;
  t: Translations;
  rosterName: string;
  guildName: string;
}

function getLocalizedRoles(specIds: string[], lang: Language): string {
  const roles = getRolesFromSpecs(specIds);
  return roles.map((role) => roleNames[role]?.[lang] || roleNames[role]?.en || role).join(', ');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportWishesToCSV(members: MemberWish[], options: ExportOptions): void {
  const { language, rosterName, guildName, t } = options;

  const maxWishes = Math.max(...members.map((member) => member.wishes.length), 0);
  if (maxWishes === 0) {
    return;
  }

  const headers: string[] = [t.auto?.export_player || 'Player', t.auto?.export_commitment || 'Commitment'];

  for (let i = 1; i <= maxWishes; i++) {
    const wishTemplate = t.auto?.export_wish_label || 'Wish {{index}}';
    const wishLabel = interpolateMessage(wishTemplate, { index: i });
    headers.push(
      `${wishLabel} - ${t.auto?.export_class || 'Class'}`,
      `${wishLabel} - ${t.auto?.export_specs || 'Specs'}`,
      `${wishLabel} - ${t.auto?.export_roles || 'Roles'}`,
      `${wishLabel} - ${t.auto?.export_comment || 'Comment'}`,
      `${wishLabel} - ${t.auto?.export_validation || 'Validation'}`,
    );
  }

  const rows: string[][] = [];

  for (const member of members) {
    const row: string[] = [
      escapeCSV(member.username),
      escapeCSV(statusNames[member.status]?.[language] || statusNames[member.status]?.en || member.status),
    ];

    for (let i = 0; i < maxWishes; i++) {
      const wish = member.wishes.find((entry) => entry.choice_index === i + 1);
      if (wish && wish.class_id) {
        row.push(
          escapeCSV(getLocalizedClassName(wish.class_id, language)),
          escapeCSV(wish.spec_ids?.map((specId) => getLocalizedSpecName(specId, language)).join(', ') || ''),
          escapeCSV(getLocalizedRoles(wish.spec_ids || [], language)),
          escapeCSV(wish.comment || ''),
          escapeCSV(
            validationNames[wish.validation_status || 'pending']?.[language] ||
              validationNames[wish.validation_status || 'pending']?.en ||
              '',
          ),
        );
      } else {
        row.push('', '', '', '', '');
      }
    }

    rows.push(row);
  }

  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const date = new Date().toISOString().split('T')[0];
  const safeGuildName = guildName.replace(/[^a-zA-Z0-9-_]/g, '-');
  const safeRosterName = rosterName.replace(/[^a-zA-Z0-9-_]/g, '-');
  const filenameSuffix = t.auto?.export_filename_suffix || 'wishes';
  const filename = `${safeGuildName}-${safeRosterName}-${filenameSuffix}-${date}.csv`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
