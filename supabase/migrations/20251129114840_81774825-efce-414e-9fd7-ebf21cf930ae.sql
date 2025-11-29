-- Drop the complex storage policy that might be causing issues
DROP POLICY IF EXISTS "Merchants can upload to their customer folder" ON storage.objects;

-- Create a simpler policy that allows any merchant to upload to customer-assets
CREATE POLICY "Merchants can upload to customer-assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'customer-assets' 
  AND has_role(auth.uid(), 'merchant'::app_role)
);