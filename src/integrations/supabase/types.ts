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
      claims: {
        Row: {
          code: string
          contact_id: string
          created_at: string
          customer_id: string
          expire_at: string
          id: string
          redeemed_at: string | null
        }
        Insert: {
          code: string
          contact_id: string
          created_at?: string
          customer_id: string
          expire_at: string
          id?: string
          redeemed_at?: string | null
        }
        Update: {
          code?: string
          contact_id?: string
          created_at?: string
          customer_id?: string
          expire_at?: string
          id?: string
          redeemed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount_cents: number
          commission_type: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          id: string
          metadata: Json | null
          promoter_id: string | null
          status: string | null
          stripe_event_id: string | null
        }
        Insert: {
          amount_cents: number
          commission_type?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          promoter_id?: string | null
          status?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          amount_cents?: number
          commission_type?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          promoter_id?: string | null
          status?: string | null
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_deletions: {
        Row: {
          customer_id: string
          deleted_at: string
          deletion_method: string
          id: string
        }
        Insert: {
          customer_id: string
          deleted_at?: string
          deletion_method: string
          id?: string
        }
        Update: {
          customer_id?: string
          deleted_at?: string
          deletion_method?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_deletions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          customer_id: string
          deleted_at: string | null
          email: string | null
          id: string
          opt_in: boolean
          phone: string | null
          unsubscribe_token: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          opt_in?: boolean
          phone?: string | null
          unsubscribe_token?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          opt_in?: boolean
          phone?: string | null
          unsubscribe_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_files: {
        Row: {
          created_at: string
          customer_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          updated_at: string
          uploaded_by_email: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by_email?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by_email?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_files_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_status_history: {
        Row: {
          change_source: string
          changed_by_email: string | null
          changed_by_user_id: string | null
          created_at: string
          customer_id: string
          id: string
          metadata: Json | null
          new_status: string
          old_status: string | null
        }
        Insert: {
          change_source: string
          changed_by_email?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          metadata?: Json | null
          new_status: string
          old_status?: string | null
        }
        Update: {
          change_source?: string
          changed_by_email?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          metadata?: Json | null
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_status_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_subscriptions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string | null
          id: string
          package_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          end_date?: string | null
          id?: string
          package_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          end_date?: string | null
          id?: string
          package_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_users: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean
          billing_address: Json | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          customer_number: number | null
          design_urls: string[] | null
          email: string | null
          google_review_url: string
          id: string
          industry: string | null
          last_contact_date: string | null
          lead_source: string | null
          logo_url: string | null
          name: string
          next_followup_date: string | null
          offer_details: string | null
          offer_text: string
          offer_title: string | null
          phone: string | null
          priority: string | null
          promoter_id: string | null
          qr_code_url: string | null
          sales_notes: string | null
          stamp_reward_text: string | null
          stamps_required: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_address?: Json | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          customer_number?: number | null
          design_urls?: string[] | null
          email?: string | null
          google_review_url: string
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          lead_source?: string | null
          logo_url?: string | null
          name: string
          next_followup_date?: string | null
          offer_details?: string | null
          offer_text: string
          offer_title?: string | null
          phone?: string | null
          priority?: string | null
          promoter_id?: string | null
          qr_code_url?: string | null
          sales_notes?: string | null
          stamp_reward_text?: string | null
          stamps_required?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_address?: Json | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          customer_number?: number | null
          design_urls?: string[] | null
          email?: string | null
          google_review_url?: string
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          lead_source?: string | null
          logo_url?: string | null
          name?: string
          next_followup_date?: string | null
          offer_details?: string | null
          offer_text?: string
          offer_title?: string | null
          phone?: string | null
          priority?: string | null
          promoter_id?: string | null
          qr_code_url?: string | null
          sales_notes?: string | null
          stamp_reward_text?: string | null
          stamps_required?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events_processed: {
        Row: {
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_id: string | null
          id: string
          issued_at: string | null
          pdf_url: string | null
          status: string | null
          stripe_invoice_id: string | null
          total_amount_cents: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          issued_at?: string | null
          pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          total_amount_cents?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          issued_at?: string | null
          pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          total_amount_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_assignments: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          merchant_user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          merchant_user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          merchant_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          merchant_user_id: string | null
          notes: string | null
          order_type: string
          quantity: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          merchant_user_id?: string | null
          notes?: string | null
          order_type: string
          quantity?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          merchant_user_id?: string | null
          notes?: string | null
          order_type?: string
          quantity?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          billing_interval: string
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          invoice_number: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          contact_id: string | null
          created_at: string
          customer_id: string
          id: string
          ip_hash: string | null
          user_agent: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stamps: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          phone: string
          stamp_date: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          phone: string
          stamp_date?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          phone?: string
          stamp_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "stamps_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_customer_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "partner" | "merchant" | "customer"
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
      app_role: ["admin", "partner", "merchant", "customer"],
    },
  },
} as const
