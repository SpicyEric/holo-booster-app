
CREATE POLICY "Anyone can view customer_boxes for NFC validation"
ON public.customer_boxes
FOR SELECT
USING (true);
