import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SecretKind = 'credential' | 'token' | 'note' | 'recovery_code';
type SecretCapability = 'metadata' | 'reveal' | 'manage' | 'audit';
type AccessType = 'user' | 'rank';
type AdminClient = ReturnType<typeof createClient>;

type GuildSecretPayload =
  | { username: string; password: string }
  | { token: string }
  | { value: string }
  | { codes: string[] };

interface SecretAccessRuleInput {
  capability: SecretCapability;
  access_type: AccessType;
  user_id?: string | null;
  min_rank_index?: number | null;
  max_rank_index?: number | null;
}

interface SecretMetadataInput {
  guild_id?: string;
  label?: string;
  service_name?: string;
  secret_kind?: SecretKind;
  illustration_url?: string | null;
  service_url?: string | null;
  login_identifier_hint?: string | null;
  description?: string | null;
  requires_reason?: boolean;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function decodeBase64(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function importEncryptionKey(rawKey: string): Promise<CryptoKey> {
  let keyBytes: Uint8Array;

  try {
    keyBytes = decodeBase64(rawKey);
  } catch {
    keyBytes = new TextEncoder().encode(rawKey);
  }

  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

function isSecretKind(value: unknown): value is SecretKind {
  return ['credential', 'token', 'note', 'recovery_code'].includes(String(value));
}

function maskTail(value: string): string {
  if (!value) return '****';
  const suffix = value.slice(-4);
  return `****${suffix}`;
}

function buildPreviewMask(kind: SecretKind, payload: GuildSecretPayload): string {
  switch (kind) {
    case 'credential':
      return maskTail((payload as { username: string; password: string }).password);
    case 'token':
      return maskTail((payload as { token: string }).token);
    case 'note':
      return maskTail((payload as { value: string }).value);
    case 'recovery_code':
      return `codes:${(payload as { codes: string[] }).codes.length}`;
    default:
      return '****';
  }
}

function normalizePayload(kind: SecretKind, payload: unknown): GuildSecretPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Missing secret payload');
  }

  switch (kind) {
    case 'credential': {
      const username = typeof (payload as { username?: unknown }).username === 'string'
        ? (payload as { username: string }).username.trim()
        : '';
      const password = typeof (payload as { password?: unknown }).password === 'string'
        ? (payload as { password: string }).password
        : '';
      if (!password) throw new Error('Credential payload requires a password');
      return { username, password };
    }
    case 'token': {
      const token = typeof (payload as { token?: unknown }).token === 'string'
        ? (payload as { token: string }).token
        : '';
      if (!token) throw new Error('Token payload requires a token value');
      return { token };
    }
    case 'note': {
      const value = typeof (payload as { value?: unknown }).value === 'string'
        ? (payload as { value: string }).value
        : '';
      if (!value) throw new Error('Note payload requires a value');
      return { value };
    }
    case 'recovery_code': {
      const codes = Array.isArray((payload as { codes?: unknown[] }).codes)
        ? (payload as { codes: unknown[] }).codes
            .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
            .map((entry) => entry.trim())
        : [];
      if (codes.length === 0) throw new Error('Recovery code payload requires at least one code');
      return { codes };
    }
    default:
      throw new Error('Unsupported secret kind');
  }
}

function normalizeMetadata(input: SecretMetadataInput, requireGuildId = false): Required<SecretMetadataInput> {
  const guildId = typeof input.guild_id === 'string' ? input.guild_id : '';
  const label = typeof input.label === 'string' ? input.label.trim() : '';
  const serviceName = typeof input.service_name === 'string' ? input.service_name.trim() : '';
  const secretKind = input.secret_kind;

  if (requireGuildId && !guildId) throw new Error('Missing guild_id');
  if (!label) throw new Error('Missing label');
  if (!serviceName) throw new Error('Missing service_name');
  if (!isSecretKind(secretKind)) throw new Error('Invalid secret_kind');

  const serviceUrl = typeof input.service_url === 'string' && input.service_url.trim()
    ? input.service_url.trim()
    : null;
  const illustrationUrl = typeof input.illustration_url === 'string' && input.illustration_url.trim()
    ? input.illustration_url.trim()
    : null;
  const loginIdentifierHint = typeof input.login_identifier_hint === 'string' && input.login_identifier_hint.trim()
    ? input.login_identifier_hint.trim()
    : null;
  const description = typeof input.description === 'string' && input.description.trim()
    ? input.description.trim()
    : null;

  return {
    guild_id: guildId,
    label,
    service_name: serviceName,
    secret_kind: secretKind,
    illustration_url: illustrationUrl,
    service_url: serviceUrl,
    login_identifier_hint: loginIdentifierHint,
    description,
    requires_reason: Boolean(input.requires_reason),
  };
}

function normalizeAccessRules(value: unknown): SecretAccessRuleInput[] {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid access rule');
    }

