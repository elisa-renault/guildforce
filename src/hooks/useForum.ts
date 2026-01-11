import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ForumCategory, ForumTopic, ForumPost, ReactionSummary, ReactionType, REACTION_TYPES } from '@/types/forum';
import { useAuth } from '@/contexts/AuthContext';

// Helper function to get reactions summary for a topic or post
async function getReactionsSummary(
  type: 'topic' | 'post',
  id: string,
  userId?: string
): Promise<ReactionSummary> {
  const column = type === 'topic' ? 'topic_id' : 'post_id';
  
  // Get all reactions for this item
  const { data: reactions } = await supabase
    .from('forum_reactions')
    .select('reaction_type, user_id')
    .eq(column, id);

  // Initialize counts
  const counts: Record<ReactionType, number> = {
    like: 0,
    love: 0,
    laugh: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };
  
  const userReactions: ReactionType[] = [];
  let total = 0;

  (reactions || []).forEach((r) => {
    const reactionType = r.reaction_type as ReactionType;
    if (reactionType in counts) {
      counts[reactionType]++;
      total++;
      if (userId && r.user_id === userId) {
        userReactions.push(reactionType);
      }
    }
  });

  return { counts, userReactions, total };
}

export function useForumCategories(guildId?: string | null) {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (guildId) {
        query = query.or(`guild_id.eq.${guildId},is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Get topic counts for each category
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (cat) => {
          const { count } = await supabase
            .from('forum_topics')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id);

          const { data: lastTopic } = await supabase
            .from('forum_topics')
            .select('id, title, created_at, author_id')
            .eq('category_id', cat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let lastTopicWithAuthor = null;
          if (lastTopic) {
            const { data: author } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', lastTopic.author_id)
              .single();
            lastTopicWithAuthor = {
              id: lastTopic.id,
              title: lastTopic.title,
              author_name: author?.username || 'Unknown',
              created_at: lastTopic.created_at,
            };
          }

          return {
            ...cat,
            topic_count: count || 0,
            last_topic: lastTopicWithAuthor,
          } as ForumCategory;
        })
      );

      setCategories(categoriesWithCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
}

export function useForumTopics(categoryId: string | null, page: number = 1, limit: number = 20) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { count } = await supabase
        .from('forum_topics')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      setTotalCount(count || 0);

      const { data, error: fetchError } = await supabase
        .from('forum_topics')
        .select('*')
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('last_reply_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      const enrichedTopics = await Promise.all(
        (data || []).map(async (topic) => {
          const { data: author } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', topic.author_id)
            .single();

          let lastReplyAuthor = null;
          if (topic.last_reply_by) {
            const { data: lra } = await supabase
              .from('profiles')
              .select('id, username')
              .eq('id', topic.last_reply_by)
              .single();
            lastReplyAuthor = lra;
          }

          // Get reactions summary
          const reactions = await getReactionsSummary('topic', topic.id, user?.id);

          return {
            ...topic,
            author,
            last_reply_author: lastReplyAuthor,
            reactions,
          } as ForumTopic;
        })
      );

      setTopics(enrichedTopics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  }, [categoryId, page, limit, user]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Real-time subscription
  useEffect(() => {
    if (!categoryId) return;

    const channel = supabase
      .channel(`forum-topics-${categoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_topics',
          filter: `category_id=eq.${categoryId}`,
        },
        () => {
          fetchTopics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, fetchTopics]);

  return { topics, totalCount, loading, error, refetch: fetchTopics };
}

export function useForumTopic(topicId: string | null) {
  const { user } = useAuth();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopic = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('forum_topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (fetchError) throw fetchError;

      // Increment view count
      await supabase
        .from('forum_topics')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', topicId);

      // Get author
      const { data: author } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', data.author_id)
        .single();

      // Get category
      const { data: category } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('id', data.category_id)
        .single();

      // Get reactions summary
      const reactions = await getReactionsSummary('topic', topicId, user?.id);

      setTopic({
        ...data,
        author,
        category,
        reactions,
      } as ForumTopic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topic');
    } finally {
      setLoading(false);
    }
  }, [topicId, user]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  return { topic, loading, error, refetch: fetchTopic };
}

export function useForumPosts(topicId: string | null, page: number = 1, limit: number = 20) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { count } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId);

      setTotalCount(count || 0);

      const { data, error: fetchError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (fetchError) throw fetchError;

      const enrichedPosts = await Promise.all(
        (data || []).map(async (post) => {
          const { data: author } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', post.author_id)
            .single();

          let quotedPost = null;
          if (post.quoted_post_id) {
            const { data: qp } = await supabase
              .from('forum_posts')
              .select('id, content, author_id')
              .eq('id', post.quoted_post_id)
              .single();
            if (qp) {
              const { data: qpAuthor } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', qp.author_id)
                .single();
              quotedPost = { ...qp, author: qpAuthor };
            }
          }

          // Get reactions summary
          const reactions = await getReactionsSummary('post', post.id, user?.id);

          return {
            ...post,
            author,
            quoted_post: quotedPost,
            reactions,
          } as ForumPost;
        })
      );

      setPosts(enrichedPosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [topicId, page, limit, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Real-time subscription
  useEffect(() => {
    if (!topicId) return;

    const channel = supabase
      .channel(`forum-posts-${topicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_posts',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, fetchPosts]);

  return { posts, totalCount, loading, error, refetch: fetchPosts };
}

export function useForumActions() {
  const { user } = useAuth();

  const createTopic = async (categoryId: string, title: string, content: string) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('forum_topics')
      .insert({
        category_id: categoryId,
        author_id: user.id,
        title,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const createPost = async (topicId: string, content: string, quotedPostId?: string) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        topic_id: topicId,
        author_id: user.id,
        content,
        quoted_post_id: quotedPostId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateTopic = async (
    topicId: string,
    updates: { title?: string; content?: string; is_pinned?: boolean; is_locked?: boolean }
  ) => {
    const { data, error } = await supabase
      .from('forum_topics')
      .update(updates)
      .eq('id', topicId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updatePost = async (postId: string, content: string) => {
    const { data, error } = await supabase
      .from('forum_posts')
      .update({ content, is_edited: true })
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteTopic = async (topicId: string) => {
    const { error } = await supabase
      .from('forum_topics')
      .delete()
      .eq('id', topicId);

    if (error) throw error;
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  };

  const toggleReaction = async (type: 'topic' | 'post', id: string, reactionType: ReactionType = 'like') => {
    if (!user) throw new Error('Not authenticated');

    const column = type === 'topic' ? 'topic_id' : 'post_id';

    // Check if already reacted with this type
    const { data: existing } = await supabase
      .from('forum_reactions')
      .select('id')
      .eq(column, id)
      .eq('user_id', user.id)
      .eq('reaction_type', reactionType)
      .limit(1);

    if (existing && existing.length > 0) {
      // Remove reaction
      await supabase
        .from('forum_reactions')
        .delete()
        .eq('id', existing[0].id);
      return false;
    } else {
      // Add reaction
      await supabase
        .from('forum_reactions')
        .insert({
          user_id: user.id,
          [column]: id,
          reaction_type: reactionType,
        });
      return true;
    }
  };

  return {
    createTopic,
    createPost,
    updateTopic,
    updatePost,
    deleteTopic,
    deletePost,
    toggleReaction,
  };
}
