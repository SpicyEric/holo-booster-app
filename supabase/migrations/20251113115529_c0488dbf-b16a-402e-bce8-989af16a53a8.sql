-- Create review_deletion_orders table for Google review deletion requests
CREATE TABLE IF NOT EXISTS public.review_deletion_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'eingereicht' CHECK (status IN ('eingereicht', 'in_bearbeitung', 'abgeschlossen', 'storniert')),
  google_account_linked BOOLEAN DEFAULT false,
  google_business_name TEXT,
  total_reviews_selected INTEGER NOT NULL DEFAULT 0,
  max_cost_cents INTEGER NOT NULL DEFAULT 0,
  actual_cost_cents INTEGER DEFAULT 0,
  reviews_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create review_deletion_results table for tracking individual review deletion results
CREATE TABLE IF NOT EXISTS public.review_deletion_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.review_deletion_orders(id) ON DELETE CASCADE,
  review_google_id TEXT NOT NULL,
  review_stars INTEGER NOT NULL CHECK (review_stars >= 1 AND review_stars <= 3),
  review_text TEXT,
  review_date DATE,
  reviewer_name TEXT,
  deletion_successful BOOLEAN DEFAULT NULL,
  deletion_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_deletion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_deletion_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_deletion_orders
CREATE POLICY "Admins can view all deletion orders"
  ON public.review_deletion_orders FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert deletion orders"
  ON public.review_deletion_orders FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update deletion orders"
  ON public.review_deletion_orders FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their own deletion orders"
  ON public.review_deletion_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_users
      WHERE customer_users.customer_id = review_deletion_orders.customer_id
      AND customer_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert their own deletion orders"
  ON public.review_deletion_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_users
      WHERE customer_users.customer_id = review_deletion_orders.customer_id
      AND customer_users.user_id = auth.uid()
    )
  );

-- RLS Policies for review_deletion_results
CREATE POLICY "Admins can view all deletion results"
  ON public.review_deletion_results FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage deletion results"
  ON public.review_deletion_results FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their deletion results"
  ON public.review_deletion_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_deletion_orders rdo
      JOIN customer_users cu ON cu.customer_id = rdo.customer_id
      WHERE rdo.id = review_deletion_results.order_id
      AND cu.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_review_deletion_orders_updated_at
  BEFORE UPDATE ON public.review_deletion_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_deletion_results_updated_at
  BEFORE UPDATE ON public.review_deletion_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_review_deletion_orders_customer_id ON public.review_deletion_orders(customer_id);
CREATE INDEX idx_review_deletion_orders_status ON public.review_deletion_orders(status);
CREATE INDEX idx_review_deletion_results_order_id ON public.review_deletion_results(order_id);