-- Sequence für Kundennummern
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1000 INCREMENT 1;

-- Customers Tabelle erweitern
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS customer_number INT UNIQUE DEFAULT nextval('customer_number_seq'),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS promoter_id UUID,
  ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Status-Spalte nur wenn noch nicht vorhanden
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
    ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Rechnungen Tabelle
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  pdf_url TEXT,
  total_amount_cents INT,
  currency TEXT DEFAULT 'EUR',
  status TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS für invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all invoices" ON invoices
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert invoices" ON invoices
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invoices" ON invoices
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view invoices of assigned customers" ON invoices
  FOR SELECT USING (
    has_role(auth.uid(), 'merchant') AND 
    EXISTS (
      SELECT 1 FROM merchant_assignments 
      WHERE merchant_user_id = auth.uid() 
      AND merchant_assignments.customer_id = invoices.customer_id
    )
  );

-- Provisionen Tabelle
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  promoter_id UUID,
  stripe_event_id TEXT,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'EUR',
  commission_type TEXT,
  status TEXT DEFAULT 'available',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS für commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all commissions" ON commissions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert commissions" ON commissions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update commissions" ON commissions
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Promoters can view their own commissions" ON commissions
  FOR SELECT USING (auth.uid() = promoter_id);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_commissions_promoter_id ON commissions(promoter_id);
CREATE INDEX IF NOT EXISTS idx_commissions_customer_id ON commissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_promoter_id ON customers(promoter_id);