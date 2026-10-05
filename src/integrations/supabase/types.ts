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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_credential_entries: {
        Row: {
          created_at: string
          credential_id: string
          id: string
          key_value: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_id: string
          id?: string
          key_value?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_id?: string
          id?: string
          key_value?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_credential_entries_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "api_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      api_credentials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_value: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_value?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_value?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      attempts: {
        Row: {
          created_at: string
          id: string
          score: number
          user_id: string
          weak_phonemes: Json
          word_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score?: number
          user_id: string
          weak_phonemes?: Json
          word_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          user_id?: string
          weak_phonemes?: Json
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_viseme_to_mouth: {
        Row: {
          description: string
          mouth: string
          viseme_id: number
        }
        Insert: {
          description?: string
          mouth: string
          viseme_id: number
        }
        Update: {
          description?: string
          mouth?: string
          viseme_id?: number
        }
        Relationships: []
      }
      ebooks: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          page_count: number | null
          reading_level: string | null
          title: string
          updated_at: string
          world_category: string | null
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          page_count?: number | null
          reading_level?: string | null
          title: string
          updated_at?: string
          world_category?: string | null
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          page_count?: number | null
          reading_level?: string | null
          title?: string
          updated_at?: string
          world_category?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          add_to_volunteers: boolean
          ai_prompt: string | null
          created_at: string
          database_name: string | null
          fields: Json
          id: string
          is_published: boolean
          name: string
          public_description: string | null
          public_title: string | null
          public_url: string | null
          show_popup: boolean
          slug: string | null
          submit_label: string | null
          updated_at: string
        }
        Insert: {
          add_to_volunteers?: boolean
          ai_prompt?: string | null
          created_at?: string
          database_name?: string | null
          fields?: Json
          id?: string
          is_published?: boolean
          name: string
          public_description?: string | null
          public_title?: string | null
          public_url?: string | null
          show_popup?: boolean
          slug?: string | null
          submit_label?: string | null
          updated_at?: string
        }
        Update: {
          add_to_volunteers?: boolean
          ai_prompt?: string | null
          created_at?: string
          database_name?: string | null
          fields?: Json
          id?: string
          is_published?: boolean
          name?: string
          public_description?: string | null
          public_title?: string | null
          public_url?: string | null
          show_popup?: boolean
          slug?: string | null
          submit_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ipa_sounds: {
        Row: {
          audio_url: string | null
          created_at: string
          examples: string[]
          id: string
          mouth_shape: string
          name: string
          symbol: string
          tip: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          examples?: string[]
          id?: string
          mouth_shape?: string
          name?: string
          symbol: string
          tip?: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          examples?: string[]
          id?: string
          mouth_shape?: string
          name?: string
          symbol?: string
          tip?: string
          updated_at?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          created_at: string
          forward_email: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          forward_email?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          forward_email?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      meeting_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          entered_at: string
          error_log: string | null
          exited_at: string | null
          id: string
          session_name: string
          updated_at: string
          user_email: string
          user_id: string | null
          user_name: string
          user_role: string
          video_provider: string
          zoom_account_id: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          entered_at?: string
          error_log?: string | null
          exited_at?: string | null
          id?: string
          session_name?: string
          updated_at?: string
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_role?: string
          video_provider?: string
          zoom_account_id?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          entered_at?: string
          error_log?: string | null
          exited_at?: string | null
          id?: string
          session_name?: string
          updated_at?: string
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_role?: string
          video_provider?: string
          zoom_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_sessions_zoom_account_id_fkey"
            columns: ["zoom_account_id"]
            isOneToOne: false
            referencedRelation: "zoom_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_verified: boolean
          role_type: string | null
          updated_at: string
          user_id: string
          zoom_account_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          role_type?: string | null
          updated_at?: string
          user_id: string
          zoom_account_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          role_type?: string | null
          updated_at?: string
          user_id?: string
          zoom_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_zoom_account_id_fkey"
            columns: ["zoom_account_id"]
            isOneToOne: false
            referencedRelation: "zoom_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          created_at: string
          grade_level: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          notes: string | null
          reading_level: string | null
          registration_type: string
          school_name: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          grade_level?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          reading_level?: string | null
          registration_type: string
          school_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          grade_level?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          reading_level?: string | null
          registration_type?: string
          school_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      user_words: {
        Row: {
          box: number
          created_at: string
          id: string
          next_review: string
          user_id: string
          word_id: string
        }
        Insert: {
          box?: number
          created_at?: string
          id?: string
          next_review?: string
          user_id: string
          word_id: string
        }
        Update: {
          box?: number
          created_at?: string
          id?: string
          next_review?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_words: {
        Row: {
          created_at: string
          definition: string
          example: string
          id: string
          reading_level: string
          updated_at: string
          word: string
        }
        Insert: {
          created_at?: string
          definition?: string
          example?: string
          id?: string
          reading_level?: string
          updated_at?: string
          word: string
        }
        Update: {
          created_at?: string
          definition?: string
          example?: string
          id?: string
          reading_level?: string
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      words: {
        Row: {
          audio_url: string | null
          created_at: string
          definition: string
          example_sentence: string
          id: string
          image_url: string | null
          ipa: string
          needs_review: boolean
          part_of_speech: string
          sentence_audio_url: string | null
          simple_definition: string
          source: string
          syllables: Json
          updated_at: string
          word: string
          word_code: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          definition?: string
          example_sentence?: string
          id?: string
          image_url?: string | null
          ipa?: string
          needs_review?: boolean
          part_of_speech?: string
          sentence_audio_url?: string | null
          simple_definition?: string
          source?: string
          syllables?: Json
          updated_at?: string
          word: string
          word_code?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          definition?: string
          example_sentence?: string
          id?: string
          image_url?: string | null
          ipa?: string
          needs_review?: boolean
          part_of_speech?: string
          sentence_audio_url?: string | null
          simple_definition?: string
          source?: string
          syllables?: Json
          updated_at?: string
          word?: string
          word_code?: string | null
        }
        Relationships: []
      }
      zoom_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          jitsi_room_name: string
          meeting_id: string
          name: string
          passcode: string
          sdk_key: string
          sdk_secret: string
          updated_at: string
          video_provider: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          jitsi_room_name?: string
          meeting_id?: string
          name: string
          passcode?: string
          sdk_key?: string
          sdk_secret?: string
          updated_at?: string
          video_provider?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          jitsi_room_name?: string
          meeting_id?: string
          name?: string
          passcode?: string
          sdk_key?: string
          sdk_secret?: string
          updated_at?: string
          video_provider?: string
        }
        Relationships: []
      }
      zoom_config: {
        Row: {
          id: string
          meeting_id: string
          passcode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          meeting_id?: string
          passcode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          passcode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_join_active_meeting: { Args: { _user_id: string }; Returns: boolean }
      get_meeting_setups: {
        Args: never
        Returns: {
          id: string
          is_active: boolean
          name: string
          video_provider: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "student" | "volunteer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "student", "volunteer"],
    },
  },
} as const
