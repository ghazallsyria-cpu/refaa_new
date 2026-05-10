// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, UserCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

// 🚀 المكون الجديد: مقياس المشاعر الواضح جداً للطلاب
const EmojiRating = ({ rating, setRating, label }) => {
  const options = [
    { val: 1, emoji: '😡', text: 'سيء جداً', activeColor: 'bg-rose-500/20 border-rose-500 text-rose-500', defaultColor: 'border-white/5 text-slate-500 hover:bg-white/5' },
    { val: 2, emoji: '🙁', text: 'ضعيف', activeColor: 'bg-orange-500/20 border-orange-500 text-orange-500', defaultColor: 'border-white/5 text-slate-500 hover:bg-white/5' },
    { val: 3, emoji: '😐', text: 'عادي', activeColor: 'bg-amber-500/20 border-amber-500 text-amber-500', defaultColor: 'border-white/5 text-slate-500 hover:bg-white/5' },
    { val: 4, emoji: '🙂', text: 'جيد جداً', activeColor: 'bg-blue-500/20 border-blue-500 text-blue-400', defaultColor: 'border-white/5 text-slate-500 hover:bg-white/5' },
    { val: 5, emoji: '😍', text: 'ممتاز', activeColor: 'bg-emerald-500/20 border-emerald-500 text-emerald-400', defaultColor: 'border-white/5 text-slate-500 hover:bg-white/5' },
  ];

  return (
    <div className="flex flex-col gap-3 w-full mb-6">
      <label className="text-sm font-black text-white text-center">{label}</label>
      <div className="flex justify-between items-center w-full gap-1 sm:gap-2" dir="ltr">
        {options.map((opt) => {
          const isSelected = rating === opt.val;
          return (
            <button
              key={opt.val}
              onClick={() => setRating(opt.val)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 active:scale-95",
                isSelected ? opt.activeColor + " shadow-lg scale-105" : opt.defaultColor
              )}
            >
              <span className={cn("text-2xl sm:text-3xl mb-1 sm:mb-2 transition-transform", isSelected ? "scale-110" : "grayscale opacity-50")}>{opt.emoji}</span>
              <span className={cn("text-[9px] sm:text-[10px] font-black whitespace-nowrap", isSelected ? "" : "opacity-0 sm:opacity-50")}>{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function StudentEvaluationGate({ studentId, sectionId }) {
  const [pendingEvaluations, setPendingEvaluations] = useState([]);
  const [currentEvalIndex, setCurrentEvalIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // حالات النظام الديناميكي
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
      const { data: settings } = await supabase.from('platform_settings').select('evaluations_middle_active, evaluations_high_active, evaluation_criteria').limit(1).maybeSingle();
      if (!settings) return;

      const { data: sectionData } = await supabase.from('sections').select('classes(name)').eq('id', sectionId).maybeSingle();
      const className = Array.isArray(sectionData?.classes) ? sectionData.classes[0]?.name : sectionData?.classes?.name || '';
      const isMiddle = /(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(className);
      
      if (isMiddle && !settings.evaluations_middle_active) return;
      if (!isMiddle && !settings.evaluations_high_active) return;

      let activeCriteria = ["المحور العلمي", "المحور الإداري", "المحور الإنساني"];
      if (settings.evaluation_criteria) {
          activeCriteria = Array.isArray(settings.evaluation_criteria) ? settings.evaluation_criteria : JSON.parse(settings.evaluation_criteria);
      }
      setCriteria(activeCriteria);
      
      const initialRatings = {};
      activeCriteria.forEach(c => initialRatings[c] = 0);
      setDynamicRatings(initialRatings);

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
    const isComplete = criteria.every(c => dynamicRatings[c] > 0);
    if (!isComplete) { alert('يرجى تقييم جميع البنود للمتابعة!'); return; }
    
    setIsSubmitting(true);
    try {
      const teacher = pendingEvaluations[currentEvalIndex];
      const { error } = await supabase.from('student_evaluations_of_teachers').insert([{
        student_id: studentId,
        teacher_id: teacher.id,
        subject_name: teacher.subject,
        dynamic_ratings: dynamicRatings, 
        feedback: feedback,
        academic_year: '2025-2026',
        semester: 'الفصل الدراسي الثاني'
      }]);

      if (error && !error.message.includes('duplicate key')) throw error;

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
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#131836] border border-indigo-500/30 rounded-[2.5rem] p-4 sm:p-8 shadow-2xl relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none rounded-full"></div>

            <div className="flex flex-col items-center text-center mb-6 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-black text-white font-cairo mb-1">تقييم المعلمين</h2>
              <p className="text-xs sm:text-sm font-bold text-indigo-300 font-cairo">أعطنا رأيك بصراحة، تقييمك سري ولن يعرفه المعلم.</p>
            </div>

            <div className="bg-[#0a0d1a]/50 p-4 sm:p-6 rounded-3xl border border-white/5 font-cairo relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-6 pb-6 border-b border-white/5">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-800 rounded-full border-2 border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                  {pendingEvaluations[currentEvalIndex]?.avatar ? <img src={pendingEvaluations[currentEvalIndex].avatar} className="w-full h-full object-cover" /> : <UserCircle className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500"/>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-400">تقييم الأستاذ:</p>
                  <p className="text-lg sm:text-xl font-black text-white">{pendingEvaluations[currentEvalIndex]?.name}</p>
                  <p className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5">مادة: {pendingEvaluations[currentEvalIndex]?.subject}</p>
                </div>
                <div className="mr-auto bg-indigo-600 px-3 py-1 rounded-xl shadow-inner text-white font-black flex items-center justify-center shrink-0">
                  {currentEvalIndex + 1} / {pendingEvaluations.length}
                </div>
              </div>

              <div className="space-y-4">
                {criteria.map((criterion, idx) => (
                   <EmojiRating 
                      key={idx} 
                      rating={dynamicRatings[criterion]} 
                      setRating={(r) => handleRatingChange(criterion, r)} 
                      label={criterion} 
                   />
                ))}
                
                <div className="pt-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">رسالة سرية للإدارة (اختياري)</label>
                    <textarea 
                        value={feedback} onChange={(e) => setFeedback(e.target.value)} 
                        placeholder="هل لديك ملاحظة إضافية؟ اكتبها هنا بصدق..." 
                        className="w-full bg-[#02040a] border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50 h-24 resize-none custom-scrollbar shadow-inner" 
                    />
                </div>
              </div>

              <button onClick={handleSubmit} disabled={isSubmitting} className="w-full mt-6 py-4 sm:py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 text-sm sm:text-base">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5" /> إرسال واعتماد التقييم</>}
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
