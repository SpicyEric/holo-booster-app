-- Add latitude and longitude columns to customers table for map positioning
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_customers_coordinates ON public.customers (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;