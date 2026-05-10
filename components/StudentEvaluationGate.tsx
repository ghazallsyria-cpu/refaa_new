// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, Loader2, UserCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

const StarRating = ({ rating, setRating, label }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">{label}</label>
    <div className="flex gap-2" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          onClick={() => setRating(star)} 
          className={`w-8 h-8 cursor-pointer transition-all hover:scale-110 ${star <= rating ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" : "fill-slate-800 text-slate-700 hover:text-amber-400/50"}`} 
        />
      ))}
    </div>
  </div>
);

export default function StudentEvaluationGate({ studentId, sectionId }) {
  const [pendingEvaluations, setPendingEvaluations] = useState([]);
  const [currentEvalIndex, setCurrentEvalIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🚀 حالات النظام الديناميكي
  const [criteria, setCriteria] = useState([]);
  const [dynamicRatings, setDynamicRatings] = useState({});
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (studentId && sectionId) {
      checkEvaluations();
    }
  }, [studentId, sectionId]);

  const checkEvaluations = async () => {
    try {
      // 1. جلب إعدادات المنصة (البنود ومفاتيح التشغيل)
      const { data: settings } = await supabase.from('platform_settings').select('evaluations_middle_active, evaluations_high_active, evaluation_criteria').limit(1).maybeSingle();
      if (!settings) return;

      // 2. معرفة مرحلة الطالب من خلال الـ sectionId
      const { data: sectionData } = await supabase.from('sections').select('classes(name)').eq('id', sectionId).maybeSingle();
      const className = Array.isArray(sectionData?.classes) ? sectionData.classes[0]?.name : sectionData?.classes?.name || '';
      const isMiddle = /(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(className);
      
      // 🚀 التحقق من مفتاح الإدارة المخصص لمرحلة الطالب
      if (isMiddle && !settings.evaluations_middle_active) return;
      if (!isMiddle && !settings.evaluations_high_active) return;

      // 3. تجهيز البنود الديناميكية
      const activeCriteria = settings.evaluation_criteria || ["المحور العلمي", "المحور الإداري", "المحور الإنساني"];
      setCriteria(activeCriteria);
      
      // تصفير التقييمات للبنود المحملة
      const initialRatings = {};
      activeCriteria.forEach(c => initialRatings[c] = 0);
      setDynamicRatings(initialRatings);

      // 4. جلب معلمي الطالب
      let allTeachersRaw = [];
      const [ { data: autoData }, { data: schedData }, { data: assignData } ] = await Promise.all([
          supabase.from('auto_schedules').select('teacher_id, teachers(users(full_name, avatar_url)), subjects(name)').eq('section_id', sectionId).limit(100),
          supabase.from('schedules').select('teacher_id, teachers(users(full_name, avatar_url)), subjects(name)').eq('section_id', sectionId).limit(100),
          supabase.from('teacher_assignments').select('teacher_id, teachers(users(full_name, avatar_url)), subjects(name)').eq('section_id', sectionId).limit(100)
      ]);

      allTeachersRaw = [...(autoData || []), ...(schedData || []), ...(assignData || [])];
      if (!allTeachersRaw || allTeachersRaw.length === 0) return;

      const uniqueTeachers = [];
      const map = new Map();
      for (const item of allTeachersRaw) {
        if (item.teacher_id && !map.has(item.teacher_id)) {
          map.set(item.teacher_id, true);
          const u = Array.isArray(item.teachers?.users) ? item.teachers.users[0] : item.teachers?.users;
          uniqueTeachers.push({
            id: item.teacher_id,
            name: u?.full_name || 'معلم',
            avatar: u?.avatar_url,
            subject: Array.isArray(item.subjects) ? item.subjects[0]?.name : item.subjects?.name || 'مادة'
          });
        }
      }

      // 5. فلترة من تم تقييمهم
      const { data: myEvals } = await supabase.from('student_evaluations_of_teachers').select('teacher_id').eq('student_id', studentId);
      const evaluatedIds = new Set((myEvals || []).map(e => e.teacher_id));
      const pending = uniqueTeachers.filter(t => !evaluatedIds.has(t.id));

      if (pending.length > 0) {
        setPendingEvaluations(pending);
        setIsOpen(true);
      }
    } catch (e) { console.error("Eval Gate Error:", e); }
  };

  const handleRatingChange = (criterion, value) => {
    setDynamicRatings(prev => ({ ...prev, [criterion]: value }));
  };

  const handleSubmit = async () => {
    // التأكد من تقييم جميع البنود
    const isComplete = criteria.every(c => dynamicRatings[c] > 0);
    if (!isComplete) { alert('يرجى تقييم جميع البنود للمتابعة!'); return; }
    
    setIsSubmitting(true);
    try {
      const teacher = pendingEvaluations[currentEvalIndex];
      const { error } = await supabase.from('student_evaluations_of_teachers').insert([{
        student_id: studentId,
        teacher_id: teacher.id,
        subject_name: teacher.subject,
        dynamic_ratings: dynamicRatings, // 🚀 إرسال التقييمات كـ JSON
        feedback: feedback,
        academic_year: '2025-2026',
        semester: 'الفصل الدراسي الثاني'
      }]);

      if (error && !error.message.includes('duplicate key')) throw error;

      // تصفير القيم للمعلم التالي
      const resetRatings = {};
      criteria.forEach(c => resetRatings[c] = 0);
      setDynamicRatings(resetRatings);
      setFeedback('');

      if (currentEvalIndex + 1 < pendingEvaluations.length) {
        setCurrentEvalIndex(prev => prev + 1);
      } else {
        setIsOpen(false);
        alert('شكراً لك! مساهمتك ستساعدنا في تطوير العملية التعليمية.');
      }
    } catch (e) { alert('خطأ في الإرسال'); } 
    finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/98 backdrop-blur-xl z-[9999]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar z-[9999] outline-none" dir="rtl">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#131836] border border-amber-500/50 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] pointer-events-none rounded-full"></div>

            <div className="flex flex-col items-center text-center mb-6 relative z-10">
              <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/30"><Star className="w-8 h-8 text-amber-400" /></div>
              <h2 className="text-2xl font-black text-white font-cairo">تقييم جودة التدريس</h2>
              <p className="text-xs font-bold text-amber-200/80 mt-2 font-cairo">التقييم سري تماماً ولن تظهر هويتك للمعلم.</p>
            </div>

            <div className="bg-[#0a0d1a]/50 p-5 sm:p-6 rounded-3xl border border-white/5 font-cairo relative z-10">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                <div className="w-12 h-12 bg-slate-800 rounded-full border-2 border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                  {pendingEvaluations[currentEvalIndex]?.avatar ? <img src={pendingEvaluations[currentEvalIndex].avatar} className="w-full h-full object-cover" /> : <UserCircle className="w-8 h-8 text-slate-500"/>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{pendingEvaluations[currentEvalIndex]?.name}</p>
                  <p className="text-xs font-bold text-amber-400">مادة: {pendingEvaluations[currentEvalIndex]?.subject}</p>
                </div>
                <div className="mr-auto bg-slate-900 px-3 py-1 rounded-lg border border-white/10 text-[10px] text-slate-400 font-black">
                  {currentEvalIndex + 1} / {pendingEvaluations.length}
                </div>
              </div>

              <div className="space-y-5">
                {/* 🚀 توليد البنود ديناميكياً من الإدارة */}
                {criteria.map((criterion, idx) => (
                   <StarRating 
                      key={idx} 
                      rating={dynamicRatings[criterion]} 
                      setRating={(r) => handleRatingChange(criterion, r)} 
                      label={criterion} 
                   />
                ))}
                
                <div className="space-y-2 pt-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">رسالة سرية للإدارة (اختياري)</label>
                    <textarea 
                        value={feedback} onChange={(e) => setFeedback(e.target.value)} 
                        placeholder="اكتب رأيك بصدق هنا..." 
                        className="w-full bg-[#02040a] border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-amber-500/50 h-20 resize-none custom-scrollbar" 
                    />
                </div>
              </div>

              <button onClick={handleSubmit} disabled={isSubmitting} className="w-full mt-6 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5" /> إرسال والتقييم التالي</>}
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
