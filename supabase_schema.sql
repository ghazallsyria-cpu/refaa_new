-- Supabase Schema for مدرسة الرفعة النموذجية

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'management', 'teacher', 'student', 'parent', 'all');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- 1. Users Table (Extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    phone TEXT,
    avatar_url TEXT,
    must_reset_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Classes Table (الصفوف الدراسية)
CREATE TABLE public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g., الصف الأول الإعدادي
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Sections Table (الشعب)
CREATE TABLE public.sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g., أ, ب, ج or 1, 2, 3
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Subjects Table (المواد الدراسية)
CREATE TABLE public.subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g., رياضيات, لغة عربية
    code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Parents Table (أولياء الأمور)
CREATE TABLE public.parents (
    id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    national_id TEXT UNIQUE,
    address TEXT,
    job_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Students Table (الطلاب)
CREATE TABLE public.students (
    id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female')),
    address TEXT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Teachers Table (المعلمين)
CREATE TABLE public.teachers (
    id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    specialization TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    zoom_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Teacher Subjects (ربط المعلم بالمواد)
CREATE TABLE public.teacher_subjects (
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

-- 9. Teacher Sections (ربط المعلم بالفصول)
CREATE TABLE public.teacher_sections (
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, section_id, subject_id)
);

-- 10. Attendance Table (الحضور والغياب)
CREATE TABLE public.attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    notes TEXT,
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, date)
);

-- 11. Exams Table (الاختبارات)
CREATE TABLE public.exams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    exam_date DATE NOT NULL,
    max_score NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. Grades Table (الدرجات)
CREATE TABLE public.grades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    score NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(exam_id, student_id)
);

-- 13. Assignments Table (الواجبات)
CREATE TABLE public.assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 14. Schedules Table (الجدول الدراسي)
CREATE TABLE public.schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
    period INTEGER NOT NULL, -- 1st period, 2nd period, etc.
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(section_id, day_of_week, period),
    UNIQUE(teacher_id, day_of_week, period)
);

-- 15. Announcements Table (الإعلانات)
CREATE TABLE public.announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_role user_role, -- If null, visible to all
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 16. Messages Table (الرسائل)
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 18. Exams Table (الاختبارات المطورة)
CREATE TABLE public.exams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL, -- Optional: target specific section
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER, -- in minutes, null means unlimited
    max_attempts INTEGER DEFAULT 1,
    pass_score NUMERIC DEFAULT 50,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{
        "shuffle_questions": false,
        "shuffle_options": false,
        "show_result_immediately": true,
        "allow_backtracking": true
    }'::JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 19. Questions Table
CREATE TYPE question_type AS ENUM (
    'multiple_choice', 
    'true_false', 
    'multi_select', 
    'essay', 
    'fill_in_blank', 
    'matching', 
    'ordering'
);

CREATE TABLE public.questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    type question_type NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT, -- 'image', 'video', 'pdf'
    points NUMERIC DEFAULT 1 NOT NULL,
    order_index INTEGER NOT NULL,
    explanation TEXT,
    metadata JSONB DEFAULT '{}'::JSONB, -- For matching/ordering specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 20. Question Options Table
CREATE TABLE public.question_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL
);

-- 21. Exam Attempts Table
CREATE TABLE public.exam_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    score NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'graded')),
    feedback TEXT
);

-- 22. Student Answers Table
CREATE TABLE public.student_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL, -- For MCQ/Multi
    text_answer TEXT, -- For essay/fill
    is_correct BOOLEAN,
    points_earned NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for new tables
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

-- Policies for Exams
CREATE POLICY "Teachers can manage their own exams" ON public.exams
    FOR ALL USING (teacher_id = auth.uid() OR public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Students can view published exams" ON public.exams
    FOR SELECT USING (status = 'published');

-- Policies for Questions & Options
CREATE POLICY "Teachers can manage questions" ON public.questions
    FOR ALL USING (EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND teacher_id = auth.uid()) OR public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Students can view questions of published exams" ON public.questions
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND status = 'published'));

CREATE POLICY "Teachers can manage options" ON public.question_options
    FOR ALL USING (EXISTS (SELECT 1 FROM public.questions q JOIN public.exams e ON q.exam_id = e.id WHERE q.id = question_id AND e.teacher_id = auth.uid()) OR public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Students can view options" ON public.question_options
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.questions q JOIN public.exams e ON q.exam_id = e.id WHERE q.id = question_id AND e.status = 'published'));

-- Policies for Attempts & Answers
CREATE POLICY "Students can manage own attempts" ON public.exam_attempts
    FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Teachers can view attempts of their exams" ON public.exam_attempts
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND teacher_id = auth.uid()) OR public.get_user_role() IN ('admin', 'management'));

CREATE POLICY "Students can manage own answers" ON public.student_answers
    FOR ALL USING (EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND student_id = auth.uid()));
CREATE POLICY "Teachers can view answers of their exams" ON public.student_answers
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.exam_attempts a JOIN public.exams e ON a.exam_id = e.id WHERE a.id = attempt_id AND e.teacher_id = auth.uid()) OR public.get_user_role() IN ('admin', 'management'));

-- Helper function to update modified column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at on exams
CREATE TRIGGER update_exams_modtime BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
