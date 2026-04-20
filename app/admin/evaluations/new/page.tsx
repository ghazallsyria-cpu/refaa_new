'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { 
  Save, Calendar, Clock, BookOpen, Users, 
  CheckCircle2, XCircle, AlertCircle, FileText,
  TrendingUp, Activity, Check, X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewEvaluationPage() {
  const { user } = useAuth() as any;
  const router = useRouter();
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 📝 حالات النموذج
  const [teacherId, setTeacherId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [subject, setSubject] = useState('');
  const [period, setPeriod] = useState('');
  const [className, setClassName] = useState('');

  // 🎯 عناصر التقييم الشاملة (10 بنود)
  const [evaluations, setEvaluations] = useState({
    plan_prep: false,
    sci_mastery: false,
    presentation: false,
    tech_use: false,
    class_mgt: false,
    ind_diff: false,
    interaction: false,
    notebooks: false,
    delay_record: false,
    parents_comm: false
  });

  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');

  useEffect(() => {
    if (date) {
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const d = new Date(date);
      setDayOfWeek(days[d.getDay()]);
    }
  }, [date]);

  useEffect(() => {
    const fetchTeachers = async () => {
      const { data } = await supabase.from('teachers').select('id, specialization, users!inner(full_name)');
      if (data) setTeachers(data);
    };
    fetchTeachers();
  }, []);

  const handleToggle = (key: keyof typeof evaluations) => {
    setEvaluations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !subject || !period || !className) {
      setMessage({ text: 'يرجى إكمال جميع البيانات الأساسية', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from('teacher_evaluations').insert({
        teacher_id: teacherId,
        evaluator_id: user.id,
        evaluation_date: date,
        day_of_week: dayOfWeek,
        subject,
        period: parseInt(period),
        class_name: className,
        plan_prep: evaluations.plan_prep,
        sci_mastery: evaluations.sci_mastery,
        presentation: evaluations.presentation,
        tech_use: evaluations.tech_use,
        class_mgt: evaluations.class_mgt,
        ind_diff: evaluations.ind_diff,
        interaction: evaluations.interaction,
        notebooks: evaluations.notebooks,
        delay_record: evaluations.delay_record,
        parents_comm: evaluations.parents_comm,
        strengths,
        improvements
      }).select();

      if (error) throw error;

      setMessage({ text: 'تم حفظ التقييم بنجاح! جاري تحويلك للطباعة...', type: 'success' });
      if (data && data.length > 0) {
        setTimeout(() => {
          router.push(`/admin/evaluations/${data[0].id}/print`); 
        }, 1500);
      }
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 🚀 البنود العشرة كما في النموذج الورقي
  const evaluationItems = [
    { key: 'plan_prep', label: 'التخطيط الجيد للدرس واعتماد التحضير' },
    { key: 'sci_mastery', label: 'التمكن من المادة العلمية' },
    { key: 'presentation', label: 'عرض المادة العلمية بأسلوب مشوق ومناسب' },
    { key: 'tech_use', label: 'استخدام الوسائل والتقنيات التربوية' },
    { key: 'class_mgt', label: 'إدارة الفصل واستثمار وقت الحصة' },
    { key: 'ind_diff', label: 'مراعاة الفروق الفردية بين المتعلمين' },
    { key: 'interaction', label: 'التفاعل والتواصل الإيجابي مع المتعلمين' },
    { key: 'notebooks', label: 'المتابعة المستمرة لكراسات وتطبيقات المتعلمين' },
    { key: 'delay_record', label: 'تفعيل سجل التأخر الدراسي والخطط العلاجية' },
    { key: 'parents_comm', label: 'التواصل مع أولياء أمور المتعلمين ضعاف التحصيل' },
  ];

  return (
    <div className="min-h-screen relative bg-slate-50 text-slate-800 pb-32 font-cairo" dir="rtl">
      <AnimatePresence>
        {message.text && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold text-white flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto pt-10 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-indigo-900 mb-2">إضافة تقييم ومتابعة</h1>
          <p className="text-slate-500 font-bold">يرجى تعبئة البنود بدقة واعتمادها.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6 text-indigo-700">
              <FileText className="w-6 h-6" /> <h2 className="text-xl font-black">البيانات الأساسية</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">اسم المعلم</label>
                <select value={teacherId} onChange={(e) => {
                  setTeacherId(e.target.value);
                  const selected = teachers.find(t => t.id === e.target.value);
                  if (selected) setSubject(selected.specialization);
                }} className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800">
                  <option value="">اختر المعلم...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.users.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">المادة الدراسية</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">التاريخ</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">اليوم</label>
                  <input type="text" value={dayOfWeek} readOnly className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-bold outline-none cursor-not-allowed" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">الحصة</label>
                  <input type="number" min="1" max="8" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">الصف</label>
                  <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6 text-emerald-600">
              <Activity className="w-6 h-6" /> <h2 className="text-xl font-black">عناصر المتابعة والتقييم</h2>
            </div>
            <div className="space-y-3">
              {evaluationItems.map((item, idx) => (
                <div key={idx} onClick={() => handleToggle(item.key as keyof typeof evaluations)} className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border-2 transition-all ${evaluations[item.key as keyof typeof evaluations] ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                  <span className={`font-bold text-sm sm:text-base ${evaluations[item.key as keyof typeof evaluations] ? 'text-emerald-900' : 'text-slate-600'}`}>{item.label}</span>
                  <div className={`w-14 h-8 rounded-full flex items-center p-1 transition-all ${evaluations[item.key as keyof typeof evaluations] ? 'bg-emerald-500 justify-start' : 'bg-slate-300 justify-end'}`}>
                    <motion.div layout className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {evaluations[item.key as keyof typeof evaluations] ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-400" />}
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6 text-amber-600">
              <TrendingUp className="w-6 h-6" /> <h2 className="text-xl font-black">الملاحظات والتوجيهات</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">نقاط القوة</label>
                <textarea rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 resize-none"></textarea>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">نقاط تحتاج إلى تحسين (ملاحظات)</label>
                <textarea rows={3} value={improvements} onChange={(e) => setImprovements(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 resize-none"></textarea>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Link href="/admin/evaluations" className="px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">إلغاء</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50">
              {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-6 h-6" />}
              حفظ واعتماد التقييم
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