    const capability = (entry as { capability?: unknown }).capability;
    const accessType = (entry as { access_type?: unknown }).access_type;

    if (!['metadata', 'reveal', 'manage', 'audit'].includes(String(capability))) {
      throw new Error('Invalid access rule capability');
    }

    if (!['user', 'rank'].includes(String(accessType))) {
      throw new Error('Invalid access rule access_type');
    }

    if (accessType === 'user') {
      const userId = typeof (entry as { user_id?: unknown }).user_id === 'string'
        ? (entry as { user_id: string }).user_id
        : '';
      if (!userId) throw new Error('User access rules require user_id');
      return {
        capability: capability as SecretCapability,
        access_type: 'user',
        user_id: userId,
      };
    }

    const maxRankIndex = Number((entry as { max_rank_index?: unknown }).max_rank_index);
    const minRankIndexRaw = (entry as { min_rank_index?: unknown }).min_rank_index;
    const minRankIndex = typeof minRankIndexRaw === 'number' ? minRankIndexRaw : 0;

    if (!Number.isInteger(maxRankIndex) || maxRankIndex < 0) {
      throw new Error('Rank access rules require max_rank_index');
    }

    return {
      capability: capability as SecretCapability,
      access_type: 'rank',
      min_rank_index: minRankIndex,
      max_rank_index: maxRankIndex,
    };
  });
}

async function encryptPayload(key: CryptoKey, payload: GuildSecretPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    encryptedPayload: encodeBase64(new Uint8Array(encrypted)),
    iv: encodeBase64(iv),
  };
}

async function decryptPayload(
  key: CryptoKey,
  encryptedPayload: string,
  iv: string,
): Promise<GuildSecretPayload> {
  const ciphertext = decodeBase64(encryptedPayload);
  const ivBytes = decodeBase64(iv);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ciphertext,
  );
  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text) as GuildSecretPayload;
}

async function canManageVault(supabaseAdmin: AdminClient, guildId: string, userId: string): Promise<boolean> {
  const [{ data: isGm, error: gmError }, { data: hasManage, error: permError }] = await Promise.all([
    supabaseAdmin.rpc('is_guild_gm', { p_guild_id: guildId, p_user_id: userId }),
    supabaseAdmin.rpc('has_guild_permission', {
      p_guild_id: guildId,
      p_user_id: userId,
      p_permission: 'manage_vault',
    }),
  ]);

  if (gmError) throw gmError;
  if (permError) throw permError;

  return Boolean(isGm || hasManage);
}

async function canAccessSecret(
  supabaseAdmin: AdminClient,
  secretId: string,
  userId: string,
  capability: SecretCapability,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('can_access_guild_secret', {
    p_secret_id: secretId,
    p_user_id: userId,
    p_capability: capability,
  });

  if (error) throw error;
  return Boolean(data);
}

async function getSecretRow(supabaseAdmin: AdminClient, secretId: string) {
  const { data, error } = await supabaseAdmin
    .from('guild_secrets')
    .select('id, guild_id, label, secret_kind, requires_reason, is_archived')
    .eq('id', secretId)
    .maybeSingle();

  if (error) throw error;
  return data as {
    id: string;
    guild_id: string;
    label: string;
    secret_kind: SecretKind;
    requires_reason: boolean;
    is_archived: boolean;
  } | null;
}

