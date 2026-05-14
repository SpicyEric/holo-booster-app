-- Hybrid Auth: phone + email
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS migration_prompt_dismissed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;

-- Ensure auth_method values are constrained
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_auth_method_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_auth_method_check
      CHECK (auth_method IN ('email','phone','both'));
  END IF;
END $$;

-- Initial backfill: derive auth_method from auth.users
UPDATE public.profiles p
SET auth_method = CASE
  WHEN u.email IS NOT NULL AND u.phone IS NOT NULL THEN 'both'
  WHEN u.phone IS NOT NULL AND u.email IS NULL THEN 'phone'
  ELSE 'email'
END
FROM auth.users u
WHERE u.id = p.user_id;

-- Helper: increment login count (callable from client via RPC)
CREATE OR REPLACE FUNCTION public.increment_login_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.profiles
  SET login_count = COALESCE(login_count, 0) + 1
  WHERE user_id = auth.uid()
  RETURNING login_count INTO v_count;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Helper: refresh auth_method from auth.users (call after add/remove email/phone)
CREATE OR REPLACE FUNCTION public.refresh_auth_method()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_phone text;
  v_method text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT email, phone INTO v_email, v_phone FROM auth.users WHERE id = auth.uid();
  v_method := CASE
    WHEN v_email IS NOT NULL AND v_phone IS NOT NULL THEN 'both'
    WHEN v_phone IS NOT NULL AND v_email IS NULL THEN 'phone'
    ELSE 'email'
  END;
  UPDATE public.profiles SET auth_method = v_method WHERE user_id = auth.uid();
  RETURN v_method;
END;
$$;