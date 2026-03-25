-- ==========================================
-- مدرسة الرفعة النموذجية - Complete System Schema
-- ==========================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'management', 'teacher', 'student', 'parent', 'all');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'multi_select', 'essay', 'fill_in_blank', 'matching', 'ordering');
    END IF;
END $$;

-- 3. Tables Definition

-- Users Table (Extends auth.users)
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

-- Classes Table (الصفوف الدراسية)
CREATE TABLE public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Sections Table (الشعب)
CREATE TABLE public.sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Subjects Table (المواد الدراسية)
CREATE TABLE public.subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Parents Table (أولياء الأمور)
CREATE TABLE public.parents (
    id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    national_id TEXT UNIQUE,
    address TEXT,
    job_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Students Table (الطلاب)
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

-- Teachers Table (المعلمين)
CREATE TABLE public.teachers (
    id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    specialization TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    zoom_link TEXT, -- Added zoom link column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Teacher Subjects (ربط المعلم بالمواد)
CREATE TABLE public.teacher_subjects (
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

-- Teacher Sections (ربط المعلم بالفصول)
CREATE TABLE public.teacher_sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, section_id, subject_id)
);

-- Attendance Table (الحضور والغياب)
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

-- Exams Table (الاختبارات)
CREATE TABLE public.exams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER,
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

-- Questions Table
CREATE TABLE public.questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    type question_type NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    points NUMERIC DEFAULT 1 NOT NULL,
    order_index INTEGER NOT NULL,
    explanation TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Question Options Table
CREATE TABLE public.question_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL
);

-- Exam Attempts Table
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

-- Student Answers Table
CREATE TABLE public.student_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
    text_answer TEXT,
    is_correct BOOLEAN,
    points_earned NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Grades Table (الدرجات)
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

-- Assignments Table (الواجبات)
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

-- Schedules Table (الجدول الدراسي)
CREATE TABLE public.schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    period INTEGER NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(section_id, day_of_week, period),
    UNIQUE(teacher_id, day_of_week, period)
);

-- Announcements Table (الإعلانات)
CREATE TABLE public.announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_role user_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Messages Table (الرسائل)
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Helper Functions

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET ROLE postgres
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Row Level Security (RLS) Policies

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage users" ON public.users FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for classes, sections, subjects
CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Anyone can view sections" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for parents & students
CREATE POLICY "Parents can view their own data" ON public.parents FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all parents" ON public.parents FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Students can view their own data" ON public.students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Parents can view their children's data" ON public.students FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Admins can manage students" ON public.students FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for teachers
CREATE POLICY "Anyone can view teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Teachers can update their own data" ON public.teachers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage teachers" ON public.teachers FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for teacher_sections
CREATE POLICY "Anyone can view teacher_sections" ON public.teacher_sections FOR SELECT USING (true);
CREATE POLICY "Admins can manage teacher_sections" ON public.teacher_sections FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for attendance
CREATE POLICY "Students can view their own attendance" ON public.attendance FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can manage attendance" ON public.attendance FOR ALL USING (public.get_user_role() IN ('admin', 'management', 'teacher'));

-- Policies for exams
CREATE POLICY "Teachers can manage their own exams" ON public.exams FOR ALL USING (teacher_id = auth.uid() OR public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Students can view published exams" ON public.exams FOR SELECT USING (status = 'published');

-- Policies for schedules
CREATE POLICY "Anyone can view schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Admins can manage schedules" ON public.schedules FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for announcements
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for messages
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- 6. Triggers

-- Triggers for updated_at
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_classes_modtime BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_sections_modtime BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_subjects_modtime BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_parents_modtime BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_students_modtime BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_teachers_modtime BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_attendance_modtime BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_exams_modtime BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_grades_modtime BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_assignments_modtime BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_schedules_modtime BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_announcements_modtime BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 7. Auth Sync Trigger
-- Automatically create a profile in public.users when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