async function getActiveVersion(supabaseAdmin: AdminClient, secretId: string) {
  const { data, error } = await supabaseAdmin
    .from('guild_secret_versions')
    .select('id, version_number, encrypted_payload, iv')
    .eq('secret_id', secretId)
    .eq('is_active', true)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as {
    id: string;
    version_number: number;
    encrypted_payload: string;
    iv: string;
  } | null;
}

async function replaceAccessRules(
  supabaseAdmin: AdminClient,
  secretId: string,
  rules: SecretAccessRuleInput[],
) {
  const { error: deleteError } = await supabaseAdmin
    .from('guild_secret_access_rules')
    .delete()
    .eq('secret_id', secretId);

  if (deleteError) throw deleteError;

  if (rules.length === 0) return;

  const { error: insertError } = await supabaseAdmin
    .from('guild_secret_access_rules')
    .insert(
      rules.map((rule) => ({
        secret_id: secretId,
        capability: rule.capability,
        access_type: rule.access_type,
        user_id: rule.access_type === 'user' ? rule.user_id ?? null : null,
        min_rank_index: rule.access_type === 'rank' ? rule.min_rank_index ?? 0 : null,
        max_rank_index: rule.access_type === 'rank' ? rule.max_rank_index ?? null : null,
      })),
    );

  if (insertError) throw insertError;
}

async function logAuditEvent(
  supabaseAdmin: AdminClient,
  guildId: string,
  secretId: string,
  actorUserId: string | null,
  actionType: string,
  actionContext: Record<string, unknown> = {},
) {
  const { error } = await supabaseAdmin
    .from('guild_secret_audit_events')
    .insert({
      guild_id: guildId,
      secret_id: secretId,
      actor_user_id: actorUserId,
      action_type: actionType,
      action_context: actionContext,
    });

  if (error) throw error;
}

async function logGuildActivity(
  supabaseAdmin: AdminClient,
  guildId: string,
  userId: string,
  actionType: string,
  actionDetails: Record<string, unknown>,
) {
  await supabaseAdmin.rpc('log_guild_activity', {
    p_guild_id: guildId,
    p_user_id: userId,
    p_action_type: actionType,
    p_action_details: actionDetails,
  });
}

async function logDeniedAccess(
  supabaseAdmin: AdminClient,
  secretId: string,
  userId: string,
  capability: SecretCapability,
  clientSurface?: string,
  reasonProvided?: boolean,
) {
  const secret = await getSecretRow(supabaseAdmin, secretId);
  if (!secret) return;

  await logAuditEvent(supabaseAdmin, secret.guild_id, secret.id, userId, 'access_denied', {
    capability,
    client_surface: clientSurface ?? null,
    reason_provided: reasonProvided ?? false,
  });
}

function requireReasonIfNeeded(secret: { requires_reason: boolean }, reason: unknown): string | null {
  const normalized = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
  if (secret.requires_reason && !normalized) {
    throw new Error('This secret requires a reason before access');
  }
  return normalized;
}

