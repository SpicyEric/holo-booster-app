-- Add auto-reply fields to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS auto_reply_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_reply_min_rating integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS auto_reply_daily_time text DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS last_auto_reply_check timestamptz,
ADD COLUMN IF NOT EXISTS next_auto_reply_run timestamptz;

-- Create review_auto_replies logging table
CREATE TABLE IF NOT EXISTS review_auto_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  review_id text NOT NULL,
  reviewer_name text,
  review_text text,
  reply_text text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on review_auto_replies
ALTER TABLE review_auto_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_auto_replies
CREATE POLICY "Admins can view all auto replies"
ON review_auto_replies FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view their own auto replies"
ON review_auto_replies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = review_auto_replies.customer_id
    AND customer_users.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert auto replies"
ON review_auto_replies FOR INSERT
TO authenticated
WITH CHECK (true);