-- RESTRUCTURE_SYSTEM.sql
-- Comprehensive refactor of Exams and Assignments system for strict teacher isolation and data ownership.

-- 1. Harden RLS for assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view assigned assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.assignments;

CREATE POLICY "Teachers can manage their own assignments" ON public.assignments
    FOR ALL USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Students can view assigned assignments" ON public.assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = auth.uid()
            AND (
                s.section_id = assignments.section_id
                OR EXISTS (
                    SELECT 1 FROM public.assignment_sections asub
                    WHERE asub.assignment_id = assignments.id
                    AND asub.section_id = s.section_id
                )
            )
        )
    );

CREATE POLICY "Admins can manage all assignments" ON public.assignments
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'management'));

-- 2. Harden RLS for exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage their own exams" ON public.exams;
DROP POLICY IF EXISTS "Students can view assigned exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can manage all exams" ON public.exams;

CREATE POLICY "Teachers can manage their own exams" ON public.exams
    FOR ALL USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Students can view assigned exams" ON public.exams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = auth.uid()
            AND s.section_id = exams.section_id
        )
    );

CREATE POLICY "Admins can manage all exams" ON public.exams
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'management'));

-- 3. Harden RLS for assignment_sections (Junction table)
ALTER TABLE public.assignment_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage sections for their assignments" ON public.assignment_sections;
DROP POLICY IF EXISTS "Anyone can view assignment sections" ON public.assignment_sections;

CREATE POLICY "Teachers can manage sections for their assignments" ON public.assignment_sections
    FOR ALL USING (public.is_teacher_of_assignment(assignment_id))
    WITH CHECK (public.is_teacher_of_assignment(assignment_id));

CREATE POLICY "Students can view their assignment sections" ON public.assignment_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = auth.uid()
            AND s.section_id = section_id
        )
    );

CREATE POLICY "Admins can manage all assignment sections" ON public.assignment_sections
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'management'));

-- 4. Harden RLS for assignment_questions
ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view assignment questions" ON public.assignment_questions;
DROP POLICY IF EXISTS "Teachers can manage questions for their assignments" ON public.assignment_questions;

CREATE POLICY "Teachers can manage questions for their assignments" ON public.assignment_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id
            AND a.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view assigned assignment questions" ON public.assignment_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id
            AND (
                EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.id = auth.uid()
                    AND (s.section_id = a.section_id OR EXISTS (SELECT 1 FROM public.assignment_sections asub WHERE asub.assignment_id = a.id AND asub.section_id = s.section_id))
                )
            )
        )
    );

CREATE POLICY "Admins can manage all assignment questions" ON public.assignment_questions
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'management'));

-- 5. Harden RLS for questions (Exams)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage questions for their exams" ON public.questions;
DROP POLICY IF EXISTS "Students can view questions for assigned exams" ON public.questions;

CREATE POLICY "Teachers can manage questions for their exams" ON public.questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.exams e
            WHERE e.id = exam_id
            AND e.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.exams e
            WHERE e.id = exam_id
            AND e.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view questions for assigned exams" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.exams e
            WHERE e.id = exam_id
            AND EXISTS (
                SELECT 1 FROM public.students s
                WHERE s.id = auth.uid()
                AND s.section_id = e.section_id
            )
        )
    );

CREATE POLICY "Admins can manage all questions" ON public.questions
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'management'));

-- 6. Harden RLS for assignment_submissions
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage their own submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their assignments" ON public.assignment_submissions;

CREATE POLICY "Students can manage their own submissions" ON public.assignment_submissions
    FOR ALL USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view and grade submissions for their assignments" ON public.assignment_submissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id
            AND a.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all assignment submissions" ON public.assignment_submissions
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'management'));

-- 7. Harden RLS for exam_attempts
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage their own attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Teachers can view attempts for their exams" ON public.exam_attempts;

CREATE POLICY "Students can manage their own attempts" ON public.exam_attempts
    FOR ALL USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view and grade attempts for their exams" ON public.exam_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.exams e
            WHERE e.id = exam_id
            AND e.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.exams e
            WHERE e.id = exam_id
            AND e.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all exam attempts" ON public.exam_attempts
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'management'));
