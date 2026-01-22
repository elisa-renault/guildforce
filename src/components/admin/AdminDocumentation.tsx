import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import {
  BookOpen, Users, Shield, Swords, FileText, MessageSquare,
  BarChart3, Settings, Lock, Globe, Zap, HelpCircle,
  UserCheck, Crown, Layers, ClipboardList, Bell, Flag,
  Database, Key, RefreshCw, ExternalLink
} from 'lucide-react';

interface DocSection {
  id: string;
  titleEn: string;
  titleFr: string;
  icon: React.ElementType;
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
        contentEn: 'Guildforce is a comprehensive guild management platform for World of Warcraft players. It enables guild leaders and officers to manage rosters, collect member preferences (wishes), conduct polls, and facilitate communication through an integrated forum system.',
        contentFr: 'Guildforce est une plateforme complète de gestion de guilde pour les joueurs de World of Warcraft. Elle permet aux chefs de guilde et aux officiers de gérer les rosters, collecter les préférences des membres (vœux), organiser des sondages et faciliter la communication via un système de forum intégré.',
        tags: ['core', 'introduction']
      },
      {
        titleEn: 'Key Features',
        titleFr: 'Fonctionnalités clés',
        contentEn: '• Battle.net Integration: Automatic synchronization of characters, guilds, and ranks\n• Multi-Roster System: Create and manage multiple rosters per guild\n• Wish System: Collect class/spec preferences for raid composition\n• Guild Polls: Survey members with various question types\n• Forum: Community discussions with moderation tools\n• Permission System: Granular access control based on WoW ranks',
        contentFr: '• Intégration Battle.net : Synchronisation automatique des personnages, guildes et rangs\n• Système Multi-Rosters : Créer et gérer plusieurs rosters par guilde\n• Système de Vœux : Collecter les préférences de classes/spécialisations pour la composition de raid\n• Sondages de Guilde : Interroger les membres avec différents types de questions\n• Forum : Discussions communautaires avec outils de modération\n• Système de Permissions : Contrôle d\'accès granulaire basé sur les rangs WoW',
        tags: ['features']
      },
      {
        titleEn: 'Technology Stack',
        titleFr: 'Stack Technique',
        contentEn: '• Frontend: React 18 + TypeScript + Vite\n• Styling: Tailwind CSS + shadcn/ui components\n• Backend: Supabase (PostgreSQL + Edge Functions)\n• Authentication: Battle.net OAuth + Email/Password\n• Real-time: Supabase Realtime for live updates\n• State: React Query for server state management',
        contentFr: '• Frontend : React 18 + TypeScript + Vite\n• Style : Tailwind CSS + composants shadcn/ui\n• Backend : Supabase (PostgreSQL + Edge Functions)\n• Authentification : Battle.net OAuth + Email/Mot de passe\n• Temps réel : Supabase Realtime pour les mises à jour en direct\n• État : React Query pour la gestion de l\'état serveur',
        tags: ['technical']
      }
    ]
  },
  {
    id: 'authentication',
    titleEn: 'Authentication',
    titleFr: 'Authentification',
    icon: Lock,
    color: 'text-green-400',
    subsections: [
      {
        titleEn: 'Battle.net OAuth',
        titleFr: 'OAuth Battle.net',
        contentEn: 'Primary authentication method. Users connect their Battle.net account which automatically syncs their WoW characters and guild memberships. Supports multiple regions: EU, Americas, Korea, Taiwan.\n\nFlow:\n1. User clicks "Connect with Battle.net"\n2. Selects their region\n3. Redirected to Blizzard login\n4. Returns with tokens stored in battlenet_tokens table\n5. Characters and guild memberships synced automatically',
        contentFr: 'Méthode d\'authentification principale. Les utilisateurs connectent leur compte Battle.net qui synchronise automatiquement leurs personnages WoW et appartenances aux guildes. Supporte plusieurs régions : EU, Amériques, Corée, Taïwan.\n\nFlux :\n1. L\'utilisateur clique sur "Connexion avec Battle.net"\n2. Sélectionne sa région\n3. Redirigé vers la connexion Blizzard\n4. Retour avec jetons stockés dans la table battlenet_tokens\n5. Personnages et appartenances aux guildes synchronisés automatiquement',
        tags: ['auth', 'battlenet']
      },
      {
        titleEn: 'Email Authentication',
        titleFr: 'Authentification par Email',
        contentEn: 'Secondary authentication method for users who prefer email/password login. Located in a collapsible section on the auth page. Users can later link their Battle.net account from their profile.',
        contentFr: 'Méthode d\'authentification secondaire pour les utilisateurs préférant la connexion email/mot de passe. Située dans une section dépliable sur la page d\'authentification. Les utilisateurs peuvent ensuite lier leur compte Battle.net depuis leur profil.',
        tags: ['auth', 'email']
      },
      {
        titleEn: 'Session Management',
        titleFr: 'Gestion des Sessions',
        contentEn: 'Sessions are managed by Supabase Auth. The AuthContext provides:\n• user: Current authenticated user\n• profile: User profile from profiles table\n• loading: Auth state loading indicator\n• signOut: Logout function\n\nSession is persisted in localStorage and refreshed automatically.',
        contentFr: 'Les sessions sont gérées par Supabase Auth. L\'AuthContext fournit :\n• user : Utilisateur authentifié actuel\n• profile : Profil utilisateur depuis la table profiles\n• loading : Indicateur de chargement de l\'état auth\n• signOut : Fonction de déconnexion\n\nLa session est persistée dans localStorage et rafraîchie automatiquement.',
        tags: ['auth', 'session']
      }
    ]
  },
  {
    id: 'battlenet-sync',
    titleEn: 'Battle.net Synchronization',
    titleFr: 'Synchronisation Battle.net',
    icon: RefreshCw,
    color: 'text-cyan-400',
    subsections: [
      {
        titleEn: 'Character Sync',
        titleFr: 'Synchronisation des Personnages',
        contentEn: 'Characters are synced from Battle.net Profile API:\n• Stored in wow_characters table\n• Includes: name, realm, class, level, guild info\n• Main character can be designated per user\n• Sync triggered on login and manually from profile\n\nThe sync uses the user\'s access token to fetch their character list.',
        contentFr: 'Les personnages sont synchronisés depuis l\'API Profile Battle.net :\n• Stockés dans la table wow_characters\n• Inclut : nom, royaume, classe, niveau, info guilde\n• Un personnage principal peut être désigné par utilisateur\n• Synchronisation déclenchée à la connexion et manuellement depuis le profil\n\nLa synchronisation utilise le token d\'accès de l\'utilisateur pour récupérer sa liste de personnages.',
        tags: ['battlenet', 'sync', 'characters']
      },
      {
        titleEn: 'Guild Roster Sync',
        titleFr: 'Synchronisation du Roster de Guilde',
        contentEn: 'Guild rosters are synced using Blizzard\'s Game Data API with client_credentials:\n• Stored in guild_roster_cache table\n• Includes: character name, class, level, rank (index + name)\n• Faction determined from roster.guild.faction.type\n• Automatic hourly sync via pg_cron scheduled job\n• Manual sync available for admins\n\nMembers who leave the guild are automatically removed from cache.',
        contentFr: 'Les rosters de guilde sont synchronisés via l\'API Game Data de Blizzard avec client_credentials :\n• Stockés dans la table guild_roster_cache\n• Inclut : nom du personnage, classe, niveau, rang (index + nom)\n• Faction déterminée depuis roster.guild.faction.type\n• Synchronisation automatique horaire via job pg_cron\n• Synchronisation manuelle disponible pour les admins\n\nLes membres quittant la guilde sont automatiquement retirés du cache.',
        tags: ['battlenet', 'sync', 'roster']
      },
      {
        titleEn: 'Edge Function: battlenet-auth',
        titleFr: 'Edge Function : battlenet-auth',
        contentEn: 'Handles all Battle.net API interactions:\n• /callback: OAuth callback handling\n• /resync: User-triggered character sync\n• /scheduled-sync: Cron job for roster updates\n\nUses fallback mechanism trying multiple Blizzard namespaces (static/dynamic) for reliability.',
        contentFr: 'Gère toutes les interactions avec l\'API Battle.net :\n• /callback : Gestion du callback OAuth\n• /resync : Synchronisation des personnages déclenchée par l\'utilisateur\n• /scheduled-sync : Job cron pour les mises à jour de roster\n\nUtilise un mécanisme de fallback essayant plusieurs namespaces Blizzard (static/dynamic) pour la fiabilité.',
        tags: ['battlenet', 'edge-function']
      }
    ]
  },
  {
    id: 'guilds',
    titleEn: 'Guild System',
    titleFr: 'Système de Guildes',
    icon: Shield,
    color: 'text-purple-400',
    subsections: [
      {
        titleEn: 'Guild Creation',
        titleFr: 'Création de Guilde',
        contentEn: 'Guilds are automatically created when a user with GM rank syncs their Battle.net account. Guild data:\n• name, server, region, faction\n• avatar_url (uploadable)\n• owner_id: User who created the guild\n• officer_rank_threshold: Rank index defining "officer" status (0-9)\n\nURL structure: /guild/:region/:server/:name (SEO-friendly slugs)',
        contentFr: 'Les guildes sont automatiquement créées quand un utilisateur avec le rang GM synchronise son compte Battle.net. Données de guilde :\n• nom, serveur, région, faction\n• avatar_url (téléversable)\n• owner_id : Utilisateur ayant créé la guilde\n• officer_rank_threshold : Index de rang définissant le statut "officier" (0-9)\n\nStructure URL : /guild/:region/:server/:name (slugs SEO-friendly)',
        tags: ['guilds', 'creation']
      },
      {
        titleEn: 'Guild Permissions',
        titleFr: 'Permissions de Guilde',
        contentEn: 'Granular permission system stored in guild_permissions table:\n• manage_wishes: Validate/edit member wishes\n• manage_rosters: Create/edit rosters and access rules\n• manage_polls: Create/manage polls\n• view_poll_results: Access poll results\n• view_activity_log: View audit log\n\nPermissions can be assigned to:\n• All members\n• Officers (based on officer_rank_threshold)\n• Specific rank ranges (min_rank_index to max_rank_index)\n• Individual users (user_id)',
        contentFr: 'Système de permissions granulaire stocké dans la table guild_permissions :\n• manage_wishes : Valider/éditer les vœux des membres\n• manage_rosters : Créer/éditer les rosters et règles d\'accès\n• manage_polls : Créer/gérer les sondages\n• view_poll_results : Accéder aux résultats des sondages\n• view_activity_log : Voir le journal d\'audit\n\nLes permissions peuvent être attribuées à :\n• Tous les membres\n• Officiers (basé sur officer_rank_threshold)\n• Plages de rangs spécifiques (min_rank_index à max_rank_index)\n• Utilisateurs individuels (user_id)',
        tags: ['guilds', 'permissions']
      },
      {
        titleEn: 'Activity Log',
        titleFr: 'Journal d\'Activité',
        contentEn: 'Audit trail in guild_activity_logs table:\n• action_type: Type of action performed\n• user_id: Who performed the action\n• target_user_id: Who was affected (if applicable)\n• action_details: JSON with additional context\n• roster_id: Related roster (if applicable)\n\nAccessible via Settings > Activity for users with view_activity_log permission.',
        contentFr: 'Piste d\'audit dans la table guild_activity_logs :\n• action_type : Type d\'action effectuée\n• user_id : Qui a effectué l\'action\n• target_user_id : Qui a été affecté (si applicable)\n• action_details : JSON avec contexte supplémentaire\n• roster_id : Roster concerné (si applicable)\n\nAccessible via Paramètres > Activité pour les utilisateurs avec la permission view_activity_log.',
        tags: ['guilds', 'audit']
      }
    ]
  },
  {
    id: 'rosters',
    titleEn: 'Roster System',
    titleFr: 'Système de Rosters',
    icon: Layers,
    color: 'text-orange-400',
    subsections: [
      {
        titleEn: 'Multi-Roster Support',
        titleFr: 'Support Multi-Rosters',
        contentEn: 'Each guild can have multiple rosters (e.g., Main Raid, Alt Run, Mythic+):\n• Stored in rosters table\n• One roster marked as is_default\n• Each roster has its own access rules\n• Wishes are isolated per roster\n\nRosters are managed via the Roster Manager in guild settings.',
        contentFr: 'Chaque guilde peut avoir plusieurs rosters (ex: Raid Principal, Run Alt, Mythic+) :\n• Stockés dans la table rosters\n• Un roster marqué comme is_default\n• Chaque roster a ses propres règles d\'accès\n• Les vœux sont isolés par roster\n\nLes rosters sont gérés via le Gestionnaire de Roster dans les paramètres de guilde.',
        tags: ['rosters', 'management']
      },
      {
        titleEn: 'Access Rules',
        titleFr: 'Règles d\'Accès',
        contentEn: 'Roster visibility controlled by roster_access_rules table:\n• access_type: "all", "officers", "rank_range", "individual"\n• min_rank_index / max_rank_index: For rank-based access\n• user_id: For individual access grants\n\nRLS function has_roster_access() checks if user can view a roster.',
        contentFr: 'Visibilité du roster contrôlée par la table roster_access_rules :\n• access_type : "all", "officers", "rank_range", "individual"\n• min_rank_index / max_rank_index : Pour l\'accès basé sur les rangs\n• user_id : Pour les accès individuels\n\nLa fonction RLS has_roster_access() vérifie si l\'utilisateur peut voir un roster.',
        tags: ['rosters', 'access']
      }
    ]
  },
  {
    id: 'wishes',
    titleEn: 'Wish System',
    titleFr: 'Système de Vœux',
    icon: ClipboardList,
    color: 'text-yellow-400',
    subsections: [
      {
        titleEn: 'Class Wishes',
        titleFr: 'Vœux de Classes',
        contentEn: 'Members can submit up to 13 wishes (one per WoW class) per roster:\n• choice_index: Priority order (drag & drop reorderable)\n• class_id: Selected class\n• spec_ids: Array of preferred specializations\n• comment: Optional notes\n• validation_status: pending/approved/rejected\n• validated_by / validated_at: Validation metadata',
        contentFr: 'Les membres peuvent soumettre jusqu\'à 13 vœux (un par classe WoW) par roster :\n• choice_index : Ordre de priorité (réordonnable par drag & drop)\n• class_id : Classe sélectionnée\n• spec_ids : Tableau de spécialisations préférées\n• comment : Notes optionnelles\n• validation_status : pending/approved/rejected\n• validated_by / validated_at : Métadonnées de validation',
        tags: ['wishes', 'classes']
      },
      {
        titleEn: 'Commitment Status',
        titleFr: 'Statut d\'Engagement',
        contentEn: 'Members indicate their availability via commitment toggle:\n• "Confirmé" (Confirmed): Committed to participate\n• "Indécis" (Undecided): Not sure yet\n• "Retrait" (Withdrawn): Not participating\n\nCommitment is per guild_member record, not per roster.',
        contentFr: 'Les membres indiquent leur disponibilité via le toggle d\'engagement :\n• "Confirmé" : Engagé à participer\n• "Indécis" : Pas encore sûr\n• "Retrait" : Ne participe pas\n\nL\'engagement est par enregistrement guild_member, pas par roster.',
        tags: ['wishes', 'commitment']
      },
      {
        titleEn: 'Validation Workflow',
        titleFr: 'Workflow de Validation',
        contentEn: 'GMs and users with manage_wishes permission can:\n• Approve wishes (green badge)\n• Reject wishes (red badge)\n• Reset to pending (gray badge)\n• Edit wishes inline from the roster table\n\nValidation state is tracked with timestamps.',
        contentFr: 'Les GMs et utilisateurs avec la permission manage_wishes peuvent :\n• Approuver les vœux (badge vert)\n• Rejeter les vœux (badge rouge)\n• Réinitialiser en attente (badge gris)\n• Éditer les vœux en ligne depuis la table de roster\n\nL\'état de validation est suivi avec horodatage.',
        tags: ['wishes', 'validation']
      }
    ]
  },
  {
    id: 'polls',
    titleEn: 'Poll System',
    titleFr: 'Système de Sondages',
    icon: BarChart3,
    color: 'text-pink-400',
    subsections: [
      {
        titleEn: 'Poll Structure',
        titleFr: 'Structure des Sondages',
        contentEn: 'Polls are organized hierarchically:\n• guild_polls: Main poll entity with title, description, dates, status\n• guild_poll_sections: Optional grouping of questions with titles\n• guild_poll_questions: Individual questions with type and options\n• guild_poll_responses: User responses per question\n\nPolls can be associated with a specific roster.',
        contentFr: 'Les sondages sont organisés hiérarchiquement :\n• guild_polls : Entité principale avec titre, description, dates, statut\n• guild_poll_sections : Regroupement optionnel de questions avec titres\n• guild_poll_questions : Questions individuelles avec type et options\n• guild_poll_responses : Réponses utilisateur par question\n\nLes sondages peuvent être associés à un roster spécifique.',
        tags: ['polls', 'structure']
      },
      {
        titleEn: 'Question Types',
        titleFr: 'Types de Questions',
        contentEn: '9 question types supported:\n• single_choice: Radio buttons\n• multiple_choice: Checkboxes\n• text: Free text input\n• rating: Star rating (1-5)\n• scale: Slider with custom min/max/step\n• date: Date picker\n• time: Time picker\n• datetime: Combined date/time\n• ranking: Drag & drop ordering',
        contentFr: '9 types de questions supportés :\n• single_choice : Boutons radio\n• multiple_choice : Cases à cocher\n• text : Saisie de texte libre\n• rating : Notation par étoiles (1-5)\n• scale : Curseur avec min/max/step personnalisés\n• date : Sélecteur de date\n• time : Sélecteur d\'heure\n• datetime : Date/heure combinés\n• ranking : Ordre par drag & drop',
        tags: ['polls', 'questions']
      },
      {
        titleEn: 'Results Access',
        titleFr: 'Accès aux Résultats',
        contentEn: 'Poll results visibility controlled by poll_results_access_rules:\n• Separate from poll participation access\n• Same access_type options as rosters\n• Configurable per poll via PollResultsAccessEditor\n• RLS function can_view_poll_results() enforces access',
        contentFr: 'Visibilité des résultats de sondage contrôlée par poll_results_access_rules :\n• Séparée de l\'accès à la participation\n• Mêmes options access_type que les rosters\n• Configurable par sondage via PollResultsAccessEditor\n• Fonction RLS can_view_poll_results() applique l\'accès',
        tags: ['polls', 'results']
      }
    ]
  },
  {
    id: 'forum',
    titleEn: 'Forum System',
    titleFr: 'Système de Forum',
    icon: MessageSquare,
    color: 'text-indigo-400',
    subsections: [
      {
        titleEn: 'Categories & Topics',
        titleFr: 'Catégories & Sujets',
        contentEn: 'Forum structure:\n• forum_categories: Global or guild-specific categories\n• forum_topics: Discussion threads with title, content, author\n• forum_posts: Replies within topics\n\nCategories have: name, slug, description, icon, color, display_order',
        contentFr: 'Structure du forum :\n• forum_categories : Catégories globales ou spécifiques à une guilde\n• forum_topics : Fils de discussion avec titre, contenu, auteur\n• forum_posts : Réponses dans les sujets\n\nLes catégories ont : nom, slug, description, icône, couleur, ordre d\'affichage',
        tags: ['forum', 'structure']
      },
      {
        titleEn: 'Interactions',
        titleFr: 'Interactions',
        contentEn: '• Reactions: Emoji reactions on topics and posts (forum_reactions)\n• Mentions: @username with autocomplete, creates notifications\n• Quotes: Reply with quoted content (quoted_post_id)\n• Subscriptions: Follow topics for reply notifications\n\nReal-time updates via Supabase Realtime.',
        contentFr: '• Réactions : Réactions emoji sur sujets et posts (forum_reactions)\n• Mentions : @username avec autocomplétion, crée des notifications\n• Citations : Répondre avec contenu cité (quoted_post_id)\n• Abonnements : Suivre les sujets pour les notifications de réponses\n\nMises à jour en temps réel via Supabase Realtime.',
        tags: ['forum', 'interactions']
      },
      {
        titleEn: 'Moderation',
        titleFr: 'Modération',
        contentEn: 'Moderation tools:\n• forum_moderators: Per-category or global moderator assignments\n• forum_reports: User reports with status workflow\n• forum_user_sanctions: Timeouts and bans with expiry dates\n• Topic locking/pinning\n• Post editing/deletion (moderators can edit locked topics)\n\nSanctions checked via is_user_forum_sanctioned() RPC.',
        contentFr: 'Outils de modération :\n• forum_moderators : Assignations de modérateurs par catégorie ou globaux\n• forum_reports : Signalements utilisateur avec workflow de statut\n• forum_user_sanctions : Timeouts et bans avec dates d\'expiration\n• Verrouillage/épinglage de sujets\n• Édition/suppression de posts (modérateurs peuvent éditer les sujets verrouillés)\n\nSanctions vérifiées via RPC is_user_forum_sanctioned().',
        tags: ['forum', 'moderation']
      }
    ]
  },
  {
    id: 'notifications',
    titleEn: 'Notifications',
    titleFr: 'Notifications',
    icon: Bell,
    color: 'text-red-400',
    subsections: [
      {
        titleEn: 'Notification Types',
        titleFr: 'Types de Notifications',
        contentEn: 'Stored in forum_notifications table:\n• mention: Someone @mentioned you\n• reply: New reply to subscribed topic\n• reaction: Someone reacted to your content\n\nEach notification links to topic_id, post_id, and triggered_by user.',
        contentFr: 'Stockées dans la table forum_notifications :\n• mention : Quelqu\'un vous a @mentionné\n• reply : Nouvelle réponse à un sujet suivi\n• reaction : Quelqu\'un a réagi à votre contenu\n\nChaque notification lie topic_id, post_id et l\'utilisateur triggered_by.',
        tags: ['notifications']
      },
      {
        titleEn: 'Real-time Updates',
        titleFr: 'Mises à Jour Temps Réel',
        contentEn: 'NotificationBell component uses Supabase Realtime:\n• Subscribes to forum_notifications changes for current user\n• Unread count shown as badge\n• Clicking marks notifications as read\n• Links directly to relevant topic/post',
        contentFr: 'Le composant NotificationBell utilise Supabase Realtime :\n• S\'abonne aux changements forum_notifications pour l\'utilisateur actuel\n• Compteur de non-lus affiché comme badge\n• Cliquer marque les notifications comme lues\n• Liens directs vers le sujet/post concerné',
        tags: ['notifications', 'realtime']
      }
    ]
  },
  {
    id: 'admin',
    titleEn: 'Administration',
    titleFr: 'Administration',
    icon: Crown,
    color: 'text-amber-400',
    subsections: [
      {
        titleEn: 'Role System',
        titleFr: 'Système de Rôles',
        contentEn: 'App-level roles in user_roles table:\n• admin: Full access to all admin features\n• moderator: Access to forum moderation, bug reports, dashboard\n• user: Default role (not stored, implicit)\n\nChecked via has_role() RPC function.',
        contentFr: 'Rôles au niveau application dans la table user_roles :\n• admin : Accès complet à toutes les fonctionnalités admin\n• moderator : Accès à la modération forum, rapports de bugs, dashboard\n• user : Rôle par défaut (non stocké, implicite)\n\nVérifié via la fonction RPC has_role().',
        tags: ['admin', 'roles']
      },
      {
        titleEn: 'Admin Sections',
        titleFr: 'Sections Admin',
        contentEn: '• Dashboard: Stats overview and quick access\n• Users: User list and management\n• Permissions: Assign admin/moderator roles\n• Guilds: Guild list and management\n• Forum: Forum administration access\n• Legal Pages: Edit legal content (FR/EN)\n• Bug Reports: View and resolve user-reported bugs\n• Deletions: Process account deletion requests',
        contentFr: '• Tableau de bord : Vue d\'ensemble des stats et accès rapide\n• Utilisateurs : Liste et gestion des utilisateurs\n• Permissions : Assigner les rôles admin/modérateur\n• Guildes : Liste et gestion des guildes\n• Forum : Accès à l\'administration du forum\n• Pages légales : Éditer le contenu légal (FR/EN)\n• Rapports de bugs : Voir et résoudre les bugs signalés\n• Suppressions : Traiter les demandes de suppression de compte',
        tags: ['admin', 'sections']
      }
    ]
  },
  {
    id: 'security',
    titleEn: 'Security & RLS',
    titleFr: 'Sécurité & RLS',
    icon: Key,
    color: 'text-emerald-400',
    subsections: [
      {
        titleEn: 'Row Level Security',
        titleFr: 'Row Level Security',
        contentEn: 'All tables have RLS enabled. Key policies:\n• profiles: Public read, self-update only\n• battlenet_tokens: Self-access only (private tokens)\n• class_wishes: Guild members can read, self-update\n• guild_roster_cache: Admin/moderator full access, members see own guild\n• forum_*: Various policies based on authorship and moderation status',
        contentFr: 'Toutes les tables ont RLS activé. Politiques clés :\n• profiles : Lecture publique, auto-modification uniquement\n• battlenet_tokens : Auto-accès seulement (tokens privés)\n• class_wishes : Membres de guilde peuvent lire, auto-modification\n• guild_roster_cache : Accès complet admin/modérateur, membres voient leur guilde\n• forum_* : Diverses politiques basées sur l\'auteur et le statut de modération',
        tags: ['security', 'rls']
      },
      {
        titleEn: 'Helper Functions',
        titleFr: 'Fonctions Utilitaires',
        contentEn: 'RPC functions for permission checks:\n• has_role(role, user_id): Check app-level role\n• has_guild_permission(guild_id, permission, user_id): Check guild permission\n• has_roster_access(roster_id, user_id): Check roster visibility\n• is_guild_member(guild_id, user_id): Check guild membership\n• is_guild_gm(guild_id, user_id): Check GM status\n• can_view_poll_results(poll_id, user_id): Check poll results access',
        contentFr: 'Fonctions RPC pour les vérifications de permissions :\n• has_role(role, user_id) : Vérifier le rôle au niveau app\n• has_guild_permission(guild_id, permission, user_id) : Vérifier permission de guilde\n• has_roster_access(roster_id, user_id) : Vérifier visibilité du roster\n• is_guild_member(guild_id, user_id) : Vérifier appartenance à la guilde\n• is_guild_gm(guild_id, user_id) : Vérifier statut GM\n• can_view_poll_results(poll_id, user_id) : Vérifier accès aux résultats',
        tags: ['security', 'functions']
      },
      {
        titleEn: 'GDPR Compliance',
        titleFr: 'Conformité RGPD',
        contentEn: '• Cookie consent banner with preference management\n• Account deletion requests (account_deletion_requests table)\n• Privacy controls: BattleTag visibility toggle\n• Data minimization: Only essential data collected\n• Legal pages: Privacy policy, Terms of Service, Legal notices',
        contentFr: '• Bannière de consentement cookies avec gestion des préférences\n• Demandes de suppression de compte (table account_deletion_requests)\n• Contrôles de confidentialité : Toggle de visibilité BattleTag\n• Minimisation des données : Seules les données essentielles collectées\n• Pages légales : Politique de confidentialité, CGU, Mentions légales',
        tags: ['security', 'gdpr']
      }
    ]
  },
  {
    id: 'database',
    titleEn: 'Database Schema',
    titleFr: 'Schéma de Base de Données',
    icon: Database,
    color: 'text-slate-400',
    subsections: [
      {
        titleEn: 'Core Tables',
        titleFr: 'Tables Principales',
        contentEn: '• profiles: User profiles (extends auth.users)\n• battlenet_tokens: OAuth tokens for Battle.net\n• wow_characters: User\'s WoW characters\n• wow_guild_memberships: Character-guild relationships\n• guilds: Guild entities\n• guild_members: User-guild relationships\n• guild_roster_cache: Synced roster from Blizzard API',
        contentFr: '• profiles : Profils utilisateurs (étend auth.users)\n• battlenet_tokens : Tokens OAuth pour Battle.net\n• wow_characters : Personnages WoW de l\'utilisateur\n• wow_guild_memberships : Relations personnage-guilde\n• guilds : Entités guilde\n• guild_members : Relations utilisateur-guilde\n• guild_roster_cache : Roster synchronisé depuis l\'API Blizzard',
        tags: ['database', 'tables']
      },
      {
        titleEn: 'Feature Tables',
        titleFr: 'Tables de Fonctionnalités',
        contentEn: '• rosters, roster_access_rules: Multi-roster system\n• class_wishes: Member class/spec preferences\n• guild_polls, guild_poll_sections, guild_poll_questions, guild_poll_responses: Poll system\n• poll_results_access_rules: Poll results visibility\n• guild_permissions: Delegated guild permissions\n• guild_activity_logs: Audit trail',
        contentFr: '• rosters, roster_access_rules : Système multi-rosters\n• class_wishes : Préférences de classes/spécs des membres\n• guild_polls, guild_poll_sections, guild_poll_questions, guild_poll_responses : Système de sondages\n• poll_results_access_rules : Visibilité des résultats\n• guild_permissions : Permissions déléguées de guilde\n• guild_activity_logs : Piste d\'audit',
        tags: ['database', 'tables']
      },
      {
        titleEn: 'Forum Tables',
        titleFr: 'Tables Forum',
        contentEn: '• forum_categories: Discussion categories\n• forum_topics: Discussion threads\n• forum_posts: Replies\n• forum_reactions: Emoji reactions\n• forum_notifications: User notifications\n• forum_topic_subscriptions: Topic follows\n• forum_reports: Content reports\n• forum_moderators: Moderator assignments\n• forum_user_sanctions: User sanctions',
        contentFr: '• forum_categories : Catégories de discussion\n• forum_topics : Fils de discussion\n• forum_posts : Réponses\n• forum_reactions : Réactions emoji\n• forum_notifications : Notifications utilisateur\n• forum_topic_subscriptions : Abonnements aux sujets\n• forum_reports : Signalements de contenu\n• forum_moderators : Assignations de modérateurs\n• forum_user_sanctions : Sanctions utilisateur',
        tags: ['database', 'forum']
      }
    ]
  }
];

