
-- Add email verification tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_verification_token uuid DEFAULT gen_random_uuid();

-- Mark all existing profiles as verified (existing users shouldn't be affected)
UPDATE public.profiles SET email_verified = true;

-- Create function to verify email via token (callable without auth for email links)
CREATE OR REPLACE FUNCTION public.verify_email_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET email_verified = true, 
      email_verification_token = gen_random_uuid()
  WHERE email_verification_token = p_token 
    AND email_verified = false;
  
  IF FOUND THEN
    RETURN json_build_object('success', true);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Ungültiger oder abgelaufener Link');
  END IF;
END;
$$;

-- Grant execute to all roles (needed for email link verification)
GRANT EXECUTE ON FUNCTION public.verify_email_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_email_token TO anon;
