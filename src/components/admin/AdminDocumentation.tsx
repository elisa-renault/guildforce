import {
  BookOpen,
  Shield,
  MessageSquare,
  BarChart3,
  Lock,
  HelpCircle,
  Crown,
  Layers,
  ClipboardList,
  Bell,
  Database,
  Key,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';

import { GlowCard } from '@/components/GlowCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBilingualValue } from '@/i18n/config';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { cn } from '@/lib/utils';

interface DocSection {
  id: string;
  titleEn: string;
  titleFr: string;
  icon: ElementType;
  color: string;
  subsections: DocSubsection[];
}

interface DocSubsection {
  titleEn: string;
  titleFr: string;
  contentEn: string;
  contentFr: string;
  tags?: string[];
}

const DOCUMENTATION: DocSection[] = [
  {
    id: 'overview',
    titleEn: 'Overview',
    titleFr: 'Vue d\'ensemble',
    icon: BookOpen,
    color: 'text-status-info',
    subsections: [
      {
        titleEn: 'What is Guildforce?',
        titleFr: 'Qu\'est-ce que Guildforce ?',
        contentEn: 'Guildforce is a guild management platform for World of Warcraft communities. It centralizes guild data, roster planning, wishes, polls, and forum collaboration in a single web app.',
        contentFr: 'Guildforce est une plateforme de gestion de guilde pour les communautés World of Warcraft. Elle centralise les données de guilde, la planification de roster, les vœux, les sondages et la collaboration forum dans une seule application web.',
        tags: ['core', 'introduction'],
      },
      {
        titleEn: 'Functional map',
        titleFr: 'Carte fonctionnelle',
        contentEn: '- Battle.net sync for characters, guild memberships, and guild member cache\n- Multi-roster wish management with validation workflow\n- Advanced guild polls (sections, targeting, conditional logic)\n- Full forum with moderation, sanctions, and realtime notifications\n- Admin back office for users, guilds, legal pages, patch notes, backups, and support queues',
        contentFr: '- Synchronisation Battle.net des personnages, appartenances de guilde et cache des membres\n- Gestion multi-rosters des vœux avec workflow de validation\n- Sondages de guilde avancés (sections, ciblage, logique conditionnelle)\n- Forum complet avec modération, sanctions et notifications temps réel\n- Back office admin pour utilisateurs, guildes, pages légales, patch notes, sauvegardes et files de support',
        tags: ['features', 'platform'],
      },
      {
        titleEn: 'Tech stack',
        titleFr: 'Stack technique',
        contentEn: '- Frontend: React 18 + TypeScript + Vite\n- UI: Tailwind CSS + shadcn/ui\n- Backend: Supabase (PostgreSQL + Edge Functions)\n- Auth/session: Supabase Auth + Battle.net OAuth linking\n- Data fetching: React Query',
        contentFr: '- Frontend : React 18 + TypeScript + Vite\n- UI : Tailwind CSS + shadcn/ui\n- Backend : Supabase (PostgreSQL + Edge Functions)\n- Auth/session : Supabase Auth + liaison OAuth Battle.net\n- Data fetching : React Query',
        tags: ['technical', 'architecture'],
      },
    ],
  },
  {
    id: 'authentication',
    titleEn: 'Authentication',
    titleFr: 'Authentification',
    icon: Lock,
    color: 'text-status-success',
    subsections: [
      {
        titleEn: 'Battle.net login flow',
        titleFr: 'Flux de connexion Battle.net',
        contentEn: 'Primary flow for WoW users:\n1. Frontend requests `battlenet-auth/auth-url`\n2. User authenticates on Blizzard\n3. Callback calls `battlenet-auth/login` (or `callback` for account linking)\n4. Guildforce establishes Supabase session and stores Battle.net linkage\n5. Character and guild sync starts automatically',
        contentFr: 'Flux principal pour les joueurs WoW :\n1. Le frontend demande `battlenet-auth/auth-url`\n2. L\'utilisateur s\'authentifie chez Blizzard\n3. Le callback appelle `battlenet-auth/login` (ou `callback` pour lier un compte existant)\n4. Guildforce crée la session Supabase et enregistre la liaison Battle.net\n5. La synchronisation personnages/guildes démarre automatiquement',
        tags: ['auth', 'battlenet', 'oauth'],
      },
      {
        titleEn: 'Email fallback',
        titleFr: 'Fallback email',
        contentEn: 'A collapsible email/password form is available for existing accounts. It is a secondary fallback path; Battle.net remains the main entry point for guild synchronization features.',
        contentFr: 'Un formulaire email/mot de passe repliable existe pour les comptes déjà créés. C\'est un chemin de secours ; Battle.net reste l\'entrée principale pour les fonctionnalités de synchronisation de guilde.',
        tags: ['auth', 'email'],
      },
      {
        titleEn: 'Session lifecycle',
        titleFr: 'Cycle de vie de session',
        contentEn: 'Sessions are managed by Supabase Auth and exposed by AuthContext (`user`, `profile`, `loading`, `signOut`). Sessions persist in localStorage. If a linked Battle.net profile exists, a background resync is triggered on sign-in.',
        contentFr: 'Les sessions sont gérées par Supabase Auth et exposées via AuthContext (`user`, `profile`, `loading`, `signOut`). Les sessions persistent dans localStorage. Si un profil Battle.net est lié, une resynchronisation en arrière-plan est déclenchée à la connexion.',
        tags: ['auth', 'session'],
      },
      {
        titleEn: 'Admin user switch',
        titleFr: 'Bascule admin vers un utilisateur',
        contentEn: 'Global admins can start a full sign-in-as-user session from the admin user table for debugging. The original admin Supabase session is stored in `sessionStorage`, the live session is swapped to the target user via a backend-generated magic link, and a persistent banner allows one-click restoration to `/admin?section=users`.',
        contentFr: 'Les administrateurs globaux peuvent ouvrir une vraie session "se connecter en tant que" depuis la table des utilisateurs admin pour le debug. La session Supabase d\'origine est stockée dans `sessionStorage`, la session active est basculée vers l\'utilisateur cible via un magic link généré côté backend, et un bandeau persistant permet un retour en un clic vers `/admin?section=users`.',
        tags: ['auth', 'admin', 'debug'],
      },
    ],
  },
  {
    id: 'battlenet-sync',
    titleEn: 'Battle.net Synchronization',
    titleFr: 'Synchronisation Battle.net',
    icon: RefreshCw,
    color: 'text-status-info',
    subsections: [
      {
        titleEn: 'Characters and guild memberships',
        titleFr: 'Personnages et appartenances de guilde',
        contentEn: 'Character sync writes to `wow_characters` and `wow_guild_memberships`. Main character selection is supported. Sync logic includes region fallback and updates membership/rank metadata used by permissions and roster analytics.',
        contentFr: 'La synchronisation des personnages écrit dans `wow_characters` et `wow_guild_memberships`. Le choix du personnage principal est pris en charge. La logique de sync inclut un fallback de région et met à jour les métadonnées de rang utilisées par les permissions et les analyses de roster.',
        tags: ['battlenet', 'sync', 'characters'],
      },
      {
        titleEn: 'Guild member cache',
        titleFr: 'Cache des membres de guilde',
        contentEn: '`guild_roster_cache` stores the full Blizzard guild member list per guild with rank data and character matching (`matched_user_id`, `matched_character_id`). Manual resync is available and scheduled sync endpoints are provided for background refresh. When a guild is still orphaned locally, a unique matched GM row in this cache can now claim `guilds.owner_id` and seed the GM membership row.',
        contentFr: '`guild_roster_cache` stocke la liste complète des membres Blizzard par guilde avec les rangs et le matching de personnages (`matched_user_id`, `matched_character_id`). Une resynchronisation manuelle est disponible et des endpoints de sync planifiée existent pour le rafraîchissement en arrière-plan. Quand une guilde est encore orpheline localement, une ligne GM matchée de façon unique dans ce cache peut désormais renseigner `guilds.owner_id` et créer la ligne GM dans `guild_members`.',
        tags: ['battlenet', 'sync', 'members'],
      },
      {
        titleEn: 'Spell/effect data sync',
        titleFr: 'Synchronisation des sorts/effets',
        contentEn: 'Raid utility data uses `raid_effects` + `wow_spells`. The `sync-wow-spells` edge function fetches localized spell metadata (EN/FR) and updates cache entries used by roster analytics and composition tooling.',
        contentFr: 'Les données d\'utilité raid utilisent `raid_effects` + `wow_spells`. L\'edge function `sync-wow-spells` récupère les métadonnées localisées des sorts (EN/FR) et met à jour le cache utilisé par les analyses de roster et les outils de composition.',
        tags: ['battlenet', 'spells', 'raid'],
      },
    ],
  },
  {
    id: 'guilds',
    titleEn: 'Guild System',
    titleFr: 'Système de guildes',
    icon: Shield,
    color: 'text-primary',
    subsections: [
      {
        titleEn: 'Auto-creation and ownership',
        titleFr: 'Création automatique et propriété',
        contentEn: 'Guilds are auto-created from Battle.net sync when relevant data is available. Guild ownership follows WoW GM state and can be transferred automatically when GM status changes.',
        contentFr: 'Les guildes sont créées automatiquement depuis la synchronisation Battle.net lorsque les données le permettent. La propriété de guilde suit l\'état GM WoW et peut être transférée automatiquement en cas de changement de GM.',
        tags: ['guilds', 'ownership'],
      },
      {
        titleEn: 'Guild renames (reconciliation)',
        titleFr: 'Renommage de guilde (réconciliation)',
        contentEn: 'On Blizzard, a guild is identified by (region, realm, guild name). If a WoW guild is renamed, a naive sync would treat it as a different guild and risk orphaning the existing `guilds.id` (and all linked data).\n\nTo prevent data loss, when a user is GM in WoW and the current guild name cannot be found in `guilds`, Guildforce attempts a safe reconciliation: it searches for an existing guild on the same realm that is strongly linked to that user (owner or GM). If exactly one candidate is found, that guild can be renamed to the current WoW name to preserve the same `guild_id`.\n\nSafety gates:\n- The old guild name must no longer exist on Blizzard (404).\n- The cached old member list must strongly overlap the new Blizzard member list (to avoid accidental merges for disband + new guild scenarios).\n\nIf checks fail (or multiple candidates exist), reconciliation is skipped and admin/manual resolution is required.',
        contentFr: 'Côté Blizzard, une guilde est identifiée par (région, royaume, nom de guilde). Si une guilde WoW est renommée, une synchronisation naïve peut la traiter comme une guilde différente et risquer de rendre orphelin le `guilds.id` existant (et toutes les données liées).\n\nPour éviter la perte de données, quand un utilisateur est GM en WoW et que le nom actuel n\'est pas trouvé dans `guilds`, Guildforce tente une réconciliation sécurisée : recherche d\'une guilde existante sur le même royaume fortement liée à cet utilisateur (owner ou GM). Si un seul candidat est trouvé, la guilde peut être renommée avec le nom WoW actuel afin de conserver le même `guild_id`.\n\nGarde-fous:\n- L\'ancien nom ne doit plus exister côté Blizzard (404).\n- Le cache des membres de l\'ancienne guilde doit fortement recouper la liste Blizzard de la nouvelle guilde (pour éviter les fusions accidentelles en cas de guilde supprimée puis recréée).\n\nSi les vérifications échouent (ou s\'il y a plusieurs candidats), la réconciliation est ignorée et une résolution admin/manuelle est nécessaire.',
        tags: ['guilds', 'battlenet', 'sync', 'rename', 'data-integrity'],
      },
      {
        titleEn: 'Guild members and statuses',
        titleFr: 'Membres et statuts',
        contentEn: '`guild_members` links users to guilds and tracks role/status (`confirmed`, `potential`, `withdrawn`). This status is used by member-facing features and guild member cache visibility policies. For freshly synced Guild Masters, Guildforce also treats `guilds.owner_id` as a first-class ownership signal so the GM can still see and open the guild even if the mirrored `guild_members` row is late.',
        contentFr: '`guild_members` relie les utilisateurs aux guildes et suit rôle/statut (`confirmed`, `potential`, `withdrawn`). Ce statut est utilisé par les fonctionnalités membres et les politiques de visibilité du cache des membres. Pour les GM fraîchement synchronisés, Guildforce traite aussi `guilds.owner_id` comme un signal de propriété de premier niveau afin que le GM puisse voir et ouvrir la guilde même si la ligne miroir dans `guild_members` arrive en retard.',
        tags: ['guilds', 'members'],
      },
      {
        titleEn: 'Delegated guild permissions',
        titleFr: 'Permissions de guilde déléguées',
        contentEn: '`guild_permissions` delegates key actions (`manage_wishes`, `manage_polls`, `manage_rosters`, `view_activity_log`, `manage_vault`, `view_vault_audit`, `manage_atlas`) with `rank` and `user` rules. GM users always keep implicit full control. The Battle.net-tracked guild owner (`guilds.owner_id`) is also treated as an effective GM by permission helpers so a freshly claimed GM does not lose settings access if the mirrored `guild_members` role is stale.',
        contentFr: '`guild_permissions` délègue les actions clés (`manage_wishes`, `manage_polls`, `manage_rosters`, `view_activity_log`, `manage_vault`, `view_vault_audit`, `manage_atlas`) avec des règles `rank` et `user`. Les GM gardent toujours un contrôle implicite complet. Le propriétaire de guilde suivi depuis Battle.net (`guilds.owner_id`) est aussi traité comme un GM effectif par les helpers de permission afin qu’un GM venant de claim sa guilde ne perde pas l’accès aux réglages si le rôle miroir dans `guild_members` est en retard.',
        tags: ['guilds', 'permissions'],
      },
      {
        titleEn: 'Guild navigation preferences',
        titleFr: 'Préférences de navigation guilde',
        contentEn: '`user_guild_navigation_preferences` stores per-user switcher state: favorite guilds and the last visited timestamp. It improves navigation speed between guild workspaces but does not grant guild access or change any guild permission helper.',
        contentFr: '`user_guild_navigation_preferences` stocke l’état du switcher par utilisateur : guildes favorites et date de dernière visite. Cette table accélère la navigation entre workspaces de guilde mais ne donne aucun accès guilde et ne modifie aucun helper de permission.',
        tags: ['guilds', 'navigation', 'preferences'],
      },
      {
        titleEn: 'Guild Vault',
        titleFr: 'Coffre de guilde',
        contentEn: '`guild_secrets` provides a guild-scoped vault for shared operational credentials, API tokens, secure notes, and recovery codes. It is exposed as a first-class guild workspace for authorized members, separate from admin settings. Secrets are stored as encrypted versions and exposed only through server-validated reveal/copy flows. Access is split between global guild permissions (`manage_vault`, `view_vault_audit`) and per-secret capability rules (`metadata`, `reveal`, `manage`, `audit`). Rank-based rules are evaluated from the current `guild_roster_cache` entries matched to the user, so stale character membership rows do not keep vault access alive. Secret cards can also carry an optional `illustration_url`, stored as a public storage asset while the secret value itself remains encrypted.',
        contentFr: '`guild_secrets` fournit un coffre de guilde pour les identifiants partagés, tokens API, notes sécurisées et codes de secours. Il est exposé comme un espace principal de guilde pour les membres autorisés, distinct des réglages d’administration. Les secrets sont stockés sous forme de versions chiffrées et ne sont exposés qu\'au travers de flux reveal/copy validés côté serveur. L\'accès combine des permissions globales de guilde (`manage_vault`, `view_vault_audit`) et des règles fines par secret (`metadata`, `reveal`, `manage`, `audit`). Les règles par rang sont évaluées depuis les entrées actuelles de `guild_roster_cache` rattachées à l’utilisateur, afin que d’anciennes lignes de membership de personnage ne conservent pas l’accès au coffre. Les cartes de secret peuvent aussi porter une `illustration_url` optionnelle, stockée comme asset public, tandis que la valeur du secret reste chiffrée.',
        tags: ['guilds', 'vault', 'security', 'permissions'],
      },
      {
        titleEn: 'Guild Atlas',
        titleFr: 'Atlas de guilde',
        contentEn: '`guild_atlas_documents` stores guild-scoped knowledge articles for rules, onboarding, raid guides, addon setup, recruitment process notes, and officer-maintained resources. Atlas is exposed as a first-class guild workspace with a searchable library, lightweight free-text collections, tags, an article reader, and dedicated create/edit pages using the shared Markdown editor. Atlas documents can embed responsive images from external URLs or the public `guild-atlas-images` storage bucket, whose writes are limited to GMs and delegated `manage_atlas` users. Published documents can target all confirmed members, officer ranks, a rank threshold, or a specific roster. Drafts and archived documents remain visible only to GMs and delegated `manage_atlas` users.',
        contentFr: '`guild_atlas_documents` stocke des articles de connaissance rattachés à une guilde : règles, onboarding, guides raid, configuration d’addons, processus de recrutement et ressources maintenues par les officiers. Atlas est exposé comme un espace de guilde à part entière avec bibliothèque consultable, collections libres légères, tags, lecteur d’articles et pages dédiées de création/édition basées sur l’éditeur Markdown partagé. Les documents Atlas peuvent intégrer des images responsives depuis des URLs externes ou depuis le bucket public `guild-atlas-images`, dont l’écriture est réservée aux GM et aux utilisateurs délégués `manage_atlas`. Les documents publiés peuvent cibler tous les membres confirmés, les rangs officiers, un seuil de rang ou un roster précis. Les brouillons et archives restent visibles uniquement aux GM et aux utilisateurs délégués `manage_atlas`.',
        tags: ['guilds', 'atlas', 'knowledge', 'docs', 'permissions'],
      },
    ],
  },
  {
    id: 'rosters',
    titleEn: 'Roster System',
    titleFr: 'Système de rosters',
    icon: Layers,
    color: 'text-status-warning',
    subsections: [
      {
        titleEn: 'Multi-roster model',
        titleFr: 'Modèle multi-rosters',
        contentEn: 'Each guild can maintain multiple rosters (main raid, alt run, etc.) with one default roster. Wishes and poll targeting can be tied to a specific roster for clearer planning boundaries.',
        contentFr: 'Chaque guilde peut maintenir plusieurs rosters (raid principal, rerolls, etc.) avec un roster par défaut. Les vœux et le ciblage des sondages peuvent être liés à un roster précis pour des périmètres de planification plus clairs.',
        tags: ['rosters', 'planning'],
      },
      {
        titleEn: 'Roster access rules',
        titleFr: 'Règles d\'accès roster',
        contentEn: '`roster_access_rules` supports `rank` ranges and explicit `user` grants. `has_roster_access()` is the canonical check used by RLS and client queries.',
        contentFr: '`roster_access_rules` supporte les plages de `rank` et les accès `user` explicites. `has_roster_access()` est le contrôle canonique utilisé par les politiques RLS et les requêtes côté client.',
        tags: ['rosters', 'access', 'security'],
      },
      {
        titleEn: 'Operational tooling',
        titleFr: 'Outillage opérationnel',
        contentEn: 'RosterManager, access editors, filters, analytics, and export utilities are built around roster isolation so officers can organize recruitment and composition by team.',
        contentFr: 'RosterManager, éditeurs d\'accès, filtres, analytics et utilitaires d\'export sont construits autour de l\'isolation des rosters afin que les officiers organisent recrutement et composition par équipe.',
        tags: ['rosters', 'operations'],
      },
    ],
  },
  {
    id: 'wishes',
    titleEn: 'Wish System',
    titleFr: 'Système de vœux',
    icon: ClipboardList,
    color: 'text-status-warning',
    subsections: [
      {
        titleEn: 'Wish model',
        titleFr: 'Modèle de vœux',
        contentEn: '`class_wishes` stores ordered class choices per roster (`choice_index`, `class_id`, `spec_ids`, `spec_order`, comments). `spec_order` keeps the per-wish spec priority (index 1 = main). Members can define up to 13 class wishes, mirroring the WoW class set. For guild members not yet on Guildforce, `external_member_wishes` stores manual entries linked to `guild_roster_cache`, including manager-edited `commitment_status`, then auto-transfers them to `class_wishes` (and syncs guild member status) once character matching resolves. Final raid decisions now live in `roster_member_selection` with status, optional reason code, manager-only comment, and decision audit fields, targeting either (`roster_id` + `user_id`) for linked users or (`roster_id` + `roster_cache_id`) for external adds. A legacy backfill also pre-sets `selected` for confirmed members who already had at least one approved wish validated by a GM or wish manager, without overwriting explicit non-`undecided` decisions.',
        contentFr: '`class_wishes` stocke les choix de classes ordonnés par roster (`choice_index`, `class_id`, `spec_ids`, `spec_order`, commentaires). `spec_order` conserve la priorité des spécialisations par vœu (index 1 = main). Les membres peuvent définir jusqu\'à 13 vœux de classes, alignés sur l\'ensemble des classes WoW. Pour les membres de guilde non encore inscrits sur Guildforce, `external_member_wishes` stocke les entrées manuelles liées à `guild_roster_cache`, avec un `commitment_status` éditable par les gérants, puis les transfère automatiquement vers `class_wishes` (et synchronise le statut du membre) dès que le matching personnage/utilisateur est résolu. Les décisions finales de roster vivent désormais dans `roster_member_selection` avec statut, code de raison optionnel, commentaire réservé aux gérants et champs d\'audit de décision, avec ciblage soit (`roster_id` + `user_id`) pour les utilisateurs liés, soit (`roster_id` + `roster_cache_id`) pour les ajouts externes. Un backfill historique pré-renseigne aussi `selected` pour les membres confirmés ayant déjà au moins un vœu approuvé et validé par un GM ou un gérant des vœux, sans écraser les décisions explicites différentes de `undecided`.',
        tags: ['wishes', 'classes'],
      },
      {
        titleEn: 'Wish seasons',
        titleFr: 'Saisons de vœux',
        contentEn: '`guild_seasons` scopes roster planning into draft, active, and archived seasons. Only one season can be active per guild. `class_wishes`, `external_member_wishes`, `roster_member_selection`, and `guild_season_member_intents` are season-scoped so historical wishes, commitments, validation decisions, and roster decisions remain reviewable after a season is archived. New seasons are created through `prepare_guild_wish_season()`, which can archive the current active season, optionally prefill wishes from a previous season, and reset copied validation fields to pending. Archived and draft seasons are read-only for member editing; RLS and `upsert_member_roster_wishes()` enforce active-season edits.',
        contentFr: '`guild_seasons` découpe la planification roster en saisons brouillon, active et archivée. Une seule saison peut être active par guilde. `class_wishes`, `external_member_wishes`, `roster_member_selection` et `guild_season_member_intents` sont rattachés à la saison afin que les vœux, engagements, validations et décisions roster historiques restent consultables après archivage. Les nouvelles saisons passent par `prepare_guild_wish_season()`, qui peut archiver la saison active, préremplir les vœux depuis une saison précédente et remettre les validations copiées en attente. Les saisons archivées et brouillon sont en lecture seule pour les membres ; la RLS et `upsert_member_roster_wishes()` imposent les éditions uniquement sur la saison active.',
        tags: ['wishes', 'seasons', 'rosters', 'security'],
      },
      {
        titleEn: 'Validation workflow',
        titleFr: 'Workflow de validation',
        contentEn: 'Validation fields (`validation_status`, `validated_by`, `validated_at`) support officer review. GM or delegated managers can approve, reject, reset to pending, and edit entries inline.',
        contentFr: 'Les champs de validation (`validation_status`, `validated_by`, `validated_at`) permettent la revue officier. Les GM ou gestionnaires délégués peuvent approuver, rejeter, remettre en attente et éditer en ligne.',
        tags: ['wishes', 'validation'],
      },
      {
        titleEn: 'Commitment status',
        titleFr: 'Statut d\'engagement',
        contentEn: 'Commitment is tracked at guild member level (`confirmed`, `potential`, `withdrawn`) and complements wish priorities to distinguish intent from availability.',
        contentFr: 'L\'engagement est suivi au niveau membre de guilde (`confirmed`, `potential`, `withdrawn`) et complète les priorités de vœux pour distinguer l\'intention de la disponibilité.',
        tags: ['wishes', 'commitment'],
      },
      {
        titleEn: 'Wish locking and deadlines',
        titleFr: 'Verrouillage des vœux et deadlines',
        contentEn: 'Roster locks use `rosters.wishes_locked` with optional scheduling via `wishes_lock_at`. Member overrides live in `guild_members.wishes_locked`. RLS enforcement relies on `can_edit_wishes()`, while admin RPCs `lock_roster_wishes`, `unlock_roster_wishes`, `schedule_roster_wishes_lock`, `set_member_wishes_locked`, `upsert_member_roster_wishes`, `remove_guild_member_with_wishes`, `upsert_external_member_wish`, and `delete_external_member_wish` power manual controls. Selection decisions are consumed through `get_roster_member_selection(p_roster_id)` so managers can see full rationale while regular members get status + reason only. Global app admins may also call this RPC in read-only mode for guild audits, but manager-only comments stay masked unless the caller is GM/manage_wishes. The migration recreates the canonical UUID overload of `get_roster_member_selection` explicitly to avoid stale replace-signature drift. Decision writes on `roster_member_selection` require GM/manage_wishes and validate target scope (guild member or unmatched `guild_roster_cache` external). Direct table SELECT on `roster_member_selection` is restricted to GM/manage_wishes to prevent comment leakage. `has_roster_access()` also normalizes realm display names vs realm slugs so localized guild servers still match synced Battle.net ranks. Scheduled locks run via `apply_scheduled_wish_locks()`.',
        contentFr: 'Les verrous roster utilisent `rosters.wishes_locked` avec planification via `wishes_lock_at`. Les verrous membres sont stockés dans `guild_members.wishes_locked`. La RLS s\'appuie sur `can_edit_wishes()` et les RPCs `lock_roster_wishes`, `unlock_roster_wishes`, `schedule_roster_wishes_lock`, `set_member_wishes_locked`, `upsert_member_roster_wishes`, `remove_guild_member_with_wishes`, `upsert_external_member_wish` et `delete_external_member_wish` pour les actions manuelles. Les décisions de sélection sont lues via `get_roster_member_selection(p_roster_id)` pour afficher le commentaire uniquement aux gérants, alors que les membres standards voient seulement le statut + la raison. Les admins globaux de l’application peuvent aussi appeler cette RPC en lecture seule pour les audits de guilde, mais les commentaires réservés aux gérants restent masqués tant que l’appelant n’est pas GM/gérant des vœux. La migration recrée explicitement la surcharge UUID canonique de `get_roster_member_selection` pour éviter les dérives de signature liées à `CREATE OR REPLACE`. Les écritures dans `roster_member_selection` exigent GM/manage_wishes et valident le périmètre cible (membre de guilde ou externe non matché via `guild_roster_cache`). Le SELECT direct sur `roster_member_selection` est restreint aux GM/gérants de vœux pour éviter les fuites de commentaires. Les verrous programmés passent par `apply_scheduled_wish_locks()`.',
        tags: ['wishes', 'rosters', 'security', 'scheduling'],
      },
      {
        titleEn: 'Manager lock override',
        titleFr: 'Override gérant sur verrou',
        contentEn: 'GM and `manage_wishes` actors may still correct a linked member\'s commitment and wishes through `upsert_member_roster_wishes()` and `upsert_external_member_wish()` when a roster/member lock would block regular self-service edits. Global read-only admins do not inherit this override.',
        contentFr: 'Les GM et acteurs `manage_wishes` peuvent toujours corriger l\'engagement et les vœux d\'un membre lié via `upsert_member_roster_wishes()` et `upsert_external_member_wish()` lorsqu\'un verrou roster ou membre bloquerait une édition classique. Les admins globaux en lecture seule ne bénéficient pas de cet override.',
        tags: ['wishes', 'security', 'rosters', 'commitment'],
      },
      {
        titleEn: 'Wish automation rules',
        titleFr: 'Règles automatiques des vœux',
        contentEn: 'Wish automation is now actor-aware. Self-edits only reset validation on the slots that actually changed, preserve commitment unless the member explicitly edits it, and reset roster decision to `undecided` only when wishes changed or when a confirmed member downgrades commitment from `confirmed` while currently `selected`/`bench`. GM or `manage_wishes` edits never auto-reset validation or roster decision; only the fields explicitly edited by the manager change. External manual entries also keep their validation/commitment/decision state when they are later linked to a Guildforce user, and external data wins on same-roster conflict during claim transfer.',
        contentFr: 'Les automatismes des vœux dépendent désormais de l’acteur. Les auto-éditions membre ne remettent en attente que les slots réellement modifiés, conservent l’engagement tant que le membre ne le change pas explicitement, et ne repassent la décision roster à `undecided` que si les vœux changent ou si un membre confirmé baisse son engagement depuis `confirmed` alors qu’il était `selected`/`bench`. Les éditions GM ou `manage_wishes` ne réinitialisent jamais automatiquement la validation ni la décision roster : seules les valeurs modifiées par le gérant changent. Les entrées externes manuelles conservent aussi leur validation, engagement et décision lors du claim vers un utilisateur Guildforce, avec priorité aux données externes en cas de conflit sur le même roster.',
        tags: ['wishes', 'validation', 'commitment', 'security', 'rosters'],
      },
    ],
  },
  {
    id: 'polls',
    titleEn: 'Poll System',
    titleFr: 'Système de sondages',
    icon: BarChart3,
    color: 'text-primary',
    subsections: [
      {
        titleEn: 'Data model and lifecycle',
        titleFr: 'Modèle de données et cycle de vie',
        contentEn: 'Polls are stored in `guild_polls` + sections/questions/responses tables. Main lifecycle states are `draft`, `active`, and `closed`. Polls support anonymous mode and optional multiple responses.',
        contentFr: 'Les sondages sont stockés dans `guild_polls` + tables de sections/questions/réponses. Les états principaux sont `draft`, `active` et `closed`. Les sondages supportent le mode anonyme et l\'option de réponses multiples.',
        tags: ['polls', 'lifecycle'],
      },
      {
        titleEn: 'Question capabilities',
        titleFr: 'Capacités des questions',
        contentEn: 'Supported types: `single_choice`, `multiple_choice`, `text`, `rating`, `date`, `time`, `datetime`, `ranking`, `scale`. Questions can include options, "other" input, scale configs, conditional display rules, and an `analysis_intent` (`decision` or `informative`) that controls whether the question feeds consensus/divisive result signals.',
        contentFr: 'Types supportés : `single_choice`, `multiple_choice`, `text`, `rating`, `date`, `time`, `datetime`, `ranking`, `scale`. Les questions peuvent inclure options, champ "autre", configuration d\'échelle, règles conditionnelles d\'affichage, et un `analysis_intent` (`decision` ou `informative`) qui contrôle la participation de la question aux signaux de consensus/division.',
        tags: ['polls', 'questions'],
      },
      {
        titleEn: 'Respondent targeting vs results access',
        titleFr: 'Ciblage répondants vs accès résultats',
        contentEn: 'Two independent rule systems exist:\n- `poll_respondent_rules` + `can_respond_to_poll()` control who can answer\n- `poll_results_access_rules` + `get_poll_question_results_visibility()` / `can_view_poll_results()` control who can view outcomes\nResults access is hierarchical by target (`question` > `section` > `question_type` > `poll`) with audience targets (`base_audience`, `rank_range`, `user`) and visibility levels (`none`, `non_text`, `full`).',
        contentFr: 'Deux systèmes de règles indépendants existent :\n- `poll_respondent_rules` + `can_respond_to_poll()` contrôlent qui peut répondre\n- `poll_results_access_rules` + `get_poll_question_results_visibility()` / `can_view_poll_results()` contrôlent qui peut voir les résultats\nL\'accès aux résultats est hiérarchique par cible (`question` > `section` > `question_type` > `poll`) avec audiences (`base_audience`, `rank_range`, `user`) et niveaux (`none`, `non_text`, `full`).',
        tags: ['polls', 'access', 'security'],
      },
      {
        titleEn: 'Poll defaults for results visibility',
        titleFr: 'Paramètres par défaut de visibilité',
        contentEn: 'Each poll now stores `results_base_audience` (`guild_members`, `eligible_respondents`, `restricted`) and `results_base_visibility` (`none`, `non_text`, `full`). This defines the baseline before overrides are evaluated.',
        contentFr: 'Chaque sondage stocke désormais `results_base_audience` (`guild_members`, `eligible_respondents`, `restricted`) et `results_base_visibility` (`none`, `non_text`, `full`). Cette base est évaluée avant les surcharges.',
        tags: ['polls', 'access', 'security'],
      },
      {
        titleEn: 'Poll read access is RLS-aligned',
        titleFr: 'Accès lecture des sondages aligné sur la RLS',
        contentEn: 'Poll read access now stays aligned between frontend checks and database policies. `guild_polls`, `guild_poll_questions`, `guild_poll_sections`, and `guild_poll_responses` all follow the same split between `can_respond_to_poll()` and `can_view_poll_results()`, so a closed poll cannot appear configurable in the editor while still being hidden by base-table RLS.',
        contentFr: 'L\'accès en lecture des sondages reste désormais aligné entre les contrôles frontend et les politiques base de données. `guild_polls`, `guild_poll_questions`, `guild_poll_sections` et `guild_poll_responses` suivent tous la même séparation entre `can_respond_to_poll()` et `can_view_poll_results()`, afin qu\'un sondage fermé ne puisse plus sembler bien configuré dans l\'éditeur tout en restant masqué par la RLS des tables de base.',
        tags: ['polls', 'access', 'security', 'rls'],
      },
      {
        titleEn: 'Cohort analysis on poll results',
        titleFr: 'Analyse de cohorte sur les résultats',
        contentEn: 'Poll results now support manager-only cohort analysis through `get_poll_results_cohort_analysis()`. Guild GMs and members with `manage_polls` can filter results by prior answers using AND logic. Anonymous polls apply extra safeguards in cohort mode: no identities, no free-text answers, and redaction when the filtered sample drops below 5 respondents.',
        contentFr: 'Les résultats de sondage supportent désormais une analyse de cohorte réservée aux gestionnaires via `get_poll_results_cohort_analysis()`. Les GM et membres disposant de `manage_polls` peuvent filtrer les résultats selon des réponses préalables en logique ET. Les sondages anonymes appliquent des garde-fous supplémentaires en mode cohorte : aucune identité, aucun texte libre, et masquage quand l\'échantillon filtré passe sous 5 répondants.',
        tags: ['polls', 'analytics', 'security'],
      },
      {
        titleEn: 'GM-triggered AI summaries for closed text questions',
        titleFr: 'Résumés IA déclenchés par le GM sur les questions texte fermées',
        contentEn: 'Closed poll text questions can expose cached AI summaries generated only on explicit GM action through the `poll-results-ai-summary` edge function. The function verifies the caller via bearer token, confirms `is_guild_gm()`, keeps question-level visibility aligned with `get_poll_question_results_visibility()`, then reads raw text answers server-side and caches one summary per (`question_id`, `locale`) in `poll_question_ai_summaries`. Cached rows include `model_name`, `prompt_version`, `source_hash`, `status`, `comment_count`, and `generated_by`, so normal result viewers can reuse the latest summary without calling OpenAI themselves. Cohort-filtered result views deliberately skip these AI summaries in v1.',
        contentFr: 'Les questions texte des sondages fermés peuvent exposer des résumés IA mis en cache, générés uniquement sur action explicite du GM via l\'edge function `poll-results-ai-summary`. La fonction valide l\'appelant via bearer token, confirme `is_guild_gm()`, maintient la visibilité question par question alignée sur `get_poll_question_results_visibility()`, puis lit les réponses texte côté serveur et met en cache un résumé par (`question_id`, `locale`) dans `poll_question_ai_summaries`. Les lignes en cache incluent `model_name`, `prompt_version`, `source_hash`, `status`, `comment_count` et `generated_by`, afin que les lecteurs ayant l\'accès normal aux résultats puissent réutiliser le dernier résumé sans appeler OpenAI eux-mêmes. Les vues filtrées par cohorte ignorent volontairement ces résumés IA en v1.',
        tags: ['polls', 'ai', 'openai', 'security'],
      },
    ],
  },
  {
    id: 'forum',
    titleEn: 'Forum System',
    titleFr: 'Système de forum',
    icon: MessageSquare,
    color: 'text-status-info',
    subsections: [
      {
        titleEn: 'Structure',
        titleFr: 'Structure',
        contentEn: 'Forum data model:\n- `forum_categories`: global or guild-scoped categories\n- `forum_topics`: threads\n- `forum_posts`: replies\nCategories support custom icon, color, description, and display order.',
        contentFr: 'Modèle de données forum :\n- `forum_categories` : catégories globales ou liées à une guilde\n- `forum_topics` : sujets\n- `forum_posts` : réponses\nLes catégories supportent icône, couleur, description et ordre d\'affichage.',
        tags: ['forum', 'structure'],
      },
      {
        titleEn: 'Interactions and realtime',
        titleFr: 'Interactions et temps réel',
        contentEn: 'Users can react (`forum_reactions`), mention members, quote posts, and subscribe to topics (`forum_topic_subscriptions`). Realtime channels propagate updates without full page reloads.',
        contentFr: 'Les utilisateurs peuvent réagir (`forum_reactions`), mentionner des membres, citer des posts et s\'abonner aux sujets (`forum_topic_subscriptions`). Les canaux temps réel propagent les mises à jour sans rechargement complet de page.',
        tags: ['forum', 'realtime'],
      },
      {
        titleEn: 'Moderation pipeline',
        titleFr: 'Pipeline de modération',
        contentEn: 'Moderation relies on `forum_reports`, `forum_moderators`, and `forum_user_sanctions` (timeout/ban). Moderators can lock/pin topics and process reports with resolution notes.',
        contentFr: 'La modération s\'appuie sur `forum_reports`, `forum_moderators` et `forum_user_sanctions` (timeout/ban). Les modérateurs peuvent verrouiller/épingler les sujets et traiter les signalements avec notes de résolution.',
        tags: ['forum', 'moderation'],
      },
    ],
  },
  {
    id: 'notifications',
    titleEn: 'Notifications',
    titleFr: 'Notifications',
    icon: Bell,
    color: 'text-status-error',
    subsections: [
      {
        titleEn: 'Notification model',
        titleFr: 'Modèle de notification',
        contentEn: '`forum_notifications` tracks per-user events with linkage to topic/post/trigger author. Current types include mention, reply, and reaction.',
        contentFr: '`forum_notifications` suit les événements par utilisateur avec lien vers sujet/post/auteur déclencheur. Les types actuels incluent mention, réponse et réaction.',
        tags: ['notifications', 'forum'],
      },
      {
        titleEn: 'NotificationBell behavior',
        titleFr: 'Comportement de NotificationBell',
        contentEn: 'The NotificationBell subscribes to realtime inserts/updates, displays unread counts, marks entries as read, and deep-links directly to related forum content.',
        contentFr: 'NotificationBell s\'abonne aux insertions/mises à jour temps réel, affiche le compteur de non-lus, marque les éléments comme lus et redirige directement vers le contenu forum concerné.',
        tags: ['notifications', 'realtime'],
      },
    ],
  },
  {
    id: 'command-palette',
    titleEn: 'Command Palette',
    titleFr: 'Palette de commandes',
    icon: Search,
    color: 'text-primary',
    subsections: [
      {
        titleEn: 'Navigation accelerator',
        titleFr: 'Accélérateur de navigation',
        contentEn: 'The Guildforce Command Palette is opened from the topbar or with `Ctrl/Cmd+K`. It replaces decorative global search with a keyboard-first overlay that can jump to guilds, members, rosters, polls, forum topics, pages, and safe quick actions without relying on the sidebar.',
        contentFr: 'La palette de commandes Guildforce s\'ouvre depuis la topbar ou avec `Ctrl/Cmd+K`. Elle remplace la recherche globale décorative par un overlay keyboard-first capable d\'ouvrir guildes, membres, rosters, sondages, sujets forum, pages et actions rapides sûres sans dépendre de la sidebar.',
        tags: ['command-palette', 'search', 'navigation'],
      },
      {
        titleEn: 'Context-aware search',
        titleFr: 'Recherche contextuelle',
        contentEn: '`search_command_palette()` combines `pg_trgm` matching with explicit permission helper checks. When a guild workspace is active, results from that guild receive a context boost while global search remains limited to spaces the user can access.',
        contentFr: '`search_command_palette()` combine le matching `pg_trgm` avec des contrôles explicites via helpers de permission. Quand un workspace de guilde est actif, les résultats de cette guilde sont priorisés, tandis que la recherche globale reste limitée aux espaces accessibles à l\'utilisateur.',
        tags: ['command-palette', 'search', 'guilds', 'permissions'],
      },
      {
        titleEn: 'Quick actions and recents',
        titleFr: 'Actions rapides et récents',
        contentEn: 'Quick actions open existing workflows only: create poll, open roster, edit wishes, open settings, sync member cache from Battle.net settings, open profile, and open admin when authorized. Activations are stored in `command_palette_recent_items` through `record_command_palette_use()` so the empty state remains useful per account.',
        contentFr: 'Les actions rapides ouvrent uniquement des workflows existants : créer un sondage, ouvrir le roster, modifier les vœux, ouvrir les paramètres, synchroniser le cache membres depuis les réglages Battle.net, ouvrir le profil et ouvrir l\'admin si autorisé. Les activations sont stockées dans `command_palette_recent_items` via `record_command_palette_use()` afin que l\'état vide reste utile par compte.',
        tags: ['command-palette', 'actions', 'recents'],
      },
    ],
  },
  {
    id: 'admin',
    titleEn: 'Administration',
    titleFr: 'Administration',
    icon: Crown,
    color: 'text-status-warning',
    subsections: [
      {
        titleEn: 'App-level roles',
        titleFr: 'Rôles applicatifs',
        contentEn: '`user_roles` stores app roles (`admin`, `moderator`, `user`). Authorization checks are centralized through `has_role()` and role-aware admin navigation.',
        contentFr: '`user_roles` stocke les rôles applicatifs (`admin`, `moderator`, `user`). Les contrôles d\'autorisation sont centralisés via `has_role()` et la navigation admin tient compte du rôle.',
        tags: ['admin', 'roles'],
      },
      {
        titleEn: 'Admin sections',
        titleFr: 'Sections admin',
        contentEn: 'Admin UI covers dashboard, users, permissions, guilds, forum admin, legal pages, patch notes, bug reports, deletion requests, documentation, and backup/export tools.',
        contentFr: 'L\'interface admin couvre tableau de bord, utilisateurs, permissions, guildes, administration forum, pages légales, patch notes, rapports de bugs, demandes de suppression, documentation et outils de sauvegarde/export.',
        tags: ['admin', 'sections'],
      },
      {
        titleEn: 'Support and compliance workflows',
        titleFr: 'Workflows support et conformité',
        contentEn: '`bug_reports` and `account_deletion_requests` provide operational queues. `legal_pages` and `patch_notes` now rely on translation tables (`legal_page_translations`, `patch_note_translations`) for scalable multilingual publishing.',
        contentFr: '`bug_reports` et `account_deletion_requests` fournissent des files opérationnelles. `legal_pages` et `patch_notes` reposent désormais sur des tables de traductions (`legal_page_translations`, `patch_note_translations`) pour une publication multilingue scalable.',
        tags: ['admin', 'support', 'legal'],
      },
    ],
  },
  {
    id: 'security',
    titleEn: 'Security & RLS',
    titleFr: 'Sécurité et RLS',
    icon: Key,
    color: 'text-status-success',
    subsections: [
      {
        titleEn: 'RLS-first policy model',
        titleFr: 'Modèle RLS-first',
        contentEn: 'All business tables run with RLS enabled. Client code must rely on policies instead of bypass logic. Sensitive tables (especially battlenet_tokens) are locked down to self access or privileged backend contexts. Guild deletion allows owner or app admin, and audit logging now safely skips inserts when cascading delete removes the parent guild row first.',
        contentFr: 'Toutes les tables métiers fonctionnent avec RLS activé. Le code client doit s\'appuyer sur les politiques au lieu de contourner la sécurité. Les tables sensibles (notamment battlenet_tokens) sont strictement limitées à l\'auto-accès ou aux contextes backend privilégiés. La suppression de guilde autorise le propriétaire ou un admin applicatif, et le journal d\'activité ignore désormais proprement les insertions quand une suppression en cascade retire d\'abord la guilde parente.',
        tags: ['security', 'rls'],
      },
      {
        titleEn: 'Self-owned navigation metadata',
        titleFr: 'Métadonnées de navigation personnelles',
        contentEn: '`user_guild_navigation_preferences` is RLS-protected with self-only select, insert, update, and delete policies. Rows store navigation metadata only and must never be used as proof of guild membership or authorization.',
        contentFr: '`user_guild_navigation_preferences` est protégée par RLS avec des politiques select, insert, update et delete limitées à l’utilisateur propriétaire. Les lignes stockent uniquement des métadonnées de navigation et ne doivent jamais servir de preuve d’appartenance ou d’autorisation guilde.',
        tags: ['security', 'rls', 'navigation'],
      },
      {
        titleEn: 'Command palette search guardrails',
        titleFr: 'Garde-fous de la palette de commandes',
        contentEn: '`command_palette_recent_items` is self-owned RLS data. `record_command_palette_use()` refuses unsupported item types and verifies guild scope before writing a recent item. `search_command_palette()` is `SECURITY DEFINER` but explicitly gates results through `is_guild_member`, `is_guild_gm`, `has_role`, `has_roster_access`, `has_guild_permission`, `can_respond_to_poll`, and `can_view_poll_results` to avoid leaking inaccessible guild, roster, poll, member, or forum data.',
        contentFr: '`command_palette_recent_items` est une donnée RLS personnelle. `record_command_palette_use()` refuse les types non supportés et vérifie le périmètre guilde avant d\'écrire un récent. `search_command_palette()` est `SECURITY DEFINER`, mais filtre explicitement les résultats via `is_guild_member`, `is_guild_gm`, `has_role`, `has_roster_access`, `has_guild_permission`, `can_respond_to_poll` et `can_view_poll_results` pour éviter toute fuite de guildes, rosters, sondages, membres ou contenus forum non accessibles.',
        tags: ['security', 'rls', 'rpc', 'command-palette'],
      },
      {
        titleEn: 'Helper RPC functions',
        titleFr: 'Fonctions RPC utilitaires',
        contentEn: 'Core helpers include:\n- `has_role`, `has_guild_permission`, `has_roster_access`\n- `is_guild_member`, `is_guild_gm`\n- `are_wishes_locked`, `can_edit_wishes`\n- `can_respond_to_poll`, `get_poll_question_results_visibility`, `can_view_poll_results`\n- `has_any_guild_secret_access`, `can_access_guild_secret`\n- `can_manage_guild_atlas`, `can_view_guild_atlas_document`, `get_user_guild_rank_index`\n- `list_visible_guild_secrets`, `list_guild_secret_audit`\n- `is_user_forum_sanctioned`\n- `get_roster_member_selection` (manager-only decision comments)\n`is_guild_gm` treats both explicit `guild_members.role = \'gm\'` and the synced Battle.net owner on `guilds.owner_id` as GM authority. Use these functions instead of duplicating permission logic in frontend code.',
        contentFr: 'Les helpers principaux incluent :\n- `has_role`, `has_guild_permission`, `has_roster_access`\n- `is_guild_member`, `is_guild_gm`\n- `are_wishes_locked`, `can_edit_wishes`\n- `can_respond_to_poll`, `get_poll_question_results_visibility`, `can_view_poll_results`\n- `has_any_guild_secret_access`, `can_access_guild_secret`\n- `can_manage_guild_atlas`, `can_view_guild_atlas_document`, `get_user_guild_rank_index`\n- `list_visible_guild_secrets`, `list_guild_secret_audit`\n- `is_user_forum_sanctioned`\n- `get_roster_member_selection` (commentaires de décision visibles seulement pour les gérants)\n`is_guild_gm` traite à la fois `guild_members.role = \'gm\'` et le propriétaire Battle.net synchronisé dans `guilds.owner_id` comme une autorité GM. Utiliser ces fonctions plutôt que de dupliquer la logique de permissions côté frontend.',
        tags: ['security', 'rpc', 'permissions'],
      },
      {
        titleEn: 'Poll result rules must match base-table RLS',
        titleFr: 'Les règles de résultats doivent correspondre à la RLS des tables',
        contentEn: 'When poll visibility rules change, update both RPC helpers and RLS together. A permissive result rule is not sufficient if `guild_polls` or the related `guild_poll_questions` / `guild_poll_sections` policies still hide the poll row, question rows, or aggregated response counts.',
        contentFr: 'Quand les règles de visibilité des sondages changent, il faut mettre à jour ensemble les helpers RPC et la RLS. Une règle de résultats permissive ne suffit pas si `guild_polls` ou les politiques liées de `guild_poll_questions` / `guild_poll_sections` masquent encore la ligne du sondage, les lignes de questions ou les compteurs agrégés.',
        tags: ['security', 'polls', 'rpc', 'rls'],
      },
      {
        titleEn: 'AI poll summaries stay server-side',
        titleFr: 'Les résumés IA de sondage restent côté serveur',
        contentEn: '`poll_question_ai_summaries` is backend-only despite RLS being enabled. Frontend code must never query it directly. All reads/writes go through the `poll-results-ai-summary` edge function, which enforces bearer-token auth, closed-poll checks, GM-only generation, and question-level results visibility before using `OPENAI_API_KEY`. This prevents client-side exposure of raw AI cache internals or the OpenAI credential.',
        contentFr: '`poll_question_ai_summaries` reste réservé au backend, même avec la RLS activée. Le frontend ne doit jamais la requêter directement. Toutes les lectures/écritures passent par l\'edge function `poll-results-ai-summary`, qui applique l\'auth bearer token, les contrôles de sondage fermé, la génération réservée au GM et la visibilité question par question avant d\'utiliser `OPENAI_API_KEY`. Cela évite toute exposition côté client du cache IA brut ou du secret OpenAI.',
        tags: ['security', 'polls', 'ai', 'openai'],
      },
      {
        titleEn: 'Secret storage and audit',
        titleFr: 'Stockage des secrets et audit',
        contentEn: 'Guild vault payloads are never stored in plaintext in client-readable tables. `guild_secret_versions` is backend-only and holds encrypted payloads (`AES-GCM`) plus masked previews, while `guild_secret_audit_events` captures create/reveal/copy/rotate/archive/denied-access events without logging secret values. The `list_guild_secret_audit` helper resolves actor usernames for settings-side review. The `guild-vault` edge function performs JWT validation, permission checks, encryption/decryption, and audit writes. Optional secret illustrations live in the `guild-vault-images` storage bucket and are governed by GM / `manage_vault` storage policies.',
        contentFr: 'Les payloads du coffre de guilde ne sont jamais stockés en clair dans des tables lisibles côté client. `guild_secret_versions` reste réservé au backend et contient les valeurs chiffrées (`AES-GCM`) ainsi que des aperçus masqués, tandis que `guild_secret_audit_events` enregistre les événements create/reveal/copy/rotate/archive/access_denied sans journaliser les valeurs secrètes. Le helper `list_guild_secret_audit` résout désormais les noms d\'utilisateur des acteurs pour la revue côté settings. L\'edge function `guild-vault` assure la validation JWT, les contrôles d\'accès, le chiffrement/déchiffrement et l\'écriture de l\'audit. Les illustrations optionnelles des secrets vivent dans le bucket `guild-vault-images` avec des policies Storage réservées aux GM / `manage_vault`.',
        tags: ['security', 'vault', 'audit', 'encryption'],
      },
      {
        titleEn: 'Admin analytics RPC guardrails',
        titleFr: 'Garde-fous RPC analytics admin',
        contentEn: '`get_admin_dashboard_stats()` and `get_admin_dashboard_timeseries()` are `SECURITY DEFINER` and role-gated (`admin` or `moderator` via `has_role`). They expose aggregated dashboard KPIs and UTC time-series (DAU/WAU/MAU rolling windows, WAU/MAU engagement, activation 7D, active guilds 30D, critical backlog, and incident creation volume) without returning raw member-level sensitive records to the client.',
        contentFr: '`get_admin_dashboard_stats()` et `get_admin_dashboard_timeseries()` sont `SECURITY DEFINER` et protégées par rôle (`admin` ou `moderator` via `has_role`). Elles exposent des KPI agrégés et des séries temporelles UTC (fenêtres glissantes DAU/WAU/MAU, engagement WAU/MAU, activation 7j, guildes actives 30j, backlog critique et volume d’incidents créés) sans renvoyer de données sensibles brutes au client.',
        tags: ['security', 'rpc', 'admin', 'analytics'],
      },
      {
        titleEn: 'Event instrumentation guardrails',
        titleFr: "Garde-fous d'instrumentation des événements",
        contentEn: '`track_product_event()` is `SECURITY DEFINER` and accepts only whitelisted event names. It always attributes events to `auth.uid()` to prevent spoofing and is intended for activation/retention analytics. Core feature events (`wish_created`, `poll_voted`, `forum_post_created`) are also captured server-side via DB triggers into `product_events`.',
        contentFr: '`track_product_event()` est `SECURITY DEFINER` et n\'accepte que des noms d\'événements autorisés. Les événements sont toujours attribués à `auth.uid()` pour éviter l\'usurpation et alimenter les analyses d\'activation/rétention. Les événements cœur (`wish_created`, `poll_voted`, `forum_post_created`) sont aussi capturés côté serveur via des triggers DB dans `product_events`.',
        tags: ['security', 'analytics', 'events'],
      },
      {
        titleEn: 'Privacy controls',
        titleFr: 'Contrôles de confidentialité',
        contentEn: 'Privacy-related controls include BattleTag visibility preferences, account deletion requests, cookie consent, and legal page governance. Keep user-facing copy synchronized across supported locales, with EN fallback.',
        contentFr: 'Les contrôles liés à la confidentialité incluent la visibilité BattleTag, les demandes de suppression de compte, le consentement cookies et la gouvernance des pages légales. Maintenir les contenus utilisateurs synchronisés sur toutes les langues supportées, avec fallback EN.',
        tags: ['security', 'privacy', 'gdpr'],
      },
    ],
  },
  {
    id: 'database',
    titleEn: 'Database Schema',
    titleFr: 'Schéma et accès',
    icon: Database,
    color: 'text-slate-400',
    subsections: [
      {
        titleEn: 'Core tables',
        titleFr: 'Tables cœur',
        contentEn: '- `profiles`, `battlenet_tokens`\n- `wow_characters`, `wow_guild_memberships`\n- `guilds`, `guild_members` (includes `wishes_locked`), `guild_roster_cache`, `guild_aliases`\n- `guild_atlas_documents` for guild knowledge articles, collections, and visibility rules\n- `user_guild_navigation_preferences` for self-owned switcher favorites and recent guilds\n- `command_palette_recent_items` for self-owned recent command palette items and action frequency',
        contentFr: '- `profiles`, `battlenet_tokens`\n- `wow_characters`, `wow_guild_memberships`\n- `guilds`, `guild_members` (inclut `wishes_locked`), `guild_roster_cache`, `guild_aliases`\n- `guild_atlas_documents` pour les articles de connaissance de guilde, les collections et les règles de visibilité\n- `user_guild_navigation_preferences` pour les favoris et guildes récentes du switcher personnel\n- `command_palette_recent_items` pour les récents personnels de la palette de commandes et la fréquence des actions',
        tags: ['database', 'core'],
      },
      {
        titleEn: 'Feature tables',
        titleFr: 'Tables de fonctionnalités',
        contentEn: '- Roster/wishes: `rosters` (wishes_locked, wishes_lock_at), `roster_access_rules`, `class_wishes`, `external_member_wishes`, `roster_member_selection`\n- Permissions/activity: `guild_permissions`, `guild_activity_logs`\n- Guild vault: `guild_secrets`, `guild_secret_versions`, `guild_secret_access_rules`, `guild_secret_audit_events`\n- Polls: `guild_polls`, `guild_poll_sections`, `guild_poll_questions`, `guild_poll_responses`, `poll_respondent_rules`, `poll_results_access_rules`, `poll_question_ai_summaries`\n- Product analytics events: `product_events` (+ RPC `track_product_event`)\n- Composition metadata: `raid_effects`, `wow_spells`',
        contentFr: '- Rosters/vœux : `rosters` (wishes_locked, wishes_lock_at), `roster_access_rules`, `class_wishes`, `external_member_wishes`, `roster_member_selection`\n- Permissions/activité : `guild_permissions`, `guild_activity_logs`\n- Coffre de guilde : `guild_secrets`, `guild_secret_versions`, `guild_secret_access_rules`, `guild_secret_audit_events`\n- Sondages : `guild_polls`, `guild_poll_sections`, `guild_poll_questions`, `guild_poll_responses`, `poll_respondent_rules`, `poll_results_access_rules`, `poll_question_ai_summaries`\n- Événements analytics produit : `product_events` (+ RPC `track_product_event`)\n- Métadonnées de composition : `raid_effects`, `wow_spells`',
        tags: ['database', 'features'],
      },
      {
        titleEn: 'Forum tables',
        titleFr: 'Tables forum',
        contentEn: '- `forum_categories`, `forum_topics`, `forum_posts`\n- `forum_reactions`, `forum_topic_subscriptions`, `forum_notifications`\n- `forum_reports`, `forum_moderators`, `forum_user_sanctions`',
        contentFr: '- `forum_categories`, `forum_topics`, `forum_posts`\n- `forum_reactions`, `forum_topic_subscriptions`, `forum_notifications`\n- `forum_reports`, `forum_moderators`, `forum_user_sanctions`',
        tags: ['database', 'forum'],
      },
      {
        titleEn: 'Admin/content tables',
        titleFr: 'Tables admin/contenu',
        contentEn: '- `user_roles`\n- `bug_reports`\n- `legal_pages`, `legal_page_translations`\n- `patch_notes`, `patch_note_translations`\n- `account_deletion_requests`\n- `admin_impersonation_sessions`',
        contentFr: '- `user_roles`\n- `bug_reports`\n- `legal_pages`, `legal_page_translations`\n- `patch_notes`, `patch_note_translations`\n- `account_deletion_requests`\n- `admin_impersonation_sessions`',
        tags: ['database', 'admin'],
      },
      {
        titleEn: 'Analytics RPC',
        titleFr: 'RPC analytics',
        contentEn: 'Admin metrics are served by `get_admin_dashboard_stats()` (snapshot KPIs) and `get_admin_dashboard_timeseries(p_days)` (daily UTC trend points, bounded 14-180 days). Formula highlights: DAU/WAU/MAU rolling windows from core actions, WAU/MAU engagement %, activation 7D by signup-day cohort, active guilds 30D, open critical backlog (`pending_reports + open_bugs + pending_deletions`), and daily incident creation volume (`created_reports + created_bugs + created_deletions`). Keep dashboard labels/tooltips aligned with these formulas.',
        contentFr: 'Les métriques admin sont exposées via `get_admin_dashboard_stats()` (KPI snapshot) et `get_admin_dashboard_timeseries(p_days)` (points de tendance quotidiens UTC, bornés entre 14 et 180 jours). Formules clés : fenêtres glissantes DAU/WAU/MAU basées sur les actions cœur, engagement WAU/MAU %, activation 7j par cohorte de jour d\'inscription, guildes actives 30j, backlog critique ouvert (`pending_reports + open_bugs + pending_deletions`) et volume quotidien d’incidents créés (`created_reports + created_bugs + created_deletions`). Maintenir les labels/tooltips dashboard alignés avec ces formules.',
        tags: ['database', 'analytics', 'admin'],
      },
      {
        titleEn: 'Command palette RPC',
        titleFr: 'RPC palette de commandes',
        contentEn: '`search_command_palette(p_query, p_context_guild_id, p_limit_per_group)` returns typed grouped result candidates for `guild`, `member`, `roster`, `poll`, and `forum`. `record_command_palette_use(...)` records safe activations for recents and frequency ranking. Keep generated Supabase types synchronized when these signatures change.',
        contentFr: '`search_command_palette(p_query, p_context_guild_id, p_limit_per_group)` renvoie des candidats typés pour les groupes `guild`, `member`, `roster`, `poll` et `forum`. `record_command_palette_use(...)` enregistre les activations sûres pour les récents et le ranking par fréquence. Les types Supabase générés doivent rester synchronisés si ces signatures changent.',
        tags: ['database', 'rpc', 'command-palette', 'search'],
      },
    ],
  },
  {
    id: 'guild-rank-labels',
    titleEn: 'Guild Rank Labels',
    titleFr: 'Labels de rangs',
    icon: Crown,
    color: 'text-primary',
    subsections: [
      {
        titleEn: 'Purpose and behavior',
        titleFr: 'But et comportement',
        contentEn: '`guild_rank_labels` lets Guild Masters assign one custom label per numeric guild rank. When present, the custom label replaces the Blizzard rank name everywhere in the UI while all permission checks still rely on `rank_index` only.',
        contentFr: '`guild_rank_labels` permet aux GM d\'attribuer un label personnalisé à chaque rang numérique de la guilde. Lorsqu\'il existe, ce label remplace le nom de rang Blizzard partout dans l\'interface, tandis que toutes les permissions continuent de reposer uniquement sur `rank_index`.',
        tags: ['guilds', 'settings', 'permissions', 'security'],
      },
      {
        titleEn: 'Schema and access',
        titleFr: 'Schéma et accès',
        contentEn: 'The table stores (`guild_id`, `rank_index`, `label`) plus audit-friendly metadata (`created_by`, `updated_by`, timestamps). It is readable by guild members for consistent display and writable only by Guild Masters through RLS.',
        contentFr: 'La table stocke (`guild_id`, `rank_index`, `label`) ainsi que des métadonnées orientées audit (`created_by`, `updated_by`, horodatages). Elle est lisible par les membres de la guilde pour un affichage cohérent, et modifiable uniquement par les GM via la RLS.',
        tags: ['database', 'guilds', 'security'],
      },
    ],
  },
];

export const AdminDocumentation = () => {
  const { language, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

  const currentSection = DOCUMENTATION.find((section) => section.id === activeSection);

  const filteredSections = searchQuery
    ? DOCUMENTATION.map((section) => ({
        ...section,
        subsections: section.subsections.filter((subsection) => {
          const title = getBilingualValue(language, { en: subsection.titleEn, fr: subsection.titleFr });
          const content = getBilingualValue(language, { en: subsection.contentEn, fr: subsection.contentFr });
          const query = searchQuery.toLowerCase();
          return (
            title.toLowerCase().includes(query) ||
            content.toLowerCase().includes(query) ||
            subsection.tags?.some((tag) => tag.toLowerCase().includes(query))
          );
        }),
      })).filter((section) => section.subsections.length > 0)
    : null;

  const sectionsToShow = filteredSections || (currentSection ? [currentSection] : []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display text-foreground">
            {sm('admin.documentation.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {sm('admin.documentation.subtitle')}
          </p>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/admin/design-system">
              <BookOpen className="h-4 w-4 mr-1.5" />
              {language === 'fr' ? 'Design System global' : 'Global Design System'}
            </Link>
          </Button>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder={sm('admin.documentation.search_placeholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border/50 bg-background/50 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                x
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {!searchQuery && (
          <div className="lg:w-56 flex-shrink-0">
            <GlowCard className="p-3">
              <ScrollArea className="h-auto lg:h-[calc(100vh-320px)]">
                <nav className="space-y-1">
                  {DOCUMENTATION.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
                          isActive
                            ? 'bg-primary/20 text-foreground ring-1 ring-primary/50'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        <Icon className={cn('h-4 w-4 flex-shrink-0', section.color)} />
                        <span className="truncate">
                          {getBilingualValue(language, { en: section.titleEn, fr: section.titleFr })}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </ScrollArea>
            </GlowCard>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {searchQuery && filteredSections && filteredSections.length === 0 && (
            <GlowCard className="p-6 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {sm('admin.documentation.no_results')}
              </p>
            </GlowCard>
          )}

          {sectionsToShow.map((section) => {
            const Icon = section.icon;

            return (
              <GlowCard key={section.id} className="p-4 md:p-6 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn('p-2 rounded-lg bg-primary/10', section.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-display text-foreground">
                    {getBilingualValue(language, { en: section.titleEn, fr: section.titleFr })}
                  </h3>
                </div>

                <Accordion type="multiple" className="space-y-2">
                  {section.subsections.map((subsection, index) => (
                    <AccordionItem
                      key={index}
                      value={`${section.id}-${index}`}
                      className="border border-border/30 rounded-lg px-4 bg-background/30"
                    >
                      <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                        <div className="flex items-center gap-2 text-left">
                          <span>{getBilingualValue(language, { en: subsection.titleEn, fr: subsection.titleFr })}</span>
                          {subsection.tags && (
                            <div className="hidden sm:flex gap-1 ml-2">
                              {subsection.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4">
                        <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                          {getBilingualValue(language, { en: subsection.contentEn, fr: subsection.contentFr })}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </GlowCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};
