-- Clean up duplicate contacts (keep only the oldest per customer_id + phone)
DELETE FROM contacts a
USING contacts b
WHERE a.customer_id = b.customer_id 
  AND a.phone = b.phone 
  AND a.created_at > b.created_at
  AND a.deleted_at IS NULL
  AND b.deleted_at IS NULL;

-- Add unique constraint to prevent future duplicates
ALTER TABLE contacts 
ADD CONSTRAINT contacts_customer_phone_unique 
UNIQUE (customer_id, phone);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_customer_phone 
ON contacts(customer_id, phone) 
WHERE deleted_at IS NULL;