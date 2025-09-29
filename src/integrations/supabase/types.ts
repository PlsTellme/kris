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
      agents: {
        Row: {
          created_at: string
          elevenlabs_agent_id: string | null
          email: string | null
          first_message: string | null
          id: string
          name: string
          phone_number: string | null
          prompt: string | null
          updated_at: string
          user_id: string
          voice_type: string | null
        }
        Insert: {
          created_at?: string
          elevenlabs_agent_id?: string | null
          email?: string | null
          first_message?: string | null
          id?: string
          name: string
          phone_number?: string | null
          prompt?: string | null
          updated_at?: string
          user_id: string
          voice_type?: string | null
        }
        Update: {
          created_at?: string
          elevenlabs_agent_id?: string | null
          email?: string | null
          first_message?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          prompt?: string | null
          updated_at?: string
          user_id?: string
          voice_type?: string | null
        }
        Relationships: []
      }
      batch_call_answers: {
        Row: {
          anrufdauer: number | null
          answers: Json | null
          batchid: string
          call_status: string | null
          callname: string | null
          created_at: string
          firma: string | null
          id: string
          lead_id: string | null
          nachname: string | null
          nummer: string | null
          transcript: string | null
          updated_at: string
          user_id: string
          vorname: string | null
          zeitpunkt: number
        }
        Insert: {
          anrufdauer?: number | null
          answers?: Json | null
          batchid: string
          call_status?: string | null
          callname?: string | null
          created_at?: string
          firma?: string | null
          id?: string
          lead_id?: string | null
          nachname?: string | null
          nummer?: string | null
          transcript?: string | null
          updated_at?: string
          user_id: string
          vorname?: string | null
          zeitpunkt: number
        }
        Update: {
          anrufdauer?: number | null
          answers?: Json | null
          batchid?: string
          call_status?: string | null
          callname?: string | null
          created_at?: string
          firma?: string | null
          id?: string
          lead_id?: string | null
          nachname?: string | null
          nummer?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string
          vorname?: string | null
          zeitpunkt?: number
        }
        Relationships: []
      }
      batch_calls: {
        Row: {
          batchid: string
          callname: string | null
          created_at: string
          id: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          batchid: string
          callname?: string | null
          created_at?: string
          id?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          batchid?: string
          callname?: string | null
          created_at?: string
          id?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          call_timestamp_unix: number
          caller_number: string | null
          created_at: string
          duration: number
          elevenlabs_agent_id: string
          erfolgreich: boolean | null
          id: string
          transcript: string | null
          updated_at: string
          verbrauch: number | null
          zusammenfassung: string | null
        }
        Insert: {
          call_timestamp_unix?: number
          caller_number?: string | null
          created_at?: string
          duration?: number
          elevenlabs_agent_id: string
          erfolgreich?: boolean | null
          id?: string
          transcript?: string | null
          updated_at?: string
          verbrauch?: number | null
          zusammenfassung?: string | null
        }
        Update: {
          call_timestamp_unix?: number
          caller_number?: string | null
          created_at?: string
          duration?: number
          elevenlabs_agent_id?: string
          erfolgreich?: boolean | null
          id?: string
          transcript?: string | null
          updated_at?: string
          verbrauch?: number | null
          zusammenfassung?: string | null
        }
        Relationships: []
      }
      pending_leads: {
        Row: {
          batchid: string
          call_name: string | null
          created_at: string
          firma: string | null
          id: string
          lead_id: string
          nachname: string | null
          nummer: string | null
          status: string | null
          user_id: string
          vorname: string | null
        }
        Insert: {
          batchid: string
          call_name?: string | null
          created_at?: string
          firma?: string | null
          id?: string
          lead_id: string
          nachname?: string | null
          nummer?: string | null
          status?: string | null
          user_id: string
          vorname?: string | null
        }
        Update: {
          batchid?: string
          call_name?: string | null
          created_at?: string
          firma?: string | null
          id?: string
          lead_id?: string
          nachname?: string | null
          nummer?: string | null
          status?: string | null
          user_id?: string
          vorname?: string | null
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          assigned_agent: string | null
          created_at: string
          id: string
          phone_number: string
          phonenumber_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_agent?: string | null
          created_at?: string
          id?: string
          phone_number: string
          phonenumber_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_agent?: string | null
          created_at?: string
          id?: string
          phone_number?: string
          phonenumber_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_assigned_agent_fkey"
            columns: ["assigned_agent"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_premium: boolean
          minutes_limit: number
          minutes_used: number
          subscription_type: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_premium?: boolean
          minutes_limit?: number
          minutes_used?: number
          subscription_type?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_premium?: boolean
          minutes_limit?: number
          minutes_used?: number
          subscription_type?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      voices: {
        Row: {
          created_at: string
          gender: string
          id: string
          name: string
          voice_id: string
        }
        Insert: {
          created_at?: string
          gender: string
          id?: string
          name: string
          voice_id: string
        }
        Update: {
          created_at?: string
          gender?: string
          id?: string
          name?: string
          voice_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
