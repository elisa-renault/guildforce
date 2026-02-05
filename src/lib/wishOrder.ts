export const resolveSpecOrder = (specIds: string[] = [], specOrder?: string[] | null): string[] => {
  const uniqueSpecIds = Array.from(new Set((specIds || []).filter(Boolean)));
  if (!specOrder || specOrder.length === 0) {
    return [...uniqueSpecIds].sort((a, b) => a.localeCompare(b));
  }

  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const specId of specOrder) {
    if (!specId || seen.has(specId)) continue;
    if (uniqueSpecIds.includes(specId)) {
      ordered.push(specId);
      seen.add(specId);
    }
  }

  const remaining = uniqueSpecIds
    .filter((specId) => !seen.has(specId))
    .sort((a, b) => a.localeCompare(b));

  return [...ordered, ...remaining];
};

export const moveSpecOrder = (specIds: string[], fromIndex: number, toIndex: number): string[] => {
  if (fromIndex === toIndex) return [...specIds];
  if (fromIndex < 0 || fromIndex >= specIds.length) return [...specIds];
  if (toIndex < 0 || toIndex >= specIds.length) return [...specIds];

  const next = [...specIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};
