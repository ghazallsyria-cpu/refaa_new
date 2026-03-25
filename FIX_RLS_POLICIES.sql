-- FIX_RLS_POLICIES.sql
-- هذا الملف يحتوي على إصلاحات لسياسات RLS بناءً على تقرير التدقيق

-- 1. إصلاح مشكلة UNIQUE في جدول attendance
-- إزالة القيد القديم (student_id, date)
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;
-- إضافة القيد الجديد (student_id, date, section_id)
-- ملاحظة: إذا كان هناك period يجب إضافته، لكن حالياً نستخدم section_id للسماح بحضور مواد مختلفة في نفس اليوم
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_date_section_key UNIQUE (student_id, date, section_id);

-- 2. إصلاح رؤية الاختبارات للطلاب (فقط شعبتهم وفي الوقت المحدد)
-- أولاً، نتأكد من وجود أعمدة start_at و end_at و status في جدول exams
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'start_at') THEN
        ALTER TABLE public.exams ADD COLUMN start_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'end_at') THEN
        ALTER TABLE public.exams ADD COLUMN end_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'status') THEN
        ALTER TABLE public.exams ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'max_attempts') THEN
        ALTER TABLE public.exams ADD COLUMN max_attempts INTEGER DEFAULT 1;
    END IF;
END $$;

-- تحديث السجلات القديمة لتجنب مشاكل NULL إذا لزم الأمر
DO $$
BEGIN
    EXECUTE 'UPDATE public.exams SET status = ''published'' WHERE status IS NULL';
END $$;

DROP POLICY IF EXISTS "Students can view published exams" ON public.exams;
DROP POLICY IF EXISTS "Students can view their section exams" ON public.exams;

-- استخدام SQL ديناميكي لتجنب أخطاء التحليل إذا لم تكن الأعمدة موجودة مسبقاً
DO $$
BEGIN
    EXECUTE '
    CREATE POLICY "Students can view their section exams"
      ON public.exams FOR SELECT
      USING (
        status = ''published''
        AND section_id IN (
          SELECT section_id FROM public.students 
          WHERE id = auth.uid()
        )
        AND (start_at IS NULL OR NOW() >= start_at)
        AND (end_at IS NULL OR NOW() <= end_at)
      )';
END $$;

-- 3. إضافة صلاحيات ولي الأمر (رؤية الحضور، الدرجات، الواجبات)
-- الحضور
DROP POLICY IF EXISTS "Parent views child attendance" ON public.attendance;
CREATE POLICY "Parent views child attendance"
  ON public.attendance FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );

-- الدرجات
DROP POLICY IF EXISTS "Parent views child grades" ON public.grades;
CREATE POLICY "Parent views child grades"
  ON public.grades FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );

-- الواجبات
DROP POLICY IF EXISTS "Parent views child assignments" ON public.assignments;
CREATE POLICY "Parent views child assignments"
  ON public.assignments FOR SELECT USING (
    section_id IN (
      SELECT section_id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );

-- 4. إصلاح رؤية الطالب لدرجاته
DROP POLICY IF EXISTS "Students view own grades" ON public.grades;
CREATE POLICY "Students view own grades"
  ON public.grades FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers view section grades" ON public.grades;
CREATE POLICY "Teachers view section grades"
  ON public.grades FOR SELECT USING (
    exam_id IN (
      SELECT id FROM public.exams 
      WHERE teacher_id = auth.uid()
    )
    OR public.get_user_role() IN ('admin', 'management')
  );

-- 5. تقييد المعلم بتسجيل حضور فصوله فقط
DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.attendance;
CREATE POLICY "Teachers manage own sections attendance"
  ON public.attendance FOR ALL
  USING (
    public.get_user_role() IN ('admin','management')
    OR section_id IN (
      SELECT section_id FROM public.teacher_sections
      WHERE teacher_id = auth.uid()
    )
  );

-- 6. التحقق من وقت الاختبار وعدد المحاولات عند الدخول
DROP POLICY IF EXISTS "Students can create their own attempts" ON public.exam_attempts;

DO $$
BEGIN
    EXECUTE '
    CREATE POLICY "Students can create their own attempts"
      ON public.exam_attempts FOR INSERT
      WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.exams e
          WHERE e.id = exam_id
          AND e.status = ''published''
          AND (e.start_at IS NULL OR NOW() >= e.start_at)
          AND (e.end_at IS NULL OR NOW() <= e.end_at)
          AND (
            SELECT COUNT(*) FROM public.exam_attempts
            WHERE exam_id = e.id AND student_id = auth.uid()
          ) < COALESCE(e.max_attempts, 1)
        )
      )';
END $$;

-- 7. تقييد رؤية الطالب للواجبات بشعبته فقط
DROP POLICY IF EXISTS "Students view section assignments" ON public.assignments;
CREATE POLICY "Students view section assignments"
  ON public.assignments FOR SELECT USING (
    section_id IN (
      SELECT section_id FROM public.students
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers manage own assignments" ON public.assignments;
CREATE POLICY "Teachers manage own assignments"
  ON public.assignments FOR ALL USING (
    teacher_id = auth.uid()
    OR public.get_user_role() IN ('admin','management')
  );

-- 8. تقييد الرسائل بقواعد العلاقات (مثال مبسط: الطالب يراسل معلميه فقط، المعلم يراسل طلابه، الخ)
-- سنقوم بتقييد الإرسال مبدئياً لمنع الإزعاج العشوائي
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    -- يمكن إضافة شروط معقدة هنا لاحقاً باستخدام وظائف قاعدة البيانات
  );
