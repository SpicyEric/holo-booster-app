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
      boxes: {
        Row: {
          box_id: string
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          box_id: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          box_id?: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          contact_id: string
          cost_minor: number | null
          created_at: string
          delivered_at: string | null
          error_code: string | null
          id: string
          provider_msg_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          cost_minor?: number | null
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          id?: string
          provider_msg_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          cost_minor?: number | null
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          id?: string
          provider_msg_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          add_unsubscribe: boolean | null
          created_at: string
          created_by_user_id: string | null
          customer_id: string
          est_recipients: number
          id: string
          message_text: string
          package_tier: string
          segment: Json
          status: string
        }
        Insert: {
          add_unsubscribe?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id: string
          est_recipients: number
          id?: string
          message_text: string
          package_tier: string
          segment: Json
          status?: string
        }
        Update: {
          add_unsubscribe?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string
          est_recipients?: number
          id?: string
          message_text?: string
          package_tier?: string
          segment?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
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
          first_scan_at: string | null
          id: string
          last_scan_at: string | null
          opt_in: boolean
          opted_out_at: string | null
          phone: string | null
          scan_count: number | null
          unsubscribe_token: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          email?: string | null
          first_scan_at?: string | null
          id?: string
          last_scan_at?: string | null
          opt_in?: boolean
          opted_out_at?: string | null
          phone?: string | null
          scan_count?: number | null
          unsubscribe_token?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          email?: string | null
          first_scan_at?: string | null
          id?: string
          last_scan_at?: string | null
          opt_in?: boolean
          opted_out_at?: string | null
          phone?: string | null
          scan_count?: number | null
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
      customer_boxes: {
        Row: {
          assigned_at: string
          box_id: string
          customer_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          box_id: string
          customer_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          box_id?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_boxes_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: true
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_boxes_customer_id_fkey"
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
          auto_reply_daily_time: string | null
          auto_reply_enabled: boolean | null
          auto_reply_min_rating: number | null
          billing_address: Json | null
          box_id: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          customer_number: number | null
          design_urls: string[] | null
          email: string | null
          google_access_token: string | null
          google_business_name: string | null
          google_refresh_token: string | null
          google_review_url: string
          google_token_expires_at: string | null
          id: string
          industry: string | null
          last_auto_reply_check: string | null
          last_contact_date: string | null
          lead_source: string | null
          logo_url: string | null
          name: string
          next_auto_reply_run: string | null
          next_followup_date: string | null
          offer_details: string | null
          offer_text: string
          offer_title: string | null
          onboarding_email_sent_at: string | null
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
          auto_reply_daily_time?: string | null
          auto_reply_enabled?: boolean | null
          auto_reply_min_rating?: number | null
          billing_address?: Json | null
          box_id?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          customer_number?: number | null
          design_urls?: string[] | null
          email?: string | null
          google_access_token?: string | null
          google_business_name?: string | null
          google_refresh_token?: string | null
          google_review_url: string
          google_token_expires_at?: string | null
          id?: string
          industry?: string | null
          last_auto_reply_check?: string | null
          last_contact_date?: string | null
          lead_source?: string | null
          logo_url?: string | null
          name: string
          next_auto_reply_run?: string | null
          next_followup_date?: string | null
          offer_details?: string | null
          offer_text: string
          offer_title?: string | null
          onboarding_email_sent_at?: string | null
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
          auto_reply_daily_time?: string | null
          auto_reply_enabled?: boolean | null
          auto_reply_min_rating?: number | null
          billing_address?: Json | null
          box_id?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          customer_number?: number | null
          design_urls?: string[] | null
          email?: string | null
          google_access_token?: string | null
          google_business_name?: string | null
          google_refresh_token?: string | null
          google_review_url?: string
          google_token_expires_at?: string | null
          id?: string
          industry?: string | null
          last_auto_reply_check?: string | null
          last_contact_date?: string | null
          lead_source?: string | null
          logo_url?: string | null
          name?: string
          next_auto_reply_run?: string | null
          next_followup_date?: string | null
          offer_details?: string | null
          offer_text?: string
          offer_title?: string | null
          onboarding_email_sent_at?: string | null
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
          invoice_type: string | null
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
          invoice_type?: string | null
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
          invoice_type?: string | null
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
          amount_cents: number | null
          created_at: string
          customer_id: string
          id: string
          merchant_user_id: string | null
          notes: string | null
          order_details: Json | null
          order_type: string
          paid_at: string | null
          quantity: number | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          customer_id: string
          id?: string
          merchant_user_id?: string | null
          notes?: string | null
          order_details?: Json | null
          order_type: string
          paid_at?: string | null
          quantity?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          customer_id?: string
          id?: string
          merchant_user_id?: string | null
          notes?: string | null
          order_details?: Json | null
          order_type?: string
          paid_at?: string | null
          quantity?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
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
      review_auto_replies: {
        Row: {
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          reply_text: string
          review_id: string
          review_text: string | null
          reviewer_name: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          reply_text: string
          review_id: string
          review_text?: string | null
          reviewer_name?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          reply_text?: string
          review_id?: string
          review_text?: string | null
          reviewer_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_auto_replies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      review_deletion_orders: {
        Row: {
          actual_cost_cents: number | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          customer_id: string
          google_account_linked: boolean | null
          google_business_name: string | null
          id: string
          max_cost_cents: number
          notes: string | null
          reviews_data: Json
          status: string
          total_reviews_selected: number
          updated_at: string
        }
        Insert: {
          actual_cost_cents?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id: string
          google_account_linked?: boolean | null
          google_business_name?: string | null
          id?: string
          max_cost_cents?: number
          notes?: string | null
          reviews_data?: Json
          status?: string
          total_reviews_selected?: number
          updated_at?: string
        }
        Update: {
          actual_cost_cents?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string
          google_account_linked?: boolean | null
          google_business_name?: string | null
          id?: string
          max_cost_cents?: number
          notes?: string | null
          reviews_data?: Json
          status?: string
          total_reviews_selected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_deletion_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      review_deletion_results: {
        Row: {
          created_at: string
          deletion_notes: string | null
          deletion_successful: boolean | null
          id: string
          order_id: string
          review_date: string | null
          review_google_id: string
          review_stars: number
          review_text: string | null
          reviewer_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deletion_notes?: string | null
          deletion_successful?: boolean | null
          id?: string
          order_id: string
          review_date?: string | null
          review_google_id: string
          review_stars: number
          review_text?: string | null
          reviewer_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deletion_notes?: string | null
          deletion_successful?: boolean | null
          id?: string
          order_id?: string
          review_date?: string | null
          review_google_id?: string
          review_stars?: number
          review_text?: string | null
          reviewer_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_deletion_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "review_deletion_orders"
            referencedColumns: ["id"]
          },
        ]
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
      stripe_sms_orders: {
        Row: {
          amount_cents: number
          campaign_id: string
          checkout_session_id: string
          created_at: string
          id: string
          paid_at: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          campaign_id: string
          checkout_session_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          campaign_id?: string
          checkout_session_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_sms_orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
