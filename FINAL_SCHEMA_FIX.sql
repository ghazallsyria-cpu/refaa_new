-- FINAL_SCHEMA_FIX.sql
-- Fixes inconsistencies in exams and assignments tables

DO $$
BEGIN
    -- 1. Make section_id nullable in assignments (since we use assignment_sections junction table)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'section_id') THEN
        ALTER TABLE public.assignments ALTER COLUMN section_id DROP NOT NULL;
    END IF;

    -- 2. Ensure total_marks exists in assignments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'total_marks') THEN
        ALTER TABLE public.assignments ADD COLUMN total_marks INTEGER DEFAULT 100;
    END IF;

    -- 3. Ensure columns exist in exams
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'start_time') THEN
        ALTER TABLE public.exams ADD COLUMN start_time TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'end_time') THEN
        ALTER TABLE public.exams ADD COLUMN end_time TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'exam_date') THEN
        ALTER TABLE public.exams ADD COLUMN exam_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'max_score') THEN
        ALTER TABLE public.exams ADD COLUMN max_score INTEGER DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'total_marks') THEN
        ALTER TABLE public.exams ADD COLUMN total_marks INTEGER DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'total_points') THEN
        ALTER TABLE public.exams ADD COLUMN total_points INTEGER DEFAULT 100;
    END IF;

    -- Sync total_points and total_marks if needed
    UPDATE public.exams SET total_points = max_score WHERE max_score IS NOT NULL AND total_points IS NULL;
    UPDATE public.exams SET total_marks = max_score WHERE max_score IS NOT NULL AND total_marks IS NULL;

END $$;