async function createSecret(
  supabaseAdmin: AdminClient,
  userId: string,
  encryptionKey: CryptoKey,
  keyVersion: string,
  body: Record<string, unknown>,
) {
  const metadata = normalizeMetadata(body as SecretMetadataInput, true);
  const payload = normalizePayload(metadata.secret_kind, body.payload);
  const accessRules = normalizeAccessRules(body.access_rules);

  if (!(await canManageVault(supabaseAdmin, metadata.guild_id, userId))) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const { data: secret, error: secretError } = await supabaseAdmin
    .from('guild_secrets')
    .insert({
      guild_id: metadata.guild_id,
      label: metadata.label,
      service_name: metadata.service_name,
      secret_kind: metadata.secret_kind,
      illustration_url: metadata.illustration_url,
      service_url: metadata.service_url,
      login_identifier_hint: metadata.login_identifier_hint,
      description: metadata.description,
      requires_reason: metadata.requires_reason,
      created_by: userId,
      updated_by: userId,
    })
    .select('id, guild_id, label')
    .single();

  if (secretError || !secret) {
    throw secretError ?? new Error('Failed to create secret');
  }

  try {
    const encrypted = await encryptPayload(encryptionKey, payload);
    const previewMask = buildPreviewMask(metadata.secret_kind, payload);

    const { error: versionError } = await supabaseAdmin
      .from('guild_secret_versions')
      .insert({
        secret_id: secret.id,
        version_number: 1,
        encrypted_payload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        key_version: keyVersion,
        preview_mask: previewMask,
        created_by: userId,
        is_active: true,
      });

    if (versionError) throw versionError;

    await replaceAccessRules(supabaseAdmin, secret.id, accessRules);

    await logAuditEvent(supabaseAdmin, secret.guild_id, secret.id, userId, 'created', {
      version_number: 1,
    });
    await logGuildActivity(supabaseAdmin, secret.guild_id, userId, 'vault_secret_created', {
      secret_id: secret.id,
      secret_label: secret.label,
      service_name: metadata.service_name,
    });
    if (accessRules.length > 0) {
      await logGuildActivity(supabaseAdmin, secret.guild_id, userId, 'vault_access_rules_updated', {
        secret_id: secret.id,
        total_rules: accessRules.length,
      });
    }

    return jsonResponse({ success: true, secret_id: secret.id }, 200);
  } catch (error) {
    await supabaseAdmin.from('guild_secrets').delete().eq('id', secret.id);
    throw error;
  }
}

