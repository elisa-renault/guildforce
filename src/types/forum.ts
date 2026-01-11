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
  reaction_count?: number;
  user_has_reacted?: boolean;
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
  reaction_count?: number;
  user_has_reacted?: boolean;
}

export interface ForumReaction {
  id: string;
  user_id: string;
  topic_id: string | null;
  post_id: string | null;
  reaction_type: string;
  created_at: string;
}
