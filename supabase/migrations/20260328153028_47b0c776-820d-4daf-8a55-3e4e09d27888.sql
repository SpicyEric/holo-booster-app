
CREATE TABLE public.sales_rep_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  street TEXT DEFAULT '',
  house_number TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT 'Deutschland',
  tax_number TEXT DEFAULT '',
  vat_id TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  bic TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  account_holder TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_rep_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales rep profiles"
  ON public.sales_rep_profiles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sales reps can view own profile"
  ON public.sales_rep_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
