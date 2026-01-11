import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TopicSubscription {
  id: string;
  user_id: string;
  topic_id: string;
  notify_replies: boolean;
  created_at: string;
}

export function useTopicSubscription(topicId: string | null) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<TopicSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user || !topicId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('forum_topic_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [user, topicId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const subscribe = useCallback(async (notifyReplies: boolean = true) => {
    if (!user || !topicId) return;

    try {
      const { data, error } = await supabase
        .from('forum_topic_subscriptions')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          notify_replies: notifyReplies,
        }, {
          onConflict: 'user_id,topic_id',
        })
        .select()
        .single();

      if (error) throw error;
      setSubscription(data);
      return data;
    } catch (err) {
      console.error('Error subscribing:', err);
      throw err;
    }
  }, [user, topicId]);

  const unsubscribe = useCallback(async () => {
    if (!user || !topicId || !subscription) return;

    try {
      const { error } = await supabase
        .from('forum_topic_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('topic_id', topicId);

      if (error) throw error;
      setSubscription(null);
    } catch (err) {
      console.error('Error unsubscribing:', err);
      throw err;
    }
  }, [user, topicId, subscription]);

  const toggleNotifications = useCallback(async () => {
    if (!user || !topicId) return;

    if (subscription) {
      // Toggle notify_replies
      const newValue = !subscription.notify_replies;
      const { data, error } = await supabase
        .from('forum_topic_subscriptions')
        .update({ notify_replies: newValue })
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .select()
        .single();

      if (error) throw error;
      setSubscription(data);
      return data;
    } else {
      // Create subscription with notifications enabled
      return subscribe(true);
    }
  }, [user, topicId, subscription, subscribe]);

  return {
    subscription,
    isSubscribed: !!subscription,
    notificationsEnabled: subscription?.notify_replies ?? false,
    loading,
    subscribe,
    unsubscribe,
    toggleNotifications,
    refetch: fetchSubscription,
  };
}
