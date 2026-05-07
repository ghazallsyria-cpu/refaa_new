'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Fingerprint, CheckCircle2, Loader2, Lock, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// 📦 تعريف خصائص مكون البصمة الذكية (Props)
// ==========================================
interface TeacherCheckInButtonProps {
  teacherId: string;       // معرّف المعلم (لتسجيل البصمة باسمه)
  periodNumber: number;    // رقم الحصة (الأولى، الثانية...) لجلب وقتها
  selectedDate: string;    // التاريخ المختار في الجدول (يجب أن يتطابق مع تاريخ اليوم ليسمح بالبصمة)
  className?: string;      // كلاسات إضافية للتنسيق الخارجي
}

export default function TeacherCheckInButton({ teacherId, periodNumber, selectedDate, className = '' }: TeacherCheckInButtonProps) {
  
  // ==========================================
  // 🎛️ حالات مكون البصمة (States)
  // ==========================================
  // status تحدد شكل الزر: 
  // loading (يفحص)، present (بصم سابقاً)، allowed (مسموح يبصم)، ended (راحت عليه)، not_started (باقي وقت)
  const [status, setStatus] = useState<'loading' | 'present' | 'allowed' | 'ended' | 'not_started'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false); // أثناء إرسال البصمة للسيرفر
  const [errorMessage, setErrorMessage] = useState(''); // رسائل الخطأ

  // ==========================================
  // ⏳ محرك الفحص الزمني (Time & Status Checker)
  // يشتغل كلما تغير رقم الحصة أو التاريخ المختار
  // ==========================================
  useEffect(() => {
    const checkStatusAndTime = async () => {
      if (!teacherId || !periodNumber || !selectedDate) return;
      setStatus('loading'); // إظهار حالة التحميل للزر
      
      try {
        // 🔍 1. هل سجل المعلم حضوره مسبقاً في هذه الحصة وهذا اليوم؟
        const { data: attendanceData } = await supabase
          .from('teacher_attendance_records')
          .select('id')
          .eq('teacher_id', teacherId)
          .eq('date', selectedDate)
          .eq('period_number', periodNumber)
          .maybeSingle(); // نبحث عن سجل واحد فقط

        // إذا وجدنا سجل، معناه أنه حضر، فنقفل الزر بالأخضر
        if (attendanceData) {
          setStatus('present'); 
          return;
        }

        // ⏱️ 2. إذا لم يكن حاضراً، نتحقق من المنطق الزمني (Time Logic)
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd'); // تاريخ اليوم الفعلي
        const currentMinutes = now.getHours() * 60 + now.getMinutes(); // نحول الوقت الحالي لدقائق للمقارنة

        // 🚫 أ. هل المعلم يستعرض يوماً في الماضي؟ (يمنع التحضير بأثر رجعي)
        if (selectedDate < todayStr) {
          setStatus('ended');
          return;
        }
        // 🚫 ب. هل المعلم يستعرض يوماً في المستقبل؟ (يمنع التحضير المسبق)
        if (selectedDate > todayStr) {
          setStatus('not_started');
          return;
        }

        // 📅 ج. إذا كان يستعرض اليوم الحالي الفعلي، نجلب وقت بداية ونهاية الحصة من الإعدادات
        const { data: periodData } = await supabase
          .from('class_periods')
          .select('start_time, end_time')
          .eq('period_number', periodNumber)
          .maybeSingle();

        // 🧮 حساب وتحويل أوقات الحصة إلى دقائق
        if (periodData && periodData.end_time && periodData.start_time) {
          const [endH, endM] = periodData.end_time.split(':').map(Number);
          const [startH, startM] = periodData.start_time.split(':').map(Number);
          
          const endMinutes = endH * 60 + endM;
          const startMinutes = startH * 60 + startM;

          // ⚖️ شروط البصمة الذكية:
          // 1. إذا تجاوز الوقت الحالي نهاية الحصة -> انتهت
          if (currentMinutes > endMinutes) {
            setStatus('ended'); 
          } 
          // 2. إذا كان الوقت الحالي أقل من بداية الحصة بـ أكثر من 10 دقائق -> لم تبدأ (لا يمكنه البصمة مبكراً جداً)
          else if (currentMinutes < (startMinutes - 10)) {
            setStatus('not_started'); 
          } 
          // 3. خلاف ذلك (أقل من 10 دقائق قبل الحصة، أو أثناء الحصة) -> مسموح ✅
          else {
            setStatus('allowed'); 
          }
        } else {
          // إذا لم نجد أوقات مجدولة للحصص في السيرفر (كأن النظام جديد)، نسمح بالبصمة لتفادي تعطيل المعلم
          setStatus('allowed');
        }

      } catch (error) {
        console.error('Error checking status:', error);
        setStatus('allowed'); // في حال انهيار الاتصال، نعطيه فرصة البصمة
      }
    };

    checkStatusAndTime();
  }, [teacherId, periodNumber, selectedDate]);

  // ==========================================
  // 🚀 دالة إثبات الحضور (Check-In Handler)
  // يتم تنفيذها عند النقر على الزر عندما يكون متاحاً
  // ==========================================
  const handleCheckIn = async () => {
    // حماية مزدوجة: لا ينفذ الكود إلا إذا كان مسموحاً ولم يكن هناك إرسال قيد التقدم
    if (status !== 'allowed' || isSubmitting) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // إرسال البصمة لقاعدة البيانات
      const { error } = await supabase
        .from('teacher_attendance_records')
        .insert([
          {
            teacher_id: teacherId,
            date: selectedDate,
            period_number: periodNumber,
            status: 'present' // يمكن تطويره لاحقاً ليصبح late إذا بصم متأخراً
          }
        ]);

      if (error) {
        setErrorMessage(error.message);
        throw error;
      }
      
      // تغيير حالة الزر للأخضر بنجاح
      setStatus('present');
      
    } catch (error: any) {
      console.error('Check-in error:', error);
      alert(`خطأ في التسجيل: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 🎨 حالات واجهة المستخدم (UI Render)
  // ==========================================
  
  // 1. حالة التحميل والتدقيق
  if (status === 'loading') {
    return (
      <button disabled className={`flex items-center gap-2 bg-slate-100 text-slate-400 px-4 py-2 rounded-xl font-bold text-sm cursor-not-allowed ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" /> يفحص الوقت...
      </button>
    );
  }

  // استخدام AnimatePresence لتغيير شكل الزر بنعومة (Morphing)
  return (
    <AnimatePresence mode="wait">
      {status === 'present' ? (
        <motion.button key="present" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} disabled
          className={`flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl font-black text-sm cursor-default shadow-inner ${className}`}
        >
          {/* 2. حالة "تم الحضور" (الأخضر) */}
          <CheckCircle2 className="w-4 h-4" /> تم إثبات الحضور
        </motion.button>
      ) : status === 'ended' ? (
        <motion.button key="ended" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} disabled
          className={`flex items-center justify-center gap-2 bg-rose-50 text-rose-500 border border-rose-100 px-4 py-2 rounded-xl font-bold text-sm cursor-not-allowed ${className}`}
        >
          {/* 3. حالة "انتهى الوقت" (الأحمر) */}
          <Lock className="w-4 h-4" /> انتهى وقت الحصة
        </motion.button>
      ) : status === 'not_started' ? (
        <motion.button key="not_started" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} disabled
          className={`flex items-center justify-center gap-2 bg-slate-50 text-slate-500 border border-slate-200 px-4 py-2 rounded-xl font-bold text-sm cursor-not-allowed ${className}`}
        >
          {/* 4. حالة "لم يبدأ الوقت" (الرمادي) */}
          <Clock className="w-4 h-4" /> لم يحن وقت الحصة
        </motion.button>
      ) : (
        <motion.button key="allowed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
          onClick={handleCheckIn} disabled={isSubmitting}
          className={`flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all ${className}`}
        >
          {/* 5. حالة "مسموح بالبصمة" (النيلي التفاعلي) */}
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4 animate-pulse" />}
          {isSubmitting ? 'جاري التسجيل...' : 'إثبات حضوري للحصة'}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
