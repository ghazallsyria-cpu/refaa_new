-- FIX: Create helper function to check teacher ownership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_teacher_of_assignment(assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET LOCAL row_level_security = off;
  RETURN EXISTS (SELECT 1 FROM public.assignments WHERE id = assignment_id AND teacher_id = auth.uid());
END;
$$;
