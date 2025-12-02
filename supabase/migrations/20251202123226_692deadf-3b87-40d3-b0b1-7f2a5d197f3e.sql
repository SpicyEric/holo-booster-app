-- =============================================
-- ELOYO MASTER PROJECT - CONSOLIDATED DB SCHEMA
-- =============================================

-- 1. Extend app_role enum with end_customer
-- Note: 'customer' already exists, we add 'end_customer' for clarity
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'end_customer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'end_customer';
  END IF;
END $$;

-- 2. Extend profiles table with end_customer fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;

-- 3. Create loyalty_accounts table
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  current_points_balance integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_customer_id)
);

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;

-- 4. Create rewards table
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  points_required integer NOT NULL DEFAULT 10,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- 5. Create reward_redemptions table
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points_spent integer NOT NULL,
  status text DEFAULT 'pending',
  redeemed_at timestamptz DEFAULT now()
);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- 6. Create transactions table (points history)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points_change integer NOT NULL,
  description text,
  transaction_type text DEFAULT 'stamp', -- 'stamp', 'redeem', 'bonus', 'adjustment'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Create stamp_cards table (merchant stamp card design)
CREATE TABLE IF NOT EXISTS public.stamp_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name text DEFAULT 'Standard Stempelkarte',
  stamp_count integer DEFAULT 10,
  stamp_type text DEFAULT 'default',
  background_color text,
  background_image_url text,
  custom_stamp_image_url text,
  stamp_animation_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(merchant_customer_id)
);

ALTER TABLE public.stamp_cards ENABLE ROW LEVEL SECURITY;

-- 8. Create user_stamp_cards table (user's progress on stamp cards)
CREATE TABLE IF NOT EXISTS public.user_stamp_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stamp_card_id uuid REFERENCES stamp_cards(id) ON DELETE SET NULL,
  current_points integer DEFAULT 0,
  last_points_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_customer_id)
);

ALTER TABLE public.user_stamp_cards ENABLE ROW LEVEL SECURITY;

-- 9. Create nfc_chips table
CREATE TABLE IF NOT EXISTS public.nfc_chips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_uid text NOT NULL UNIQUE,
  merchant_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  chip_type text DEFAULT 'stamp',
  points_value integer DEFAULT 1,
  stamp_color text DEFAULT 'primary',
  stamp_name text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfc_chips ENABLE ROW LEVEL SECURITY;

-- 10. Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  show_in_storefront boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- 11. Create app_messages table (merchant to end_customer messages)
CREATE TABLE IF NOT EXISTS public.app_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  show_in_storefront boolean DEFAULT false,
  read_at timestamptz,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_messages ENABLE ROW LEVEL SECURITY;

-- 12. Create qr_tokens table
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  loyalty_account_id uuid REFERENCES loyalty_accounts(id) ON DELETE SET NULL,
  type text DEFAULT 'user', -- 'user', 'physical_card'
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;

-- 13. Create google_review_claims table
CREATE TABLE IF NOT EXISTS public.google_review_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points_awarded integer NOT NULL DEFAULT 5,
  claimed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_customer_id)
);

ALTER TABLE public.google_review_claims ENABLE ROW LEVEL SECURITY;

-- 14. Create new_customer_offers table
CREATE TABLE IF NOT EXISTS public.new_customer_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  bonus_stamps integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.new_customer_offers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- loyalty_accounts policies
CREATE POLICY "End customers can view their own loyalty accounts"
ON loyalty_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all loyalty accounts"
ON loyalty_accounts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view loyalty accounts for their business"
ON loyalty_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = loyalty_accounts.merchant_customer_id 
    AND customer_users.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert loyalty accounts"
ON loyalty_accounts FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update loyalty accounts"
ON loyalty_accounts FOR UPDATE
USING (true);

-- rewards policies
CREATE POLICY "Anyone can view active rewards"
ON rewards FOR SELECT
USING (is_active = true);

CREATE POLICY "Merchants can manage their rewards"
ON rewards FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = rewards.merchant_customer_id 
    AND customer_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all rewards"
ON rewards FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- reward_redemptions policies
CREATE POLICY "End customers can view their redemptions"
ON reward_redemptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
ON reward_redemptions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "End customers can create redemptions"
ON reward_redemptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- point_transactions policies
CREATE POLICY "Users can view their own transactions"
ON point_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM loyalty_accounts 
    WHERE loyalty_accounts.id = point_transactions.loyalty_account_id 
    AND loyalty_accounts.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all transactions"
