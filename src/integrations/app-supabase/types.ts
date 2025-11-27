/**
 * TypeScript Types für die App-Datenbank (Eloyo App)
 * 
 * Diese Types spiegeln die Struktur der App-Datenbank wider.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// App-Rollen (unterscheiden sich von Website-Rollen!)
export type AppRole = 'endkunde' | 'kunde' | 'admin';

export type AppDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          birth_date: string | null
          gender: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          birth_date?: string | null
          gender?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          birth_date?: string | null
          gender?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: AppRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: AppRole
          created_at?: string
        }
      }
      merchants: {
        Row: {
          id: string
          owner_user_id: string | null
          name: string
          description: string | null
          category: string | null
          address: string
          postal_code: string | null
          city: string
          lat: number
          lng: number
          logo_url: string | null
          cover_image_url: string | null
          phone_number: string | null
          website: string | null
          facebook_url: string | null
          instagram_url: string | null
          twitter_url: string | null
          opening_hours: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id?: string | null
          name: string
          description?: string | null
          category?: string | null
          address: string
          postal_code?: string | null
          city: string
          lat: number
          lng: number
          logo_url?: string | null
          cover_image_url?: string | null
          phone_number?: string | null
          website?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          twitter_url?: string | null
          opening_hours?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string | null
          name?: string
          description?: string | null
          category?: string | null
          address?: string
          postal_code?: string | null
          city?: string
          lat?: number
          lng?: number
          logo_url?: string | null
          cover_image_url?: string | null
          phone_number?: string | null
          website?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          twitter_url?: string | null
          opening_hours?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      merchant_activation_codes: {
        Row: {
          id: string
          code: string
          merchant_id: string | null
          status: string
          green_stamp_points: number
          blue_stamp_points: number
          red_stamp_points: number
          activated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          merchant_id?: string | null
          status?: string
          green_stamp_points?: number
          blue_stamp_points?: number
          red_stamp_points?: number
          activated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          merchant_id?: string | null
          status?: string
          green_stamp_points?: number
          blue_stamp_points?: number
          red_stamp_points?: number
          activated_at?: string | null
          created_at?: string
        }
      }
      nfc_chips: {
        Row: {
          id: string
          merchant_id: string | null
          chip_uid: string
          chip_type: string
          stamp_name: string | null
          stamp_color: string | null
          points_value: number
          is_active: boolean
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          merchant_id?: string | null
          chip_uid: string
          chip_type?: string
          stamp_name?: string | null
          stamp_color?: string | null
          points_value?: number
          is_active?: boolean
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string | null
          chip_uid?: string
          chip_type?: string
          stamp_name?: string | null
          stamp_color?: string | null
          points_value?: number
          is_active?: boolean
          is_default?: boolean
          created_at?: string
        }
      }
      loyalty_accounts: {
        Row: {
          id: string
          user_id: string
          merchant_id: string
          current_points_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          merchant_id: string
          current_points_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          merchant_id?: string
          current_points_balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          loyalty_account_id: string
          merchant_id: string
          points_change: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          loyalty_account_id: string
          merchant_id: string
          points_change: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          loyalty_account_id?: string
          merchant_id?: string
          points_change?: number
          description?: string | null
          created_at?: string
        }
      }
      rewards: {
        Row: {
          id: string
          merchant_id: string
          title: string
          description: string | null
          image_url: string | null
          points_required: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          title: string
          description?: string | null
          image_url?: string | null
          points_required: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          points_required?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      reward_redemptions: {
        Row: {
          id: string
          user_id: string
          reward_id: string
          loyalty_account_id: string
          merchant_id: string
          points_spent: number
          status: string
          redeemed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          reward_id: string
          loyalty_account_id: string
          merchant_id: string
          points_spent: number
          status?: string
          redeemed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          reward_id?: string
          loyalty_account_id?: string
          merchant_id?: string
          points_spent?: number
          status?: string
          redeemed_at?: string | null
        }
      }
      offers: {
        Row: {
          id: string
          merchant_id: string
          title: string
          description: string | null
          image_url: string | null
          offer_date: string | null
          valid_until: string | null
          is_active: boolean
          show_in_storefront: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          title: string
          description?: string | null
          image_url?: string | null
          offer_date?: string | null
          valid_until?: string | null
          is_active?: boolean
          show_in_storefront?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          offer_date?: string | null
          valid_until?: string | null
          is_active?: boolean
          show_in_storefront?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          merchant_id: string
          user_id: string
          title: string
          body: string
          show_in_storefront: boolean
          sent_at: string | null
          read_at: string | null
        }
        Insert: {
          id?: string
          merchant_id: string
          user_id: string
          title: string
          body: string
          show_in_storefront?: boolean
          sent_at?: string | null
          read_at?: string | null
        }
        Update: {
          id?: string
          merchant_id?: string
          user_id?: string
          title?: string
          body?: string
          show_in_storefront?: boolean
          sent_at?: string | null
          read_at?: string | null
        }
      }
      stamp_cards: {
        Row: {
          id: string
          merchant_id: string
          name: string
          stamp_count: number
          stamp_type: string
          background_color: string | null
          background_image_url: string | null
          custom_stamp_image_url: string | null
          stamp_animation_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          name?: string
          stamp_count?: number
          stamp_type?: string
          background_color?: string | null
          background_image_url?: string | null
          custom_stamp_image_url?: string | null
          stamp_animation_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          name?: string
          stamp_count?: number
          stamp_type?: string
          background_color?: string | null
          background_image_url?: string | null
          custom_stamp_image_url?: string | null
          stamp_animation_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_stamp_cards: {
        Row: {
          id: string
          user_id: string
          merchant_id: string
          stamp_card_id: string | null
          current_points: number
          last_points_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          merchant_id: string
          stamp_card_id?: string | null
          current_points?: number
          last_points_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          merchant_id?: string
          stamp_card_id?: string | null
          current_points?: number
          last_points_at?: string | null
          created_at?: string
        }
      }
      qr_tokens: {
        Row: {
          id: string
          code: string
          type: string
          user_id: string | null
          loyalty_account_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          type: string
          user_id?: string | null
          loyalty_account_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          type?: string
          user_id?: string | null
          loyalty_account_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      new_customer_offers: {
        Row: {
          id: string
          merchant_id: string
          title: string
          description: string | null
          bonus_stamps: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          title: string
          description?: string | null
          bonus_stamps?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          title?: string
          description?: string | null
          bonus_stamps?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: AppRole
        }
        Returns: boolean
      }
      get_user_role: {
        Args: {
          _user_id: string
        }
        Returns: AppRole | null
      }
      is_merchant_owner: {
        Args: {
          _user_id: string
          _merchant_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: AppRole
    }
  }
}

// Helper Types für einfachen Zugriff
export type Profile = AppDatabase['public']['Tables']['profiles']['Row'];
export type UserRole = AppDatabase['public']['Tables']['user_roles']['Row'];
export type Merchant = AppDatabase['public']['Tables']['merchants']['Row'];
export type LoyaltyAccount = AppDatabase['public']['Tables']['loyalty_accounts']['Row'];
export type Transaction = AppDatabase['public']['Tables']['transactions']['Row'];
export type Reward = AppDatabase['public']['Tables']['rewards']['Row'];
export type RewardRedemption = AppDatabase['public']['Tables']['reward_redemptions']['Row'];
export type Offer = AppDatabase['public']['Tables']['offers']['Row'];
export type Message = AppDatabase['public']['Tables']['messages']['Row'];
export type StampCard = AppDatabase['public']['Tables']['stamp_cards']['Row'];
export type UserStampCard = AppDatabase['public']['Tables']['user_stamp_cards']['Row'];
export type NfcChip = AppDatabase['public']['Tables']['nfc_chips']['Row'];
export type MerchantActivationCode = AppDatabase['public']['Tables']['merchant_activation_codes']['Row'];
