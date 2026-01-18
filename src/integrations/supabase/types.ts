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
      battlenet_tokens: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
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
        }
        Insert: {
          guild_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          guild_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
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
      guild_poll_questions: {
        Row: {
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
      legal_pages: {
        Row: {
          content_en: string
          content_fr: string
          id: string
          slug: string
          title_en: string
          title_fr: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content_en: string
          content_fr: string
          id?: string
          slug: string
          title_en: string
          title_fr: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content_en?: string
          content_fr?: string
          id?: string
          slug?: string
          title_en?: string
          title_fr?: string
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
      patch_notes: {
        Row: {
          content_en: string
          content_fr: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          status: string
          title_en: string
          title_fr: string
          updated_at: string
          version: string
        }
        Insert: {
          content_en?: string
          content_fr?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title_en: string
          title_fr: string
          updated_at?: string
          version: string
        }
        Update: {
          content_en?: string
          content_fr?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title_en?: string
          title_fr?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      poll_results_access_rules: {
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
            foreignKeyName: "poll_results_access_rules_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "guild_polls"
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
          main_character_name?: string | null
          preferred_language?: string
          show_battletag?: boolean | null
          updated_at?: string
          username?: string
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
      rosters: {
        Row: {
          created_at: string
          description: string | null
          guild_id: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          guild_id: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          guild_id?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_poll_results: {
        Args: { p_poll_id: string; p_user_id: string }
        Returns: boolean
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_roster_access: {
        Args: { p_roster_id: string; p_user_id: string }
        Returns: boolean
      }
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
      log_guild_activity: {
        Args: {
          p_action_details?: Json
          p_action_type: string
          p_guild_id: string
          p_roster_id?: string
          p_target_user_id?: string
          p_user_id: string
        }
        Returns: string
      }
      set_main_character: {
        Args: { p_character_id: string }
        Returns: undefined
      }
      set_main_character_by_key: {
        Args: { p_name: string; p_realm_slug: string }
        Returns: undefined
      }
      shares_wow_guild: {
        Args: { p_current_user_id: string; p_target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      forum_sanction_type: "timeout" | "ban"
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
    },
  },
} as const
