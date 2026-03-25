-- MIGRATION_ACADEMIC_YEARS.sql
-- إضافة مفهوم السنة الدراسية والفصل الدراسي

CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- "2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.semesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- "الفصل الأول"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- إضافة academic_year_id و semester_id للجداول المهمة
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id);

ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id);

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id);

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id);

-- Enable RLS
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view academic years" ON public.academic_years FOR SELECT USING (true);
CREATE POLICY "Admins manage academic years" ON public.academic_years FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

CREATE POLICY "Anyone can view semesters" ON public.semesters FOR SELECT USING (true);
CREATE POLICY "Admins manage semesters" ON public.semesters FOR ALL USING (public.get_user_role() IN ('admin', 'management'));
