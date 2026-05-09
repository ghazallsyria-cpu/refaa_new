// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Loader2, Save, FileSignature, CheckCircle2, UserCog, BookOpen, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function DigitalCover() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorizedHOD, setIsAuthorizedHOD] = useState(false);
  
  const [timetables, setTimetables] = useState<any[]>([]);
  // 🚀 نحفظ جميع التخصصات لمعلمي المدرسة لفلترتها لاحقاً
  const [allTeacherSubjects, setAllTeacherSubjects] = useState<any[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [roles, setRoles] = useState<any[]>([]);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return;
      setIsLoading(true);

      try {
        // 1. 🛡️ التحقق من الصلاحيات: هل هو مدير أم رئيس قسم؟
        let authorized = false;
        if (['admin', 'management'].includes(currentRole)) {
          authorized = true;
        } else if (currentRole === 'teacher') {
          // فحص هل المعلم رئيس قسم (HOD)
          const { data: hodData } = await supabase.from('department_heads').select('id').eq('teacher_id', user.id).maybeSingle();
          if (hodData) authorized = true;
        }

        setIsAuthorizedHOD(authorized);

        if (authorized) {
          // 2. جلب جداول الامتحانات
          const { data: exams } = await supabase
            .from('exam_timetables')
            .select('*, subjects(name)')
            .eq('academic_year', currentYear)
            .eq('semester', currentSemester)
            .order('exam_date');
            
          // 3. 🚀 جلب المعلمين مع موادهم للفلترة الذكية
          const { data: tSubj } = await supabase
            .from('teacher_subjects')
            .select('teacher_id, subject_id, teachers(users(full_name))');

          setTimetables(exams || []);
          setAllTeacherSubjects(tSubj || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [user?.id, currentRole]);

  // 🚀 استخراج المادة المحددة لجلب معلميها فقط
  const selectedSubjectId = useMemo(() => {
    if (!selectedExamId) return null;
    return timetables.find(t => t.id === selectedExamId)?.subject_id || null;
  }, [selectedExamId, timetables]);

  // 🚀 فلترة المعلمين ليعرض فقط من يدرسون المادة المحددة في الاختبار
  const filteredTeachers = useMemo(() => {
    if (!selectedSubjectId) return [];
    
    const teachersOfSubject = allTeacherSubjects.filter(ts => ts.subject_id === selectedSubjectId);
    
    // إزالة التكرار إن وجد
    const uniqueTeachers = new Map();
    teachersOfSubject.forEach(ts => {
      const name = ts.teachers?.users?.full_name || ts.teachers?.users?.[0]?.full_name;
      if (name && !uniqueTeachers.has(ts.teacher_id)) {
        uniqueTeachers.set(ts.teacher_id, { id: ts.teacher_id, name: name });
      }
    });
    
    return Array.from(uniqueTeachers.values());
  }, [selectedSubjectId, allTeacherSubjects]);


  // تحديث عدد الأسئلة وجلب البيانات القديمة إن وجدت
  useEffect(() => {
    if (!selectedExamId) {
      setRoles([]);
      return;
    }

    const fetchExisting = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('exam_grading_roles').select('*').eq('timetable_id', selectedExamId).order('question_number');
      if (data && data.length > 0) {
        setRoles(data);
        setNumQuestions(data.length);
      } else {
        // تهيئة مصفوفة جديدة فارغة
        const newRoles = Array.from({ length: numQuestions }, (_, i) => ({
          question_number: i + 1, grader_id: '', reviewer_id: ''
        }));
        setRoles(newRoles);
      }
      setIsLoading(false);
    };
    fetchExisting();
  }, [selectedExamId]);

  // تغيير عدد الأسئلة يدوياً
  const handleNumQuestionsChange = (newNum: number) => {
    const num = Math.min(20, Math.max(1, newNum));
    setNumQuestions(num);
    
    setRoles(prevRoles => {
      const newRoles = [...prevRoles];
      if (num > newRoles.length) {
        // إضافة أسئلة جديدة
        for (let i = newRoles.length; i < num; i++) {
          newRoles.push({ question_number: i + 1, grader_id: '', reviewer_id: '' });
        }
      } else if (num < newRoles.length) {
        // إزالة الأسئلة الزائدة
        newRoles.length = num;
      }
      return newRoles;
    });
  };

  const handleRoleChange = (index: number, field: 'grader_id' | 'reviewer_id', value: string) => {
    const newRoles = [...roles];
    newRoles[index][field] = value;
    
    // 🛡️ حماية منطقية: لا يمكن للمصحح أن يكون هو نفسه المراجع لنفس السؤال!
    if (field === 'grader_id' && newRoles[index].reviewer_id === value && value !== '') {
      alert('تنبيه: لا يمكن تعيين نفس المعلم كمصحح ومراجع لنفس السؤال لضمان جودة التدقيق!');
      newRoles[index].reviewer_id = '';
    }
    if (field === 'reviewer_id' && newRoles[index].grader_id === value && value !== '') {
      alert('تنبيه: لا يمكن تعيين نفس المعلم كمصحح ومراجع لنفس السؤال لضمان جودة التدقيق!');
      newRoles[index].grader_id = '';
    }

    setRoles(newRoles);
  };

  const handleSave = async () => {
    if (!selectedExamId || !user?.id) return;

    // التأكد من تعبئة جميع الحقول
    const isIncomplete = roles.some(r => !r.grader_id || !r.reviewer_id);
    if (isIncomplete) {
      if(!confirm('هناك أسئلة لم يتم تعيين مصححين أو مراجعين لها. هل أنت متأكد من الحفظ بشكل جزئي؟')) return;
    }

    setIsSaving(true);
    try {
      // حذف التوزيع القديم لهذا الاختبار لمنع التكرار والتضارب
      await supabase.from('exam_grading_roles').delete().eq('timetable_id', selectedExamId);

      // إدخال التوزيع الجديد
      const payload = roles.map(r => ({
        timetable_id: selectedExamId,
        question_number: r.question_number,
        grader_id: r.grader_id || null,
        reviewer_id: r.reviewer_id || null,
        assigned_by: user.id
      }));

      const { error } = await supabase.from('exam_grading_roles').insert(payload);
      if (error) throw error;
      
      alert('تم حفظ الغلاف الرقمي وتوثيقه بنجاح! الوثيقة الآن معتمدة للكنترول.');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء الحفظ.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !isAuthorizedHOD) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;
  }

  // 🛑 صد أي شخص ليس مديراً أو رئيس قسم
  if (!isAuthorizedHOD) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-cairo" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-12 h-12 text-rose-500" /></div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">منطقة محظورة! 🛑</h1>
          <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">هذه الصفحة مخصصة لمدير النظام ورؤساء الأقسام (HOD) فقط لتوزيع مهام التصحيح.</p>
          <button onClick={() => router.back()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-md active:scale-95">العودة للخلف</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-cairo pb-32" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-indigo-50/50 pointer-events-none">
             <FileSignature className="w-64 h-64" />
          </div>

          <div className="relative z-10 flex items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-inner shrink-0"><FileSignature className="w-8 h-8" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">الغلاف الرقمي للاختبارات</h1>
              <p className="text-slate-500 font-bold text-xs sm:text-sm mt-1 leading-relaxed">توزيع مهام التصحيح والمراجعة على أسئلة الاختبار كوثيقة رسمية معتمدة للكنترول.</p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500"/> 1. اختر المادة الامتحانية</label>
              <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-4 font-black text-slate-800 focus:border-indigo-500 outline-none shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
                <option value="">-- اضغط لاختيار المادة --</option>
                {timetables.map(t => <option key={t.id} value={t.id}>{t.subjects?.name} - الصف {t.class_level}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500"/> 2. حدد عدد الأسئلة</label>
              <input type="number" min="1" max="20" disabled={!selectedExamId} value={numQuestions} onChange={(e) => handleNumQuestionsChange(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl p-4 font-black text-slate-800 focus:border-indigo-500 outline-none shadow-sm disabled:opacity-50 disabled:bg-slate-100" />
            </div>
          </div>

          {selectedExamId && (
            <div className="relative z-10 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              
              {filteredTeachers.length === 0 ? (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <p className="font-bold text-sm">تنبيه: لا يوجد معلمين مسجلين في النظام يدرسون هذه المادة! يرجى إضافة التخصصات للمعلمين أولاً من شاشة الكادر.</p>
                </div>
              ) : (
                <>
                  <div className="bg-indigo-900 rounded-xl p-4 flex justify-between items-center font-black text-white shadow-md">
                    <span className="w-16 sm:w-20 text-center text-xs sm:text-sm">السؤال</span>
                    <span className="flex-1 text-center text-xs sm:text-sm flex items-center justify-center gap-2"><UserCog className="w-4 h-4 text-emerald-400"/> المعلم المصحح</span>
                    <span className="flex-1 text-center text-xs sm:text-sm flex items-center justify-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-400"/> المعلم المراجع</span>
                  </div>
                  
                  {isLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
                  ) : (
                    <div className="space-y-3">
                      {roles.map((role, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center p-3 sm:p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-all hover:shadow-md">
                          <div className="w-full sm:w-16 h-10 sm:h-14 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl flex items-center justify-center font-black text-lg shrink-0">
                            {role.question_number}
                          </div>
                          
                          <div className="flex-1 w-full">
                            <select value={role.grader_id} onChange={(e) => handleRoleChange(idx, 'grader_id', e.target.value)} className="w-full bg-emerald-50/30 border border-slate-200 rounded-xl p-3 sm:p-4 font-bold text-slate-800 outline-none focus:border-emerald-500 hover:border-emerald-300 transition-colors">
                              <option value="" className="text-slate-400">- اختر المصحح -</option>
                              {filteredTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>

                          <div className="flex-1 w-full">
                            <select value={role.reviewer_id} onChange={(e) => handleRoleChange(idx, 'reviewer_id', e.target.value)} className="w-full bg-amber-50/30 border border-slate-200 rounded-xl p-3 sm:p-4 font-bold text-slate-800 outline-none focus:border-amber-500 hover:border-amber-300 transition-colors">
                              <option value="" className="text-slate-400">- اختر المراجع -</option>
                              {filteredTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={handleSave} disabled={isSaving || isLoading} className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 sm:py-5 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6 text-emerald-400" /> اعتماد وتوثيق الغلاف الرقمي</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
