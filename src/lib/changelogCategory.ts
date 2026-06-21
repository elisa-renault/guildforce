export type PatchCategory = 'Feature' | 'Update' | 'Bugfix';

export const getChangelogCategory = (title: string, content: string): PatchCategory => {
  const normalizedTitle = title.toLowerCase();
  const normalizedContent = content.toLowerCase();

  if (/\bbugfix\b/.test(normalizedTitle) || /^fix(es)?\b/.test(normalizedTitle)) {
    return 'Bugfix';
  }

  if (/\b(feature|pack|overhaul|launch|foundations|management|planning|localization|translation|ux|atlas|roster|poll)\b/.test(normalizedTitle)) {
    return 'Feature';
  }

  if (/\b(hardening|maintenance|sync|update|improvements?)\b/.test(normalizedTitle)) {
    return 'Update';
  }

  const bugfixSignals = normalizedContent.match(/\b(fixed|bugfix|regression|crash)\b/g)?.length || 0;
  const featureSignals = normalizedContent.match(/\b(added|new|introduces|support|feature|editor|workflow)\b/g)?.length || 0;

  if (bugfixSignals >= 3 && bugfixSignals > featureSignals) {
    return 'Bugfix';
  }

  if (featureSignals > 0) {
    return 'Feature';
  }

  return 'Update';
};
