-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'partner', 'merchant');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create customers table (business customers)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_review_url TEXT NOT NULL,
  offer_text TEXT NOT NULL,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create merchant_assignments table (links merchants to customers)
CREATE TABLE public.merchant_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_user_id, customer_id)
);

ALTER TABLE public.merchant_assignments ENABLE ROW LEVEL SECURITY;

-- Create contacts table (GDPR-compliant with opt-in and unsubscribe token)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  email TEXT,
  phone TEXT,
  opt_in BOOLEAN NOT NULL DEFAULT false,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT contacts_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_contacts_unsubscribe_token ON public.contacts(unsubscribe_token);
CREATE INDEX idx_contacts_customer_id ON public.contacts(customer_id);

-- Create scans table (tracking with IP hash instead of full IP)
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_scans_customer_id ON public.scans(customer_id);
CREATE INDEX idx_scans_created_at ON public.scans(created_at);

-- Create claims table (voucher codes with 5-minute expiry)
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  expire_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_claims_code ON public.claims(code);
CREATE INDEX idx_claims_expire_at ON public.claims(expire_at);

-- Create validation trigger for expire_at (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_claim_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expire_at <= now() THEN
    RAISE EXCEPTION 'expire_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_claim_expiry_before_insert
BEFORE INSERT ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.validate_claim_expiry();

-- Create orders table (for reorders and callback requests)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  merchant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('qr_reorder', 'display_stand', 'callback')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- Create contact_deletions table (GDPR audit log without PII)
CREATE TABLE public.contact_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  deletion_method TEXT NOT NULL CHECK (deletion_method IN ('self_service', 'admin', 'automated')),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_deletions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for customers
CREATE POLICY "Admins can view all customers"
  ON public.customers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view assigned customers"
  ON public.customers FOR SELECT
  USING (
    public.has_role(auth.uid(), 'merchant') AND
    EXISTS (
      SELECT 1 FROM public.merchant_assignments
      WHERE merchant_user_id = auth.uid()
        AND customer_id = customers.id
    )
  );

CREATE POLICY "Admins can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update customers"
  ON public.customers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for merchant_assignments
CREATE POLICY "Admins can view all merchant assignments"
  ON public.merchant_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view their own assignments"
  ON public.merchant_assignments FOR SELECT
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Admins can insert merchant assignments"
  ON public.merchant_assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete merchant assignments"
  ON public.merchant_assignments FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for contacts
CREATE POLICY "Admins can view all contacts"
  ON public.contacts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view contacts of assigned customers"
  ON public.contacts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'merchant') AND
    EXISTS (
      SELECT 1 FROM public.merchant_assignments
      WHERE merchant_user_id = auth.uid()
        AND customer_id = contacts.customer_id
    )
  );

CREATE POLICY "Admins can delete contacts"
  ON public.contacts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for scans
CREATE POLICY "Admins can view all scans"
  ON public.scans FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view scans of assigned customers"
  ON public.scans FOR SELECT
  USING (
    public.has_role(auth.uid(), 'merchant') AND
    EXISTS (
      SELECT 1 FROM public.merchant_assignments
      WHERE merchant_user_id = auth.uid()
        AND customer_id = scans.customer_id
    )
  );

-- RLS Policies for claims
CREATE POLICY "Admins can view all claims"
  ON public.claims FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view claims of assigned customers"
  ON public.claims FOR SELECT
  USING (
    public.has_role(auth.uid(), 'merchant') AND
    EXISTS (
      SELECT 1 FROM public.merchant_assignments
      WHERE merchant_user_id = auth.uid()
        AND customer_id = claims.customer_id
    )
  );

-- RLS Policies for orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can insert their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = merchant_user_id);

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for contact_deletions (audit log - admins only)
CREATE POLICY "Admins can view contact deletions"
  ON public.contact_deletions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for QR codes and logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-assets',
  'customer-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
);

-- Storage policies for customer-assets bucket
CREATE POLICY "Public can view customer assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-assets');

CREATE POLICY "Admins can upload customer assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-assets' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update customer assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'customer-assets' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete customer assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'customer-assets' AND
    public.has_role(auth.uid(), 'admin')
  );