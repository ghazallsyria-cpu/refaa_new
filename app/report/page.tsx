'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, CheckCircle2, XCircle, AlertCircle, Info, 
  ChevronDown, ChevronUp, ShieldAlert, FileWarning, 
  Users, Database, Lock, Zap, LayoutDashboard, Calendar,
  Bell, FileText, BarChart3, Clock, Plus
} from "lucide-react";

const problems = [
  {
    id: 1,
    severity: "critical",
    category: "الأدوار والصلاحيات",
    icon: <ShieldAlert className="w-6 h-6" />,
    title: "دور management موجود في DB لكن غير موجود في Middleware",
    current: `// في middleware.ts لا يوجد أي توجيه لدور management
if (user.role === 'admin') → /dashboard
if (user.role === 'teacher') → /dashboard/teacher
if (user.role === 'student') → /dashboard/student
if (user.role === 'parent') → /dashboard/parent
// ❌ management → لا شيء! يبقى عالقاً`,
    fix: `// يجب إضافة:
if (user.role === 'management') 
  return NextResponse.redirect(new URL('/dashboard/management', request.url));

// وإنشاء صلحيات خاصة:
// management: يرى كل شيء لكن لا يعدّل إعدادات النظام`,
    impact: "مستخدم management لا يستطيع تسجيل الدخول بشكل صحيح"
  },
  {
    id: 2,
    severity: "critical",
    category: "الحضور والغياب",
    icon: <Database className="w-6 h-6" />,
    title: "UNIQUE على (student_id, date) يكسر منطق تسجيل الحضور",
    current: `UNIQUE(student_id, date)
-- ❌ طالب لديه 6 حصص يومياً
-- لكن لا يمكن تسجيل إلا حضور واحد في اليوم!
-- معلم الرياضيات سيمسح حضور معلم العربي`,
    fix: `-- الصحيح منطقياً:
UNIQUE(student_id, section_id, subject_id, date, period)
-- أو على الأقل:
UNIQUE(student_id, date, period)
-- كل حصة = سجل منفصل`,
    impact: "استحالة تسجيل حضور حقيقي لأكثر من مادة في اليوم"
  },
  {
    id: 3,
    severity: "critical",
    category: "الاختبارات",
    icon: <FileWarning className="w-6 h-6" />,
    title: "الطالب يرى اختبارات كل الشعب وليس شعبته فقط",
    current: `-- سياسة RLS الحالية:
CREATE POLICY "Students can view published exams"
  ON public.exams FOR SELECT
  USING (status = 'published');
-- ❌ طالب في الصف 10/أ يرى اختبارات 10/ب و10/ج!`,
    fix: `-- الصحيح:
CREATE POLICY "Students can view their section exams"
  ON public.exams FOR SELECT
  USING (
    status = 'published'
    AND section_id = (
      SELECT section_id FROM public.students 
      WHERE id = auth.uid()
    )
    AND NOW() BETWEEN start_at AND end_at
  );`,
    impact: "خرق أمني: طالب يطّلع على أسئلة فصل آخر"
  },
  {
    id: 4,
    severity: "critical",
    category: "ولي الأمر",
    icon: <Users className="w-6 h-6" />,
    title: "ولي الأمر لا يرى درجات ولا حضور أبنائه",
    current: `-- لا توجد سياسة RLS لولي الأمر على:
-- ❌ جدول attendance (الحضور)
-- ❌ جدول grades (الدرجات)
-- ❌ جدول exam_attempts (محاولات الاختبار)
-- ❌ جدول assignments (الواجبات)
-- ولي الأمر يرى فقط بيانات الطالب الأساسية`,
    fix: `-- يجب إضافة:
CREATE POLICY "Parent views child attendance"
  ON public.attendance FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parent views child grades"
  ON public.grades FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );`,
    impact: "ولي الأمر عاجز تماماً — النظام بلا قيمة له"
  },
  {
    id: 5,
    severity: "critical",
    category: "الدرجات",
    icon: <BarChart3 className="w-6 h-6" />,
    title: "لا توجد سياسة لرؤية الطالب لدرجاته الخاصة!",
    current: `-- جدول grades في complete_system_schema.sql
-- RLS مفعّل لكن لا يوجد SELECT policy للطلاب
-- ❌ الطالب لا يستطيع رؤية علاماته في جدول grades
-- يوجد فقط: exam_attempts.score لكن grades منفصل`,
    fix: `CREATE POLICY "Students view own grades"
  ON public.grades FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers view section grades"
  ON public.grades FOR SELECT USING (
    exam_id IN (
      SELECT id FROM public.exams 
      WHERE teacher_id = auth.uid()
    )
  );`,
    impact: "الطالب محروم من رؤية نتائجه الرسمية"
  },
  {
    id: 6,
    severity: "high",
    category: "المعلم",
    icon: <Users className="w-6 h-6" />,
    title: "المعلم يسجّل حضور أي طالب في أي فصل",
    current: `-- سياسة الحضور الحالية:
CREATE POLICY "Teachers can manage attendance"
  ON public.attendance FOR ALL
  USING (get_user_role() IN ('admin','management','teacher'));
-- ❌ أي معلم يسجّل غياب طالب في فصل لا يدرّسه`,
    fix: `CREATE POLICY "Teachers manage own sections attendance"
  ON public.attendance FOR ALL
  USING (
    get_user_role() IN ('admin','management')
    OR section_id IN (
      SELECT section_id FROM public.teacher_sections
      WHERE teacher_id = auth.uid()
    )
  );`,
    impact: "معلم الرياضيات يعدّل غياب حصة العربي"
  },
  {
    id: 7,
    severity: "high",
    category: "الاختبارات",
    icon: <Clock className="w-6 h-6" />,
    title: "لا يوجد تحقق من وقت الاختبار عند الدخول",
    current: `-- طالب يمكنه إنشاء exam_attempt حتى لو:
-- ❌ الاختبار لم يبدأ بعد (قبل start_at)
-- ❌ انتهى وقت الاختبار (بعد end_at)
-- ❌ استنفد عدد المحاولات (max_attempts)
CREATE POLICY "Students can create their own attempts"
  ON public.exam_attempts FOR INSERT
  WITH CHECK (student_id = auth.uid()); -- فقط!`,
    fix: `WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
    AND e.status = 'published'
    AND NOW() BETWEEN e.start_at AND e.end_at
    AND (
      SELECT COUNT(*) FROM public.exam_attempts
      WHERE exam_id = e.id AND student_id = auth.uid()
    ) < e.max_attempts
  )
);`,
    impact: "طلاب يدخلون الاختبار خارج وقته أو يكررونه"
  },
  {
    id: 8,
    severity: "high",
    category: "الواجبات",
    icon: <FileText className="w-6 h-6" />,
    title: "الطالب لا يرى الواجبات المخصصة لشعبته",
    current: `-- لا توجد SELECT policy للطلاب على جدول assignments
-- ❌ الطالب لا يرى واجباته
-- لا توجد أي policy لـ assignments تخص الطالب في
-- complete_system_schema.sql أو exams_rls_schema.sql`,
    fix: `CREATE POLICY "Students view section assignments"
  ON public.assignments FOR SELECT USING (
    section_id = (
      SELECT section_id FROM public.students
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own assignments"
  ON public.assignments FOR ALL USING (
    teacher_id = auth.uid()
    OR get_user_role() IN ('admin','management')
  );`,
    impact: "الطالب لا يعلم بالواجبات المطلوبة منه"
  },
  {
    id: 9,
    severity: "high",
    category: "الرسائل",
    icon: <Bell className="w-6 h-6" />,
    title: "أي مستخدم يرسل رسالة لأي مستخدم آخر",
    current: `CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());
-- ❌ طالب يرسل لمدير آخر في مدرسة أخرى
-- ❌ لا قيود على من يمكن مراسلته
-- ❌ طالب يرسل لطالب آخر من فصل مختلف`,
    fix: `-- يجب تحديد قواعد المراسلة:
-- طالب ← معلمو فصله فقط
-- معلم ← طلاب فصوله + إدارة
-- ولي أمر ← معلمو ابنه + إدارة
-- إدارة ← الجميع
-- + إضافة rate limiting`,
    impact: "فوضى في التواصل وخصوصية منعدمة"
  },
  {
    id: 10,
    severity: "medium",
    category: "قاعدة البيانات",
    icon: <Database className="w-6 h-6" />,
    title: "لا يوجد مفهوم السنة الدراسية / الفصل الدراسي",
    current: `-- كل البيانات بلا سياق زمني:
-- ❌ الجداول، الحضور، الدرجات كلها بلا academic_year
-- ❌ لا يمكن أرشفة سنة وبدء سنة جديدة
-- ❌ إحصائيات 2024 مختلطة مع 2025 و2026`,
    fix: `CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- "2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE
);
-- ثم إضافة academic_year_id لكل الجداول المهمة`,
    impact: "استحالة الأرشفة والمقارنة بين السنوات"
  },
  {
    id: 11,
    severity: "medium",
    category: "الأمان",
    icon: <Lock className="w-6 h-6" />,
    title: "getSession() مهجور وغير آمن في Server-side",
    current: `// middleware.ts
const { data: { session } } = 
  await supabase.auth.getSession();
// ⚠️ getSession() يقرأ من cookies بدون تحقق JWT
// ⚠️ يمكن تزوير الجلسة نظرياً`,
    fix: `// الصحيح:
const { data: { user }, error } = 
  await supabase.auth.getUser();
// getUser() يتحقق من JWT مع Supabase server
// آمن تماماً للاستخدام في Middleware`,
    impact: "ثغرة أمنية محتملة في التحقق من الجلسات"
  },
  {
    id: 12,
    severity: "medium",
    category: "الأداء",
    icon: <Zap className="w-6 h-6" />,
    title: "استعلام DB في كل request يُبطّئ التطبيق",
    current: `// كل طلب HTTP يستدعي:
const { data: user } = await supabase
  .from('users')
  .select('role, must_reset_password')
  .eq('id', session.user.id)
  .single();
// = N طلبات DB في الثانية!`,
    fix: `// الحل: تخزين الدور في JWT custom claims
// في Supabase → Auth → Hooks:
// custom_access_token_hook يضيف role في JWT
// ثم في middleware:
const role = user.user_metadata?.role;
// = 0 استعلامات إضافية!`,
    impact: "بطء ملحوظ عند زيادة المستخدمين"
  },
  {
    id: 13,
    severity: "low",
    category: "قاعدة البيانات",
    icon: <Database className="w-6 h-6" />,
    title: "ENUM 'all' كدور مستخدم لا منطق له",
    current: `CREATE TYPE user_role AS ENUM (
  'admin', 'management', 'teacher', 
  'student', 'parent', 'all' -- ❓ ما هذا؟
);
-- 'all' يُستخدم في announcements.target_role
-- لكن ليس كدور لمستخدم حقيقي`,
    fix: `-- فصل الـ ENUM إلى نوعين:
CREATE TYPE user_role AS ENUM (
  'admin','management','teacher','student','parent'
);
CREATE TYPE announcement_target AS ENUM (
  'admin','management','teacher','student','parent','all'
);`,
    impact: "تشويش في منطق الأدوار"
  }
];

