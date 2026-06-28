import {
  Archive,
  Copy,
  Ellipsis,
  Eye,
  ExternalLink,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  RotateCw,
  Shield,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from '@/components/ui/sonner';

import { GuildSecretAccessEditor } from '@/components/settings/GuildSecretAccessEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildRankLabels } from '@/hooks/useGuildRankLabels';
import { useGuildVault } from '@/hooks/useGuildVault';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import {
  buildGuildVaultCreateRequest,
  createEmptyGuildSecretAccessRulesCompact,
  flattenCompactGuildSecretAccessRules,
  groupCompactGuildSecretAccessRules,
  summarizeCompactAccessRules,
  type GuildSecretAccessRulesCompact,
  type GuildSecretKind,
  type GuildSecretPayload,
  type GuildSecretSummary,
} from '@/lib/guildVault';
import { toNormalizedRealmSlug } from '@/lib/guildDiscovery';
import { formatRankLabel } from '@/lib/rankLabel';

interface GuildVaultSectionProps {
  guildId: string;
  canManageVault: boolean;
  officerRankThreshold?: number;
}

interface CreateFormState {
  label: string;
  serviceUrl: string;
  secretKind: GuildSecretKind;
  credentialUsername: string;
  credentialPassword: string;
  genericValue: string;
  recoveryCodes: string;
  requiresReason: boolean;
  accessRules: GuildSecretAccessRulesCompact;
}

interface RevealedSecretState {
  payload: GuildSecretPayload;
  expiresAt: string;
}

interface GuildMemberOption {
  user_id: string;
  username: string;
}

interface GuildRankOption {
  rank_index: number;
  rank_name: string;
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const FIELD_CLASSNAME = 'focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-primary';
const SELECT_TRIGGER_CLASSNAME = 'focus:ring-1 focus:ring-offset-0 focus:border-primary';

const initialFormState: CreateFormState = {
  label: '',
  serviceUrl: '',
  secretKind: 'credential',
  credentialUsername: '',
  credentialPassword: '',
  genericValue: '',
  recoveryCodes: '',
  requiresReason: false,
  accessRules: createEmptyGuildSecretAccessRulesCompact(),
};

const isLinkableUrl = (value: string | null): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

function getRevealedText(payload: GuildSecretPayload) {
  if ('password' in payload) return payload.password;
  if ('token' in payload) return payload.token;
  if ('value' in payload) return payload.value;
  return payload.codes.join('\n');
}

export const GuildVaultSection = ({
  guildId,
  canManageVault,
  officerRankThreshold = 2,
}: GuildVaultSectionProps) => {
  const { t } = useLanguage();
  const vault = t.guildVault;
  const rankLabel = resolveSemanticMessage({ key: 'guild.members.rank_label', language: t.lang, translations: t });
  const { rankLabels } = useGuildRankLabels({ guildId });
  const {
    secrets,
    loading,
    mutating,
    createSecret,
    updateSecret,
    rotateSecret,
    archiveSecret,
    revealSecret,
    loadSecretAccessRules,
    saveSecretAccessRules,
  } = useGuildVault({ guildId, includeAudit: false });

  const [form, setForm] = useState<CreateFormState>(initialFormState);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<GuildSecretSummary | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, RevealedSecretState>>({});
  const [members, setMembers] = useState<GuildMemberOption[]>([]);
  const [ranks, setRanks] = useState<GuildRankOption[]>([]);
  const [accessEditorOpen, setAccessEditorOpen] = useState<Record<string, boolean>>({});
  const [accessDrafts, setAccessDrafts] = useState<Record<string, GuildSecretAccessRulesCompact>>({});
  const [loadingAccessRules, setLoadingAccessRules] = useState<Record<string, boolean>>({});
  const [savingAccessSecretId, setSavingAccessSecretId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [illustrationFile, setIllustrationFile] = useState<File | null>(null);
  const [illustrationPreviewUrl, setIllustrationPreviewUrl] = useState<string | null>(null);
  const illustrationInputRef = useRef<HTMLInputElement>(null);
  const accessSummaryHydrationRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const loadAccessOptions = async () => {
      try {
        const { data: membersData } = await supabase
          .from('guild_members')
          .select('user_id')
          .eq('guild_id', guildId);

        if (cancelled) return;

        if (membersData && membersData.length > 0) {
          const userIds = membersData.map((member) => member.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);

          if (cancelled) return;

          setMembers(
            membersData.map((member) => ({
              user_id: member.user_id,
              username: profilesData?.find((profile) => profile.id === member.user_id)?.username || 'Unknown',
            })),
          );
        } else {
          setMembers([]);
        }

        const { data: guildData } = await supabase
          .from('guilds')
          .select('name, server, region')
          .eq('id', guildId)
          .maybeSingle();

        if (cancelled || !guildData) return;

        const { data: ranksData } = await supabase
          .from('wow_guild_memberships')
          .select('rank_index, rank_name')
          .ilike('guild_name', guildData.name)
          .ilike('guild_realm_slug', toNormalizedRealmSlug(guildData.server))
          .ilike('guild_region', guildData.region);

        if (cancelled) return;

        if (!ranksData) {
          setRanks([]);
          return;
        }

        const uniqueRanks = new Map<number, string>();
        ranksData.forEach((rank) => {
          if (!uniqueRanks.has(rank.rank_index)) {
            uniqueRanks.set(
              rank.rank_index,
              formatRankLabel({
                rankName: rank.rank_name,
                rankIndex: rank.rank_index,
                rankLabel,
                guildMasterLabel: t.guild.rank0,
                customLabel: rankLabels[rank.rank_index],
              }),
            );
          }
        });

        setRanks(
          Array.from(uniqueRanks.entries())
            .map(([rank_index, rank_name]) => ({ rank_index, rank_name }))
            .sort((left, right) => left.rank_index - right.rank_index),
        );
      } catch {
        if (!cancelled) {
          setMembers([]);
          setRanks([]);
        }
      }
    };

    void loadAccessOptions();

    return () => {
      cancelled = true;
    };
  }, [guildId, rankLabel, rankLabels, t.guild.rank0]);

  useEffect(() => {
    if (Object.keys(revealedSecrets).length === 0) return;

    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [revealedSecrets]);

  useEffect(() => {
    const manageableSecrets = secrets.filter((secret) => secret.can_manage);
    if (manageableSecrets.length === 0) return;

    let cancelled = false;

    manageableSecrets.forEach((secret) => {
      if (accessDrafts[secret.id] || accessSummaryHydrationRef.current[secret.id]) {
        return;
      }

      accessSummaryHydrationRef.current[secret.id] = true;

      void (async () => {
        try {
          const rules = await Promise.race([
            loadSecretAccessRules(secret.id),
            new Promise<never>((_, reject) => {
              window.setTimeout(() => reject(new Error('timeout')), 10_000);
            }),
          ]);

          if (cancelled) return;

          setAccessDrafts((current) => ({
            ...current,
            [secret.id]: groupCompactGuildSecretAccessRules(rules),
          }));
        } catch {
          if (cancelled) return;

          setAccessDrafts((current) => ({
            ...current,
            [secret.id]: createEmptyGuildSecretAccessRulesCompact(),
          }));
        } finally {
          delete accessSummaryHydrationRef.current[secret.id];
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [accessDrafts, loadSecretAccessRules, secrets]);

  const loadAccessDraftForSecret = async (secretId: string) => {
    if (accessDrafts[secretId]) {
      return accessDrafts[secretId];
    }

    setLoadingAccessRules((current) => ({ ...current, [secretId]: true }));

    try {
      const rules = await Promise.race([
        loadSecretAccessRules(secretId),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('timeout')), 10_000);
        }),
      ]);

      const grouped = groupCompactGuildSecretAccessRules(rules);
      setAccessDrafts((current) => ({
        ...current,
        [secretId]: grouped,
      }));
      return grouped;
    } catch {
      const fallback = createEmptyGuildSecretAccessRulesCompact();
      setAccessDrafts((current) => ({
        ...current,
        [secretId]: fallback,
      }));
      toast.error(vault.feedback.loadAccessError);
      return fallback;
    } finally {
      setLoadingAccessRules((current) => ({ ...current, [secretId]: false }));
    }
  };

  const updateForm = <K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetDrawerToCreate = () => {
    setEditingSecret(null);
    setForm(initialFormState);
    resetIllustrationSelection();
    setIsCreateDrawerOpen(true);
  };

  const storeRevealedSecret = (secretId: string, payload: GuildSecretPayload, expiresAt: string) => {
    setRevealedSecrets((current) => ({
      ...current,
      [secretId]: { payload, expiresAt },
    }));

    window.setTimeout(() => {
      setRevealedSecrets((current) => {
        const next = { ...current };
        delete next[secretId];
        return next;
      });
    }, 60_000);
  };

  useEffect(() => () => {
    if (illustrationPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(illustrationPreviewUrl);
    }
  }, [illustrationPreviewUrl]);

  const resetIllustrationSelection = () => {
    setIllustrationFile(null);
    setIllustrationPreviewUrl((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return null;
    });

    if (illustrationInputRef.current) {
      illustrationInputRef.current.value = '';
    }
  };

  const uploadIllustration = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `${guildId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('guild-vault-images')
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('guild-vault-images').getPublicUrl(filePath);
    return {
      filePath,
      publicUrl: `${data.publicUrl}?t=${Date.now()}`,
    };
  };

  const handleIllustrationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE) {
      toast.error(vault.feedback.imageUploadError);
      if (illustrationInputRef.current) {
        illustrationInputRef.current.value = '';
      }
      return;
    }

    setIllustrationFile(file);
    setIllustrationPreviewUrl((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
  };

  const openEditDrawer = async (secret: GuildSecretSummary) => {
    setEditingSecret(secret);
    const nextRules = await loadAccessDraftForSecret(secret.id);

    setForm({
      label: secret.label,
      serviceUrl: secret.service_url || '',
      secretKind: secret.secret_kind,
      credentialUsername:
        revealedSecrets[secret.id] && 'password' in revealedSecrets[secret.id].payload
          ? revealedSecrets[secret.id].payload.username
          : '',
      credentialPassword: '',
      genericValue: '',
      recoveryCodes: '',
      requiresReason: secret.requires_reason,
      accessRules: nextRules,
    });

    setIllustrationFile(null);
    setIllustrationPreviewUrl(secret.illustration_url);
    if (illustrationInputRef.current) {
      illustrationInputRef.current.value = '';
    }
    setIsCreateDrawerOpen(true);
  };

  const buildRotationPayloadFromForm = (): GuildSecretPayload | null => {
    if (form.secretKind === 'credential') {
      if (!form.credentialPassword.trim()) return null;
      return {
        username: form.credentialUsername.trim(),
        password: form.credentialPassword,
      };
    }

    if (form.secretKind === 'token') {
      if (!form.genericValue.trim()) return null;
      return { token: form.genericValue };
    }

    if (form.secretKind === 'note') {
      if (!form.genericValue.trim()) return null;
      return { value: form.genericValue };
    }

    const codes = form.recoveryCodes
      .split('\n')
      .map((code) => code.trim())
      .filter(Boolean);

    if (codes.length === 0) return null;
    return { codes };
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let uploadedImagePath: string | null = null;

    try {
      let uploadedIllustrationUrl = illustrationPreviewUrl;

      if (illustrationFile) {
        const uploaded = await uploadIllustration(illustrationFile);
        uploadedImagePath = uploaded.filePath;
        uploadedIllustrationUrl = uploaded.publicUrl;
      }

      if (editingSecret) {
        await updateSecret({
          secret_id: editingSecret.id,
          metadata: {
            label: form.label,
            service_name: form.label,
            illustration_url: uploadedIllustrationUrl?.trim() ? uploadedIllustrationUrl : null,
            service_url: form.serviceUrl.trim() || null,
            login_identifier_hint: null,
            description: null,
            requires_reason: form.requiresReason,
          },
          access_rules: flattenCompactGuildSecretAccessRules(form.accessRules),
          client_surface: 'guild_vault',
        });

        const nextPayload = buildRotationPayloadFromForm();
        if (nextPayload) {
          await rotateSecret({
            secret_id: editingSecret.id,
            payload: nextPayload,
          });
        }

        toast.success(vault.feedback.updateSuccess);
      } else {
        await createSecret(
          buildGuildVaultCreateRequest({
            guildId,
            label: form.label,
            illustrationUrl: uploadedIllustrationUrl,
            serviceUrl: form.serviceUrl,
            secretKind: form.secretKind,
            credentialUsername: form.credentialUsername,
            credentialPassword: form.credentialPassword,
            genericValue: form.genericValue,
            recoveryCodes: form.recoveryCodes,
            requiresReason: form.requiresReason,
            accessRules: form.accessRules,
          }),
        );
        toast.success(vault.feedback.createSuccess);
      }

      setForm(initialFormState);
      setEditingSecret(null);
      resetIllustrationSelection();
      setIsCreateDrawerOpen(false);
    } catch {
      if (uploadedImagePath) {
        await supabase.storage.from('guild-vault-images').remove([uploadedImagePath]);
      }
      toast.error(editingSecret ? vault.feedback.updateError : vault.feedback.createError);
    }
  };

  const requestReason = (requiresReason: boolean) => {
    if (!requiresReason) return undefined;

    const value = window.prompt(vault.prompts.reason);
    if (!value) return null;
    return value;
  };

  const handleReveal = async (secretId: string, requiresReason: boolean) => {
    try {
      const reason = requestReason(requiresReason);
      if (reason === null) return;

      const result = await revealSecret(secretId, reason || undefined);
      storeRevealedSecret(secretId, result.payload, result.expires_client_at);
      toast.success(vault.state.revealed);
    } catch {
      toast.error(vault.feedback.actionError);
    }
  };

  const handleCopyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(vault.state.copied);
    } catch {
      toast.error(vault.feedback.actionError);
    }
  };

  const handleRotate = async (secret: GuildSecretSummary) => {
    try {
      let payload: GuildSecretPayload | null = null;

      if (secret.secret_kind === 'credential') {
        const currentReveal = revealedSecrets[secret.id]?.payload;
        const fallbackUsername = currentReveal && 'password' in currentReveal ? currentReveal.username : '';
        const username = window.prompt(vault.form.username, fallbackUsername) ?? '';
        const password = window.prompt(vault.form.password);
        if (!password) return;
        payload = { username, password };
      } else if (secret.secret_kind === 'token') {
        const token = window.prompt(vault.prompts.rotateValue);
        if (!token) return;
        payload = { token };
      } else if (secret.secret_kind === 'note') {
        const value = window.prompt(vault.prompts.rotateValue);
        if (!value) return;
        payload = { value };
      } else {
        const codesRaw = window.prompt(vault.prompts.rotateCodes);
        if (!codesRaw) return;
        payload = { codes: codesRaw.split('\n').map((code) => code.trim()).filter(Boolean) };
      }

      await rotateSecret({ secret_id: secret.id, payload });
      toast.success(vault.feedback.rotated);
    } catch {
      toast.error(vault.feedback.actionError);
    }
  };

  const handleArchive = async (secretId: string) => {
    if (!window.confirm(vault.confirm.archive)) return;

    try {
      await archiveSecret({ secret_id: secretId });
      toast.success(vault.feedback.archived);
    } catch {
      toast.error(vault.feedback.actionError);
    }
  };

  const handleToggleAccessEditor = async (secretId: string) => {
    const nextOpen = !accessEditorOpen[secretId];
    setAccessEditorOpen((current) => ({ ...current, [secretId]: nextOpen }));

    if (!nextOpen || loadingAccessRules[secretId]) return;

    await loadAccessDraftForSecret(secretId);
  };

  const handleAccessDraftChange = (secretId: string, nextValue: GuildSecretAccessRulesCompact) => {
    setAccessDrafts((current) => ({ ...current, [secretId]: nextValue }));
  };

  const handleSaveAccessRules = async (secretId: string) => {
    const draft = accessDrafts[secretId] ?? createEmptyGuildSecretAccessRulesCompact();
    const normalizedRules = flattenCompactGuildSecretAccessRules(draft);
    setSavingAccessSecretId(secretId);

    try {
      await saveSecretAccessRules(secretId, normalizedRules);
      setAccessDrafts((current) => ({
        ...current,
        [secretId]: groupCompactGuildSecretAccessRules(normalizedRules),
      }));
      toast.success(vault.feedback.accessSaved);
    } catch {
      toast.error(vault.feedback.accessError);
    } finally {
      setSavingAccessSecretId(null);
    }
  };

  const valueLabel = (() => {
    if (form.secretKind === 'token') return vault.form.token;
    if (form.secretKind === 'note') return vault.form.value;
    return vault.form.recoveryCodes;
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-primary" />
            <h2 className="font-sans text-base font-medium">{vault.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{vault.subtitle}</p>
        </div>

        {canManageVault && (
          <Sheet
            open={isCreateDrawerOpen}
            onOpenChange={(open) => {
              setIsCreateDrawerOpen(open);
              if (!open) {
                setEditingSecret(null);
                setForm(initialFormState);
                resetIllustrationSelection();
              }
            }}
          >
            <Button type="button" onClick={resetDrawerToCreate} className="gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              {vault.addSecret}
            </Button>
            <SheetContent side="right" className="w-full border-border bg-background/95 px-5 py-5 backdrop-blur sm:max-w-[680px]">
              <SheetHeader>
                <SheetTitle>{editingSecret ? vault.actions.editSecret : vault.create.title}</SheetTitle>
                <SheetDescription>{vault.create.description}</SheetDescription>
              </SheetHeader>
              <form onSubmit={handleCreate} className="mt-5 flex h-[calc(100%-5rem)] flex-col">
                <div className="flex-1 space-y-5 overflow-y-auto pr-2">
                  <section className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="vault-label">{vault.form.label}</Label>
                      <Input
                        id="vault-label"
                        className={FIELD_CLASSNAME}
                        value={form.label}
                        onChange={(event) => updateForm('label', event.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                      <div className="space-y-2">
                        <Label htmlFor="vault-url">{vault.form.url}</Label>
                        <Input
                          id="vault-url"
                          className={FIELD_CLASSNAME}
                          value={form.serviceUrl}
                          onChange={(event) => updateForm('serviceUrl', event.target.value)}
                          placeholder="https://..."
                        />
                        <p className="text-xs text-muted-foreground">{vault.form.urlHint}</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vault-kind">{vault.form.kind}</Label>
                        <Select
                          value={form.secretKind}
                          onValueChange={(value) => updateForm('secretKind', value as GuildSecretKind)}
                          disabled={Boolean(editingSecret)}
                        >
                          <SelectTrigger id="vault-kind" className={SELECT_TRIGGER_CLASSNAME}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credential">{vault.types.credential}</SelectItem>
                            <SelectItem value="token">{vault.types.token}</SelectItem>
                            <SelectItem value="note">{vault.types.note}</SelectItem>
                            <SelectItem value="recovery_code">{vault.types.recoveryCode}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="vault-illustration">{vault.form.image}</Label>
                        <input
                          ref={illustrationInputRef}
                          id="vault-illustration"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleIllustrationChange}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => illustrationInputRef.current?.click()}
                          >
                            <ImagePlus className="h-3.5 w-3.5" />
                            {vault.form.imageAdd}
                          </Button>
                          {illustrationPreviewUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-2"
                              onClick={resetIllustrationSelection}
                            >
                              <X className="h-3.5 w-3.5" />
                              {vault.form.imageRemove}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/30 p-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/30 bg-card/40">
                          {illustrationPreviewUrl ? (
                            <img
                              src={illustrationPreviewUrl}
                              alt={vault.form.imageAlt}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{vault.form.imageHint}</p>
                      </div>
                    </div>
                    {form.secretKind === 'credential' ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="vault-username">{vault.form.username}</Label>
                          <Input
                            id="vault-username"
                            className={FIELD_CLASSNAME}
                            value={form.credentialUsername}
                            onChange={(event) => updateForm('credentialUsername', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vault-password">{vault.form.password}</Label>
                          <Input
                            id="vault-password"
                            type="password"
                            className={FIELD_CLASSNAME}
                            value={form.credentialPassword}
                            onChange={(event) => updateForm('credentialPassword', event.target.value)}
                            required={!editingSecret}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="vault-generic-value">{valueLabel}</Label>
                        <Textarea
                          id="vault-generic-value"
                          className={FIELD_CLASSNAME}
                          value={form.secretKind === 'recovery_code' ? form.recoveryCodes : form.genericValue}
                          onChange={(event) =>
                            form.secretKind === 'recovery_code'
                              ? updateForm('recoveryCodes', event.target.value)
                              : updateForm('genericValue', event.target.value)
                          }
                          required={!editingSecret}
                        />
                      </div>
                    )}
                    <label className="flex items-start gap-3 rounded-lg border border-border/30 bg-background/30 p-3">
                      <Switch
                        checked={form.requiresReason}
                        onCheckedChange={(checked) => updateForm('requiresReason', Boolean(checked))}
                      />
                      <span className="text-sm">{vault.form.requiresReason}</span>
                    </label>
                  </section>

                  <section className="space-y-3">
                    <GuildSecretAccessEditor
                      value={form.accessRules}
                      members={members}
                      ranks={ranks}
                      officerRankThreshold={officerRankThreshold}
                      onChange={(nextValue) => updateForm('accessRules', nextValue)}
                    />
                  </section>
                </div>

                <SheetFooter className="sticky bottom-0 mt-4 border-t border-border/30 bg-background/95 px-0 pb-1 pt-4">
                  <SheetClose asChild>
                    <Button type="button" variant="outline">
                      {vault.create.cancel}
                    </Button>
                  </SheetClose>
                  <Button type="submit" disabled={mutating} className="gap-2">
                    {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    {mutating ? vault.create.submitting : editingSecret ? t.common.save : vault.create.submit}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : secrets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/40 p-5 text-sm text-muted-foreground">
          {vault.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {secrets.map((secret) => {
            const revealed = revealedSecrets[secret.id];
            const showAccessEditor = Boolean(accessEditorOpen[secret.id]);
            const accessDraft = accessDrafts[secret.id] ?? createEmptyGuildSecretAccessRulesCompact();
            const accessSummary = summarizeCompactAccessRules(accessDraft, {
              access: vault.access.summaryAccess,
              manage: vault.access.summaryManage,
              ranks: vault.access.summaryRanks,
              members: vault.access.summaryMembers,
              globalOnly: vault.access.empty,
            });
            const remainingSeconds = revealed
              ? Math.max(0, Math.ceil((new Date(revealed.expiresAt).getTime() - nowTs) / 1000))
              : 0;
            const progressValue = (remainingSeconds / 60) * 100;

            return (
              <div key={secret.id} className="rounded border border-border/35 bg-card/20 p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      {secret.illustration_url ? (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/30 bg-card/40">
                          <img
                            src={secret.illustration_url}
                            alt={secret.label}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}

                      <div className="min-w-0 flex-1 space-y-2 lg:space-y-1">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-medium md:text-base">{secret.label}</h3>
                            {secret.can_reveal && (
                              <Badge variant="outline" className="h-6 px-2 text-[11px]">
                                {vault.state.revealBadge}
                              </Badge>
                            )}
                            {secret.can_manage && (
                              <Badge variant="outline" className="h-6 px-2 text-[11px]">
                                {vault.state.manageBadge}
                              </Badge>
                            )}
                          </div>

                          {secret.service_url && (
                            <div className="min-w-0 text-xs text-muted-foreground lg:flex-1">
                              {isLinkableUrl(secret.service_url) ? (
                                <a
                                  href={secret.service_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex max-w-full items-center gap-1 truncate hover:text-foreground"
                                >
                                  <span className="truncate">{secret.service_url}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ) : (
                                <span>{secret.service_url}</span>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground lg:whitespace-nowrap">
                            {vault.state.updated}: {new Date(secret.updated_at).toLocaleString()}
                          </div>
                        </div>

                        {secret.can_manage && (
                          <div className="flex flex-wrap gap-1.5">
                            {accessSummary.access.concat(accessSummary.manage).map((chip) => (
                              <span
                                key={`${secret.id}-${chip}`}
                                className="rounded-full border border-border/30 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:self-start">
                    {isLinkableUrl(secret.service_url) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(secret.service_url, '_blank', 'noopener,noreferrer')}
                        title={vault.actions.openLink}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="sr-only">{vault.actions.openLink}</span>
                      </Button>
                    )}

                    {secret.can_reveal && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleReveal(secret.id, secret.requires_reason)}
                        className="h-8 gap-2"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {vault.actions.reveal}
                      </Button>
                    )}

                    {secret.can_manage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="h-8 gap-2">
                            <Ellipsis className="h-3.5 w-3.5" />
                            {vault.actions.more}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void openEditDrawer(secret)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {vault.actions.editSecret}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRotate(secret)}>
                            <RotateCw className="mr-2 h-4 w-4" />
                            {vault.actions.rotate}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAccessEditor(secret.id)}>
                            <Shield className="mr-2 h-4 w-4" />
                            {showAccessEditor ? vault.actions.hideAccess : vault.actions.editAccess}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArchive(secret.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            {vault.actions.archive}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {revealed && (
                  <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs font-medium text-primary">
                        {vault.state.expiresIn} {remainingSeconds}s
                      </div>
                      <Progress value={progressValue} className="h-1.5 w-full sm:w-40" />
                    </div>

                    {'password' in revealed.payload ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-md border border-border/20 bg-background/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{vault.form.username}</div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleCopyText(revealed.payload.username)}
                              title={vault.actions.copyUsername}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="sr-only">{vault.actions.copyUsername}</span>
                            </Button>
                          </div>
                          <div className="mt-1 break-all font-mono text-sm">{revealed.payload.username || '-'}</div>
                        </div>
                        <div className="rounded-md border border-border/20 bg-background/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{vault.form.password}</div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleCopyText(revealed.payload.password)}
                              title={vault.actions.copyPassword}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="sr-only">{vault.actions.copyPassword}</span>
                            </Button>
                          </div>
                          <div className="mt-1 break-all font-mono text-sm">{revealed.payload.password}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-border/20 bg-background/40 p-3">
                        <div className="mb-2 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopyText(getRevealedText(revealed.payload))}
                            title={vault.actions.copyValue}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="sr-only">{vault.actions.copyValue}</span>
                          </Button>
                        </div>
                        <div className="whitespace-pre-wrap break-all font-mono text-sm">
                          {getRevealedText(revealed.payload)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {showAccessEditor && secret.can_manage && (
                  <div className="mt-3 space-y-3 rounded-lg border border-border/30 bg-background/25 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-sm font-medium">{vault.actions.editAccess}</h4>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveAccessRules(secret.id)}
                        disabled={savingAccessSecretId === secret.id}
                        className="h-8 gap-2"
                      >
                        {savingAccessSecretId === secret.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                        {savingAccessSecretId === secret.id ? vault.actions.savingAccess : vault.actions.saveAccess}
                      </Button>
                    </div>

                    {loadingAccessRules[secret.id] ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{vault.feedback.loadingAccess}</span>
                      </div>
                    ) : (
                      <GuildSecretAccessEditor
                        value={accessDraft}
                        members={members}
                        ranks={ranks}
                        officerRankThreshold={officerRankThreshold}
                        onChange={(nextValue) => handleAccessDraftChange(secret.id, nextValue)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
