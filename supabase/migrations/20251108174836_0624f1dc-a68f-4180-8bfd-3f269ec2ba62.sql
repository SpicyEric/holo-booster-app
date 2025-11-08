-- Normalize existing phone numbers in contacts table
UPDATE contacts 
SET phone = CASE 
  WHEN phone ~ '^0049' THEN '+49' || regexp_replace(substring(phone from 5), '[^0-9]', '', 'g')
  WHEN phone ~ '^049' THEN '+49' || regexp_replace(substring(phone from 4), '[^0-9]', '', 'g')
  WHEN phone ~ '^49' AND phone !~ '^\+' THEN '+49' || regexp_replace(substring(phone from 3), '[^0-9]', '', 'g')
  WHEN phone ~ '^0' THEN '+49' || regexp_replace(substring(phone from 2), '[^0-9]', '', 'g')
  ELSE regexp_replace(phone, '[^0-9+]', '', 'g')
END
WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- Normalize existing phone numbers in stamps table
UPDATE stamps
SET phone = CASE 
  WHEN phone ~ '^0049' THEN '+49' || regexp_replace(substring(phone from 5), '[^0-9]', '', 'g')
  WHEN phone ~ '^049' THEN '+49' || regexp_replace(substring(phone from 4), '[^0-9]', '', 'g')
  WHEN phone ~ '^49' AND phone !~ '^\+' THEN '+49' || regexp_replace(substring(phone from 3), '[^0-9]', '', 'g')
  WHEN phone ~ '^0' THEN '+49' || regexp_replace(substring(phone from 2), '[^0-9]', '', 'g')
  ELSE regexp_replace(phone, '[^0-9+]', '', 'g')
END
WHERE phone IS NOT NULL;