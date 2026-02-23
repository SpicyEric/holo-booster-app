
-- Allow end users to view offers that are attached to their app_messages
CREATE POLICY "Users can view offers attached to their messages"
ON public.offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_messages
    WHERE app_messages.offer_id = offers.id
      AND app_messages.user_id = auth.uid()
  )
);
