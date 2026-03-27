-- MIGRATION_ASSIGNMENT_SECTIONS.sql
-- إنشاء جدول وسيط لربط الواجبات بالفصول المتعددة

CREATE TABLE IF NOT EXISTS public.assignment_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- نقل البيانات الحالية من assignments.section_id إلى الجدول الجديد
INSERT INTO public.assignment_sections (assignment_id, section_id)
SELECT id, section_id
FROM public.assignments
WHERE section_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.assignment_sections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view assignment sections" ON public.assignment_sections FOR SELECT USING (true);
CREATE POLICY "Teachers manage assignment sections" ON public.assignment_sections FOR ALL USING (
    (auth.jwt() ->> 'role' IN ('admin', 'management')) OR 
    public.is_teacher_of_assignment(assignment_id)
);
