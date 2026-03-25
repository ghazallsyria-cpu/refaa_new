ALTER TABLE public.assignment_submissions 
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.users(id);

-- Update RLS policies to allow teachers to update submissions
DROP POLICY IF EXISTS "Teachers manage section submissions" ON public.assignment_submissions;
CREATE POLICY "Teachers manage section submissions" ON public.assignment_submissions FOR ALL USING (
  assignment_id IN (
    SELECT id FROM public.assignments
    WHERE teacher_id = auth.uid()
  )
  OR public.get_user_role() IN ('admin', 'management')
);
