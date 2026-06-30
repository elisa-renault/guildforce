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
  // Forum tables are intentionally absent after migration 20260616110000.
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
      auth_diagnostics: {
        Row: {
          browser: string | null
          created_at: string
          error_message: string | null
          flow_id: string
          id: string
          metadata: Json
          provider: string
          status: string
          step: string
          url_path: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          error_message?: string | null
          flow_id: string
          id?: string
          metadata?: Json
          provider?: string
          status: string
          step: string
          url_path?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          error_message?: string | null
          flow_id?: string
          id?: string
          metadata?: Json
          provider?: string
          status?: string
          step?: string
          url_path?: string | null
          user_id?: string | null
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
          season_id: string
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
          season_id: string
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
          season_id?: string
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
            foreignKeyName: "class_wishes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "roster_wish_seasons"
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
      client_error_reports: {
        Row: {
          created_at: string
          id: string
          locale: string | null
          metadata: Json
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          route_path: string | null
          route_url: string | null
          status: string
          toast_description: string | null
          toast_title: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string | null
          metadata?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_path?: string | null
          route_url?: string | null
          status?: string
          toast_description?: string | null
          toast_title: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string | null
          metadata?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_path?: string | null
          route_url?: string | null
          status?: string
          toast_description?: string | null
          toast_title?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_error_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_error_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      command_palette_recent_items: {
        Row: {
          created_at: string
          guild_id: string | null
          href: string | null
          item_id: string
          item_type: string
          last_used_at: string
          metadata: Json
          subtitle: string | null
          title: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          guild_id?: string | null
          href?: string | null
          item_id: string
          item_type: string
          last_used_at?: string
          metadata?: Json
          subtitle?: string | null
          title: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          guild_id?: string | null
          href?: string | null
          item_id?: string
          item_type?: string
          last_used_at?: string
          metadata?: Json
          subtitle?: string | null
          title?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_palette_recent_items_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_palette_recent_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      composition_abilities: {
        Row: {
          ability_key: string
          ability_kind: string
          active: boolean
          cooldown_profile: string | null
          cooldown_seconds: number | null
          coverage_key: string
          created_at: string
          id: string
          sort_order: number | null
          source: string
          source_label_fr: string | null
          source_updated_at: string | null
          source_url: string | null
          spell_id: number | null
          updated_at: string
        }
        Insert: {
          ability_key: string
          ability_kind: string
          active?: boolean
          cooldown_profile?: string | null
          cooldown_seconds?: number | null
          coverage_key: string
          created_at?: string
          id?: string
          sort_order?: number | null
          source?: string
          source_label_fr?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          spell_id?: number | null
          updated_at?: string
        }
        Update: {
          ability_key?: string
          ability_kind?: string
          active?: boolean
          cooldown_profile?: string | null
          cooldown_seconds?: number | null
          coverage_key?: string
          created_at?: string
          id?: string
          sort_order?: number | null
          source?: string
          source_label_fr?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          spell_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      composition_ability_mappings: {
        Row: {
          ability_id: string
          applies_to_main: boolean
          applies_to_offspec_alt: boolean
          class_id: string
          id: string
          notes: string | null
          role: string | null
          spec_id: string | null
        }
        Insert: {
          ability_id: string
          applies_to_main?: boolean
          applies_to_offspec_alt?: boolean
          class_id: string
          id?: string
          notes?: string | null
          role?: string | null
          spec_id?: string | null
        }
        Update: {
          ability_id?: string
          applies_to_main?: boolean
          applies_to_offspec_alt?: boolean
          class_id?: string
          id?: string
          notes?: string | null
          role?: string | null
          spec_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composition_ability_mappings_ability_id_fkey"
            columns: ["ability_id"]
            isOneToOne: false
            referencedRelation: "composition_abilities"
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
          season_id: string
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
          season_id: string
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
          season_id?: string
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
            foreignKeyName: "external_member_wishes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "roster_wish_seasons"
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
      guild_activity_logs: {
        // Wish activity user_id stores the authenticated actor; target_user_id stores the member whose wishes changed.
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          guild_id: string
          id: string
          roster_id: string | null
          season_id: string | null
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
          season_id?: string | null
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
          season_id?: string | null
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
            foreignKeyName: "guild_activity_logs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "roster_wish_seasons"
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
      guild_atlas_documents: {
        Row: {
          collection: string | null
          content: string
          created_at: string
          created_by: string | null
          guild_id: string
          id: string
          min_rank_index: number | null
          owner_user_id: string | null
          roster_id: string | null
          slug: string
          status: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
          visibility_type: string
        }
        Insert: {
          collection?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          guild_id: string
          id?: string
          min_rank_index?: number | null
          owner_user_id?: string | null
          roster_id?: string | null
          slug: string
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
          visibility_type?: string
        }
        Update: {
          collection?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          guild_id?: string
          id?: string
          min_rank_index?: number | null
          owner_user_id?: string | null
          roster_id?: string | null
          slug?: string
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
          visibility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_atlas_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_atlas_documents_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_atlas_documents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_atlas_documents_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_atlas_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_members: {
        Row: {
          guild_id: string
          guild_main_character_id: string | null
          guild_main_character_name: string | null
          guild_main_character_realm: string | null
          guild_main_character_realm_slug: string | null
          guild_main_character_updated_at: string | null
          guild_main_character_updated_by: string | null
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
          wishes_locked: boolean
        }
        Insert: {
          guild_id: string
          guild_main_character_id?: string | null
          guild_main_character_name?: string | null
          guild_main_character_realm?: string | null
          guild_main_character_realm_slug?: string | null
          guild_main_character_updated_at?: string | null
          guild_main_character_updated_by?: string | null
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
          wishes_locked?: boolean
        }
        Update: {
          guild_id?: string
          guild_main_character_id?: string | null
          guild_main_character_name?: string | null
          guild_main_character_realm?: string | null
          guild_main_character_realm_slug?: string | null
          guild_main_character_updated_at?: string | null
          guild_main_character_updated_by?: string | null
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
          wishes_locked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_guild_main_character_id_fkey"
            columns: ["guild_main_character_id"]
            isOneToOne: false
            referencedRelation: "wow_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_members_guild_main_character_updated_by_fkey"
            columns: ["guild_main_character_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      guild_season_member_intents: {
        Row: {
          commitment_status: string
          guild_id: string
          id: string
          roster_id: string
          season_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commitment_status?: string
          guild_id: string
          id?: string
          roster_id: string
          season_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commitment_status?: string
          guild_id?: string
          id?: string
          roster_id?: string
          season_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_season_member_intents_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_season_member_intents_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "roster_wish_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_season_member_intents_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_season_member_intents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_seasons: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          guild_id: string
          id: string
          name: string
          source_season_id: string | null
          starts_at: string | null
          state: Database["public"]["Enums"]["guild_season_state"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          guild_id: string
          id?: string
          name: string
          source_season_id?: string | null
          starts_at?: string | null
          state?: Database["public"]["Enums"]["guild_season_state"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          guild_id?: string
          id?: string
          name?: string
          source_season_id?: string | null
          starts_at?: string | null
          state?: Database["public"]["Enums"]["guild_season_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_seasons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_seasons_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_seasons_source_season_id_fkey"
            columns: ["source_season_id"]
            isOneToOne: false
            referencedRelation: "guild_seasons"
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
          active: boolean
          category: string
          class_id: string
          created_at: string
          effect_key: string | null
          id: number
          sort_order: number | null
          source: string
          source_label_fr: string | null
          source_updated_at: string | null
          source_url: string | null
          spec_id: string | null
          spell_id: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          class_id: string
          created_at?: string
          effect_key?: string | null
          id?: number
          sort_order?: number | null
          source?: string
          source_label_fr?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          spec_id?: string | null
          spell_id: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          class_id?: string
          created_at?: string
          effect_key?: string | null
          id?: number
          sort_order?: number | null
          source?: string
          source_label_fr?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          spec_id?: string | null
          spell_id?: number
          updated_at?: string
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
      roster_wish_seasons: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          guild_id: string
          guild_season_id: string | null
          hide_member_wishes: boolean
          id: string
          name: string
          roster_id: string
          source_season_id: string | null
          starts_at: string | null
          state: Database["public"]["Enums"]["guild_season_state"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          guild_id: string
          guild_season_id?: string | null
          hide_member_wishes?: boolean
          id?: string
          name: string
          roster_id: string
          source_season_id?: string | null
          starts_at?: string | null
          state?: Database["public"]["Enums"]["guild_season_state"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          guild_id?: string
          guild_season_id?: string | null
          hide_member_wishes?: boolean
          id?: string
          name?: string
          roster_id?: string
          source_season_id?: string | null
          starts_at?: string | null
          state?: Database["public"]["Enums"]["guild_season_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_wish_seasons_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_wish_seasons_guild_season_id_fkey"
            columns: ["guild_season_id"]
            isOneToOne: false
            referencedRelation: "guild_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      // Cache-claim trigger merges stale external rows when a roster cache entry links to a user.
      roster_season_members: {
        Row: {
          character_name_snapshot: string | null
          created_at: string
          display_name_snapshot: string
          guild_id: string
          id: string
          joined_wishlist_at: string
          left_guild_at: string | null
          left_roster_at: string | null
          locked: boolean
          rank_index_snapshot: number | null
          realm_snapshot: string | null
          roster_cache_id: string | null
          roster_id: string
          season_id: string
          season_status: Database["public"]["Enums"]["roster_season_member_status"]
          source: Database["public"]["Enums"]["roster_season_member_source"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          character_name_snapshot?: string | null
          created_at?: string
          display_name_snapshot: string
          guild_id: string
          id?: string
          joined_wishlist_at?: string
          left_guild_at?: string | null
          left_roster_at?: string | null
          locked?: boolean
          rank_index_snapshot?: number | null
          realm_snapshot?: string | null
          roster_cache_id?: string | null
          roster_id: string
          season_id: string
          season_status?: Database["public"]["Enums"]["roster_season_member_status"]
          source?: Database["public"]["Enums"]["roster_season_member_source"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          character_name_snapshot?: string | null
          created_at?: string
          display_name_snapshot?: string
          guild_id?: string
          id?: string
          joined_wishlist_at?: string
          left_guild_at?: string | null
          left_roster_at?: string | null
          locked?: boolean
          rank_index_snapshot?: number | null
          realm_snapshot?: string | null
          roster_cache_id?: string | null
          roster_id?: string
          season_id?: string
          season_status?: Database["public"]["Enums"]["roster_season_member_status"]
          source?: Database["public"]["Enums"]["roster_season_member_source"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      roster_season_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          guild_id: string
          id: string
          payload: Json
          roster_id: string
          roster_season_member_id: string | null
          season_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          guild_id: string
          id?: string
          payload?: Json
          roster_id: string
          roster_season_member_id?: string | null
          season_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          guild_id?: string
          id?: string
          payload?: Json
          roster_id?: string
          roster_season_member_id?: string | null
          season_id?: string
        }
        Relationships: []
      }
      roster_member_selection: {
        Row: {
          comment: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          reason_code: Database["public"]["Enums"]["roster_selection_reason_code"] | null
          roster_id: string
          roster_cache_id: string | null
          season_id: string
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
          season_id: string
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
          season_id?: string
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
            foreignKeyName: "roster_member_selection_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "roster_wish_seasons"
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
      user_guild_navigation_preferences: {
        Row: {
          created_at: string
          guild_id: string
          is_favorite: boolean
          last_visited_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          is_favorite?: boolean
          last_visited_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          is_favorite?: boolean
          last_visited_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_guild_navigation_preferences_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_guild_navigation_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          description_de: string | null
          description_en: string | null
          description_es: string | null
          description_fr: string | null
          description_it: string | null
          description_ko: string | null
          description_pt_br: string | null
          description_ru: string | null
          description_zh_tw: string | null
          name_de: string | null
          name_en: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          name_ko: string | null
          name_pt_br: string | null
          name_ru: string | null
          name_zh_tw: string | null
          spell_id: number
          updated_at: string
        }
        Insert: {
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          description_ko?: string | null
          description_pt_br?: string | null
          description_ru?: string | null
          description_zh_tw?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_ko?: string | null
          name_pt_br?: string | null
          name_ru?: string | null
          name_zh_tw?: string | null
          spell_id: number
          updated_at?: string
        }
        Update: {
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          description_ko?: string | null
          description_pt_br?: string | null
          description_ru?: string | null
          description_zh_tw?: string | null
          name_de?: string | null
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          name_ko?: string | null
          name_pt_br?: string | null
          name_ru?: string | null
          name_zh_tw?: string | null
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
      create_roster_with_wish_season: {
        Args: {
          p_guild_id: string
          p_name: string
          p_description?: string | null
          p_access_rules?: Json
          p_season_name?: string | null
        }
        Returns: Database["public"]["Tables"]["rosters"]["Row"]
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
      // Contract unchanged; activity-source semantics are refined in the 20260616093000 migration.
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_polls: number
          activation_rate_7d_pct: number | null
          active_guilds_30d: number
          active_guilds_30d_delta_pct: number | null
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
          poll_voters: number
          retention_d30_pct: number | null
          retention_d7_pct: number | null
          total_guilds: number
          total_polls: number
          total_users: number
          total_wishes: number
          unique_wish_users: number
          wau_delta_pct: number | null
          wau_mau_ratio: number | null
          wau_users: number
        }[]
      }
      // Contract unchanged; activity-source semantics are refined in the 20260616093000 migration, and SQL-only ambiguity fixes keep this shape.
      get_admin_dashboard_timeseries: {
        Args: { p_days?: number }
        Returns: {
          created_bugs: number
          created_deletions: number
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
      get_guild_member_main_candidates: {
        Args: { p_guild_id: string; p_member_id: string }
        Returns: {
          character_id: string | null
          roster_cache_id: string | null
          character_name: string
          character_realm: string | null
          character_realm_slug: string
          character_level: number | null
          character_class_id: number | null
          rank_index: number | null
          is_effective_main: boolean
        }[]
      }
      get_guild_member_main_characters: {
        Args: { p_guild_id: string }
        Returns: {
          user_id: string
          character_id: string | null
          roster_cache_id: string | null
          character_name: string
          character_realm: string | null
          character_realm_slug: string
          source: string
        }[]
      }
      // Compatibility shim after roster member assignments were retired.
      seed_roster_assignments_from_first_approved_wish: {
        Args: { p_roster_id: string; p_season_id: string }
        Returns: number
      }
      // Contract unchanged; implementation upserts against roster-scoped unique indexes.
      materialize_roster_season_members: {
        Args: { p_roster_id: string; p_season_id: string }
        Returns: number
      }
      get_roster_season_table: {
        // current_assignment is retained for API compatibility; roster assignments are retired.
        Args: { p_roster_id: string; p_season_id: string }
        Returns: {
          season_member_id: string
          user_id: string | null
          roster_cache_id: string | null
          display_name: string
          character_name: string | null
          realm: string | null
          rank_index: number | null
          source: Database["public"]["Enums"]["roster_season_member_source"]
          season_status: Database["public"]["Enums"]["roster_season_member_status"]
          locked: boolean
          wishes: Json
          selection_status: Database["public"]["Enums"]["roster_selection_status"]
          selection_reason_code: Database["public"]["Enums"]["roster_selection_reason_code"] | null
          selection_comment: string | null
          selection_decided_by: string | null
          selection_decided_at: string | null
          selection_updated_at: string | null
          current_assignment: Json | null
          outcome: Json
        }[]
      }
      get_roster_season_history: {
        // Signature unchanged; the RPC wraps UNION output before ordering by event timestamp.
        Args: {
          p_roster_id: string
          p_season_id: string
          p_roster_season_member_id: string
        }
        Returns: {
          event_at: string
          event_type: string
          actor_id: string | null
          payload: Json
        }[]
      }
      get_roster_season_outcomes: {
        Args: { p_roster_id: string; p_season_id: string }
        Returns: {
          roster_season_member_id: string
          user_id: string | null
          roster_cache_id: string | null
          first_choice_granted: boolean
          granted_choice_index: number | null
          final_class_id: string | null
          final_spec_id: string | null
          changed_class_during_season: boolean
          changed_for_raid_need: boolean
          joined_mid_season: boolean
          left_mid_season: boolean
          final_status: Database["public"]["Enums"]["roster_season_member_status"]
        }[]
      }
      apply_roster_season_sync_delta: {
        Args: { p_roster_id: string; p_season_id: string }
        Returns: Json
      }
      prepare_roster_wish_season: {
        Args: {
          p_roster_id: string
          p_name: string
          p_starts_at?: string | null
          p_ends_at?: string | null
          p_source_season_id?: string | null
          p_activate?: boolean
        }
        Returns: Database["public"]["Tables"]["roster_wish_seasons"]["Row"]
      }
      archive_roster_wish_season: {
        Args: { p_season_id: string }
        Returns: Database["public"]["Tables"]["roster_wish_seasons"]["Row"]
      }
      activate_roster_wish_season: {
        Args: { p_season_id: string }
        Returns: Database["public"]["Tables"]["roster_wish_seasons"]["Row"]
      }
      get_roster_member_selection: {
        Args: { p_roster_id: string; p_season_id?: string | null }
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
      set_roster_member_selection: {
        Args: {
          p_roster_id: string
          p_selection_status: Database["public"]["Enums"]["roster_selection_status"]
          p_user_id?: string | null
          p_roster_cache_id?: string | null
          p_season_id?: string | null
          p_reason_code?: Database["public"]["Enums"]["roster_selection_reason_code"] | null
          p_comment?: string | null
        }
        Returns: undefined
      }
      get_active_guild_season: {
        Args: { p_guild_id: string }
        Returns: Database["public"]["Tables"]["guild_seasons"]["Row"]
      }
      prepare_guild_wish_season: {
        Args: {
          p_activate?: boolean
          p_ends_at?: string | null
          p_guild_id: string
          p_name: string
          p_prefill_wishes?: boolean
          p_reset_copied_wishes?: boolean
          p_source_season_id?: string | null
          p_starts_at?: string | null
        }
        Returns: Database["public"]["Tables"]["guild_seasons"]["Row"]
      }
      // Global admins may call this RPC in read-only mode; signature is unchanged.
      can_manage_guild_atlas: {
        Args: { p_guild_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_guild_atlas_document: {
        Args: { p_document_id: string; p_user_id: string }
        Returns: boolean
      }
      get_user_guild_rank_index: {
        Args: { p_guild_id: string; p_user_id: string }
        Returns: number | null
      }
      get_roster_access_debug: {
        Args: { p_roster_id: string; p_user_id: string }
        Returns: {
          best_rank_index: number | null
          has_access: boolean
          latest_sync_at: string | null
          profile_is_syncing: boolean
          source: string
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
          p_season_id?: string | null
          p_target_user_id?: string
          p_user_id: string
        }
        Returns: string | null
      }
      log_client_error_report: {
        Args: {
          p_locale?: string | null
          p_metadata?: Json
          p_route_path?: string | null
          p_route_url?: string | null
          p_toast_description?: string | null
          p_toast_title: string
          p_user_agent?: string | null
        }
        Returns: string
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
      remove_roster_wish_row: {
        Args: {
          p_guild_id: string
          p_member_id: string
          p_roster_id: string
          p_season_id: string
        }
        Returns: undefined
      }
      record_command_palette_use: {
        Args: {
          p_guild_id?: string | null
          p_href?: string | null
          p_item_id: string
          p_item_type: string
          p_metadata?: Json
          p_subtitle?: string | null
          p_title: string
        }
        Returns: undefined
      }
      search_command_palette: {
        Args: {
          p_context_guild_id?: string | null
          p_limit_per_group?: number
          p_query: string
        }
        Returns: {
          guild_id: string | null
          metadata: Json
          result_id: string
          result_type: string
          score: number
          subtitle: string | null
          title: string
        }[]
      }
      set_member_wishes_locked: {
        Args: { p_guild_id: string; p_member_id: string; p_locked: boolean }
        Returns: undefined
      }
      archive_guild_wish_season: {
        Args: { p_season_id: string }
        Returns: Database["public"]["Tables"]["guild_seasons"]["Row"]
      }
      activate_guild_wish_season: {
        Args: { p_season_id: string }
        Returns: Database["public"]["Tables"]["guild_seasons"]["Row"]
      }
      set_main_character: {
        Args: { p_character_id: string }
        Returns: undefined
      }
      set_main_character_by_key: {
        Args: { p_name: string; p_realm_slug: string }
        Returns: undefined
      }
      set_guild_member_main_character: {
        Args: {
          p_character_name: string
          p_guild_id: string
          p_member_id: string
          p_realm_slug: string
        }
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
      // Trigger function; keeps legal_pages.updated_at aligned with translation changes.
      sync_legal_page_parent_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      // Trigger function; keeps patch_notes.updated_at aligned with translation changes.
      sync_patch_note_parent_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
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
          p_season_id?: string | null
          p_spec_ids?: string[]
        }
        Returns: string
      }
      // Self-service saves may use a matched guild_roster_cache row while guild_members sync catches up.
      upsert_member_roster_wishes: {
        Args: {
          p_commitment_status: string
          p_guild_id: string
          p_manager_edit?: boolean
          p_member_id: string
          p_roster_id: string
          p_season_id?: string | null
          p_wishes?: Json | null
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      guild_season_state: "draft" | "active" | "archived"
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
      roster_season_event_type:
        | "member_joined"
        | "member_departed"
        | "member_removed"
        | "member_status_changed"
        | "roster_selection_changed"
        | "assignment_created"
        | "assignment_updated"
        | "assignment_removed"
        | "season_sync_delta_applied"
        | "wishes_updated"
      roster_season_member_source:
        | "target_rule"
        | "manual_external"
        | "manual_user"
        | "sync_auto_add"
        | "selection"
        | "wish"
      roster_season_member_status:
        | "candidate"
        | "confirmed"
        | "selected"
        | "bench"
        | "departed"
        | "removed"
        | "declined"
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
      guild_season_state: ["draft", "active", "archived"],
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
