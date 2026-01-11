import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ForumNotification {
  id: string;
  user_id: string;
  type: 'mention' | 'topic_reply' | 'post_reply';
  topic_id: string | null;
  post_id: string | null;
  triggered_by: string | null;
  is_read: boolean;
  created_at: string;
  // Enriched data
  topic_title?: string;
  triggered_by_username?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('forum_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Enrich notifications with topic titles and usernames
      const enriched = await Promise.all(
        (data || []).map(async (notif) => {
          let topic_title = '';
          let triggered_by_username = '';

          if (notif.topic_id) {
            const { data: topic } = await supabase
              .from('forum_topics')
              .select('title')
              .eq('id', notif.topic_id)
              .single();
            topic_title = topic?.title || '';
          }

          if (notif.triggered_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', notif.triggered_by)
              .single();
            triggered_by_username = profile?.username || '';
          }

          return {
            ...notif,
            type: notif.type as ForumNotification['type'],
            topic_title,
            triggered_by_username,
          };
        })
      );

      setNotifications(enriched);
      setUnreadCount(enriched.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from('forum_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('forum_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, [user]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      const notif = notifications.find((n) => n.id === notificationId);
      const { error } = await supabase
        .from('forum_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (notif && !notif.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    },
    [user, notifications]
  );

  const clearAllNotifications = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('forum_notifications')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch: fetchNotifications,
  };
}

// Function to create mention notifications (called from useForum)
export async function createMentionNotifications(
  content: string,
  topicId: string,
  postId: string,
  authorId: string
) {
  // Extract mentions from content (format: **[@username](/profile/username)**)
  const mentionRegex = /\*\*\[@([^\]]+)\]\([^)]+\)\*\*/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  if (mentions.length === 0) return;

  // Get user IDs for mentioned usernames
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', mentions);

  if (!users || users.length === 0) return;

  // Create notifications for each mentioned user (except the author)
  const notificationsToInsert = users
    .filter((u) => u.id !== authorId)
    .map((u) => ({
      user_id: u.id,
      type: 'mention' as const,
      topic_id: topicId,
      post_id: postId,
      triggered_by: authorId,
    }));

  if (notificationsToInsert.length > 0) {
    await supabase.from('forum_notifications').insert(notificationsToInsert);
  }
}
