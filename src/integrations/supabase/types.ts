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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_logs: {
        Row: {
          action: string
          agent_name: string
          agent_role: string
          created_at: string
          details: string | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          agent_name: string
          agent_role: string
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          agent_name?: string
          agent_role?: string
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      agents: {
        Row: {
          created_at: string
          id: string
          last_login: string | null
          name: string
          password: string
          role: string
          status: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_login?: string | null
          name: string
          password: string
          role?: string
          status?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          last_login?: string | null
          name?: string
          password?: string
          role?: string
          status?: string
          username?: string
        }
        Relationships: []
      }
      codes: {
        Row: {
          code: string
          code_type: string
          created_at: string
          created_by: string | null
          fee_amount: number
          id: string
          payment_method: string | null
          school_id: string | null
          status: string
          used_by_user_id: string | null
        }
        Insert: {
          code: string
          code_type?: string
          created_at?: string
          created_by?: string | null
          fee_amount?: number
          id?: string
          payment_method?: string | null
          school_id?: string | null
          status?: string
          used_by_user_id?: string | null
        }
        Update: {
          code?: string
          code_type?: string
          created_at?: string
          created_by?: string | null
          fee_amount?: number
          id?: string
          payment_method?: string | null
          school_id?: string | null
          status?: string
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_codes_used_by"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          id: string
          method: string
          momo_name: string | null
          momo_number_used: string | null
          rejection_reason: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          submitted_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          method?: string
          momo_name?: string | null
          momo_number_used?: string | null
          rejection_reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          submitted_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          method?: string
          momo_name?: string | null
          momo_number_used?: string | null
          rejection_reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          submitted_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          created_at: string
          id: string
          momo_fee: number
          original_amount: number
          processed_at: string | null
          processed_by_email: string | null
          reason: string | null
          refund_amount: number
          refund_method: string | null
          refund_phone: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          momo_fee?: number
          original_amount: number
          processed_at?: string | null
          processed_by_email?: string | null
          reason?: string | null
          refund_amount: number
          refund_method?: string | null
          refund_phone?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          momo_fee?: number
          original_amount?: number
          processed_at?: string | null
          processed_by_email?: string | null
          reason?: string | null
          refund_amount?: number
          refund_method?: string | null
          refund_phone?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_logs: {
        Row: {
          gate: string
          id: string
          result: string
          scanned_at: string
          scanned_by_email: string | null
          scanned_by_ip: string | null
          scanned_by_user_id: string | null
          scanned_code: string | null
          user_id: string | null
        }
        Insert: {
          gate?: string
          id?: string
          result: string
          scanned_at?: string
          scanned_by_email?: string | null
          scanned_by_ip?: string | null
          scanned_by_user_id?: string | null
          scanned_code?: string | null
          user_id?: string | null
        }
        Update: {
          gate?: string
          id?: string
          result?: string
          scanned_at?: string
          scanned_by_email?: string | null
          scanned_by_ip?: string | null
          scanned_by_user_id?: string | null
          scanned_code?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          prefix: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          prefix: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          prefix?: string
          status?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      ticket_print_logs: {
        Row: {
          created_at: string
          id: string
          is_admin_reprint: boolean
          print_type: string
          printed_by_email: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_reprint?: boolean
          print_type?: string
          printed_by_email?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_reprint?: boolean
          print_type?: string
          printed_by_email?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_print_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          created_at: string
          description: string | null
          homepage_force_soldout: boolean
          homepage_label: string | null
          homepage_show_remaining: boolean
          homepage_show_sold: boolean
          homepage_visible: boolean
          id: string
          is_active: boolean
          is_table_tier: boolean
          name: string
          perks: Json
          price: number
          quantity_sold: number
          quantity_total: number
          seats_per_table: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          homepage_force_soldout?: boolean
          homepage_label?: string | null
          homepage_show_remaining?: boolean
          homepage_show_sold?: boolean
          homepage_visible?: boolean
          id?: string
          is_active?: boolean
          is_table_tier?: boolean
          name: string
          perks?: Json
          price: number
          quantity_sold?: number
          quantity_total?: number
          seats_per_table?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          homepage_force_soldout?: boolean
          homepage_label?: string | null
          homepage_show_remaining?: boolean
          homepage_show_sold?: boolean
          homepage_visible?: boolean
          id?: string
          is_active?: boolean
          is_table_tier?: boolean
          name?: string
          perks?: Json
          price?: number
          quantity_sold?: number
          quantity_total?: number
          seats_per_table?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          payment_id: string | null
          recorded_by: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          payment_id?: string | null
          recorded_by?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          payment_id?: string | null
          recorded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      users: {
        Row: {
          amount_paid: number
          amount_remaining: number
          code_id: string | null
          department: string
          early_reg_paid: boolean
          email: string
          entered: boolean
          entered_at: string | null
          exited: boolean
          exited_at: string | null
          first_name: string
          gender: string
          id: string
          last_name: string
          level: string | null
          paid_amount: number
          payment_status: string
          phone: string
          qr_version: number
          registered_at: string
          remaining_amount: number
          school_id: string | null
          school_name: string | null
          section: string | null
          ticket_price: number
          ticket_printed: boolean
          ticket_printed_at: string | null
          ticket_state: Database["public"]["Enums"]["ticket_state"]
          tier_id: string | null
        }
        Insert: {
          amount_paid?: number
          amount_remaining?: number
          code_id?: string | null
          department: string
          early_reg_paid?: boolean
          email: string
          entered?: boolean
          entered_at?: string | null
          exited?: boolean
          exited_at?: string | null
          first_name: string
          gender: string
          id?: string
          last_name: string
          level?: string | null
          paid_amount?: number
          payment_status?: string
          phone: string
          qr_version?: number
          registered_at?: string
          remaining_amount?: number
          school_id?: string | null
          school_name?: string | null
          section?: string | null
          ticket_price?: number
          ticket_printed?: boolean
          ticket_printed_at?: string | null
          ticket_state?: Database["public"]["Enums"]["ticket_state"]
          tier_id?: string | null
        }
        Update: {
          amount_paid?: number
          amount_remaining?: number
          code_id?: string | null
          department?: string
          early_reg_paid?: boolean
          email?: string
          entered?: boolean
          entered_at?: string | null
          exited?: boolean
          exited_at?: string | null
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          level?: string | null
          paid_amount?: number
          payment_status?: string
          phone?: string
          qr_version?: number
          registered_at?: string
          remaining_amount?: number
          school_id?: string | null
          school_name?: string | null
          section?: string | null
          ticket_price?: number
          ticket_printed?: boolean
          ticket_printed_at?: string | null
          ticket_state?: Database["public"]["Enums"]["ticket_state"]
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "agent" | "door_in" | "door_out"
      ticket_state: "pending" | "confirmed" | "rejected"
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
      app_role: ["superadmin", "agent", "door_in", "door_out"],
      ticket_state: ["pending", "confirmed", "rejected"],
    },
  },
} as const
