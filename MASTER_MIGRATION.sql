-- MASTER_MIGRATION.sql
-- هذا الملف يجمع جميع الإصلاحات والميزات الجديدة لسهولة التنفيذ

-- 1. إصلاح سياسات RLS الحالية
\i FIX_RLS_POLICIES.sql

-- 2. إضافة ميزة السنوات الدراسية والفصول
\i MIGRATION_ACADEMIC_YEARS.sql

-- 3. إضافة ميزة الإشعارات
\i MIGRATION_NOTIFICATIONS.sql

-- 4. إضافة ميزة تسليم الواجبات
\i MIGRATION_ASSIGNMENT_SUBMISSIONS.sql

-- ملاحظة: لتنفيذ هذا الملف في Supabase، يمكنك نسخ محتويات كل ملف ولصقها في محرر SQL،
-- أو استخدام أداة سطر الأوامر (Supabase CLI) لتنفيذها بالترتيب.
