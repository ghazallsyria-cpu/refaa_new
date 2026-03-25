-- MIGRATION_ASSIGNMENT_SUBMISSIONS.sql
-- إضافة جدول تسليم الواجبات

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  grade NUMERIC,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES public.teachers(id),
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can view their own submissions" ON public.assignment_submissions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can submit their own assignments" ON public.assignment_submissions
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id
      AND a.section_id IN (SELECT section_id FROM public.students WHERE id = auth.uid())
      AND NOW() <= a.due_date
    )
  );

CREATE POLICY "Students can update their own submissions before due date" ON public.assignment_submissions
  FOR UPDATE USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id
      AND NOW() <= a.due_date
    )
  ) WITH CHECK (
    student_id = auth.uid()
  );

CREATE POLICY "Teachers can view submissions for their assignments" ON public.assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id
      AND a.teacher_id = auth.uid()
    )
    OR public.get_user_role() IN ('admin', 'management')
  );

CREATE POLICY "Teachers can grade submissions for their assignments" ON public.assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id
      AND a.teacher_id = auth.uid()
    )
    OR public.get_user_role() IN ('admin', 'management')
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id
      AND a.teacher_id = auth.uid()
    )
    OR public.get_user_role() IN ('admin', 'management')
  );

CREATE POLICY "Parents can view their children's submissions" ON public.assignment_submissions
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  );
