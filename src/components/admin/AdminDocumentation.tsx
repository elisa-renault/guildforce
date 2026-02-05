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
} from 'lucide-react';
import { useState, type ElementType } from 'react';

import { GlowCard } from '@/components/GlowCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
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
    color: 'text-blue-400',
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
        contentEn: '- Battle.net sync for characters, guild memberships, and roster cache\n- Multi-roster wish management with validation workflow\n- Advanced guild polls (sections, targeting, conditional logic)\n- Full forum with moderation, sanctions, and realtime notifications\n- Admin back office for users, guilds, legal pages, patch notes, backups, and support queues',
        contentFr: '- Synchronisation Battle.net des personnages, appartenances de guilde et cache de roster\n- Gestion multi-rosters des vœux avec workflow de validation\n- Sondages de guilde avancés (sections, ciblage, logique conditionnelle)\n- Forum complet avec modération, sanctions et notifications temps réel\n- Back office admin pour utilisateurs, guildes, pages légales, patch notes, sauvegardes et files de support',
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
    color: 'text-green-400',
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
    ],
  },
  {
    id: 'battlenet-sync',
    titleEn: 'Battle.net Synchronization',
    titleFr: 'Synchronisation Battle.net',
    icon: RefreshCw,
    color: 'text-cyan-400',
    subsections: [
      {
        titleEn: 'Characters and guild memberships',
        titleFr: 'Personnages et appartenances de guilde',
        contentEn: 'Character sync writes to `wow_characters` and `wow_guild_memberships`. Main character selection is supported. Sync logic includes region fallback and updates membership/rank metadata used by permissions and roster analytics.',
        contentFr: 'La synchronisation des personnages écrit dans `wow_characters` et `wow_guild_memberships`. Le choix du personnage principal est pris en charge. La logique de sync inclut un fallback de région et met à jour les métadonnées de rang utilisées par les permissions et les analyses de roster.',
        tags: ['battlenet', 'sync', 'characters'],
      },
      {
        titleEn: 'Guild roster cache',
        titleFr: 'Cache de roster de guilde',
        contentEn: '`guild_roster_cache` stores the full Blizzard roster per guild with rank data and character matching (`matched_user_id`, `matched_character_id`). Manual resync is available and scheduled sync endpoints are provided for background refresh.',
        contentFr: '`guild_roster_cache` stocke le roster Blizzard complet par guilde avec les rangs et le matching de personnages (`matched_user_id`, `matched_character_id`). Une resynchronisation manuelle est disponible et des endpoints de sync planifiée existent pour le rafraîchissement en arrière-plan.',
        tags: ['battlenet', 'sync', 'roster'],
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
    color: 'text-violet-400',
    subsections: [
      {
        titleEn: 'Auto-creation and ownership',
        titleFr: 'Création automatique et propriété',
        contentEn: 'Guilds are auto-created from Battle.net sync when relevant data is available. Guild ownership follows WoW GM state and can be transferred automatically when GM status changes.',
        contentFr: 'Les guildes sont créées automatiquement depuis la synchronisation Battle.net lorsque les données le permettent. La propriété de guilde suit l\'état GM WoW et peut être transférée automatiquement en cas de changement de GM.',
        tags: ['guilds', 'ownership'],
      },
      {
        titleEn: 'Guild members and statuses',
        titleFr: 'Membres et statuts',
        contentEn: '`guild_members` links users to guilds and tracks role/status (`confirmed`, `potential`, `withdrawn`). This status is used by member-facing features and roster visibility policies.',
        contentFr: '`guild_members` relie les utilisateurs aux guildes et suit rôle/statut (`confirmed`, `potential`, `withdrawn`). Ce statut est utilisé par les fonctionnalités membres et les politiques de visibilité roster.',
        tags: ['guilds', 'members'],
      },
      {
        titleEn: 'Delegated guild permissions',
        titleFr: 'Permissions de guilde déléguées',
        contentEn: '`guild_permissions` delegates key actions (`manage_wishes`, `manage_polls`, `manage_rosters`, `view_activity_log`) with `rank` and `user` rules. GM users always keep implicit full control.',
        contentFr: '`guild_permissions` délègue les actions clés (`manage_wishes`, `manage_polls`, `manage_rosters`, `view_activity_log`) avec des règles `rank` et `user`. Les GM gardent toujours un contrôle implicite complet.',
        tags: ['guilds', 'permissions'],
      },
    ],
  },
  {
    id: 'rosters',
    titleEn: 'Roster System',
    titleFr: 'Système de rosters',
    icon: Layers,
    color: 'text-orange-400',
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
    color: 'text-yellow-400',
    subsections: [
      {
        titleEn: 'Wish model',
        titleFr: 'Modèle de vœux',
        contentEn: '`class_wishes` stores ordered class choices per roster (`choice_index`, `class_id`, `spec_ids`, `spec_order`, comments). `spec_order` keeps the per-wish spec priority (index 1 = main). Members can define up to 13 class wishes, mirroring the WoW class set.',
        contentFr: '`class_wishes` stocke les choix de classes ordonnés par roster (`choice_index`, `class_id`, `spec_ids`, `spec_order`, commentaires). `spec_order` conserve la priorité des spécialisations par vœu (index 1 = main). Les membres peuvent définir jusqu\'à 13 vœux de classes, alignés sur l\'ensemble des classes WoW.',
        tags: ['wishes', 'classes'],
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
    ],
  },
  {
    id: 'polls',
    titleEn: 'Poll System',
    titleFr: 'Système de sondages',
    icon: BarChart3,
    color: 'text-pink-400',
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
        contentEn: 'Supported types: `single_choice`, `multiple_choice`, `text`, `rating`, `date`, `time`, `datetime`, `ranking`, `scale`. Questions can include options, "other" input, scale configs, and conditional display rules.',
        contentFr: 'Types supportés : `single_choice`, `multiple_choice`, `text`, `rating`, `date`, `time`, `datetime`, `ranking`, `scale`. Les questions peuvent inclure options, champ "autre", configuration d\'échelle et règles conditionnelles d\'affichage.',
        tags: ['polls', 'questions'],
      },
      {
        titleEn: 'Respondent targeting vs results access',
        titleFr: 'Ciblage répondants vs accès résultats',
        contentEn: 'Two independent rule systems exist:\n- `poll_respondent_rules` + `can_respond_to_poll()` control who can answer\n- `poll_results_access_rules` + `can_view_poll_results()` control who can view outcomes\nBoth support rank-range and user-specific grants.',
        contentFr: 'Deux systèmes de règles indépendants existent :\n- `poll_respondent_rules` + `can_respond_to_poll()` contrôlent qui peut répondre\n- `poll_results_access_rules` + `can_view_poll_results()` contrôlent qui peut voir les résultats\nLes deux supportent des règles par plage de rang et par utilisateur.',
        tags: ['polls', 'access', 'security'],
      },
    ],
  },
  {
    id: 'forum',
    titleEn: 'Forum System',
    titleFr: 'Système de forum',
    icon: MessageSquare,
    color: 'text-indigo-400',
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
    color: 'text-red-400',
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
    id: 'admin',
    titleEn: 'Administration',
    titleFr: 'Administration',
    icon: Crown,
    color: 'text-amber-400',
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
        contentFr: '`bug_reports` et `account_deletion_requests` fournissent des files operationnelles. `legal_pages` et `patch_notes` reposent desormais sur des tables de traductions (`legal_page_translations`, `patch_note_translations`) pour une publication multilingue scalable.',
        tags: ['admin', 'support', 'legal'],
      },
    ],
  },
  {
    id: 'security',
    titleEn: 'Security & RLS',
    titleFr: 'Sécurité et RLS',
    icon: Key,
    color: 'text-emerald-400',
    subsections: [
      {
        titleEn: 'RLS-first policy model',
        titleFr: 'Modèle RLS-first',
        contentEn: 'All business tables run with RLS enabled. Client code must rely on policies instead of bypass logic. Sensitive tables (especially `battlenet_tokens`) are locked down to self access or privileged backend contexts.',
        contentFr: 'Toutes les tables métiers fonctionnent avec RLS activé. Le code client doit s\'appuyer sur les politiques au lieu de contourner la sécurité. Les tables sensibles (notamment `battlenet_tokens`) sont strictement limitées à l\'auto-accès ou aux contextes backend privilégiés.',
        tags: ['security', 'rls'],
      },
      {
        titleEn: 'Helper RPC functions',
        titleFr: 'Fonctions RPC utilitaires',
        contentEn: 'Core helpers include:\n- `has_role`, `has_guild_permission`, `has_roster_access`\n- `is_guild_member`, `is_guild_gm`\n- `can_respond_to_poll`, `can_view_poll_results`\n- `is_user_forum_sanctioned`\nUse these functions instead of duplicating permission logic in frontend code.',
        contentFr: 'Les helpers principaux incluent :\n- `has_role`, `has_guild_permission`, `has_roster_access`\n- `is_guild_member`, `is_guild_gm`\n- `can_respond_to_poll`, `can_view_poll_results`\n- `is_user_forum_sanctioned`\nUtiliser ces fonctions plutôt que de dupliquer la logique de permissions côté frontend.',
        tags: ['security', 'rpc', 'permissions'],
      },
      {
        titleEn: 'Privacy controls',
        titleFr: 'Contrôles de confidentialité',
        contentEn: 'Privacy-related controls include BattleTag visibility preferences, account deletion requests, cookie consent, and legal page governance. Keep user-facing copy synchronized across supported locales, with EN fallback.',
        contentFr: 'Les controles lies a la confidentialite incluent la visibilite BattleTag, les demandes de suppression de compte, le consentement cookies et la gouvernance des pages legales. Maintenir les contenus utilisateurs synchronises sur toutes les langues supportees, avec fallback EN.',
        tags: ['security', 'privacy', 'gdpr'],
      },
    ],
  },
  {
    id: 'database',
    titleEn: 'Database Schema',
    titleFr: 'Schéma de base de données',
    icon: Database,
    color: 'text-slate-400',
    subsections: [
      {
        titleEn: 'Core tables',
        titleFr: 'Tables cœur',
        contentEn: '- `profiles`, `battlenet_tokens`\n- `wow_characters`, `wow_guild_memberships`\n- `guilds`, `guild_members`, `guild_roster_cache`',
        contentFr: '- `profiles`, `battlenet_tokens`\n- `wow_characters`, `wow_guild_memberships`\n- `guilds`, `guild_members`, `guild_roster_cache`',
        tags: ['database', 'core'],
      },
      {
        titleEn: 'Feature tables',
        titleFr: 'Tables de fonctionnalités',
        contentEn: '- Roster/wishes: `rosters`, `roster_access_rules`, `class_wishes`\n- Permissions/activity: `guild_permissions`, `guild_activity_logs`\n- Polls: `guild_polls`, `guild_poll_sections`, `guild_poll_questions`, `guild_poll_responses`, `poll_respondent_rules`, `poll_results_access_rules`\n- Composition metadata: `raid_effects`, `wow_spells`',
        contentFr: '- Rosters/vœux : `rosters`, `roster_access_rules`, `class_wishes`\n- Permissions/activité : `guild_permissions`, `guild_activity_logs`\n- Sondages : `guild_polls`, `guild_poll_sections`, `guild_poll_questions`, `guild_poll_responses`, `poll_respondent_rules`, `poll_results_access_rules`\n- Métadonnées de composition : `raid_effects`, `wow_spells`',
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
        contentEn: '- `user_roles`\n- `bug_reports`\n- `legal_pages`, `legal_page_translations`\n- `patch_notes`, `patch_note_translations`\n- `account_deletion_requests`',
        contentFr: '- `user_roles`\n- `bug_reports`\n- `legal_pages`, `legal_page_translations`\n- `patch_notes`, `patch_note_translations`\n- `account_deletion_requests`',
        tags: ['database', 'admin'],
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

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder={sm('admin.documentation.search_placeholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-border/50 bg-background/50 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
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
