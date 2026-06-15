export type RosterSelectionErrorKind =
  | 'unauthorized'
  | 'inactiveSeason'
  | 'invalidTarget'
  | 'notFound'
  | 'generic';

interface RosterSelectionErrorLike {
  message?: string | null;
  code?: string | null;
}

export function getRosterSelectionErrorKind(error: unknown): RosterSelectionErrorKind {
  const candidate = error as RosterSelectionErrorLike | null | undefined;
  const message = String(candidate?.message || '').toLowerCase();
  const code = String(candidate?.code || '');

  if (code === '42501' || message.includes('not authorized') || message.includes('not a guild member')) {
    return 'unauthorized';
  }

  if (code === '25006' || message.includes('active season')) {
    return 'inactiveSeason';
  }

  if (
    code === '22023' ||
    message.includes('target') ||
    message.includes('external roster cache')
  ) {
    return 'invalidTarget';
  }

  if (code === 'P0002' || message.includes('not found')) {
    return 'notFound';
  }

  return 'generic';
}

export function getRosterSelectionErrorMessage(
  error: unknown,
  language: string,
  genericFallback: string,
): string {
  const kind = getRosterSelectionErrorKind(error);
  const isFrench = language === 'fr';

  switch (kind) {
    case 'unauthorized':
      return isFrench
        ? 'Vous n’avez pas l’autorisation de modifier cette décision de roster.'
        : 'You are not authorized to update this roster decision.';
    case 'inactiveSeason':
      return isFrench
        ? 'Les décisions de roster ne peuvent être modifiées que sur la saison active.'
        : 'Roster decisions can only be changed for the active season.';
    case 'invalidTarget':
      return isFrench
        ? 'La cible de cette décision de roster n’est plus valide.'
        : 'This roster decision target is no longer valid.';
    case 'notFound':
      return isFrench
        ? 'Le roster ou la saison sélectionnée est introuvable.'
        : 'The selected roster or season could not be found.';
    case 'generic':
    default:
      return genericFallback;
  }
}
