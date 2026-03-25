-- ASSIGNMENT_QUESTIONS_ANSWERS.sql
-- إضافة جداول الأسئلة والإجابات للواجبات

-- 1. جدول أسئلة الواجبات
CREATE TABLE IF NOT EXISTS public.assignment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL, -- 'multiple_choice', 'true_false', 'essay', 'short_answer'
    options JSONB, -- For multiple choice options
    points NUMERIC DEFAULT 1,
    is_required BOOLEAN DEFAULT TRUE,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. جدول إجابات الطلاب على أسئلة الواجب
CREATE TABLE IF NOT EXISTS public.assignment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.assignment_submissions(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.assignment_questions(id) ON DELETE CASCADE NOT NULL,
    answer_text TEXT, -- For essay/short answer
    selected_options JSONB, -- For multiple choice (array of selected option indices or values)
    is_correct BOOLEAN,
    points_earned NUMERIC,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_answers ENABLE ROW LEVEL SECURITY;

-- Policies for assignment_questions
CREATE POLICY "Anyone can view assignment questions" ON public.assignment_questions
    FOR SELECT USING (true);

CREATE POLICY "Teachers can manage questions for their assignments" ON public.assignment_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id
            AND a.teacher_id = auth.uid()
        )
        OR public.get_user_role() IN ('admin', 'management')
    );

-- Policies for assignment_answers
CREATE POLICY "Students can view their own answers" ON public.assignment_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assignment_submissions s
            WHERE s.id = submission_id
            AND s.student_id = auth.uid()
        )
    );

CREATE POLICY "Students can insert their own answers" ON public.assignment_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assignment_submissions s
            WHERE s.id = submission_id
            AND s.student_id = auth.uid()
        )
    );

CREATE POLICY "Students can update their own answers" ON public.assignment_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.assignment_submissions s
            WHERE s.id = submission_id
            AND s.student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view answers for their assignments" ON public.assignment_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assignment_submissions s
            JOIN public.assignments a ON s.assignment_id = a.id
            WHERE s.id = submission_id
            AND a.teacher_id = auth.uid()
        )
        OR public.get_user_role() IN ('admin', 'management')
    );

CREATE POLICY "Teachers can grade answers" ON public.assignment_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.assignment_submissions s
            JOIN public.assignments a ON s.assignment_id = a.id
            WHERE s.id = submission_id
            AND a.teacher_id = auth.uid()
        )
        OR public.get_user_role() IN ('admin', 'management')
    );
