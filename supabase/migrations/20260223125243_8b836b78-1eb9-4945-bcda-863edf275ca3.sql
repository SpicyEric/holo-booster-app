-- Allow end users to update read_at and offer_redeemed_at on their own messages
CREATE POLICY "Users can update their own messages"
ON public.app_messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);