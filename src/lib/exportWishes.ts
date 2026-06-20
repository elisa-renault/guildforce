import { getLocalizedClassName, getLocalizedSpecName, getRolesFromSpecs } from '@/data/wowClasses';
import { interpolateMessage } from '@/i18n/format';
import { Language, Translations } from '@/i18n/translations';
import { MemberWish, ValidationStatus } from '@/types/guild';

const filenameSuffixByLanguage: Partial<Record<Language, string>> = {
  en: 'wishes',
  fr: 'vœux',
  de: 'wuensche',
  es: 'deseos',
  'pt-BR': 'desejos',
  it: 'desideri',
  ru: 'zhelaniya',
  'zh-TW': 'xinyuan',
  ko: 'hui-mang',
};

interface ExportOptions {
  language: Language;
  t: Translations;
  rosterName: string;
  guildName: string;
}

function getLocalizedRoles(specIds: string[], t: Translations): string {
  const roles = getRolesFromSpecs(specIds);
  return roles
    .map((role) => {
      if (role === 'tank' || role === 'healer' || role === 'dps') {
        return t.dashboard[role];
      }
      return role;
    })
    .join(', ');
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

  const statusLabelByStatus: Record<string, string> = {
    confirmed: t.wishes.confirmed,
    potential: t.wishes.potential,
    withdrawn: t.wishes.commitment.withdrawn,
  };
  const validationLabelByStatus: Record<ValidationStatus, string> = {
    pending: t.wishes.validation.pending,
    approved: t.wishes.validation.approved,
    rejected: t.wishes.validation.rejected,
  };

  const headers: string[] = [t.dashboard.player, t.dashboard.commitment];

  for (let i = 1; i <= maxWishes; i++) {
    const wishLabel = interpolateMessage(t.wishes.choiceNumber, { number: i });
    headers.push(
      `${wishLabel} - ${t.profile.characterClass}`,
      `${wishLabel} - ${t.wishes.specs}`,
      `${wishLabel} - ${t.dashboard.rolesByPriority}`,
      `${wishLabel} - ${t.wishes.comment}`,
      `${wishLabel} - ${t.dashboard.validation}`,
    );
  }

  const rows: string[][] = [];

  for (const member of members) {
    const row: string[] = [
      escapeCSV(member.username),
      escapeCSV(statusLabelByStatus[member.status] || member.status),
    ];

    for (let i = 0; i < maxWishes; i++) {
      const wish = member.wishes.find((entry) => entry.choice_index === i + 1);
      if (wish && wish.class_id) {
        row.push(
          escapeCSV(getLocalizedClassName(wish.class_id, language)),
          escapeCSV(wish.spec_ids?.map((specId) => getLocalizedSpecName(specId, language)).join(', ') || ''),
          escapeCSV(getLocalizedRoles(wish.spec_ids || [], t)),
          escapeCSV(wish.comment || ''),
          escapeCSV(validationLabelByStatus[wish.validation_status || 'pending'] || ''),
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
  const filenameSuffix = filenameSuffixByLanguage[language] || filenameSuffixByLanguage.en;
  const filename = `${safeGuildName}-${safeRosterName}-${filenameSuffix}-${date}.csv`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
