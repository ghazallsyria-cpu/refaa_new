-- FIX: Create missing get_user_role helper function
-- This is required for RLS policies to work correctly.

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

-- 2. Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role;

-- 3. Now you can run your exam_rls_schema.sql file!