async function updateSecret(
  supabaseAdmin: AdminClient,
  userId: string,
  body: Record<string, unknown>,
) {
  const secretId = typeof body.secret_id === 'string' ? body.secret_id : '';
  if (!secretId) return jsonResponse({ error: 'Missing secret_id' }, 400);

  const canManage = await canAccessSecret(supabaseAdmin, secretId, userId, 'manage');
  if (!canManage) {
    await logDeniedAccess(
      supabaseAdmin,
      secretId,
      userId,
      'manage',
      typeof body.client_surface === 'string' ? body.client_surface : undefined,
    );
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const secret = await getSecretRow(supabaseAdmin, secretId);
  if (!secret) return jsonResponse({ error: 'Not found' }, 404);

  const updates: Record<string, unknown> = { updated_by: userId };
  const metadataInput = body.metadata;
  if (metadataInput && typeof metadataInput === 'object') {
    const metadata = metadataInput as SecretMetadataInput;
    if (typeof metadata.label === 'string') updates.label = metadata.label.trim();
    if (typeof metadata.service_name === 'string') updates.service_name = metadata.service_name.trim();
    if (typeof metadata.illustration_url === 'string' || metadata.illustration_url === null) {
      updates.illustration_url = metadata.illustration_url ? metadata.illustration_url.trim() : null;
    }
    if (typeof metadata.service_url === 'string' || metadata.service_url === null) {
      updates.service_url = metadata.service_url ? metadata.service_url.trim() : null;
    }
    if (typeof metadata.login_identifier_hint === 'string' || metadata.login_identifier_hint === null) {
      updates.login_identifier_hint = metadata.login_identifier_hint ? metadata.login_identifier_hint.trim() : null;
    }
    if (typeof metadata.description === 'string' || metadata.description === null) {
      updates.description = metadata.description ? metadata.description.trim() : null;
    }
    if (typeof metadata.requires_reason === 'boolean') {
      updates.requires_reason = metadata.requires_reason;
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('guild_secrets')
    .update(updates)
    .eq('id', secretId);

  if (updateError) throw updateError;

  const accessRules = normalizeAccessRules(body.access_rules);
  const accessRulesProvided = Array.isArray(body.access_rules);
  if (accessRulesProvided) {
    await replaceAccessRules(supabaseAdmin, secretId, accessRules);
    await logGuildActivity(supabaseAdmin, secret.guild_id, userId, 'vault_access_rules_updated', {
      secret_id: secret.id,
      total_rules: accessRules.length,
    });
  }

  await logAuditEvent(supabaseAdmin, secret.guild_id, secretId, userId, 'updated', {
    access_rules_updated: accessRulesProvided,
  });

  return jsonResponse({ success: true }, 200);
}

async function revealOrCopySecret(
  supabaseAdmin: AdminClient,
  userId: string,
  encryptionKey: CryptoKey,
  body: Record<string, unknown>,
  auditAction: 'revealed' | 'copied',
) {
  const secretId = typeof body.secret_id === 'string' ? body.secret_id : '';
  if (!secretId) return jsonResponse({ error: 'Missing secret_id' }, 400);

  const canReveal = await canAccessSecret(supabaseAdmin, secretId, userId, 'reveal');
  const clientSurface = typeof body.client_surface === 'string' ? body.client_surface : undefined;
  if (!canReveal) {
    await logDeniedAccess(supabaseAdmin, secretId, userId, 'reveal', clientSurface);
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const secret = await getSecretRow(supabaseAdmin, secretId);
  if (!secret || secret.is_archived) {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  let reason: string | null = null;
  try {
    reason = requireReasonIfNeeded(secret, body.reason);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid request' }, 400);
  }

  const version = await getActiveVersion(supabaseAdmin, secretId);
  if (!version) {
    return jsonResponse({ error: 'No active secret version' }, 409);
  }

  const payload = await decryptPayload(encryptionKey, version.encrypted_payload, version.iv);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60_000);

  await logAuditEvent(supabaseAdmin, secret.guild_id, secret.id, userId, auditAction, {
    version_number: version.version_number,
    reason_required: secret.requires_reason,
    reason_provided: Boolean(reason),
    client_surface: clientSurface ?? null,
  });

  return jsonResponse({
    payload,
    revealed_at: now.toISOString(),
    expires_client_at: expiresAt.toISOString(),
  });
}

async function rotateSecret(
  supabaseAdmin: AdminClient,
  userId: string,
  encryptionKey: CryptoKey,
  keyVersion: string,
  body: Record<string, unknown>,
) {
  const secretId = typeof body.secret_id === 'string' ? body.secret_id : '';
  if (!secretId) return jsonResponse({ error: 'Missing secret_id' }, 400);

  const canManage = await canAccessSecret(supabaseAdmin, secretId, userId, 'manage');
  if (!canManage) {
    await logDeniedAccess(
      supabaseAdmin,
      secretId,
      userId,
      'manage',
      typeof body.client_surface === 'string' ? body.client_surface : undefined,
    );
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const secret = await getSecretRow(supabaseAdmin, secretId);
  if (!secret) return jsonResponse({ error: 'Not found' }, 404);

  const payload = normalizePayload(secret.secret_kind, body.payload);
  const currentVersion = await getActiveVersion(supabaseAdmin, secretId);
  const nextVersionNumber = (currentVersion?.version_number ?? 0) + 1;
  const encrypted = await encryptPayload(encryptionKey, payload);
  const previewMask = buildPreviewMask(secret.secret_kind, payload);

  const { error: deactivateError } = await supabaseAdmin
    .from('guild_secret_versions')
    .update({ is_active: false })
    .eq('secret_id', secretId)
    .eq('is_active', true);

  if (deactivateError) throw deactivateError;

  const { error: insertError } = await supabaseAdmin
    .from('guild_secret_versions')
    .insert({
      secret_id: secretId,
      version_number: nextVersionNumber,
      encrypted_payload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      key_version: keyVersion,
      preview_mask: previewMask,
      expires_at: body.expires_at ?? null,
      created_by: userId,
      is_active: true,
    });

  if (insertError) throw insertError;

  const { error: updateSecretError } = await supabaseAdmin
    .from('guild_secrets')
    .update({ updated_by: userId })
    .eq('id', secretId);

  if (updateSecretError) throw updateSecretError;

  await logAuditEvent(supabaseAdmin, secret.guild_id, secretId, userId, 'rotated', {
    version_number: nextVersionNumber,
  });
  await logGuildActivity(supabaseAdmin, secret.guild_id, userId, 'vault_secret_rotated', {
    secret_id: secretId,
    version_number: nextVersionNumber,
  });

  return jsonResponse({ success: true, version_number: nextVersionNumber }, 200);
}

async function archiveSecret(
  supabaseAdmin: AdminClient,
  userId: string,
  body: Record<string, unknown>,
) {
  const secretId = typeof body.secret_id === 'string' ? body.secret_id : '';
  if (!secretId) return jsonResponse({ error: 'Missing secret_id' }, 400);

  const canManage = await canAccessSecret(supabaseAdmin, secretId, userId, 'manage');
  if (!canManage) {
    await logDeniedAccess(supabaseAdmin, secretId, userId, 'manage');
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const secret = await getSecretRow(supabaseAdmin, secretId);
  if (!secret) return jsonResponse({ error: 'Not found' }, 404);

  const { error } = await supabaseAdmin
    .from('guild_secrets')
    .update({ is_archived: true, updated_by: userId })
    .eq('id', secretId);

  if (error) throw error;

  await logAuditEvent(supabaseAdmin, secret.guild_id, secretId, userId, 'archived');
  await logGuildActivity(supabaseAdmin, secret.guild_id, userId, 'vault_secret_archived', {
    secret_id: secretId,
  });

  return jsonResponse({ success: true }, 200);
}

async function deleteSecret(
  supabaseAdmin: AdminClient,
  userId: string,
  body: Record<string, unknown>,
) {
  const secretId = typeof body.secret_id === 'string' ? body.secret_id : '';
  if (!secretId) return jsonResponse({ error: 'Missing secret_id' }, 400);

  const canManage = await canAccessSecret(supabaseAdmin, secretId, userId, 'manage');
  if (!canManage) {
    await logDeniedAccess(supabaseAdmin, secretId, userId, 'manage');
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const secret = await getSecretRow(supabaseAdmin, secretId);
  if (!secret) return jsonResponse({ error: 'Not found' }, 404);

  await logAuditEvent(supabaseAdmin, secret.guild_id, secretId, userId, 'deleted');

  const { error } = await supabaseAdmin
    .from('guild_secrets')
    .delete()
    .eq('id', secretId);

  if (error) throw error;

  return jsonResponse({ success: true }, 200);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const SUPABASE_URL = getEnv('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const MASTER_KEY = getEnv('GUILD_VAULT_MASTER_KEY_CURRENT');
    const KEY_VERSION = getEnv('GUILD_VAULT_MASTER_KEY_VERSION');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const encryptionKey = await importEncryptionKey(MASTER_KEY);

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const action = typeof (body as { action?: unknown }).action === 'string'
      ? (body as { action: string }).action
      : '';

    switch (action) {
      case 'create_secret':
        return await createSecret(supabaseAdmin, userData.user.id, encryptionKey, KEY_VERSION, body as Record<string, unknown>);
      case 'update_secret':
        return await updateSecret(supabaseAdmin, userData.user.id, body as Record<string, unknown>);
      case 'reveal_secret':
        return await revealOrCopySecret(
          supabaseAdmin,
          userData.user.id,
          encryptionKey,
          body as Record<string, unknown>,
          'revealed',
        );
      case 'copy_secret':
        return await revealOrCopySecret(
          supabaseAdmin,
          userData.user.id,
          encryptionKey,
          body as Record<string, unknown>,
          'copied',
        );
      case 'rotate_secret':
        return await rotateSecret(supabaseAdmin, userData.user.id, encryptionKey, KEY_VERSION, body as Record<string, unknown>);
      case 'archive_secret':
        return await archiveSecret(supabaseAdmin, userData.user.id, body as Record<string, unknown>);
      case 'delete_secret':
        return await deleteSecret(supabaseAdmin, userData.user.id, body as Record<string, unknown>);
      default:
        return jsonResponse({ error: 'Unsupported action' }, 400);
    }
  } catch (error) {
    console.error('guild-vault error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      500,
    );
  }
});
