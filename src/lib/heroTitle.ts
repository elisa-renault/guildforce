export const splitHeroTitleForEffect = (title: string): { plain: string; accent: string } => {
  const normalized = title.trim().replace(/\s+/g, ' ');
  const words = normalized.split(' ').filter(Boolean);

  if (words.length > 2) {
    return {
      plain: words.slice(0, 2).join(' '),
      accent: words.slice(2).join(' '),
    };
  }

  const cjkPossessiveIndex = Math.max(normalized.lastIndexOf('的'), normalized.lastIndexOf('之'));
  if (cjkPossessiveIndex > 0 && cjkPossessiveIndex < normalized.length - 1) {
    return {
      plain: normalized.slice(0, cjkPossessiveIndex + 1),
      accent: normalized.slice(cjkPossessiveIndex + 1),
    };
  }

  const graphemes = Array.from(normalized);
  const splitIndex = Math.ceil(graphemes.length / 2);

  return {
    plain: graphemes.slice(0, splitIndex).join(''),
    accent: graphemes.slice(splitIndex).join(''),
  };
};
