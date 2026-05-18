export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_impersonation_sessions: {
        Row: {
          actor_user_id: string
          ended_at: string | null
          id: string
          restore_path: string | null
          start_path: string | null
          started_at: string
          target_email: string | null
          target_user_id: string
          target_username: string | null
        }
        Insert: {
          actor_user_id: string
          ended_at?: string | null
          id?: string
          restore_path?: string | null
          start_path?: string | null
          started_at?: string
          target_email?: string | null
          target_user_id: string
          target_username?: string | null
        }
        Update: {
          actor_user_id?: string
          ended_at?: string | null
          id?: string
          restore_path?: string | null
          start_path?: string | null
          started_at?: string
          target_email?: string | null
          target_user_id?: string
          target_username?: string | null
        }
        Relationships: []
      }
      battlenet_tokens: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          refresh_token: string | null
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          refresh_token?: string | null
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          refresh_token?: string | null
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battlenet_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          browser_info: Json | null
          category: string
          console_logs: Json | null
          created_at: string
          current_url: string | null
          description: string
          id: string
          priority: string
          reporter_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          user_context: Json | null
        }
        Insert: {
          browser_info?: Json | null
          category?: string
          console_logs?: Json | null
          created_at?: string
          current_url?: string | null
          description: string
          id?: string
          priority?: string
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          user_context?: Json | null
        }
        Update: {
          browser_info?: Json | null
          category?: string
          console_logs?: Json | null
          created_at?: string
          current_url?: string | null
          description?: string
          id?: string
          priority?: string
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          user_context?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          class_id: string
          created_at: string
          id: string
          is_main: boolean | null
          level: number | null
          name: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          is_main?: boolean | null
          level?: number | null
          name: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          is_main?: boolean | null
          level?: number | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      class_wishes: {
        Row: {
          choice_index: number
          class_id: string
          comment: string | null
          created_at: string
          guild_id: string
          id: string
          roster_id: string | null
          spec_ids: string[]
          spec_order: string[]
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validation_status: string
        }
        Insert: {
          choice_index: number
          class_id: string
          comment?: string | null
          created_at?: string
          guild_id: string
          id?: string
          roster_id?: string | null
          spec_ids?: string[]
          spec_order?: string[]
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
        }
        Update: {
          choice_index?: number
          class_id?: string
          comment?: string | null
          created_at?: string
          guild_id?: string
          id?: string
          roster_id?: string | null
          spec_ids?: string[]
          spec_order?: string[]
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_wishes_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_wishes_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_wishes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_wishes_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_member_wishes: {
        Row: {
          choice_index: number
          class_id: string
          comment: string | null
          commitment_status: string
          created_at: string
          created_by: string | null
          guild_id: string
          id: string
          roster_cache_id: string
          roster_id: string
          spec_ids: string[]
          spec_order: string[]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_status: string
        }
        Insert: {
          choice_index?: number
          class_id: string
          comment?: string | null
          commitment_status?: string
          created_at?: string
          created_by?: string | null
          guild_id: string
          id?: string
          roster_cache_id: string
          roster_id: string
          spec_ids?: string[]
          spec_order?: string[]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
        }
        Update: {
          choice_index?: number
          class_id?: string
          comment?: string | null
          commitment_status?: string
          created_at?: string
          created_by?: string | null
          guild_id?: string
          id?: string
          roster_cache_id?: string
          roster_id?: string
          spec_ids?: string[]
          spec_order?: string[]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_member_wishes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_member_wishes_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_member_wishes_roster_cache_id_fkey"
            columns: ["roster_cache_id"]
            isOneToOne: false
            referencedRelation: "guild_roster_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_member_wishes_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_member_wishes_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          guild_id: string | null
          icon: string | null
          id: string
          is_global: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          guild_id?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          guild_id?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_categories_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_moderators: {
        Row: {
          category_id: string | null
          created_at: string
          guild_id: string | null
          id: string
          is_global_mod: boolean
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          is_global_mod?: boolean
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          is_global_mod?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_moderators_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_moderators_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_moderators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          post_id: string | null
          topic_id: string | null
          triggered_by: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          post_id?: string | null
          topic_id?: string | null
          triggered_by?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          post_id?: string | null
          topic_id?: string | null
          triggered_by?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_notifications_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_notifications_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_edited: boolean
          quoted_post_id: string | null
          topic_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          quoted_post_id?: string | null
          topic_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          quoted_post_id?: string | null
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_quoted_post_id_fkey"
            columns: ["quoted_post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          reaction_type: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topic_subscriptions: {
        Row: {
          created_at: string
          id: string
          notify_replies: boolean
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_replies?: boolean
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_replies?: boolean
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_topic_subscriptions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topic_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          author_id: string
          category_id: string
          content: string
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          last_reply_at: string | null
          last_reply_by: string | null
          reply_count: number
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          category_id: string
          content: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          last_reply_at?: string | null
          last_reply_by?: string | null
          reply_count?: number
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          category_id?: string
          content?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          last_reply_at?: string | null
          last_reply_by?: string | null
          reply_count?: number
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topics_last_reply_by_fkey"
            columns: ["last_reply_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_user_sanctions: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          sanction_type: Database["public"]["Enums"]["forum_sanction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          sanction_type: Database["public"]["Enums"]["forum_sanction_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          sanction_type?: Database["public"]["Enums"]["forum_sanction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_user_sanctions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_user_sanctions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_user_sanctions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_activity_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          guild_id: string
          id: string
          roster_id: string | null
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          guild_id: string
          id?: string
          roster_id?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          guild_id?: string
          id?: string
          roster_id?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_activity_logs_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_activity_logs_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_activity_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_members: {
        Row: {
          guild_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
          wishes_locked: boolean
        }
        Insert: {
          guild_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
          wishes_locked?: boolean
        }
        Update: {
          guild_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
          wishes_locked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_permissions: {
        Row: {
          access_type: string
          created_at: string
          guild_id: string
          id: string
          max_rank_index: number | null
          min_rank_index: number | null
          permission_type: string
          user_id: string | null
        }
        Insert: {
          access_type: string
          created_at?: string
          guild_id: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          permission_type: string
          user_id?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string
          guild_id?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          permission_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_permissions_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_secret_access_rules: {
        Row: {
          access_type: string
          capability: string
          created_at: string
          id: string
          max_rank_index: number | null
          min_rank_index: number | null
          secret_id: string
          user_id: string | null
        }
        Insert: {
          access_type: string
          capability: string
          created_at?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          secret_id: string
          user_id?: string | null
        }
        Update: {
          access_type?: string
          capability?: string
          created_at?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          secret_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_secret_access_rules_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "guild_secrets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_secret_access_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_secret_audit_events: {
        Row: {
          action_context: Json
          action_type: string
          actor_user_id: string | null
          created_at: string
          guild_id: string
          id: string
          secret_id: string
        }
        Insert: {
          action_context?: Json
          action_type: string
          actor_user_id?: string | null
          created_at?: string
          guild_id: string
          id?: string
          secret_id: string
        }
        Update: {
          action_context?: Json
          action_type?: string
          actor_user_id?: string | null
          created_at?: string
          guild_id?: string
          id?: string
          secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_secret_audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_secret_audit_events_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_secret_audit_events_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "guild_secrets"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_secret_versions: {
        Row: {
          created_at: string
          created_by: string
          encrypted_payload: string
          expires_at: string | null
          id: string
          is_active: boolean
          iv: string
          key_version: string
          preview_mask: string
          secret_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          encrypted_payload: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          iv: string
          key_version: string
          preview_mask: string
          secret_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          encrypted_payload?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          iv?: string
          key_version?: string
          preview_mask?: string
          secret_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "guild_secret_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_secret_versions_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "guild_secrets"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_secrets: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          guild_id: string
          id: string
          illustration_url: string | null
          is_archived: boolean
          label: string
          login_identifier_hint: string | null
          requires_reason: boolean
          secret_kind: string
          service_name: string
          service_url: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          guild_id: string
          id?: string
          illustration_url?: string | null
          is_archived?: boolean
          label: string
          login_identifier_hint?: string | null
          requires_reason?: boolean
          secret_kind: string
          service_name: string
          service_url?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          guild_id?: string
          id?: string
          illustration_url?: string | null
          is_archived?: boolean
          label?: string
          login_identifier_hint?: string | null
          requires_reason?: boolean
          secret_kind?: string
          service_name?: string
          service_url?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_secrets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_secrets_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_secrets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_poll_questions: {
        Row: {
          analysis_intent:
            | Database["public"]["Enums"]["poll_question_analysis_intent"]
            | null
          allow_other: boolean
          condition: Json | null
          created_at: string
          display_order: number
          id: string
          is_required: boolean
          options: Json | null
          poll_id: string
          question_text: string
          question_type: Database["public"]["Enums"]["poll_question_type"]
          scale_config: Json | null
          section_id: string | null
        }
        Insert: {
          analysis_intent?:
            | Database["public"]["Enums"]["poll_question_analysis_intent"]
            | null
          allow_other?: boolean
          condition?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          options?: Json | null
          poll_id: string
          question_text: string
          question_type?: Database["public"]["Enums"]["poll_question_type"]
          scale_config?: Json | null
          section_id?: string | null
        }
        Update: {
          analysis_intent?:
            | Database["public"]["Enums"]["poll_question_analysis_intent"]
            | null
          allow_other?: boolean
          condition?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          options?: Json | null
          poll_id?: string
          question_text?: string
          question_type?: Database["public"]["Enums"]["poll_question_type"]
          scale_config?: Json | null
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_poll_questions_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "guild_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_poll_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "guild_poll_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_poll_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string
          response_value: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          response_value: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          response_value?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_poll_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "guild_poll_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_poll_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_poll_sections: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          poll_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          poll_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          poll_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_poll_sections_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "guild_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_polls: {
        Row: {
          allow_multiple_responses: boolean
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          guild_id: string
          id: string
          is_anonymous: boolean
          results_base_audience: string
          results_base_visibility: string
          roster_id: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["poll_status"]
          title: string
          updated_at: string
        }
        Insert: {
          allow_multiple_responses?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          guild_id: string
          id?: string
          is_anonymous?: boolean
          results_base_audience?: string
          results_base_visibility?: string
          roster_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["poll_status"]
          title: string
          updated_at?: string
        }
        Update: {
          allow_multiple_responses?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          guild_id?: string
          id?: string
          is_anonymous?: boolean
          results_base_audience?: string
          results_base_visibility?: string
          roster_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["poll_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_polls_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_polls_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_aliases: {
        Row: {
          created_at: string
          guild_id: string
          id: string
          old_name: string
          region: string
          server: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          id?: string
          old_name: string
          region: string
          server: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          id?: string
          old_name?: string
          region?: string
          server?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_aliases_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_roster_cache: {
        Row: {
          character_class_id: number
          character_level: number
          character_name: string
          character_realm: string
          character_realm_slug: string
          created_at: string
          guild_id: string
          id: string
          is_guild_master: boolean | null
          matched_character_id: string | null
          matched_user_id: string | null
          rank_index: number
          rank_name: string | null
          updated_at: string
        }
        Insert: {
          character_class_id: number
          character_level?: number
          character_name: string
          character_realm: string
          character_realm_slug: string
          created_at?: string
          guild_id: string
          id?: string
          is_guild_master?: boolean | null
          matched_character_id?: string | null
          matched_user_id?: string | null
          rank_index?: number
          rank_name?: string | null
          updated_at?: string
        }
        Update: {
          character_class_id?: number
          character_level?: number
          character_name?: string
          character_realm?: string
          character_realm_slug?: string
          created_at?: string
          guild_id?: string
          id?: string
          is_guild_master?: boolean | null
          matched_character_id?: string | null
          matched_user_id?: string | null
          rank_index?: number
          rank_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_roster_cache_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_roster_cache_matched_character_id_fkey"
            columns: ["matched_character_id"]
            isOneToOne: false
            referencedRelation: "wow_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_roster_cache_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_rank_labels: {
        Row: {
          created_at: string
          created_by: string
          guild_id: string
          id: string
          label: string
          rank_index: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          guild_id: string
          id?: string
          label: string
          rank_index: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          guild_id?: string
          id?: string
          label?: string
          rank_index?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_rank_labels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_rank_labels_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_rank_labels_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by_user_id: string | null
          faction: string
          id: string
          name: string
          officer_rank_threshold: number
          owner_id: string | null
          region: string
          server: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by_user_id?: string | null
          faction: string
          id?: string
          name: string
          officer_rank_threshold?: number
          owner_id?: string | null
          region?: string
          server: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by_user_id?: string | null
          faction?: string
          id?: string
          name?: string
          officer_rank_threshold?: number
          owner_id?: string | null
          region?: string
          server?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_page_translations: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          legal_page_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language: string
          legal_page_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          legal_page_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_page_translations_legal_page_id_fkey"
            columns: ["legal_page_id"]
            isOneToOne: false
            referencedRelation: "legal_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          id: string
          slug: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          slug: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          slug?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patch_note_translations: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          patch_note_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          language: string
          patch_note_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          patch_note_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patch_note_translations_patch_note_id_fkey"
            columns: ["patch_note_id"]
            isOneToOne: false
            referencedRelation: "patch_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      patch_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      poll_question_ai_summaries: {
        Row: {
          comment_count: number
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          locale: string
          model_name: string
          poll_id: string
          prompt_version: string
          question_id: string
          source_hash: string
          status: string
          summary_payload: Json | null
          updated_at: string
        }
        Insert: {
          comment_count?: number
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          locale: string
          model_name: string
          poll_id: string
          prompt_version: string
          question_id: string
          source_hash: string
          status: string
          summary_payload?: Json | null
          updated_at?: string
        }
        Update: {
          comment_count?: number
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          locale?: string
          model_name?: string
          poll_id?: string
          prompt_version?: string
          question_id?: string
          source_hash?: string
          status?: string
          summary_payload?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_question_ai_summaries_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_question_ai_summaries_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "guild_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_question_ai_summaries_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "guild_poll_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_respondent_rules: {
        Row: {
          access_type: string
          created_at: string
          id: string
          max_rank_index: number | null
          min_rank_index: number | null
          poll_id: string
          user_id: string | null
        }
        Insert: {
          access_type: string
          created_at?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          poll_id: string
          user_id?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          poll_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_respondent_rules_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "guild_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_respondent_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_results_access_rules: {
        Row: {
          audience_type: string
          created_at: string
          id: string
          max_rank_index: number | null
          min_rank_index: number | null
          poll_id: string
          question_id: string | null
          question_type:
            | Database["public"]["Enums"]["poll_question_type"]
            | null
          section_id: string | null
          target_type: string
          user_id: string | null
          visibility_level: string
        }
        Insert: {
          audience_type?: string
          created_at?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          poll_id: string
          question_id?: string | null
          question_type?:
            | Database["public"]["Enums"]["poll_question_type"]
            | null
          section_id?: string | null
          target_type?: string
          user_id?: string | null
          visibility_level?: string
        }
        Update: {
          audience_type?: string
          created_at?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          poll_id?: string
          question_id?: string | null
          question_type?:
            | Database["public"]["Enums"]["poll_question_type"]
            | null
          section_id?: string | null
          target_type?: string
          user_id?: string | null
          visibility_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_results_access_rules_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "guild_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_results_access_rules_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "guild_poll_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_results_access_rules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "guild_poll_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          battlenet_id: string | null
          battletag: string | null
          battletag_visibility: string
          created_at: string
          id: string
          is_syncing: boolean
          main_character_name: string | null
          preferred_language: string
          show_battletag: boolean | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          battlenet_id?: string | null
          battletag?: string | null
          battletag_visibility?: string
          created_at?: string
          id: string
          is_syncing?: boolean
          main_character_name?: string | null
          preferred_language?: string
          show_battletag?: boolean | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          battlenet_id?: string | null
          battletag?: string | null
          battletag_visibility?: string
          created_at?: string
          id?: string
          is_syncing?: boolean
          main_character_name?: string | null
          preferred_language?: string
          show_battletag?: boolean | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      product_events: {
        Row: {
          created_at: string
          event_context: Json
          event_name: string
          event_source: string | null
          guild_id: string | null
          id: number
          occurred_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_context?: Json
          event_name: string
          event_source?: string | null
          guild_id?: string | null
          id?: number
          occurred_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_context?: Json
          event_name?: string
          event_source?: string | null
          guild_id?: string | null
          id?: number
          occurred_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_events_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      raid_effects: {
        Row: {
          category: string
          class_id: string
          created_at: string
          id: number
          spec_id: string | null
          spell_id: number
        }
        Insert: {
          category: string
          class_id: string
          created_at?: string
          id?: number
          spec_id?: string | null
          spell_id: number
        }
        Update: {
          category?: string
          class_id?: string
          created_at?: string
          id?: number
          spec_id?: string | null
          spell_id?: number
        }
        Relationships: []
      }
      roster_access_rules: {
        Row: {
          access_type: string
          created_at: string
          id: string
          max_rank_index: number | null
          min_rank_index: number | null
          roster_id: string
          user_id: string | null
        }
        Insert: {
          access_type: string
          created_at?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          roster_id: string
          user_id?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string
          id?: string
          max_rank_index?: number | null
          min_rank_index?: number | null
          roster_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_access_rules_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      // Data backfills can target roster selections without changing the table shape.
      roster_member_selection: {
        Row: {
          comment: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          reason_code: Database["public"]["Enums"]["roster_selection_reason_code"] | null
          roster_id: string
          roster_cache_id: string | null
          selection_status: Database["public"]["Enums"]["roster_selection_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason_code?: Database["public"]["Enums"]["roster_selection_reason_code"] | null
          roster_id: string
          roster_cache_id?: string | null
          selection_status?: Database["public"]["Enums"]["roster_selection_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason_code?: Database["public"]["Enums"]["roster_selection_reason_code"] | null
          roster_id?: string
          roster_cache_id?: string | null
          selection_status?: Database["public"]["Enums"]["roster_selection_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_member_selection_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_member_selection_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_member_selection_roster_cache_id_fkey"
            columns: ["roster_cache_id"]
            isOneToOne: false
            referencedRelation: "guild_roster_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_member_selection_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rosters: {
        Row: {
          created_at: string
          description: string | null
          guild_id: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          wishes_lock_at: string | null
          wishes_locked: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          guild_id: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          wishes_lock_at?: string | null
          wishes_locked?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          guild_id?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          wishes_lock_at?: string | null
          wishes_locked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rosters_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wow_characters: {
        Row: {
          class_id: number
          created_at: string
          guild_name: string | null
          guild_realm: string | null
          id: string
          is_main: boolean
          level: number
          name: string
          realm: string
          realm_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id: number
          created_at?: string
          guild_name?: string | null
          guild_realm?: string | null
          id?: string
          is_main?: boolean
          level?: number
          name: string
          realm: string
          realm_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: number
          created_at?: string
          guild_name?: string | null
          guild_realm?: string | null
          id?: string
          is_main?: boolean
          level?: number
          name?: string
          realm?: string
          realm_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wow_characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wow_guild_memberships: {
        Row: {
          character_id: string | null
          created_at: string
          guild_faction: string
          guild_name: string
          guild_realm: string
          guild_realm_slug: string
          guild_region: string
          id: string
          is_guild_master: boolean | null
          rank_index: number
          rank_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          guild_faction?: string
          guild_name: string
          guild_realm: string
          guild_realm_slug: string
          guild_region?: string
          id?: string
          is_guild_master?: boolean | null
          rank_index?: number
          rank_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          character_id?: string | null
          created_at?: string
          guild_faction?: string
          guild_name?: string
          guild_realm?: string
          guild_realm_slug?: string
          guild_region?: string
          id?: string
          is_guild_master?: boolean | null
          rank_index?: number
          rank_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wow_guild_memberships_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "wow_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wow_guild_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wow_spells: {
        Row: {
          description_en: string | null
          description_fr: string | null
          name_en: string | null
          name_fr: string | null
          spell_id: number
          updated_at: string
        }
        Insert: {
          description_en?: string | null
          description_fr?: string | null
          name_en?: string | null
          name_fr?: string | null
          spell_id: number
          updated_at?: string
        }
        Update: {
          description_en?: string | null
          description_fr?: string | null
          name_en?: string | null
          name_fr?: string | null
          spell_id?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_scheduled_wish_locks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      can_edit_wishes: {
        Args: { p_guild_id: string; p_roster_id: string; p_user_id: string }
        Returns: boolean
      }
      can_respond_to_poll: {
        Args: { p_poll_id: string; p_user_id: string }
        Returns: boolean
      }
      // Vault rank access is evaluated against current guild_roster_cache matches.
      can_access_guild_secret: {
        Args: { p_capability: string; p_secret_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_poll_results: {
        Args: { p_poll_id: string; p_user_id: string }
        Returns: boolean
      }
      get_poll_question_results_visibility: {
        Args: { p_question_id: string; p_user_id: string }
        Returns: string
      }
      get_poll_results_visibility_map: {
        Args: { p_poll_id: string; p_user_id: string }
        Returns: {
          question_id: string
          visibility_level: string
        }[]
      }
      get_poll_results_cohort_analysis: {
        Args: { p_filters?: Json; p_poll_id: string; p_user_id: string }
        Returns: Json
      }
      fix_jsonb_text_array_mojibake: { Args: { j: Json }; Returns: Json }
      fix_poll_response_value: { Args: { j: Json }; Returns: Json }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_polls: number
          activation_rate_7d_pct: number | null
          active_guilds_30d: number
          active_guilds_30d_delta_pct: number | null
          active_sanctions: number
          active_users_30d: number
          active_users_30d_delta_pct: number | null
          closed_polls: number
          dau_delta_pct: number | null
          dau_users: number
          guild_engagement_rate: number
          guilds_with_roster_wishes: number
          guilds_with_two_members: number
          guilds_with_two_wish_users: number
          guilds_with_wishes: number
          mau_delta_pct: number | null
          mau_users: number
          open_bugs: number
          new_signups_7d: number
          pending_deletions: number
          pending_reports: number
          poll_voters: number
          retention_d30_pct: number | null
          retention_d7_pct: number | null
          total_guilds: number
          total_polls: number
          total_posts: number
          total_topics: number
          total_users: number
          total_wishes: number
          unique_wish_users: number
          wau_delta_pct: number | null
          wau_mau_ratio: number | null
          wau_users: number
        }[]
      }
      get_admin_dashboard_timeseries: {
        Args: { p_days?: number }
        Returns: {
          created_bugs: number
          created_deletions: number
          created_reports: number
          activated_users_7d: number | null
          activation_rate_7d_pct: number | null
          active_guilds_30d: number
          bucket_date: string
          critical_created_issues: number
          critical_issues: number
          dau_users: number
          engagement_wau_mau_pct: number | null
          mau_users: number
          new_signups: number
          open_bugs: number
          pending_deletions: number
          pending_reports: number
          wau_users: number
        }[]
      }
      get_guild_member_counts: {
        Args: { p_guild_ids: string[] }
        Returns: {
          guild_id: string
          total_count: number
          unique_users: number
        }[]
      }
      get_poll_response_counts: {
        Args: { p_poll_ids: string[] }
        Returns: {
          poll_id: string
          response_count: number
        }[]
      }
      get_public_profile_info: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          battletag: string
          id: string
          main_character_name: string
          username: string
        }[]
      }
      get_roster_member_selection: {
        Args: { p_roster_id: string }
        Returns: {
          user_id: string | null
          roster_cache_id: string | null
          selection_status: Database["public"]["Enums"]["roster_selection_status"]
          reason_code: Database["public"]["Enums"]["roster_selection_reason_code"] | null
          comment: string | null
          decided_by: string | null
          decided_at: string | null
          updated_at: string
        }[]
      }
      // Global admins may call this RPC in read-only mode; signature is unchanged.
      get_user_forum_sanction: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          expires_at: string
          reason: string
          sanction_type: Database["public"]["Enums"]["forum_sanction_type"]
        }[]
      }
      has_guild_permission: {
        Args: { p_guild_id: string; p_permission: string; p_user_id: string }
        Returns: boolean
      }
      has_any_guild_secret_access: {
        Args: { p_guild_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      // Backend helper normalizes guild server display names vs synced realm slugs.
      has_roster_access: {
        Args: { p_roster_id: string; p_user_id: string }
        Returns: boolean
      }
      // Backend permission semantics: guild owner_id is treated as GM authority.
      is_guild_gm: {
        Args: { p_guild_id: string; p_user_id: string }
        Returns: boolean
      }
      is_guild_member: {
        Args: { _guild_id: string; _user_id: string }
        Returns: boolean
      }
      is_guild_owner_or_gm: { Args: { _guild_id: string }; Returns: boolean }
      is_same_wow_guild: {
        Args: {
          p_guild_name: string
          p_guild_realm_slug: string
          p_guild_region: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_user_forum_sanctioned: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      list_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      list_guild_secret_audit: {
        Args: { p_guild_id: string; p_secret_id?: string | null }
        Returns: {
          action_context: Json
          action_type: string
          actor_user_id: string | null
          actor_username: string | null
          created_at: string
          guild_id: string
          id: string
          secret_id: string
          secret_label: string
        }[]
      }
      list_visible_guild_secrets: {
        Args: { p_guild_id: string }
        Returns: {
          can_audit: boolean
          can_manage: boolean
          can_reveal: boolean
          description: string | null
          id: string
          illustration_url: string | null
          label: string
          login_identifier_hint: string | null
          preview_mask: string
          requires_reason: boolean
          secret_kind: string
          service_name: string
          service_url: string | null
          updated_at: string
        }[]
      }
      delete_external_member_wish: {
        Args: { p_external_wish_id: string }
        Returns: undefined
      }
      lock_roster_wishes: {
        Args: { p_roster_id: string }
        Returns: undefined
      }
      log_product_event_from_forum_post: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      log_product_event_from_poll_response: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      log_product_event_from_wish: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      log_guild_activity: {
        Args: {
          p_action_details?: Json
          p_action_type: string
          p_guild_id: string
          p_roster_id?: string
          p_target_user_id?: string
          p_user_id: string
        }
        Returns: string | null
      }
      schedule_roster_wishes_lock: {
        Args: { p_lock_at: string | null; p_roster_id: string }
        Returns: undefined
      }
      reassign_profile_id: {
        Args: { new_id: string; old_id: string }
        Returns: undefined
      }
      remove_guild_member_with_wishes: {
        Args: { p_guild_id: string; p_member_id: string }
        Returns: undefined
      }
      set_member_wishes_locked: {
        Args: { p_guild_id: string; p_member_id: string; p_locked: boolean }
        Returns: undefined
      }
      set_main_character: {
        Args: { p_character_id: string }
        Returns: undefined
      }
      set_main_character_by_key: {
        Args: { p_name: string; p_realm_slug: string }
        Returns: undefined
      }
      track_product_event: {
        Args: {
          p_event_context?: Json
          p_event_name: string
          p_event_source?: string
          p_guild_id?: string
          p_occurred_at?: string
        }
        Returns: undefined
      }
      unlock_roster_wishes: {
        Args: { p_roster_id: string }
        Returns: undefined
      }
      shares_wow_guild: {
        Args: { p_current_user_id: string; p_target_user_id: string }
        Returns: boolean
      }
      try_fix_mojibake: { Args: { input: string }; Returns: string }
      upsert_external_member_wish: {
        Args: {
          p_class_id: string
          p_comment?: string | null
          p_commitment_status?: string
          p_roster_cache_id: string
          p_roster_id: string
          p_spec_ids?: string[]
        }
        Returns: string
      }
      upsert_member_roster_wishes: {
        Args: {
          p_commitment_status: string
          p_guild_id: string
          p_manager_edit?: boolean
          p_member_id: string
          p_roster_id: string
          p_wishes?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      forum_sanction_type: "timeout" | "ban"
      poll_question_analysis_intent: "decision" | "informative"
      poll_question_type:
        | "single_choice"
        | "multiple_choice"
        | "text"
        | "rating"
        | "date"
        | "time"
        | "datetime"
        | "ranking"
        | "scale"
      poll_status: "draft" | "active" | "closed"
      roster_selection_reason_code:
        | "role_fit"
        | "composition"
        | "attendance"
        | "performance"
        | "trial"
        | "conflict"
        | "other"
      roster_selection_status: "undecided" | "selected" | "bench" | "not_selected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      forum_sanction_type: ["timeout", "ban"],
      poll_question_analysis_intent: ["decision", "informative"],
      poll_question_type: [
        "single_choice",
        "multiple_choice",
        "text",
        "rating",
        "date",
        "time",
        "datetime",
        "ranking",
        "scale",
      ],
      poll_status: ["draft", "active", "closed"],
      roster_selection_reason_code: [
        "role_fit",
        "composition",
        "attendance",
        "performance",
        "trial",
        "conflict",
        "other",
      ],
      roster_selection_status: ["undecided", "selected", "bench", "not_selected"],
    },
  },
} as const
