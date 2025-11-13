-- Allow customers to view their own contacts for SMS campaigns
CREATE POLICY "Customers can view their own contacts"
ON contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = contacts.customer_id
    AND customer_users.user_id = auth.uid()
  )
);