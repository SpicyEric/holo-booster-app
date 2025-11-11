-- Add material orders support to existing orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_details jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS amount_cents integer,
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

-- Update existing constraint to include new order types
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('aufsteller', 'design', 'material', 'upgrade'));

-- Update status constraint to include new statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_user_id ON public.orders(merchant_user_id);

-- Create RLS policies for customers to view their own orders
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = orders.customer_id
    AND customer_users.user_id = auth.uid()
  )
);

COMMENT ON COLUMN public.orders.order_details IS 'JSON details: quantity, product_name, delivery_notes, etc.';
COMMENT ON COLUMN public.orders.stripe_payment_intent_id IS 'Stripe payment intent ID for paid orders';
COMMENT ON COLUMN public.orders.amount_cents IS 'Order amount in cents';
COMMENT ON COLUMN public.orders.paid_at IS 'Timestamp when payment was completed';