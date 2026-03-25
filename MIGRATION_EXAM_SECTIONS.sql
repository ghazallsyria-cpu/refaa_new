-- MIGRATION_EXAM_SECTIONS.sql
-- إنشاء جدول وسيط لربط الاختبارات بالفصول المتعددة

CREATE TABLE IF NOT EXISTS public.exam_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- نقل البيانات الحالية من exams.section_id إلى الجدول الجديد
INSERT INTO public.exam_sections (exam_id, section_id)
SELECT id, section_id
FROM public.exams
WHERE section_id IS NOT NULL;

-- إزالة عمود section_id من جدول exams (اختياري، يفضل الاحتفاظ به مؤقتاً للتوافق)
-- ALTER TABLE public.exams DROP COLUMN IF EXISTS section_id;

-- Enable RLS
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view exam sections" ON public.exam_sections FOR SELECT USING (true);
CREATE POLICY "Teachers manage exam sections" ON public.exam_sections FOR ALL USING (public.get_user_role() IN ('admin', 'teacher'));
