-- Allow merchants to insert boxes for their assigned customers
CREATE POLICY "Merchants can insert their own boxes"
ON public.customer_boxes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = customer_boxes.customer_id
  )
);

-- Allow merchants to view boxes for their assigned customers
CREATE POLICY "Merchants can view their assigned customer boxes"
ON public.customer_boxes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = customer_boxes.customer_id
  )
);