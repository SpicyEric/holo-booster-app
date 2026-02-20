
-- Add automation settings to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS welcome_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT 'Herzlich willkommen in unserem Bonusprogramm! Sammle Stempel und sichere dir tolle Prämien.',
  ADD COLUMN IF NOT EXISTS birthday_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS birthday_message text DEFAULT 'Alles Gute zum Geburtstag! Als kleines Geschenk schenken wir dir Bonus-Punkte.',
  ADD COLUMN IF NOT EXISTS birthday_bonus_points integer NOT NULL DEFAULT 50;

-- Create a function that sends a welcome message when a new loyalty account is created
CREATE OR REPLACE FUNCTION public.send_welcome_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer record;
BEGIN
  -- Check if the merchant has welcome messages enabled
  SELECT id, name, welcome_enabled, welcome_message
  INTO v_customer
  FROM customers
  WHERE id = NEW.merchant_customer_id;

  IF v_customer IS NULL OR NOT v_customer.welcome_enabled THEN
    RETURN NEW;
  END IF;

  -- Insert welcome message for the new user
  INSERT INTO app_messages (
    merchant_customer_id,
    user_id,
    title,
    body,
    show_in_storefront
  ) VALUES (
    NEW.merchant_customer_id,
    NEW.user_id,
    'Willkommen bei ' || v_customer.name || '!',
    COALESCE(v_customer.welcome_message, 'Herzlich willkommen in unserem Bonusprogramm!'),
    false
  );

  RETURN NEW;
END;
$$;

-- Trigger on loyalty_accounts insert
CREATE TRIGGER trigger_send_welcome_message
  AFTER INSERT ON public.loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_message();
