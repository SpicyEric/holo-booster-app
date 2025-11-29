-- Create storage policies for customer-assets bucket if they don't exist
-- Allow merchants to upload files to their assigned customer's folder
CREATE POLICY "Merchants can upload to their customer folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'customer-assets' 
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND EXISTS (
    SELECT 1 FROM merchant_assignments 
    WHERE merchant_assignments.merchant_user_id = auth.uid() 
    AND merchant_assignments.customer_id::text = (storage.foldername(name))[1]
  )
);

-- Allow merchants to update files in their assigned customer's folder
CREATE POLICY "Merchants can update their customer files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'customer-assets' 
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND EXISTS (
    SELECT 1 FROM merchant_assignments 
    WHERE merchant_assignments.merchant_user_id = auth.uid() 
    AND merchant_assignments.customer_id::text = (storage.foldername(name))[1]
  )
);

-- Public read access for customer assets (logos, covers shown on mobile app)
CREATE POLICY "Public read access for customer assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'customer-assets');