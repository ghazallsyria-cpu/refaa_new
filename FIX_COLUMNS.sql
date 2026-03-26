-- FIX_COLUMNS.sql
-- Ensure all required columns exist in the database

DO $$
BEGIN
    -- 1. Ensure period_number exists in attendance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'period_number') THEN
        ALTER TABLE public.attendance ADD COLUMN period_number INTEGER DEFAULT 1;
    END IF;

    -- 2. Ensure exam_id exists in grades
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grades' AND column_name = 'exam_id') THEN
        -- This is a critical column, if it's missing, the table is likely broken
        ALTER TABLE public.grades ADD COLUMN exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE;
    END IF;

    -- 3. Fix the UNIQUE constraint on attendance
    -- First, drop any existing constraints that might conflict
    ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;
    ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_date_section_key;
    ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_period_number_key;
    
    -- Add the correct constraint
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_date_period_number_key UNIQUE (student_id, date, period_number);

END $$;