ON point_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert transactions"
ON point_transactions FOR INSERT
WITH CHECK (true);

-- stamp_cards policies
CREATE POLICY "Anyone can view stamp cards"
ON stamp_cards FOR SELECT
USING (true);

CREATE POLICY "Merchants can manage their stamp cards"
ON stamp_cards FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = stamp_cards.merchant_customer_id 
    AND customer_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all stamp cards"
ON stamp_cards FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- user_stamp_cards policies
CREATE POLICY "Users can view their own stamp cards"
ON user_stamp_cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user stamp cards"
ON user_stamp_cards FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage user stamp cards"
ON user_stamp_cards FOR ALL
USING (true);

-- nfc_chips policies
CREATE POLICY "Anyone can view active NFC chips for scanning"
ON nfc_chips FOR SELECT
USING (is_active = true);

CREATE POLICY "Merchants can manage their NFC chips"
ON nfc_chips FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = nfc_chips.merchant_customer_id 
    AND customer_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all NFC chips"
ON nfc_chips FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- offers policies
CREATE POLICY "Anyone can view active offers"
ON offers FOR SELECT
USING (is_active = true AND show_in_storefront = true);

CREATE POLICY "Merchants can manage their offers"
ON offers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = offers.merchant_customer_id 
    AND customer_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all offers"
ON offers FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- app_messages policies
CREATE POLICY "Users can view their messages"
ON app_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Merchants can manage messages for their business"
ON app_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = app_messages.merchant_customer_id 
    AND customer_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all messages"
ON app_messages FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- qr_tokens policies
CREATE POLICY "Users can view their own QR tokens"
ON qr_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can validate QR tokens"
ON qr_tokens FOR SELECT
USING (is_active = true);

CREATE POLICY "System can manage QR tokens"
ON qr_tokens FOR ALL
USING (true);

-- google_review_claims policies
CREATE POLICY "Users can view their own claims"
ON google_review_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims"
ON google_review_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims"
ON google_review_claims FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- new_customer_offers policies
CREATE POLICY "Anyone can view active new customer offers"
ON new_customer_offers FOR SELECT
USING (is_active = true);

CREATE POLICY "Merchants can manage their new customer offers"
ON new_customer_offers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = new_customer_offers.merchant_customer_id 
    AND customer_users.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all new customer offers"
ON new_customer_offers FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to award points via NFC scan
CREATE OR REPLACE FUNCTION award_points_via_nfc(p_chip_uid text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chip nfc_chips%ROWTYPE;
  v_loyalty_account loyalty_accounts%ROWTYPE;
  v_points integer;
BEGIN
  -- Get NFC chip
  SELECT * INTO v_chip FROM nfc_chips WHERE chip_uid = p_chip_uid AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chip nicht gefunden');
  END IF;
  
  -- Get or create loyalty account
  SELECT * INTO v_loyalty_account 
  FROM loyalty_accounts 
  WHERE user_id = p_user_id AND merchant_customer_id = v_chip.merchant_customer_id;
  
  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (p_user_id, v_chip.merchant_customer_id, 0)
    RETURNING * INTO v_loyalty_account;
  END IF;
  
  v_points := v_chip.points_value;
  
  -- Update points
  UPDATE loyalty_accounts 
  SET current_points_balance = current_points_balance + v_points, updated_at = now()
  WHERE id = v_loyalty_account.id;
  
  -- Log transaction
  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, description, transaction_type)
  VALUES (v_loyalty_account.id, v_chip.merchant_customer_id, v_points, 'NFC Stempel', 'stamp');
  
  -- Update user_stamp_cards
  INSERT INTO user_stamp_cards (user_id, merchant_customer_id, current_points, last_points_at)
  VALUES (p_user_id, v_chip.merchant_customer_id, v_points, now())
  ON CONFLICT (user_id, merchant_customer_id) 
  DO UPDATE SET current_points = user_stamp_cards.current_points + v_points, last_points_at = now();
  
  RETURN jsonb_build_object(
    'success', true, 
    'points_awarded', v_points,
    'total_points', v_loyalty_account.current_points_balance + v_points,
    'merchant_customer_id', v_chip.merchant_customer_id
  );
END;
$$;