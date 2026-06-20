import type { Translations } from '@/i18n/translations';

type ActivityLogLabels = Translations['activityLog'];

export function buildVaultAuditDetails(
  actionContext: Record<string, unknown>,
  labels: Pick<
    ActivityLogLabels,
    'detailReasonGiven' | 'detailSurface' | 'detailVersion' | 'auditSurfaces'
  >,
) {
  const details: string[] = [];

  if (actionContext.reason_provided === true) {
    details.push(labels.detailReasonGiven);
  }

  if (typeof actionContext.client_surface === 'string' && actionContext.client_surface.trim()) {
    const surface = actionContext.client_surface.trim();
    details.push(`${labels.detailSurface}: ${labels.auditSurfaces[surface] || surface}`);
  }

  if (typeof actionContext.version_number === 'number') {
    details.push(`${labels.detailVersion} ${actionContext.version_number}`);
  }

  return details.join(' \u2022 ') || '\u2014';
}

export function getVaultAuditActionLabel(
  actionType: string,
  labels: Pick<
    ActivityLogLabels,
    | 'vaultSecretCreated'
    | 'vaultSecretRevealed'
    | 'vaultSecretArchived'
    | 'vaultSecretRotated'
    | 'vaultAccessUpdated'
  >,
) {
  switch (actionType) {
    case 'created':
      return labels.vaultSecretCreated;
    case 'revealed':
      return labels.vaultSecretRevealed;
    case 'archived':
      return labels.vaultSecretArchived;
    case 'rotated':
      return labels.vaultSecretRotated;
    case 'updated':
      return labels.vaultAccessUpdated;
    default:
      return actionType;
  }
}
