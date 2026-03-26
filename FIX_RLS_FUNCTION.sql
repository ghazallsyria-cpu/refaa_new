-- FIX: Create missing get_user_role helper function
-- This is required for RLS policies to work correctly.

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SET LOCAL row_level_security = off;
  SELECT role::text INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN v_role;
END;
$$;

-- 2. Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role;

-- 3. Now you can run your exam_rls_schema.sql file!
