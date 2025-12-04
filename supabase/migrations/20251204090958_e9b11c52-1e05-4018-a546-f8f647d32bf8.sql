-- Create shop_suggestions table for lead management
CREATE TABLE public.shop_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_name TEXT NOT NULL,
  street TEXT,
  house_number TEXT,
  postal_code TEXT,
  city TEXT,
  contact_person TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can create suggestions
CREATE POLICY "Users can create shop suggestions"
ON public.shop_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own suggestions
CREATE POLICY "Users can view their own suggestions"
ON public.shop_suggestions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all suggestions
CREATE POLICY "Admins can view all shop suggestions"
ON public.shop_suggestions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update suggestions
CREATE POLICY "Admins can update shop suggestions"
ON public.shop_suggestions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete suggestions
CREATE POLICY "Admins can delete shop suggestions"
ON public.shop_suggestions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_shop_suggestions_updated_at
BEFORE UPDATE ON public.shop_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();