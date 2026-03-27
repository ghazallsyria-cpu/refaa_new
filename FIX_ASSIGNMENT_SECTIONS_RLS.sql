-- FIX: Resolve infinite recursion in assignment_sections RLS policies
-- Replace get_user_role() with direct JWT and table checks to avoid recursion.

DROP POLICY IF EXISTS "Teachers manage assignment sections" ON public.assignment_sections;

CREATE POLICY "Teachers manage assignment sections" ON public.assignment_sections FOR ALL USING (
    (auth.jwt() ->> 'role' IN ('admin', 'management')) OR 
    EXISTS (SELECT 1 FROM public.teachers WHERE id = auth.uid())
);