const architecture = [
  {
    role: "مدير النظام",
    emoji: "👑",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    can: [
      "إنشاء وتعديل وحذف جميع المستخدمين",
      "إدارة الصفوف والشعب والمواد",
      "تعيين المعلمين للفصول",
      "الإعلانات لجميع الأدوار",
      "رؤية كل التقارير والإحصائيات",
      "إدارة السنة الدراسية",
      "الوصول الكامل لكل البيانات",
    ],
    cannot: [
      "تسجيل حضور (دور المعلم)",
      "إنشاء اختبارات (دور المعلم)",
    ]
  },
  {
    role: "الإدارة / management",
    emoji: "🏫",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    can: [
      "رؤية تقارير الحضور والغياب",
      "رؤية نتائج جميع الطلاب",
      "إرسال إعلانات لفئات محددة",
      "رؤية جداول المعلمين والفصول",
      "مراسلة المعلمين وأولياء الأمور",
      "رؤية إحصائيات المدرسة",
    ],
    cannot: [
      "حذف مستخدمين (صلاحية Admin)",
      "تعديل إعدادات النظام",
      "إنشاء اختبارات",
    ]
  },
  {
    role: "المعلم",
    emoji: "📚",
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    can: [
      "تسجيل حضور طلاب فصوله فقط",
      "إنشاء اختبارات لفصوله فقط",
      "إضافة وتصحيح الواجبات",
      "رؤية درجات طلاب فصوله فقط",
      "مراسلة الإدارة وأولياء أمور طلابه",
      "إدارة المحتوى التعليمي لمواده",
    ],
    cannot: [
      "رؤية بيانات فصول لا يدرّسها",
      "تعديل بيانات معلمين آخرين",
      "تعديل درجات اختبارات معلم آخر",
    ]
  },
  {
    role: "الطالب",
    emoji: "🎒",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    can: [
      "رؤية جدوله الدراسي الخاص",
      "أداء اختبارات شعبته في وقتها فقط",
      "رؤية درجاته ونتائجه",
      "رؤية واجبات شعبته",
      "رؤية حضوره وغيابه",
      "مراسلة معلميه فقط",
    ],
    cannot: [
      "رؤية اختبارات فصول أخرى",
      "رؤية درجات زملائه",
      "التعديل على إجاباته بعد التسليم",
      "أداء الاختبار خارج وقته",
    ]
  },
  {
    role: "ولي الأمر",
    emoji: "👨‍👩‍👧",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    can: [
      "رؤية حضور وغياب أبنائه فقط",
      "رؤية درجات ونتائج أبنائه",
      "رؤية جدول أبنائه الدراسي",
      "رؤية واجبات أبنائه",
      "مراسلة معلمي أبنائه فقط",
      "استقبال إعلانات المدرسة",
    ],
    cannot: [
      "رؤية بيانات طلاب آخرين",
      "التواصل مع طلاب مباشرة",
      "تعديل أي بيانات في النظام",
    ]
  }
];

