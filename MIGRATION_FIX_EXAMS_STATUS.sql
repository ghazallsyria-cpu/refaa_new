-- MIGRATION: Fix exams table status column
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Add status column if it's missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'status') THEN
        ALTER TABLE public.exams ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));
    END IF;
END $$;

-- 2. Ensure existing exams have a status
UPDATE public.exams SET status = 'published' WHERE status IS NULL;

-- 3. Verify the column exists and has the correct constraint
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'exams' AND column_name = 'status';