export const AdminDocumentation = () => {
  const { language, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const currentSection = DOCUMENTATION.find(s => s.id === activeSection);

  // Filter subsections based on search
  const filteredSections = searchQuery
    ? DOCUMENTATION.map(section => ({
        ...section,
        subsections: section.subsections.filter(sub => {
          const title = ({ fr: sub.titleFr, en: sub.titleEn } as const)[language];
          const content = ({ fr: sub.contentFr, en: sub.contentEn } as const)[language];
          const query = searchQuery.toLowerCase();
          return (
            title.toLowerCase().includes(query) ||
            content.toLowerCase().includes(query) ||
            sub.tags?.some(tag => tag.toLowerCase().includes(query))
          );
        })
      })).filter(section => section.subsections.length > 0)
    : null;

  const sectionsToShow = filteredSections || (currentSection ? [currentSection] : []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display text-foreground">
            {t.auto.components_admin_AdminDocumentation_405}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.auto.components_admin_AdminDocumentation_408
            }
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder={t.auto.components_admin_AdminDocumentation_419}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-border/50 bg-background/50 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation - Hidden when searching */}
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
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                          isActive
                            ? "bg-primary/20 text-foreground ring-1 ring-primary/50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 flex-shrink-0", section.color)} />
                        <span className="truncate">
                          {({ fr: section.titleFr, en: section.titleEn } as const)[language]}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </ScrollArea>
            </GlowCard>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {searchQuery && filteredSections && filteredSections.length === 0 && (
            <GlowCard className="p-6 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {t.auto.components_admin_AdminDocumentation_475
                }
              </p>
            </GlowCard>
          )}

          {sectionsToShow.map((section) => {
            const Icon = section.icon;
            return (
              <GlowCard key={section.id} className="p-4 md:p-6 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("p-2 rounded-lg bg-primary/10", section.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-display text-foreground">
                    {({ fr: section.titleFr, en: section.titleEn } as const)[language]}
                  </h3>
                </div>

                <Accordion type="multiple" className="space-y-2">
                  {section.subsections.map((sub, idx) => (
                    <AccordionItem 
                      key={idx} 
                      value={`${section.id}-${idx}`}
                      className="border border-border/30 rounded-lg px-4 bg-background/30"
                    >
                      <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                        <div className="flex items-center gap-2 text-left">
                          <span>{({ fr: sub.titleFr, en: sub.titleEn } as const)[language]}</span>
                          {sub.tags && (
                            <div className="hidden sm:flex gap-1 ml-2">
                              {sub.tags.slice(0, 2).map(tag => (
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
                          {({ fr: sub.contentFr, en: sub.contentEn } as const)[language]}
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
