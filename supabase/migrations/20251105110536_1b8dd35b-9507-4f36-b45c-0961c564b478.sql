-- Allow users to read their own role (fix role loading on frontend)
-- Drop if exists, then create
DROP POLICY IF EXISTS "Users can view their own user roles" ON public.user_roles;

CREATE POLICY "Users can view their own user roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);
