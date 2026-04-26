ALTER TABLE public.invitations 
DROP CONSTRAINT IF EXISTS invitations_status_check;

ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_status_check 
CHECK (status IN ('pending', 'accepted', 'converted', 'expired', 'blocked_same_device'));