const missingFeatures = [
  { icon: <Calendar className="w-6 h-6 text-indigo-500" />, title: "السنة الدراسية", desc: "academic_years table — ضروري للأرشفة" },
  { icon: <Bell className="w-6 h-6 text-amber-500" />, title: "الإشعارات", desc: "notifications table — لتنبيهات الحضور والدرجات" },
  { icon: <FileText className="w-6 h-6 text-emerald-500" />, title: "تسليم الواجبات", desc: "assignment_submissions — ملف SQL موجود لكن غير مدمج" },
  { icon: <BarChart3 className="w-6 h-6 text-sky-500" />, title: "التقارير", desc: "views/functions للإحصائيات — لا تُحسب من الكود" },
  { icon: <AlertCircle className="w-6 h-6 text-rose-500" />, title: "تنبيه ولي الأمر", desc: "عند غياب الطالب أو انخفاض الدرجات" },
  { icon: <Calendar className="w-6 h-6 text-purple-500" />, title: "الفصل الدراسي", desc: "semester — لتقسيم النتائج بشكل صحيح" },
];

const severityColors: Record<string, any> = {
  critical: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-600", text: "text-red-600", label: "حرجة" },
  high: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-600", text: "text-orange-600", label: "عالية" },
  medium: { bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-600", text: "text-yellow-600", label: "متوسطة" },
  low: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-600", text: "text-blue-600", label: "منخفضة" },
};

export default function SchoolAnalysis() {
  const [activeTab, setActiveTab] = useState("problems");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterSeverity, setFilterSeverity] = useState("all");

  const filtered = filterSeverity === "all"
    ? problems
    : problems.filter(p => p.severity === filterSeverity);

  const counts = {
    critical: problems.filter(p => p.severity === "critical").length,
    high: problems.filter(p => p.severity === "high").length,
    medium: problems.filter(p => p.severity === "medium").length,
    low: problems.filter(p => p.severity === "low").length,
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
              <LayoutDashboard className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">تقرير تدقيق — مدرسة الرفعة النموذجية</h1>
              <p className="text-slate-400 mt-1 font-medium">refaaschool2026 · تحليل منطق النظام المدرسي</p>
            </div>
          </div>

          {/* Summary counts */}
          <div className="flex flex-wrap gap-4 mt-8">
            {[
              { label: "مشاكل حرجة", count: counts.critical, color: "text-red-400", bg: "bg-red-400/10" },
              { label: "مشاكل عالية", count: counts.high, color: "text-orange-400", bg: "bg-orange-400/10" },
              { label: "مشاكل متوسطة", count: counts.medium, color: "text-yellow-400", bg: "bg-yellow-400/10" },
              { label: "مشاكل منخفضة", count: counts.low, color: "text-blue-400", bg: "bg-blue-400/10" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl px-6 py-4 text-center min-w-[140px] border border-white/5 ${s.bg}`}>
                <div className={`text-4xl font-black ${s.color}`}>{s.count}</div>
                <div className="text-sm font-bold text-slate-300 mt-2">{s.label}</div>
              </div>
            ))}
            <div className="rounded-2xl px-6 py-4 text-center min-w-[140px] border border-white/5 bg-purple-400/10">
              <div className="text-4xl font-black text-purple-400">{missingFeatures.length}</div>
              <div className="text-sm font-bold text-slate-300 mt-2">ميزات مفقودة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex overflow-x-auto hide-scrollbar">
          {[
            { id: "problems", label: "المشاكل المكتشفة", icon: <AlertTriangle className="w-4 h-4" /> },
            { id: "roles", label: "منطق الأدوار الصحيح", icon: <Users className="w-4 h-4" /> },
            { id: "missing", label: "ميزات مفقودة", icon: <Plus className="w-4 h-4" /> },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-5 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.id 
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" 
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-10 px-6">

        {/* PROBLEMS TAB */}
        {activeTab === "problems" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Filter */}
            <div className="flex items-center gap-3 flex-wrap bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-sm font-bold text-slate-500 ml-2">تصفية حسب الخطورة:</span>
              {["all", "critical", "high", "medium", "low"].map(s => (
                <button 
                  key={s} 
                  onClick={() => setFilterSeverity(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    filterSeverity === s 
                      ? "bg-slate-800 text-white shadow-md" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s === "all" ? "الكل" : severityColors[s].label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {filtered.map(problem => {
                  const sc = severityColors[problem.severity];
                  const isOpen = expandedId === problem.id;
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      key={problem.id}
                      className={`bg-white rounded-2xl border ${sc.border} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
                    >
                      <div 
                        onClick={() => setExpandedId(isOpen ? null : problem.id)}
                        className="p-5 cursor-pointer flex items-start gap-4 relative"
                      >
                        <div className={`absolute right-0 top-0 bottom-0 w-1 ${sc.badge}`}></div>
                        <div className={`p-3 rounded-xl ${sc.bg} ${sc.text} shrink-0`}>
                          {problem.icon}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`${sc.badge} text-white rounded-lg px-2.5 py-1 text-xs font-black tracking-wide`}>
                              {sc.label}
                            </span>
                            <span className="bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 text-xs font-bold">
                              {problem.category}
                            </span>
                            <span className="text-xs font-bold text-slate-400">#{problem.id}</span>
                          </div>
                          <h3 className="font-black text-lg text-slate-900 leading-snug">{problem.title}</h3>
                          <div className="text-sm text-red-500 mt-2 flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="w-4 h-4" /> 
                            <span>{problem.impact}</span>
                          </div>
                        </div>
                        <div className="shrink-0 pt-2 text-slate-400">
                          {isOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 pt-0 border-t border-slate-100 bg-slate-50/50">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                <div>
                                  <div className="text-sm font-black text-red-500 mb-3 flex items-center gap-2">
                                    <XCircle className="w-5 h-5" /> الكود الحالي (المشكلة)
                                  </div>
                                  <pre className="bg-slate-900 text-red-200 rounded-2xl p-5 text-sm overflow-x-auto leading-relaxed border border-red-900/30 shadow-inner" dir="ltr">
                                    <code>{problem.current}</code>
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-sm font-black text-emerald-500 mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> الكود المقترح (الإصلاح)
                                  </div>
                                  <pre className="bg-slate-900 text-emerald-200 rounded-2xl p-5 text-sm overflow-x-auto leading-relaxed border border-emerald-900/30 shadow-inner" dir="ltr">
                                    <code>{problem.fix}</code>
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ROLES TAB */}
        {activeTab === "roles" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex gap-4 items-start shadow-sm">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-indigo-900 mb-2 text-lg">مبدأ أساسي في المنطق المدرسي</h3>
                <p className="text-indigo-800/80 leading-relaxed font-medium">
                  كل دور يرى <strong>فقط ما يخصه</strong>. المعلم لا يرى فصولاً غير فصوله، والطالب لا يرى شعباً غير شعبته، وولي الأمر لا يرى سوى أبنائه المسجلين. هذا المبدأ يجب أن ينعكس في كل سياسة RLS.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {architecture.map(role => (
                <div key={role.role} className={`bg-white rounded-3xl border ${role.border} overflow-hidden shadow-sm`}>
                  <div className={`${role.bg} p-5 border-b ${role.border} flex items-center gap-4`}>
                    <span className="text-4xl">{role.emoji}</span>
                    <h3 className={`font-black text-xl ${role.color}`}>{role.role}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-8">
                    <div>
                      <div className="text-sm font-black text-emerald-600 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> يمكنه
                      </div>
                      <ul className="space-y-3">
                        {role.can.map((item, i) => (
                          <li key={i} className="text-sm text-slate-700 font-medium flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-emerald-500 shrink-0 mt-0.5">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-black text-red-600 mb-4 flex items-center gap-2">
                        <XCircle className="w-5 h-5" /> لا يمكنه
                      </div>
                      <ul className="space-y-3">
                        {role.cannot.map((item, i) => (
                          <li key={i} className="text-sm text-slate-700 font-medium flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-red-500 shrink-0 mt-0.5">×</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* RLS Matrix */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mt-10">
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                <Database className="w-5 h-5 text-slate-500" />
                <h3 className="font-black text-slate-900">مصفوفة الصلاحيات المقترحة (RLS Matrix)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="p-4 font-bold">الجدول</th>
                      {["مدير", "إدارة", "معلم", "طالب", "ولي أمر"].map(r => (
                        <th key={r} className="p-4 font-bold text-center">{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { table: "users", perms: ["CRUD", "R", "R(self)", "R(self)", "R(self)"] },
                      { table: "students", perms: ["CRUD", "R", "R(section)", "R(self)", "R(children)"] },
                      { table: "teachers", perms: ["CRUD", "R", "R(self)", "R(own)", "R(own)"] },
                      { table: "attendance", perms: ["CRUD", "R", "CRU(section)", "R(self)", "R(children)"] },
                      { table: "exams", perms: ["CRUD", "R", "CRUD(own)", "R(section+time)", "—"] },
                      { table: "grades", perms: ["CRUD", "R", "CRUD(own)", "R(self)", "R(children)"] },
                      { table: "assignments", perms: ["CRUD", "R", "CRUD(own)", "R(section)", "R(children)"] },
                      { table: "messages", perms: ["CRUD", "CRUD", "CRU(rules)", "CRU(rules)", "CRU(rules)"] },
                      { table: "announcements", perms: ["CRUD", "CRU", "R", "R", "R"] },
                    ].map((row, i) => (
                      <tr key={row.table} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="p-4 font-mono font-bold text-indigo-600">{row.table}</td>
                        {row.perms.map((p, j) => (
                          <td key={j} className="p-4 text-center">
                            <span className={`
                              inline-block px-3 py-1 rounded-lg text-xs font-black tracking-wide
                              ${p === "CRUD" ? "bg-emerald-100 text-emerald-700" : 
                                p === "—" ? "bg-slate-100 text-slate-400" : 
                                "bg-amber-100 text-amber-700"}
                            `}>
                              {p}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 text-xs font-medium text-slate-500 border-t border-slate-200 bg-slate-50">
                  CRUD = إنشاء+قراءة+تعديل+حذف | R = قراءة فقط | (section) = فصوله فقط | (self) = بياناته فقط | (children) = أبناؤه فقط | (rules) = بقواعد محددة
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* MISSING FEATURES TAB */}
        {activeTab === "missing" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {missingFeatures.map((f, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 flex gap-5 items-start shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 bg-slate-50 rounded-xl shrink-0 border border-slate-100">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Priority roadmap */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mt-10">
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                <LayoutDashboard className="w-5 h-5 text-slate-500" />
                <h3 className="font-black text-slate-900">خارطة طريق الإصلاح المقترحة</h3>
              </div>
              <div className="p-6 space-y-6">
                {[
                  {
                    phase: "المرحلة 1 — حرجة (أسبوع 1)",
                    color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: <ShieldAlert className="w-5 h-5" />,
                    items: [
                      "إصلاح UNIQUE في جدول attendance → (student_id, subject_id, date, period)",
                      "إضافة RLS لولي الأمر على attendance + grades + assignments",
                      "إضافة SELECT policy للطالب على جدول grades",
                      "تقييد الطالب برؤية اختبارات شعبته فقط + التحقق من الوقت",
                      "تقييد المعلم بتسجيل حضور فصوله فقط",
                    ]
                  },
                  {
                    phase: "المرحلة 2 — عالية (أسبوع 2)",
                    color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", icon: <AlertTriangle className="w-5 h-5" />,
                    items: [
                      "إضافة dashboard للـ management + توجيه Middleware",
                      "تقييد الرسائل بقواعد العلاقات (معلم↔طالب فصله فقط)",
                      "استبدال getSession() بـ getUser() في middleware",
                      "إضافة SELECT policy للطالب على assignments",
                      "التحقق من max_attempts في RLS الاختبارات",
                    ]
                  },
                  {
                    phase: "المرحلة 3 — تحسين (أسبوع 3-4)",
                    color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", icon: <Zap className="w-5 h-5" />,
                    items: [
                      "إنشاء جدول academic_years وربطه بكل الجداول",
                      "نقل الدور إلى JWT custom claims (Supabase Hook)",
                      "دمج assignment_submissions_schema.sql",
                      "إنشاء جدول notifications",
                      "إضافة مفهوم الفصل الدراسي (semester)",
                    ]
                  },
                  {
                    phase: "المرحلة 4 — تنظيف (أسبوع 4)",
                    color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: <CheckCircle2 className="w-5 h-5" />,
                    items: [
                      "حذف firebase-tools و@google/genai من package.json",
                      "فصل ENUM user_role عن announcement_target",
                      "توحيد ملفات SQL المتفرقة في migration واحد منظّم",
                      "إنشاء database functions للإحصائيات والتقارير",
                    ]
                  },
                ].map(phase => (
                  <div key={phase.phase} className={`${phase.bg} rounded-2xl p-6 border ${phase.border}`}>
                    <div className={`font-black ${phase.color} mb-4 text-lg flex items-center gap-2`}>
                      {phase.icon} {phase.phase}
                    </div>
                    <ul className="space-y-3">
                      {phase.items.map((item, i) => (
                        <li key={i} className="text-sm text-slate-700 font-medium flex items-start gap-3 bg-white/60 p-3 rounded-xl border border-white">
                          <span className={`${phase.color} shrink-0 mt-0.5`}>→</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
