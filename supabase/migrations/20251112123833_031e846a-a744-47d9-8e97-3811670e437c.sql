-- Erweitere contacts-Tabelle für SMS-Kampagnen
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS opted_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS scan_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_scan_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_scan_at timestamptz;

-- Index für Performance bei Kampagnen-Queries
CREATE INDEX IF NOT EXISTS idx_contacts_customer_sms ON contacts (customer_id, last_scan_at DESC) WHERE deleted_at IS NULL AND opt_in = true AND opted_out_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_scan_count ON contacts (customer_id, scan_count) WHERE deleted_at IS NULL AND opt_in = true AND opted_out_at IS NULL;

-- Kampagnen-Tabelle
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  segment jsonb NOT NULL,
  est_recipients int NOT NULL,
  package_tier text NOT NULL CHECK (package_tier IN ('100', '300', '500', '1000')),
  message_text text NOT NULL CHECK (char_length(message_text) <= 612),
  add_unsubscribe boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'payment_required', 'paid', 'sending', 'done', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_customer ON campaigns (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);

-- Einzelne Nachrichten pro Kampagne
CREATE TABLE IF NOT EXISTS campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  provider_msg_id text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  error_code text,
  cost_minor int,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON campaign_messages (status, sent_at);

-- Stripe Orders für SMS-Kampagnen
CREATE TABLE IF NOT EXISTS stripe_sms_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  checkout_session_id text NOT NULL UNIQUE,
  amount_cents int NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'expired', 'canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_stripe_sms_orders_session ON stripe_sms_orders (checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sms_orders_campaign ON stripe_sms_orders (campaign_id);

-- RLS Policies für campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all campaigns"
  ON campaigns FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their own campaigns"
  ON campaigns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = campaigns.customer_id
    AND customer_users.user_id = auth.uid()
  ));

CREATE POLICY "Customers can insert their own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = campaigns.customer_id
    AND customer_users.user_id = auth.uid()
  ));

CREATE POLICY "Admins can update campaigns"
  ON campaigns FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies für campaign_messages
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all campaign messages"
  ON campaign_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their campaign messages"
  ON campaign_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaigns c
    JOIN customer_users cu ON cu.customer_id = c.customer_id
    WHERE c.id = campaign_messages.campaign_id
    AND cu.user_id = auth.uid()
  ));

-- RLS Policies für stripe_sms_orders
ALTER TABLE stripe_sms_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all SMS orders"
  ON stripe_sms_orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their SMS orders"
  ON stripe_sms_orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaigns c
    JOIN customer_users cu ON cu.customer_id = c.customer_id
    WHERE c.id = stripe_sms_orders.campaign_id
    AND cu.user_id = auth.uid()
  ));

-- Trigger um scan_count und timestamps in contacts zu aktualisieren
CREATE OR REPLACE FUNCTION update_contact_scan_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET 
    scan_count = (
      SELECT COUNT(*) 
      FROM scans 
      WHERE scans.contact_id = NEW.contact_id
    ),
    first_scan_at = COALESCE(first_scan_at, NEW.created_at),
    last_scan_at = NEW.created_at
  WHERE id = NEW.contact_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_contact_stats_on_scan
AFTER INSERT ON scans
FOR EACH ROW
EXECUTE FUNCTION update_contact_scan_stats();