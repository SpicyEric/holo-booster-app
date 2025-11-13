-- Add invoice_type column to invoices table
ALTER TABLE invoices 
ADD COLUMN invoice_type text DEFAULT 'subscription' CHECK (invoice_type IN ('subscription', 'sms_campaign', 'refund'));

-- Update existing SMS campaign invoices (those starting with 'sms_')
UPDATE invoices 
SET invoice_type = 'sms_campaign' 
WHERE stripe_invoice_id LIKE 'sms_%';

-- Create index for better filtering performance
CREATE INDEX idx_invoices_type ON invoices(invoice_type);
CREATE INDEX idx_invoices_customer_type ON invoices(customer_id, invoice_type);