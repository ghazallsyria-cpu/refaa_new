'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Fingerprint, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion'; // تأكد من وجود مكتبة framer-motion

interface TeacherCheckInButtonProps {
  teacherId: string; // معرف المعلم (User ID)
  periodNumber: number; // رقم الحصة (1, 2, 3...)
  className?: string; // لتخصيص الستايل من الخارج
}

export default function TeacherCheckInButton({ teacherId, periodNumber, className = '' }: TeacherCheckInButtonProps) {
  const [status, setStatus] = useState<'loading' | 'pending' | 'present'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // فحص حالة الحضور عند تحميل الزر
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('teacher_attendance_records')
          .select('id')
          .eq('teacher_id', teacherId)
          .eq('date', todayStr)
          .eq('period_number', periodNumber)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setStatus('present'); // سجل حضوره مسبقاً
        } else {
          setStatus('pending'); // لم يسجل بعد
        }
      } catch (error) {
        console.error('Error checking attendance status:', error);
        setStatus('pending');
      }
    };

    if (teacherId && periodNumber) {
      checkStatus();
    }
  }, [teacherId, periodNumber]);

  // دالة إثبات الحضور عند الضغط
  const handleCheckIn = async () => {
    if (status === 'present' || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('teacher_attendance_records')
        .insert([
          {
            teacher_id: teacherId,
            date: todayStr,
            period_number: periodNumber,
            status: 'present'
          }
        ]);

      if (error) throw error;
      
      setStatus('present'); // تحويل الزر للأخضر بنجاح!
      
    } catch (error) {
      console.error('Error recording check-in:', error);
      alert('حدث خطأ أثناء إثبات الحضور، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <button disabled className={`flex items-center gap-2 bg-slate-100 text-slate-400 px-4 py-2 rounded-xl font-bold text-sm cursor-not-allowed ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        جاري الفحص...
      </button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {status === 'present' ? (
        <motion.button
          key="present"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          disabled
          className={`flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl font-black text-sm cursor-default shadow-inner ${className}`}
        >
          <CheckCircle2 className="w-4 h-4" />
          تم إثبات الحضور
        </motion.button>
      ) : (
        <motion.button
          key="pending"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCheckIn}
          disabled={isSubmitting}
          className={`flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all ${className}`}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Fingerprint className="w-4 h-4 animate-pulse" />
          )}
          {isSubmitting ? 'جاري التسجيل...' : 'إثبات حضوري للحصة'}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
