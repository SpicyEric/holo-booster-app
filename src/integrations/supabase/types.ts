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
      admin_merchant_messages: {
        Row: {
          body: string
          created_at: string
          customer_id: string
          id: string
          read_at: string | null
          sent_by_user_id: string | null
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          customer_id: string
          id?: string
          read_at?: string | null
          sent_by_user_id?: string | null
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          customer_id?: string
          id?: string
          read_at?: string | null
          sent_by_user_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_merchant_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      app_messages: {
        Row: {
          body: string
          bonus_points: number | null
          bonus_points_claimed_at: string | null
          id: string
          image_url: string | null
          merchant_customer_id: string
          offer_id: string | null
          offer_redeemed_at: string | null
          read_at: string | null
          sent_at: string | null
          show_in_storefront: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          bonus_points?: number | null
          bonus_points_claimed_at?: string | null
          id?: string
          image_url?: string | null
          merchant_customer_id: string
          offer_id?: string | null
          offer_redeemed_at?: string | null
          read_at?: string | null
          sent_at?: string | null
          show_in_storefront?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          bonus_points?: number | null
          bonus_points_claimed_at?: string | null
          id?: string
          image_url?: string | null
          merchant_customer_id?: string
          offer_id?: string | null
          offer_redeemed_at?: string | null
          read_at?: string | null
          sent_at?: string | null
          show_in_storefront?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_messages_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_messages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      box_pakete: {
        Row: {
          anzahl_boxen: number
          bestelldatum: string
          created_at: string
          id: string
          notizen: string | null
          paket_typ: string
          status: string
          updated_at: string
          vertriebler_id: string
        }
        Insert: {
          anzahl_boxen: number
          bestelldatum?: string
          created_at?: string
          id?: string
          notizen?: string | null
          paket_typ: string
          status?: string
          updated_at?: string
          vertriebler_id: string
        }
        Update: {
          anzahl_boxen?: number
          bestelldatum?: string
          created_at?: string
          id?: string
          notizen?: string | null
          paket_typ?: string
          status?: string
          updated_at?: string
          vertriebler_id?: string
        }
        Relationships: []
      }
      boxes: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          stamp_id: string
          stamp_preset: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          stamp_id: string
          stamp_preset?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          stamp_id?: string
          stamp_preset?: string
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
          available_at: string | null
          commission_type: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          discount_cents: number | null
          id: string
          metadata: Json | null
          promoter_id: string | null
          status: string | null
          stripe_event_id: string | null
        }
        Insert: {
          amount_cents: number
          available_at?: string | null
          commission_type?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_cents?: number | null
          id?: string
          metadata?: Json | null
          promoter_id?: string | null
          status?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          amount_cents?: number
          available_at?: string | null
          commission_type?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_cents?: number | null
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
      contact_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          avg_revenue: number | null
          billing_address: Json | null
          birthday_bonus_points: number
          birthday_enabled: boolean
          birthday_gift_type: string | null
          birthday_message: string | null
          birthday_offer_description: string | null
          birthday_offer_title: string | null
          cancelled_at: string | null
          city: string | null
          company_name: string | null
          contact_person: string | null
          contact_person_email: string | null
          contact_person_phone: string | null
          cover_image_url: string | null
          created_at: string
          customer_number: number | null
          description: string | null
          design_urls: string[] | null
          email: string | null
          facebook: string | null
          gallery_images: string[]
          google_access_token: string | null
          google_business_name: string | null
          google_refresh_token: string | null
          google_review_points_enabled: boolean | null
          google_review_points_value: number | null
          google_review_url: string
          google_token_expires_at: string | null
          house_number: string | null
          id: string
          industry: string | null
          instagram: string | null
          is_demo: boolean
          last_auto_reply_check: string | null
          last_contact_date: string | null
          latitude: number | null
          lead_source: string | null
          logo_url: string | null
          longitude: number | null
          manual_stamp_mode: boolean | null
          name: string
          next_auto_reply_run: string | null
          next_followup_date: string | null
          offer_details: string | null
          offer_text: string
          offer_title: string | null
          onboarding_email_sent_at: string | null
          opening_hours: Json | null
          phone: string | null
          postal_code: string | null
          priority: string | null
          promoter_id: string | null
          qr_code_url: string | null
          referral_enabled: boolean
          referral_invitee_points: number
          referral_inviter_points: number
          sales_notes: string | null
          stamp_id: string | null
          stamp_mode: string | null
          stamp_reward_text: string | null
          stamp_variant: string | null
          stamps_required: number | null
          status: string | null
          street: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          three_day_email_sent_at: string | null
          twitter: string | null
          updated_at: string
          website: string | null
          welcome_enabled: boolean
          welcome_message: string | null
          winback_bonus_points: number | null
          winback_enabled: boolean
          winback_gift_type: string
          winback_inactivity_days: number
          winback_message: string | null
          winback_offer_description: string | null
          winback_offer_title: string | null
        }
        Insert: {
          active?: boolean
          auto_reply_daily_time?: string | null
          auto_reply_enabled?: boolean | null
          auto_reply_min_rating?: number | null
          avg_revenue?: number | null
          billing_address?: Json | null
          birthday_bonus_points?: number
          birthday_enabled?: boolean
          birthday_gift_type?: string | null
          birthday_message?: string | null
          birthday_offer_description?: string | null
          birthday_offer_title?: string | null
          cancelled_at?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          contact_person_email?: string | null
          contact_person_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          customer_number?: number | null
          description?: string | null
          design_urls?: string[] | null
          email?: string | null
          facebook?: string | null
          gallery_images?: string[]
          google_access_token?: string | null
          google_business_name?: string | null
          google_refresh_token?: string | null
          google_review_points_enabled?: boolean | null
          google_review_points_value?: number | null
          google_review_url: string
          google_token_expires_at?: string | null
          house_number?: string | null
          id?: string
          industry?: string | null
          instagram?: string | null
          is_demo?: boolean
          last_auto_reply_check?: string | null
          last_contact_date?: string | null
          latitude?: number | null
          lead_source?: string | null
          logo_url?: string | null
          longitude?: number | null
          manual_stamp_mode?: boolean | null
          name: string
          next_auto_reply_run?: string | null
          next_followup_date?: string | null
          offer_details?: string | null
          offer_text: string
          offer_title?: string | null
          onboarding_email_sent_at?: string | null
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          promoter_id?: string | null
          qr_code_url?: string | null
          referral_enabled?: boolean
          referral_invitee_points?: number
          referral_inviter_points?: number
          sales_notes?: string | null
          stamp_id?: string | null
          stamp_mode?: string | null
          stamp_reward_text?: string | null
          stamp_variant?: string | null
          stamps_required?: number | null
          status?: string | null
          street?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          three_day_email_sent_at?: string | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
          welcome_enabled?: boolean
          welcome_message?: string | null
          winback_bonus_points?: number | null
          winback_enabled?: boolean
          winback_gift_type?: string
          winback_inactivity_days?: number
          winback_message?: string | null
          winback_offer_description?: string | null
          winback_offer_title?: string | null
        }
        Update: {
          active?: boolean
          auto_reply_daily_time?: string | null
          auto_reply_enabled?: boolean | null
          auto_reply_min_rating?: number | null
          avg_revenue?: number | null
          billing_address?: Json | null
          birthday_bonus_points?: number
          birthday_enabled?: boolean
          birthday_gift_type?: string | null
          birthday_message?: string | null
          birthday_offer_description?: string | null
          birthday_offer_title?: string | null
          cancelled_at?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          contact_person_email?: string | null
          contact_person_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          customer_number?: number | null
          description?: string | null
          design_urls?: string[] | null
          email?: string | null
          facebook?: string | null
          gallery_images?: string[]
          google_access_token?: string | null
          google_business_name?: string | null
          google_refresh_token?: string | null
          google_review_points_enabled?: boolean | null
          google_review_points_value?: number | null
          google_review_url?: string
          google_token_expires_at?: string | null
          house_number?: string | null
          id?: string
          industry?: string | null
          instagram?: string | null
          is_demo?: boolean
          last_auto_reply_check?: string | null
          last_contact_date?: string | null
          latitude?: number | null
          lead_source?: string | null
          logo_url?: string | null
          longitude?: number | null
          manual_stamp_mode?: boolean | null
          name?: string
          next_auto_reply_run?: string | null
          next_followup_date?: string | null
          offer_details?: string | null
          offer_text?: string
          offer_title?: string | null
          onboarding_email_sent_at?: string | null
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          promoter_id?: string | null
          qr_code_url?: string | null
          referral_enabled?: boolean
          referral_invitee_points?: number
          referral_inviter_points?: number
          sales_notes?: string | null
          stamp_id?: string | null
          stamp_mode?: string | null
          stamp_reward_text?: string | null
          stamp_variant?: string | null
          stamps_required?: number | null
          status?: string | null
          street?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          three_day_email_sent_at?: string | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
          welcome_enabled?: boolean
          welcome_message?: string | null
          winback_bonus_points?: number | null
          winback_enabled?: boolean
          winback_gift_type?: string
          winback_inactivity_days?: number
          winback_message?: string | null
          winback_offer_description?: string | null
          winback_offer_title?: string | null
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          fcm_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fcm_token: string
          id?: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fcm_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discovered_stores: {
        Row: {
          address: string | null
          admin_user_id: string
          ai_summary: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          enrichment_data: Json | null
          enrichment_status: string
          google_photo_url: string | null
          google_rating: number | null
          google_reviews_count: number | null
          house_number: string | null
          id: string
          industry: string | null
          latitude: number | null
          linked_customer_id: string | null
          longitude: number | null
          name: string
          note_title: string | null
          notes: string | null
          opening_hours: Json | null
          phone: string | null
          place_id: string | null
          postal_code: string | null
          status: string
          street: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_user_id: string
          ai_summary?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          enrichment_data?: Json | null
          enrichment_status?: string
          google_photo_url?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          house_number?: string | null
          id?: string
          industry?: string | null
          latitude?: number | null
          linked_customer_id?: string | null
          longitude?: number | null
          name: string
          note_title?: string | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          place_id?: string | null
          postal_code?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_user_id?: string
          ai_summary?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          enrichment_data?: Json | null
          enrichment_status?: string
          google_photo_url?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          house_number?: string | null
          id?: string
          industry?: string | null
          latitude?: number | null
          linked_customer_id?: string | null
          longitude?: number | null
          name?: string
          note_title?: string | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          place_id?: string | null
          postal_code?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovered_stores_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      eloyo_boxes: {
        Row: {
          abschlussdatum: string | null
          bestelldatum: string | null
          box_id: string
          created_at: string
          frist_ablauf: string | null
          haendler_id: string | null
          id: string
          paket_id: string | null
          preis_protokolliert: number
          rechnung_stripe_id: string | null
          retour_datum: string | null
          status: string
          stempel_id: string | null
          updated_at: string
          versanddatum: string | null
          vertriebler_id: string | null
        }
        Insert: {
          abschlussdatum?: string | null
          bestelldatum?: string | null
          box_id: string
          created_at?: string
          frist_ablauf?: string | null
          haendler_id?: string | null
          id?: string
          paket_id?: string | null
          preis_protokolliert?: number
          rechnung_stripe_id?: string | null
          retour_datum?: string | null
          status?: string
          stempel_id?: string | null
          updated_at?: string
          versanddatum?: string | null
          vertriebler_id?: string | null
        }
        Update: {
          abschlussdatum?: string | null
          bestelldatum?: string | null
          box_id?: string
          created_at?: string
          frist_ablauf?: string | null
          haendler_id?: string | null
          id?: string
          paket_id?: string | null
          preis_protokolliert?: number
          rechnung_stripe_id?: string | null
          retour_datum?: string | null
          status?: string
          stempel_id?: string | null
          updated_at?: string
          versanddatum?: string | null
          vertriebler_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eloyo_boxes_haendler_id_fkey"
            columns: ["haendler_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eloyo_boxes_paket_id_fkey"
            columns: ["paket_id"]
            isOneToOne: false
            referencedRelation: "box_pakete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eloyo_boxes_stempel_id_fkey"
            columns: ["stempel_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["stamp_id"]
          },
        ]
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
      feed_post_likes: {
        Row: {
          created_at: string
          feed_post_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_post_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_post_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_likes_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          merchant_customer_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          merchant_customer_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          merchant_customer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_review_claims: {
        Row: {
          claimed_at: string | null
          id: string
          merchant_customer_id: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          merchant_customer_id: string
          points_awarded?: number
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          id?: string
          merchant_customer_id?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_review_claims_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_redemptions: {
        Row: {
          accepted_at: string
          bonus_awarded_at: string | null
          bonus_window_starts_at: string | null
          id: string
          invitation_id: string
          invitee_stamped_at: string | null
          invitee_user_id: string
          inviter_stamped_at: string | null
        }
        Insert: {
          accepted_at?: string
          bonus_awarded_at?: string | null
          bonus_window_starts_at?: string | null
          id?: string
          invitation_id: string
          invitee_stamped_at?: string | null
          invitee_user_id: string
          inviter_stamped_at?: string | null
        }
        Update: {
          accepted_at?: string
          bonus_awarded_at?: string | null
          bonus_window_starts_at?: string | null
          id?: string
          invitation_id?: string
          invitee_stamped_at?: string | null
          invitee_user_id?: string
          inviter_stamped_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_redemptions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          inviter_user_id: string
          merchant_customer_id: string
          share_code: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          inviter_user_id: string
          merchant_customer_id: string
          share_code: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          inviter_user_id?: string
          merchant_customer_id?: string
          share_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          lead_id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          partner_user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          lead_id: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          partner_user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          partner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scheduled_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          lead_id: string
          partner_user_id: string
          reminder_sent: boolean | null
          scheduled_at: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          partner_user_id: string
          reminder_sent?: boolean | null
          scheduled_at: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          partner_user_id?: string
          reminder_sent?: boolean | null
          scheduled_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scheduled_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          created_at: string | null
          current_points_balance: number | null
          id: string
          merchant_customer_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_points_balance?: number | null
          id?: string
          merchant_customer_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_points_balance?: number | null
          id?: string
          merchant_customer_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
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
      merchant_badges: {
        Row: {
          badge_key: string
          customer_id: string
          earned_at: string
          id: string
          metadata: Json | null
        }
        Insert: {
          badge_key: string
          customer_id: string
          earned_at?: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          badge_key?: string
          customer_id?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_badges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_boosts: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          duration_days: number
          ends_at: string
          id: string
          merchant_customer_id: string
          starts_at: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tier: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          duration_days: number
          ends_at: string
          id?: string
          merchant_customer_id: string
          starts_at?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tier: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          duration_days?: number
          ends_at?: string
          id?: string
          merchant_customer_id?: string
          starts_at?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_boosts_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_push_log: {
        Row: {
          id: string
          merchant_customer_id: string
          sent_at: string
          sent_by_user_id: string
        }
        Insert: {
          id?: string
          merchant_customer_id: string
          sent_at?: string
          sent_by_user_id: string
        }
        Update: {
          id?: string
          merchant_customer_id?: string
          sent_at?: string
          sent_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_push_log_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      new_customer_offers: {
        Row: {
          bonus_stamps: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          merchant_customer_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          bonus_stamps?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_customer_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          bonus_stamps?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_customer_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_customer_offers_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_chips: {
        Row: {
          chip_type: string | null
          chip_uid: string
          created_at: string | null
          hardware_uid: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          merchant_customer_id: string | null
          points_value: number | null
          stamp_color: string | null
          stamp_name: string | null
        }
        Insert: {
          chip_type?: string | null
          chip_uid: string
          created_at?: string | null
          hardware_uid?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          merchant_customer_id?: string | null
          points_value?: number | null
          stamp_color?: string | null
          stamp_name?: string | null
        }
        Update: {
          chip_type?: string | null
          chip_uid?: string
          created_at?: string | null
          hardware_uid?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          merchant_customer_id?: string | null
          points_value?: number | null
          stamp_color?: string | null
          stamp_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_chips_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          merchant_customer_id: string
          show_in_storefront: boolean | null
          title: string
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_customer_id: string
          show_in_storefront?: boolean | null
          title: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_customer_id?: string
          show_in_storefront?: boolean | null
          title?: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
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
      pipeline_appointments: {
        Row: {
          address: string | null
          created_at: string | null
          created_by_user_id: string
          description: string | null
          duration_minutes: number | null
          google_calendar_event_id: string | null
          id: string
          lead_id: string
          scheduled_at: string
          title: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by_user_id: string
          description?: string | null
          duration_minutes?: number | null
          google_calendar_event_id?: string | null
          id?: string
          lead_id: string
          scheduled_at: string
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by_user_id?: string
          description?: string | null
          duration_minutes?: number | null
          google_calendar_event_id?: string | null
          id?: string
          lead_id?: string
          scheduled_at?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_lead_notes: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          lead_id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          lead_id: string
          note: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          lead_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_leads: {
        Row: {
          churned_customer_id: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          house_number: string | null
          id: string
          industry: string | null
          last_contact_date: string | null
          latitude: number | null
          longitude: number | null
          next_contact_date: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          priority: string | null
          shop_name: string
          source: string | null
          status: string
          street: string | null
          updated_at: string
        }
        Insert: {
          churned_customer_id?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          latitude?: number | null
          longitude?: number | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          shop_name: string
          source?: string | null
          status?: string
          street?: string | null
          updated_at?: string
        }
        Update: {
          churned_customer_id?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          latitude?: number | null
          longitude?: number | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          shop_name?: string
          source?: string | null
          status?: string
          street?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          loyalty_account_id: string
          merchant_customer_id: string
          points_change: number
          transaction_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          loyalty_account_id: string
          merchant_customer_id: string
          points_change: number
          transaction_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          loyalty_account_id?: string
          merchant_customer_id?: string
          points_change?: number
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_loyalty_account_id_fkey"
            columns: ["loyalty_account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email_verification_token: string | null
          email_verified: boolean | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email_verification_token?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email_verification_token?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_notification_logs: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          device_count: number
          error_message: string | null
          failed_count: number
          fcm_responses: Json | null
          id: string
          invalid_token_count: number
          metadata: Json | null
          recipient_email: string | null
          recipient_name: string | null
          sent_count: number
          source: string | null
          status: string
          title: string
          trigger_function: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          device_count?: number
          error_message?: string | null
          failed_count?: number
          fcm_responses?: Json | null
          id?: string
          invalid_token_count?: number
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          sent_count?: number
          source?: string | null
          status?: string
          title: string
          trigger_function?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          device_count?: number
          error_message?: string | null
          failed_count?: number
          fcm_responses?: Json | null
          id?: string
          invalid_token_count?: number
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          sent_count?: number
          source?: string | null
          status?: string
          title?: string
          trigger_function?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      qr_tokens: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          loyalty_account_id: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          loyalty_account_id?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          loyalty_account_id?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_tokens_loyalty_account_id_fkey"
            columns: ["loyalty_account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      reward_redemptions: {
        Row: {
          id: string
          loyalty_account_id: string
          merchant_customer_id: string
          points_spent: number
          redeemed_at: string | null
          reward_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          loyalty_account_id: string
          merchant_customer_id: string
          points_spent: number
          redeemed_at?: string | null
          reward_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          loyalty_account_id?: string
          merchant_customer_id?: string
          points_spent?: number
          redeemed_at?: string | null
          reward_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_loyalty_account_id_fkey"
            columns: ["loyalty_account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          merchant_customer_id: string
          points_required: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_customer_id: string
          points_required?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_customer_id?: string
          points_required?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          city: string | null
          contact_person: string | null
          converted_customer_id: string | null
          created_at: string
          email: string | null
          house_number: string | null
          id: string
          industry: string | null
          notes: string | null
          partner_user_id: string
          phone: string | null
          postal_code: string | null
          priority: string | null
          shop_name: string
          status: string
          street: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          contact_person?: string | null
          converted_customer_id?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          partner_user_id: string
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          shop_name: string
          status?: string
          street?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          contact_person?: string | null
          converted_customer_id?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          partner_user_id?: string
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          shop_name?: string
          status?: string
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_rep_contract_uploads: {
        Row: {
          confirmed_at: string | null
          confirmed_by_user_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_at: string
          vertriebler_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          vertriebler_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          vertriebler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_rep_contract_uploads_vertriebler_id_fkey"
            columns: ["vertriebler_id"]
            isOneToOne: false
            referencedRelation: "sales_rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_rep_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_rep_profiles: {
        Row: {
          account_holder: string | null
          activated_at: string | null
          bank_name: string | null
          bic: string | null
          city: string | null
          contract_deadline: string | null
          contract_file_path: string | null
          contract_status: string | null
          contract_uploaded_at: string | null
          country: string | null
          created_at: string
          email: string
          employee_number: number | null
          first_conversion_at: string | null
          first_name: string
          house_number: string | null
          iban: string | null
          id: string
          is_active: boolean
          is_small_business: boolean | null
          last_conversion_at: string | null
          last_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          street: string | null
          tax_number: string | null
          updated_at: string
          user_id: string
          ust_id_verified: boolean | null
          vat_id: string | null
          vertrag_angenommen_am: string | null
          vertrag_inaktiv: boolean | null
          vertrag_ip: string | null
          vertrag_outdated: boolean | null
          vertrag_outdated_seit: string | null
          vertrag_pdf_url: string | null
          vertrag_user_agent: string | null
          vertrag_version: string | null
        }
        Insert: {
          account_holder?: string | null
          activated_at?: string | null
          bank_name?: string | null
          bic?: string | null
          city?: string | null
          contract_deadline?: string | null
          contract_file_path?: string | null
          contract_status?: string | null
          contract_uploaded_at?: string | null
          country?: string | null
          created_at?: string
          email?: string
          employee_number?: number | null
          first_conversion_at?: string | null
          first_name?: string
          house_number?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          is_small_business?: boolean | null
          last_conversion_at?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id: string
          ust_id_verified?: boolean | null
          vat_id?: string | null
          vertrag_angenommen_am?: string | null
          vertrag_inaktiv?: boolean | null
          vertrag_ip?: string | null
          vertrag_outdated?: boolean | null
          vertrag_outdated_seit?: string | null
          vertrag_pdf_url?: string | null
          vertrag_user_agent?: string | null
          vertrag_version?: string | null
        }
        Update: {
          account_holder?: string | null
          activated_at?: string | null
          bank_name?: string | null
          bic?: string | null
          city?: string | null
          contract_deadline?: string | null
          contract_file_path?: string | null
          contract_status?: string | null
          contract_uploaded_at?: string | null
          country?: string | null
          created_at?: string
          email?: string
          employee_number?: number | null
          first_conversion_at?: string | null
          first_name?: string
          house_number?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          is_small_business?: boolean | null
          last_conversion_at?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
          ust_id_verified?: boolean | null
          vat_id?: string | null
          vertrag_angenommen_am?: string | null
          vertrag_inaktiv?: boolean | null
          vertrag_ip?: string | null
          vertrag_outdated?: boolean | null
          vertrag_outdated_seit?: string | null
          vertrag_pdf_url?: string | null
          vertrag_user_agent?: string | null
          vertrag_version?: string | null
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
      shop_suggestions: {
        Row: {
          admin_notes: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          house_number: string | null
          id: string
          postal_code: string | null
          shop_name: string
          status: string
          street: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          house_number?: string | null
          id?: string
          postal_code?: string | null
          shop_name: string
          status?: string
          street?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          house_number?: string | null
          id?: string
          postal_code?: string | null
          shop_name?: string
          status?: string
          street?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stamp_cards: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          created_at: string | null
          custom_stamp_image_url: string | null
          id: string
          merchant_customer_id: string
          name: string | null
          stamp_animation_url: string | null
          stamp_count: number | null
          stamp_type: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string | null
          custom_stamp_image_url?: string | null
          id?: string
          merchant_customer_id: string
          name?: string | null
          stamp_animation_url?: string | null
          stamp_count?: number | null
          stamp_type?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string | null
          custom_stamp_image_url?: string | null
          id?: string
          merchant_customer_id?: string
          name?: string | null
          stamp_animation_url?: string | null
          stamp_count?: number | null
          stamp_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stamp_cards_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: true
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
      support_messages: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_device_fingerprints: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          last_seen_at?: string
          user_id?: string
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
      user_stamp_cards: {
        Row: {
          created_at: string | null
          current_points: number | null
          id: string
          last_points_at: string | null
          merchant_customer_id: string
          stamp_card_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_points?: number | null
          id?: string
          last_points_at?: string | null
          merchant_customer_id: string
          stamp_card_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_points?: number | null
          id?: string
          last_points_at?: string | null
          merchant_customer_id?: string
          stamp_card_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stamp_cards_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stamp_cards_stamp_card_id_fkey"
            columns: ["stamp_card_id"]
            isOneToOne: false
            referencedRelation: "stamp_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      vertrag_versionen: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ist_aktiv: boolean
          notizen: string | null
          pdf_url: string
          titel: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ist_aktiv?: boolean
          notizen?: string | null
          pdf_url: string
          titel: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ist_aktiv?: boolean
          notizen?: string | null
          pdf_url?: string
          titel?: string
          version?: string
        }
        Relationships: []
      }
      vertriebler_gutschriften: {
        Row: {
          aktive_kunden_snapshot: number
          ausgezahlt_am: string | null
          created_at: string
          direktprovision_details: Json | null
          direktprovision_netto: number
          erstelldatum: string
          folgeprovision_netto: number
          gesamt_brutto: number
          gesamt_netto: number
          gutschrift_nummer: string
          id: string
          pdf_url: string | null
          periode: string
          periode_jahr: number
          periode_monat: number
          sponsor_bonus_details: Json | null
          sponsor_bonus_netto: number
          status: string
          updated_at: string
          ust_betrag: number
          ust_id: string | null
          ust_pflichtig: boolean
          vertriebler_id: string
        }
        Insert: {
          aktive_kunden_snapshot?: number
          ausgezahlt_am?: string | null
          created_at?: string
          direktprovision_details?: Json | null
          direktprovision_netto?: number
          erstelldatum?: string
          folgeprovision_netto?: number
          gesamt_brutto?: number
          gesamt_netto?: number
          gutschrift_nummer: string
          id?: string
          pdf_url?: string | null
          periode: string
          periode_jahr: number
          periode_monat: number
          sponsor_bonus_details?: Json | null
          sponsor_bonus_netto?: number
          status?: string
          updated_at?: string
          ust_betrag?: number
          ust_id?: string | null
          ust_pflichtig?: boolean
          vertriebler_id: string
        }
        Update: {
          aktive_kunden_snapshot?: number
          ausgezahlt_am?: string | null
          created_at?: string
          direktprovision_details?: Json | null
          direktprovision_netto?: number
          erstelldatum?: string
          folgeprovision_netto?: number
          gesamt_brutto?: number
          gesamt_netto?: number
          gutschrift_nummer?: string
          id?: string
          pdf_url?: string | null
          periode?: string
          periode_jahr?: number
          periode_monat?: number
          sponsor_bonus_details?: Json | null
          sponsor_bonus_netto?: number
          status?: string
          updated_at?: string
          ust_betrag?: number
          ust_id?: string | null
          ust_pflichtig?: boolean
          vertriebler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertriebler_gutschriften_vertriebler_id_fkey"
            columns: ["vertriebler_id"]
            isOneToOne: false
            referencedRelation: "sales_rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vertriebler_zusatzvereinbarungen: {
        Row: {
          angenommen_am: string | null
          created_at: string
          id: string
          ip: string | null
          pdf_url: string | null
          status: string
          user_agent: string | null
          user_id: string
          vereinbarung_id: string
        }
        Insert: {
          angenommen_am?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          pdf_url?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
          vereinbarung_id: string
        }
        Update: {
          angenommen_am?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          pdf_url?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
          vereinbarung_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertriebler_zusatzvereinbarungen_vereinbarung_id_fkey"
            columns: ["vereinbarung_id"]
            isOneToOne: false
            referencedRelation: "zusatzvereinbarungen"
            referencedColumns: ["id"]
          },
        ]
      }
      winback_message_log: {
        Row: {
          app_message_id: string | null
          id: string
          last_stamp_at: string | null
          merchant_customer_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          app_message_id?: string | null
          id?: string
          last_stamp_at?: string | null
          merchant_customer_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          app_message_id?: string | null
          id?: string
          last_stamp_at?: string | null
          merchant_customer_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "winback_message_log_merchant_customer_id_fkey"
            columns: ["merchant_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      zusatzvereinbarungen: {
        Row: {
          beschreibung: string | null
          created_at: string
          created_by: string | null
          id: string
          ist_aktiv: boolean
          pdf_url: string
          pflicht: boolean
          titel: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ist_aktiv?: boolean
          pdf_url: string
          pflicht?: boolean
          titel: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ist_aktiv?: boolean
          pdf_url?: string
          pflicht?: boolean
          titel?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points_via_nfc:
        | {
            Args: {
              p_chip_data: string
              p_hardware_uid: string
              p_user_id: string
            }
            Returns: Json
          }
        | { Args: { p_hardware_uid: string; p_user_id: string }; Returns: Json }
      claim_orphan_nfc_chips: {
        Args: { p_merchant_customer_id: string; p_stempel_id: string }
        Returns: number
      }
      consume_invitation:
        | { Args: { p_share_code: string }; Returns: Json }
        | {
            Args: { p_device_fingerprint?: string; p_share_code: string }
            Returns: Json
          }
      create_invitation: {
        Args: { p_merchant_customer_id: string }
        Returns: Json
      }
      expire_old_invitations: { Args: never; Returns: number }
      generate_customer_number: { Args: never; Returns: string }
      get_pending_invitation: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_merchant_referrals: {
        Args: { p_merchant_customer_id: string }
        Returns: {
          bonus_awarded_at: string
          created_at: string
          invitation_id: string
          invitee_points: number
          inviter_points: number
          share_code: string
          status: string
        }[]
      }
      lookup_invitation: { Args: { p_share_code: string }; Returns: Json }
      mark_invitation_shared: { Args: { p_share_code: string }; Returns: Json }
      process_referral_bonus: {
        Args: { p_merchant_customer_id: string; p_user_id: string }
        Returns: Json
      }
      redeem_message_offer_via_nfc: {
        Args: {
          p_hardware_uid: string
          p_message_id: string
          p_user_id: string
        }
        Returns: Json
      }
      verify_email_token: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "partner" | "merchant" | "customer" | "end_customer"
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
      app_role: ["admin", "partner", "merchant", "customer", "end_customer"],
    },
  },
} as const
