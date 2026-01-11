export interface ForumCategory {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  color: string | null;
  display_order: number;
  guild_id: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
  topic_count?: number;
  last_topic?: {
    id: string;
    title: string;
    author_name: string;
    created_at: string;
  } | null;
}

export interface ForumTopic {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  last_reply_at: string | null;
  last_reply_by: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_reply_author?: {
    id: string;
    username: string;
  } | null;
  category?: ForumCategory;
  reactions?: ReactionSummary;
}

export interface ForumPost {
  id: string;
  topic_id: string;
  author_id: string;
  content: string;
  quoted_post_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  quoted_post?: {
    id: string;
    content: string;
    author?: {
      username: string;
    };
  } | null;
  reactions?: ReactionSummary;
}

export interface ForumReaction {
  id: string;
  user_id: string;
  topic_id: string | null;
  post_id: string | null;
  reaction_type: string;
  created_at: string;
}

export interface ForumReport {
  id: string;
  reporter_id: string;
  post_id: string | null;
  topic_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  reporter?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  post?: ForumPost | null;
  topic?: ForumTopic | null;
  resolver?: {
    id: string;
    username: string;
  } | null;
}

// Available reaction types with their emojis
export const REACTION_TYPES = {
  like: '👍',
  love: '❤️',
  laugh: '😄',
  wow: '😮',
  sad: '😢',
  angry: '😠',
} as const;

export type ReactionType = keyof typeof REACTION_TYPES;

// Summary of reactions for a post/topic
export interface ReactionSummary {
  counts: Record<ReactionType, number>;
  userReactions: ReactionType[];
  total: number;
}

// Report reasons
export const REPORT_REASONS = {
  spam: { fr: 'Spam', en: 'Spam' },
  harassment: { fr: 'Harcèlement', en: 'Harassment' },
  inappropriate: { fr: 'Contenu inapproprié', en: 'Inappropriate content' },
  misinformation: { fr: 'Désinformation', en: 'Misinformation' },
  other: { fr: 'Autre', en: 'Other' },
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;
