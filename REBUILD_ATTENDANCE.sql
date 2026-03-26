-- REBUILD ATTENDANCE SYSTEM: SESSION-BASED MODEL

-- 1. Drop old attendance structures
DROP VIEW IF EXISTS public.attendance_daily_summary CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;

-- 2. Create Attendance Sessions Table
-- This is the atomic unit for attendance recording
CREATE TABLE public.attendance_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES public.users(id) NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 8), -- Increased to 8 for flexibility
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(teacher_id, section_id, subject_id, date, period_number)
);

-- 3. Create Attendance Records Table
-- Details for each student within a session
CREATE TABLE public.attendance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(session_id, student_id)
);

-- 4. Create Daily Attendance Summary View
-- Aggregates session data for daily reporting
CREATE OR REPLACE VIEW public.daily_attendance_summary AS
WITH session_data AS (
    SELECT 
        r.student_id,
        s.date,
        s.period_number,
        r.status
    FROM public.attendance_records r
    JOIN public.attendance_sessions s ON r.session_id = s.id
    WHERE s.status = 'submitted'
),
period_severity AS (
    SELECT 
        student_id,
        date,
        period_number,
        MAX(CASE 
            WHEN status = 'absent' THEN 3
            WHEN status = 'late' THEN 2
            WHEN status = 'excused' THEN 1
            ELSE 0 
        END) as max_severity
    FROM session_data
    GROUP BY student_id, date, period_number
),
daily_counts AS (
    SELECT 
        student_id,
        date,
        COUNT(*) FILTER (WHERE max_severity = 3) as absent_periods,
        COUNT(*) as recorded_periods
    FROM period_severity
    GROUP BY student_id, date
)
SELECT 
    student_id,
    date,
    recorded_periods,
    absent_periods,
    CASE 
        WHEN recorded_periods < 5 THEN 'incomplete'
        WHEN absent_periods = 5 THEN 'full_absent'
        WHEN absent_periods > 0 THEN 'partial_absent'
        ELSE 'present'
    END as daily_status
FROM daily_counts;

-- 5. Row Level Security (RLS)

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Sessions Policies
CREATE POLICY "Teachers manage own sessions" ON public.attendance_sessions
    FOR ALL USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Admins view all sessions" ON public.attendance_sessions
    FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));

-- Records Policies
CREATE POLICY "Teachers manage own session records" ON public.attendance_records
    FOR ALL USING (
        session_id IN (SELECT id FROM public.attendance_sessions WHERE teacher_id = auth.uid())
    )
    WITH CHECK (
        session_id IN (SELECT id FROM public.attendance_sessions WHERE teacher_id = auth.uid())
    );

CREATE POLICY "Admins view all records" ON public.attendance_records
    FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));

-- Student/Parent View (via View or direct records)
CREATE POLICY "Students view own records" ON public.attendance_records
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents view child records" ON public.attendance_records
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid())
    );

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_sessions_updated_at
    BEFORE UPDATE ON public.attendance_sessions
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
