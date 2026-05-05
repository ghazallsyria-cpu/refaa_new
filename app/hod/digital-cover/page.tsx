// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, Save, FileSignature, CheckCircle2, UserCog, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export default function DigitalCover() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [timetables, setTimetables] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [roles, setRoles] = useState<any[]>([]);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: exams } = await supabase
          .from('exam_timetables')
          .select('*, subjects(name)')
          .eq('academic_year', currentYear)
          .eq('semester', currentSemester)
          .order('exam_date');
          
        const { data: tchrs } = await supabase
          .from('teachers')
          .select('id, users(full_name)');

        setTimetables(exams || []);
        setTeachers((tchrs || []).map(t => ({ id: t.id, name: t.users?.full_name || 'معلم' })));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // تحديث عدد الأسئلة
  useEffect(() => {
    if (!selectedExamId) return;
    const fetchExisting = async () => {
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
    };
    fetchExisting();
  }, [selectedExamId, numQuestions]);

  const handleRoleChange = (index: number, field: 'grader_id' | 'reviewer_id', value: string) => {
    const newRoles = [...roles];
    newRoles[index][field] = value;
    setRoles(newRoles);
  };

  const handleSave = async () => {
    if (!selectedExamId || !user?.id) return;
    setIsSaving(true);
    try {
      const payload = roles.map(r => ({
        timetable_id: selectedExamId,
        question_number: r.question_number,
        grader_id: r.grader_id || null,
        reviewer_id: r.reviewer_id || null,
        assigned_by: user.id
      }));

      const { error } = await supabase.from('exam_grading_roles').upsert(payload, { onConflict: 'timetable_id, question_number' });
      if (error) throw error;
      alert('تم حفظ الغلاف الرقمي وتوثيقه بنجاح!');
    } catch (error) {
      alert('حدث خطأ أثناء الحفظ.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!['admin', 'management', 'teacher'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-cairo" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><FileSignature className="w-8 h-8" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">الغلاف الرقمي للاختبارات</h1>
              <p className="text-slate-500 font-bold text-sm mt-1">توزيع مهام التصحيح والمراجعة على أسئلة الاختبار كوثيقة رسمية.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">اختر المادة الامتحانية</label>
              <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-800 focus:border-indigo-500 outline-none">
                <option value="">-- يرجى اختيار المادة --</option>
                {timetables.map(t => <option key={t.id} value={t.id}>{t.subjects?.name} - الصف {t.class_level}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">عدد أسئلة الاختبار</label>
              <input type="number" min="1" max="20" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-black text-slate-800 focus:border-indigo-500 outline-none" />
            </div>
          </div>

          {selectedExamId && (
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center font-black text-indigo-900">
                <span className="w-16 text-center">السؤال</span>
                <span className="flex-1 text-center">المعلم المصحح</span>
                <span className="flex-1 text-center">المعلم المراجع</span>
              </div>
              
              {roles.map((role, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-4 items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-all">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg shrink-0">
                    {role.question_number}
                  </div>
                  
                  <div className="flex-1 w-full">
                    <select value={role.grader_id} onChange={(e) => handleRoleChange(idx, 'grader_id', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-emerald-500">
                      <option value="">- اختر المصحح -</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="flex-1 w-full">
                    <select value={role.reviewer_id} onChange={(e) => handleRoleChange(idx, 'reviewer_id', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-amber-500">
                      <option value="">- اختر المراجع -</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              ))}

              <button onClick={handleSave} disabled={isSaving} className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> اعتماد وحفظ الغلاف الرقمي</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
