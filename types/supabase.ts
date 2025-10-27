export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      global_war_regulations: {
        Row: {
          id: string
          attacking_cooldown_hours: number
          pk_cooldown_type: string
          pk_cooldown_days: number
          max_participants: number
          max_assault_rifles: number
          weapon_restrictions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          attacking_cooldown_hours: number
          pk_cooldown_type: string
          pk_cooldown_days: number
          max_participants: number
          max_assault_rifles: number
          weapon_restrictions: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          attacking_cooldown_hours?: number
          pk_cooldown_type?: string
          pk_cooldown_days?: number
          max_participants?: number
          max_assault_rifles?: number
          weapon_restrictions?: Json
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          discord_id: string
          username: string
          discriminator: string | null
          avatar: string | null
          email: string | null
          role: 'ADMIN' | 'LEADER' | 'MODERATOR' | 'MEMBER' | 'GUEST'
          rank: string | null
          joined_at: string
          last_active: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          discord_id: string
          username: string
          discriminator?: string | null
          avatar?: string | null
          email?: string | null
          role?: 'ADMIN' | 'LEADER' | 'MODERATOR' | 'MEMBER' | 'GUEST'
          rank?: string | null
          joined_at?: string
          last_active?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          discord_id?: string
          username?: string
          discriminator?: string | null
          avatar?: string | null
          email?: string | null
          role?: 'ADMIN' | 'LEADER' | 'MODERATOR' | 'MEMBER' | 'GUEST'
          rank?: string | null
          joined_at?: string
          last_active?: string
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          type: 'ANNOUNCEMENT' | 'SCREENSHOT' | 'WORD_ON_STREET' | 'ATTACK_LOG' | 'DEFENSE_LOG' | 'GRAFFITI' | 'MEDIA' | 'GENERAL'
          title: string | null
          content: string
          media_urls: string[]
          tags: string[]
          is_ic: boolean
          is_pinned: boolean
          author_id: string
          discord_message_id: string | null
          discord_channel_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'ANNOUNCEMENT' | 'SCREENSHOT' | 'WORD_ON_STREET' | 'ATTACK_LOG' | 'DEFENSE_LOG' | 'GRAFFITI' | 'MEDIA' | 'GENERAL'
          title?: string | null
          content: string
          media_urls?: string[]
          tags?: string[]
          is_ic?: boolean
          is_pinned?: boolean
          author_id: string
          discord_message_id?: string | null
          discord_channel_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'ANNOUNCEMENT' | 'SCREENSHOT' | 'WORD_ON_STREET' | 'ATTACK_LOG' | 'DEFENSE_LOG' | 'GRAFFITI' | 'MEDIA' | 'GENERAL'
          title?: string | null
          content?: string
          media_urls?: string[]
          tags?: string[]
          is_ic?: boolean
          is_pinned?: boolean
          author_id?: string
          discord_message_id?: string | null
          discord_channel_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          content: string
          post_id: string
          author_id: string
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          post_id: string
          author_id: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          post_id?: string
          author_id?: string
          created_at?: string
        }
      }
      logs: {
        Row: {
          id: string
          type: 'TURF_WAR' | 'ROBBERY' | 'DRUG_DEAL' | 'MEETING' | 'RECRUITMENT' | 'ALLIANCE' | 'CONFLICT' | 'OTHER'
          title: string
          description: string | null
          location: string | null
          participants: string[]
          outcome: string | null
          author_id: string
          timestamp: string
        }
        Insert: {
          id?: string
          type: 'TURF_WAR' | 'ROBBERY' | 'DRUG_DEAL' | 'MEETING' | 'RECRUITMENT' | 'ALLIANCE' | 'CONFLICT' | 'OTHER'
          title: string
          description?: string | null
          location?: string | null
          participants?: string[]
          outcome?: string | null
          author_id: string
          timestamp?: string
        }
        Update: {
          id?: string
          type?: 'TURF_WAR' | 'ROBBERY' | 'DRUG_DEAL' | 'MEETING' | 'RECRUITMENT' | 'ALLIANCE' | 'CONFLICT' | 'OTHER'
          title?: string
          description?: string | null
          location?: string | null
          participants?: string[]
          outcome?: string | null
          author_id?: string
          timestamp?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          type: 'MEETING' | 'OPERATION' | 'RECRUITMENT' | 'PARTY' | 'TRAINING' | 'OTHER'
          location: string | null
          start_time: string
          end_time: string | null
          is_recurring: boolean
          creator_id: string
          attendees: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: 'MEETING' | 'OPERATION' | 'RECRUITMENT' | 'PARTY' | 'TRAINING' | 'OTHER'
          location?: string | null
          start_time: string
          end_time?: string | null
          is_recurring?: boolean
          creator_id: string
          attendees?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: 'MEETING' | 'OPERATION' | 'RECRUITMENT' | 'PARTY' | 'TRAINING' | 'OTHER'
          location?: string | null
          start_time?: string
          end_time?: string | null
          is_recurring?: boolean
          creator_id?: string
          attendees?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      turf_zones: {
        Row: {
          id: string
          name: string
          description: string | null
          coordinates: Json
          status: 'CONTROLLED' | 'CONTESTED' | 'NEUTRAL' | 'LOST'
          controlled_by: string | null
          contested_by: string[]
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          coordinates: Json
          status?: 'CONTROLLED' | 'CONTESTED' | 'NEUTRAL' | 'LOST'
          controlled_by?: string | null
          contested_by?: string[]
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          coordinates?: Json
          status?: 'CONTROLLED' | 'CONTESTED' | 'NEUTRAL' | 'LOST'
          controlled_by?: string | null
          contested_by?: string[]
          updated_at?: string
        }
      }
      turf_history: {
        Row: {
          id: string
          zone_id: string
          action: string
          description: string | null
          faction: string
          timestamp: string
        }
        Insert: {
          id?: string
          zone_id: string
          action: string
          description?: string | null
          faction: string
          timestamp?: string
        }
        Update: {
          id?: string
          zone_id?: string
          action?: string
          description?: string | null
          faction?: string
          timestamp?: string
        }
      }
      faction_wars: {
        Row: {
          id: string
          enemy_faction: string
          started_by: string
          status: string
          war_type: string
          regulations: Json
          attacking_cooldown_hours: number
          pk_cooldown_type: string
          pk_cooldown_days: number
          max_participants: number
          max_assault_rifles: number
          weapon_restrictions: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enemy_faction: string
          started_by: string
          status?: string
          war_type: string
          regulations: Json
          attacking_cooldown_hours?: number
          pk_cooldown_type?: string
          pk_cooldown_days?: number
          max_participants?: number
          max_assault_rifles?: number
          weapon_restrictions?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enemy_faction?: string
          started_by?: string
          status?: string
          war_type?: string
          regulations?: Json
          attacking_cooldown_hours?: number
          pk_cooldown_type?: string
          pk_cooldown_days?: number
          max_participants?: number
          max_assault_rifles?: number
          weapon_restrictions?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      webhook_configs: {
        Row: {
          id: string
          channel_id: string
          channel_name: string
          post_type: 'ANNOUNCEMENT' | 'SCREENSHOT' | 'WORD_ON_STREET' | 'ATTACK_LOG' | 'DEFENSE_LOG' | 'GRAFFITI' | 'MEDIA' | 'GENERAL'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          channel_name: string
          post_type: 'ANNOUNCEMENT' | 'SCREENSHOT' | 'WORD_ON_STREET' | 'ATTACK_LOG' | 'DEFENSE_LOG' | 'GRAFFITI' | 'MEDIA' | 'GENERAL'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          channel_name?: string
          post_type?: 'ANNOUNCEMENT' | 'SCREENSHOT' | 'WORD_ON_STREET' | 'ATTACK_LOG' | 'DEFENSE_LOG' | 'GRAFFITI' | 'MEDIA' | 'GENERAL'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'ADMIN' | 'LEADER' | 'MODERATOR' | 'MEMBER' | 'GUEST'
      post_type: 'ANNOUNCEMENT' | 'SCREENSHOT' | 'WORD_ON_STREET' | 'ATTACK_LOG' | 'DEFENSE_LOG' | 'GRAFFITI' | 'MEDIA' | 'GENERAL'
      log_type: 'TURF_WAR' | 'ROBBERY' | 'DRUG_DEAL' | 'MEETING' | 'RECRUITMENT' | 'ALLIANCE' | 'CONFLICT' | 'OTHER'
      event_type: 'MEETING' | 'OPERATION' | 'RECRUITMENT' | 'PARTY' | 'TRAINING' | 'OTHER'
      turf_status: 'CONTROLLED' | 'CONTESTED' | 'NEUTRAL' | 'LOST'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
