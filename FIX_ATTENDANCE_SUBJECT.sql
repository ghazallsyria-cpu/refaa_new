-- Update attendance table to support per-subject attendance
DO $$
BEGIN
    -- 1. Add subject_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'subject_id') THEN
        ALTER TABLE public.attendance ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;
    END IF;

    -- 2. Update the UNIQUE constraint to include subject_id
    -- This allows different teachers teaching different subjects in the same period to have their own records
    ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_period_number_key;
    ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_period_subject_key;
    
    -- We'll name it attendance_student_id_date_period_subject_key
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_date_period_subject_key UNIQUE (student_id, date, period_number, subject_id);
END $$;

-- Update RLS Policies for attendance
DROP POLICY IF EXISTS "Teachers manage own sections attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers manage own subjects attendance" ON public.attendance;

CREATE POLICY "Teachers manage own subjects attendance" ON public.attendance FOR ALL USING (
  public.get_user_role() IN ('admin','management')
  OR (
    section_id IN (
      SELECT section_id FROM public.teacher_sections
      WHERE teacher_id = auth.uid()
    )
    AND (
      subject_id IS NULL OR subject_id IN (
        SELECT subject_id FROM public.teacher_sections
        WHERE teacher_id = auth.uid() AND section_id = public.attendance.section_id
      )
    )
  )
) WITH CHECK (
  public.get_user_role() IN ('admin','management')
  OR (
    section_id IN (
      SELECT section_id FROM public.teacher_sections
      WHERE teacher_id = auth.uid()
    )
    AND (
      subject_id IS NULL OR subject_id IN (
        SELECT subject_id FROM public.teacher_sections
        WHERE teacher_id = auth.uid() AND section_id = public.attendance.section_id
      )
    )
  )
);

-- Update Attendance Daily Summary View
CREATE OR REPLACE VIEW public.attendance_daily_summary AS
WITH period_status AS (
    -- Get the most "severe" status for each period if multiple subjects exist
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
    FROM public.attendance
    GROUP BY student_id, date, period_number
),
daily_counts AS (
    SELECT 
        student_id,
        date,
        COUNT(*) FILTER (WHERE max_severity = 3) as absent_periods,
        COUNT(*) as recorded_periods
    FROM period_status
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
