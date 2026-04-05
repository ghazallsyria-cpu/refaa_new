'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Fingerprint, CheckCircle2, Loader2, Lock, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface TeacherCheckInButtonProps {
  teacherId: string;
  periodNumber: number;
  selectedDate: string; // 👈 التحديث الجديد: نأخذ التاريخ الذي حدده المعلم في الشاشة
  className?: string;
}

export default function TeacherCheckInButton({ teacherId, periodNumber, selectedDate, className = '' }: TeacherCheckInButtonProps) {
  const [status, setStatus] = useState<'loading' | 'present' | 'allowed' | 'ended' | 'not_started'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkStatusAndTime = async () => {
      if (!teacherId || !periodNumber || !selectedDate) return;
      setStatus('loading');
      
      try {
        // 1. هل سجل حضوره مسبقاً في هذا اليوم وهذه الحصة؟
        const { data: attendanceData } = await supabase
          .from('teacher_attendance_records')
          .select('id')
          .eq('teacher_id', teacherId)
          .eq('date', selectedDate)
          .eq('period_number', periodNumber)
          .maybeSingle();

        if (attendanceData) {
          setStatus('present'); // حاضر مسبقاً
          return;
        }

        // 2. إذا لم يكن حاضراً، نتحقق من المنطق الزمني (Time Logic)
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // هل اختار يوماً في الماضي؟
        if (selectedDate < todayStr) {
          setStatus('ended');
          return;
        }
        // هل اختار يوماً في المستقبل؟
        if (selectedDate > todayStr) {
          setStatus('not_started');
          return;
        }

        // إذا كان اليوم هو نفس اليوم الحالي، نجلب وقت الحصة من القاعدة
        const { data: periodData } = await supabase
          .from('class_periods')
          .select('start_time, end_time')
          .eq('period_number', periodNumber)
          .maybeSingle();

        if (periodData && periodData.end_time && periodData.start_time) {
          const [endH, endM] = periodData.end_time.split(':').map(Number);
          const [startH, startM] = periodData.start_time.split(':').map(Number);
          
          const endMinutes = endH * 60 + endM;
          const startMinutes = startH * 60 + startM;

          // السماح بالتحضير قبل الحصة بـ 10 دقائق وحتى نهايتها
          if (currentMinutes > endMinutes) {
            setStatus('ended'); // الحصة انتهت
          } else if (currentMinutes < (startMinutes - 10)) {
            setStatus('not_started'); // لم تبدأ بعد
          } else {
            setStatus('allowed'); // في الوقت المسموح ✅
          }
        } else {
          // في حال لم يجد وقت مسجل للحصة، نسمح كإجراء افتراضي
          setStatus('allowed');
        }

      } catch (error) {
        console.error('Error checking status:', error);
        setStatus('allowed'); // fallback
      }
    };

    checkStatusAndTime();
  }, [teacherId, periodNumber, selectedDate]);

  const handleCheckIn = async () => {
    if (status !== 'allowed' || isSubmitting) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const { error } = await supabase
        .from('teacher_attendance_records')
        .insert([
          {
            teacher_id: teacherId,
            date: selectedDate,
            period_number: periodNumber,
            status: 'present'
          }
        ]);

      if (error) {
        setErrorMessage(error.message);
        throw error;
      }
      
      setStatus('present');
      
    } catch (error: any) {
      console.error('Check-in error:', error);
      alert(`خطأ في التسجيل: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <button disabled className={`flex items-center gap-2 bg-slate-100 text-slate-400 px-4 py-2 rounded-xl font-bold text-sm cursor-not-allowed ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" /> يفحص الوقت...
      </button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {status === 'present' ? (
        <motion.button key="present" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} disabled
          className={`flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl font-black text-sm cursor-default shadow-inner ${className}`}
        >
          <CheckCircle2 className="w-4 h-4" /> تم إثبات الحضور
        </motion.button>
      ) : status === 'ended' ? (
        <motion.button key="ended" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} disabled
          className={`flex items-center justify-center gap-2 bg-rose-50 text-rose-500 border border-rose-100 px-4 py-2 rounded-xl font-bold text-sm cursor-not-allowed ${className}`}
        >
          <Lock className="w-4 h-4" /> انتهى وقت الحصة
        </motion.button>
      ) : status === 'not_started' ? (
        <motion.button key="not_started" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} disabled
          className={`flex items-center justify-center gap-2 bg-slate-50 text-slate-500 border border-slate-200 px-4 py-2 rounded-xl font-bold text-sm cursor-not-allowed ${className}`}
        >
          <Clock className="w-4 h-4" /> لم يحن وقت الحصة
        </motion.button>
      ) : (
        <motion.button key="allowed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
          onClick={handleCheckIn} disabled={isSubmitting}
          className={`flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all ${className}`}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4 animate-pulse" />}
          {isSubmitting ? 'جاري التسجيل...' : 'إثبات حضوري للحصة'}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
