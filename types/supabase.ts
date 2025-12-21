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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_name: string | null
          type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          type?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          post_id: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendees: string[] | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          end_time: string | null
          id: string
          is_recurring: boolean | null
          location: string | null
          start_time: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string | null
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          start_time: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string | null
        }
        Update: {
          attendees?: string[] | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          start_time?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_wars: {
        Row: {
          created_at: string | null
          discord_channel_id: string | null
          discord_message_id: string | null
          ended_at: string | null
          enemy_faction: string
          id: string
          regulations: Json | null
          slug: string | null
          started_at: string | null
          started_by: string | null
          status: string | null
          updated_at: string | null
          war_level: string | null
          war_type: string | null
        }
        Insert: {
          created_at?: string | null
          discord_channel_id?: string | null
          discord_message_id?: string | null
          ended_at?: string | null
          enemy_faction: string
          id?: string
          regulations?: Json | null
          slug?: string | null
          started_at?: string | null
          started_by?: string | null
          status?: string | null
          updated_at?: string | null
          war_level?: string | null
          war_type?: string | null
        }
        Update: {
          created_at?: string | null
          discord_channel_id?: string | null
          discord_message_id?: string | null
          ended_at?: string | null
          enemy_faction?: string
          id?: string
          regulations?: Json | null
          slug?: string | null
          started_at?: string | null
          started_by?: string | null
          status?: string | null
          updated_at?: string | null
          war_level?: string | null
          war_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faction_wars_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      global_war_regulations: {
        Row: {
          attacking_cooldown_hours: number | null
          id: string
          max_assault_rifles: number | null
          max_participants: number | null
          pk_cooldown_days: number | null
          pk_cooldown_type: string | null
          updated_at: string | null
          updated_by: string | null
          weapon_restrictions: string | null
        }
        Insert: {
          attacking_cooldown_hours?: number | null
          id?: string
          max_assault_rifles?: number | null
          max_participants?: number | null
          pk_cooldown_days?: number | null
          pk_cooldown_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          weapon_restrictions?: string | null
        }
        Update: {
          attacking_cooldown_hours?: number | null
          id?: string
          max_assault_rifles?: number | null
          max_participants?: number | null
          pk_cooldown_days?: number | null
          pk_cooldown_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          weapon_restrictions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_war_regulations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          discord_id: string
          login_time: string
          user_agent: string | null
          username: string | null
          last_visited_url: string | null
        }
        Insert: {
          discord_id: string
          login_time?: string
          user_agent?: string | null
          username?: string | null
          last_visited_url?: string | null
        }
        Update: {
          discord_id?: string
          login_time?: string
          user_agent?: string | null
          username?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          author_id: string | null
          description: string | null
          id: string
          location: string | null
          outcome: string | null
          participants: string[] | null
          timestamp: string | null
          title: string
          type: Database["public"]["Enums"]["log_type"]
        }
        Insert: {
          author_id?: string | null
          description?: string | null
          id?: string
          location?: string | null
          outcome?: string | null
          participants?: string[] | null
          timestamp?: string | null
          title: string
          type: Database["public"]["Enums"]["log_type"]
        }
        Update: {
          author_id?: string | null
          description?: string | null
          id?: string
          location?: string | null
          outcome?: string | null
          participants?: string[] | null
          timestamp?: string | null
          title?: string
          type?: Database["public"]["Enums"]["log_type"]
        }
        Relationships: [
          {
            foreignKeyName: "logs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string
          channel_name: string
          created_at: string | null
          id: number
          last_message_at: string | null
          message_count: number | null
          updated_at: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          channel_id: string
          channel_name: string
          created_at?: string | null
          id?: number
          last_message_at?: string | null
          message_count?: number | null
          updated_at?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          channel_id?: string
          channel_name?: string
          created_at?: string | null
          id?: number
          last_message_at?: string | null
          message_count?: number | null
          updated_at?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      player_kill_list: {
        Row: {
          added_by: string | null
          added_via: string | null
          created_at: string | null
          discord_id: string | null
          faction: string
          id: string
          kill_count: number | null
          last_killed_at: string | null
          player_name: string
          war_id: string | null
        }
        Insert: {
          added_by?: string | null
          added_via?: string | null
          created_at?: string | null
          discord_id?: string | null
          faction: string
          id?: string
          kill_count?: number | null
          last_killed_at?: string | null
          player_name: string
          war_id?: string | null
        }
        Update: {
          added_by?: string | null
          added_via?: string | null
          created_at?: string | null
          discord_id?: string | null
          faction?: string
          id?: string
          kill_count?: number | null
          last_killed_at?: string | null
          player_name?: string
          war_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_kill_list_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_kill_list_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "faction_wars"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          discord_channel_id: string | null
          discord_message_id: string | null
          id: string
          is_ic: boolean | null
          is_pinned: boolean | null
          media_urls: string[] | null
          tags: string[] | null
          title: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          discord_channel_id?: string | null
          discord_message_id?: string | null
          id?: string
          is_ic?: boolean | null
          is_pinned?: boolean | null
          media_urls?: string[] | null
          tags?: string[] | null
          title?: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          discord_channel_id?: string | null
          discord_message_id?: string | null
          id?: string
          is_ic?: boolean | null
          is_pinned?: boolean | null
          media_urls?: string[] | null
          tags?: string[] | null
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      turf_history: {
        Row: {
          action: string
          description: string | null
          faction: string
          id: string
          timestamp: string | null
          zone_id: string | null
        }
        Insert: {
          action: string
          description?: string | null
          faction: string
          id?: string
          timestamp?: string | null
          zone_id?: string | null
        }
        Update: {
          action?: string
          description?: string | null
          faction?: string
          id?: string
          timestamp?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turf_history_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "turf_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      turf_zones: {
        Row: {
          contested_by: string[] | null
          controlled_by: string | null
          coordinates: Json
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["turf_status"] | null
          updated_at: string | null
        }
        Insert: {
          contested_by?: string[] | null
          controlled_by?: string | null
          coordinates: Json
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["turf_status"] | null
          updated_at?: string | null
        }
        Update: {
          contested_by?: string[] | null
          controlled_by?: string | null
          coordinates?: Json
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["turf_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar: string | null
          created_at: string | null
          discord_id: string
          discriminator: string | null
          display_name: string | null
          email: string | null
          id: string
          joined_at: string | null
          last_active: string | null
          rank: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          discord_id: string
          discriminator?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          joined_at?: string | null
          last_active?: string | null
          rank?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          discord_id?: string
          discriminator?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          joined_at?: string | null
          last_active?: string | null
          rank?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      war_logs: {
        Row: {
          created_at: string | null
          date_time: string
          discord_channel_id: string | null
          discord_message_id: string | null
          edited_at: string | null
          edited_by: string | null
          evidence_url: string | null
          friends_involved: string[]
          id: string
          log_type: string | null
          members_involved: string[] | null
          notes: string | null
          players_killed: string[]
          submitted_by: string | null
          submitted_by_display_name: string | null
          updated_at: string | null
          war_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_time: string
          discord_channel_id?: string | null
          discord_message_id?: string | null
          edited_at?: string | null
          edited_by?: string | null
          evidence_url?: string | null
          friends_involved: string[]
          id?: string
          log_type?: string | null
          members_involved?: string[] | null
          notes?: string | null
          players_killed: string[]
          submitted_by?: string | null
          submitted_by_display_name?: string | null
          updated_at?: string | null
          war_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_time?: string
          discord_channel_id?: string | null
          discord_message_id?: string | null
          edited_at?: string | null
          edited_by?: string | null
          evidence_url?: string | null
          friends_involved?: string[]
          id?: string
          log_type?: string | null
          members_involved?: string[] | null
          notes?: string | null
          players_killed?: string[]
          submitted_by?: string | null
          submitted_by_display_name?: string | null
          updated_at?: string | null
          war_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "war_logs_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "war_logs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "war_logs_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "faction_wars"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          channel_id: string
          channel_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          post_type: Database["public"]["Enums"]["post_type"]
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          channel_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          post_type: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          channel_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          post_type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_message_leaderboard: {
        Args: { p_channel_id?: string; p_limit?: number }
        Returns: {
          channel_id: string
          channel_name: string
          last_message_at: string
          message_count: number
          user_id: string
          user_name: string
        }[]
      }
      increment_message_count: {
        Args: {
          p_channel_id: string
          p_channel_name: string
          p_user_id: string
          p_user_name: string
        }
        Returns: Json
      }
      log_login: {
        Args: {
          p_discord_id: string
          p_ip_address: string
          p_user_agent: string
        }
        Returns: undefined
      }
    }
    Enums: {
      event_type:
        | "MEETING"
        | "OPERATION"
        | "RECRUITMENT"
        | "PARTY"
        | "TRAINING"
        | "OTHER"
      log_type:
        | "TURF_WAR"
        | "ROBBERY"
        | "DRUG_DEAL"
        | "MEETING"
        | "RECRUITMENT"
        | "ALLIANCE"
        | "CONFLICT"
        | "OTHER"
      post_type:
        | "ANNOUNCEMENT"
        | "SCREENSHOT"
        | "WORD_ON_STREET"
        | "ATTACK_LOG"
        | "DEFENSE_LOG"
        | "GRAFFITI"
        | "MEDIA"
        | "GENERAL"
      turf_status: "CONTROLLED" | "CONTESTED" | "NEUTRAL" | "LOST"
      user_role: "ADMIN" | "LEADER" | "MODERATOR" | "MEMBER" | "GUEST"
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
      event_type: [
        "MEETING",
        "OPERATION",
        "RECRUITMENT",
        "PARTY",
        "TRAINING",
        "OTHER",
      ],
      log_type: [
        "TURF_WAR",
        "ROBBERY",
        "DRUG_DEAL",
        "MEETING",
        "RECRUITMENT",
        "ALLIANCE",
        "CONFLICT",
        "OTHER",
      ],
      post_type: [
        "ANNOUNCEMENT",
        "SCREENSHOT",
        "WORD_ON_STREET",
        "ATTACK_LOG",
        "DEFENSE_LOG",
        "GRAFFITI",
        "MEDIA",
        "GENERAL",
      ],
      turf_status: ["CONTROLLED", "CONTESTED", "NEUTRAL", "LOST"],
      user_role: ["ADMIN", "LEADER", "MODERATOR", "MEMBER", "GUEST"],
    },
  },
} as const
