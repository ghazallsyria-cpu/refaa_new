// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Users, Target, CheckCircle2, XCircle, 
  MessageSquareHeart, Send, X, Sparkles, Activity, Loader2, Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function ArenaMonitorDashboard() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [studentsProgress, setStudentsProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'management' && currentRole !== 'teacher') return;

    const fetchAssignments = async () => {
      try {
        let actualTeacherId = null;
        if (currentRole === 'teacher' && user?.id) {
          const { data: tByUserId } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
          if (tByUserId?.id) {
            actualTeacherId = tByUserId.id;
          } else {
             const { data: tById } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
             if (tById?.id) actualTeacherId = tById.id;
          }
        }

        let query = supabase.from('assignments_v2')
          .select('id, title, is_practice_mode, created_at, teacher_id')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (currentRole === 'teacher') {
          if (actualTeacherId) {
            query = query.eq('teacher_id', actualTeacherId);
          } else {
             query = query.eq('teacher_id', user.id); 
          }
        }

        const { data: assignmentsData, error: assignErr } = await query;
        if (assignErr) throw assignErr;

        if (!assignmentsData || assignmentsData.length === 0) {
           setAssignments([]);
           setLoading(false);
           return;
        }

        const assignmentIds = assignmentsData.map(a => a.id);
        const { data: questionsData } = await supabase
          .from('assignment_questions_v2')
          .select('id, assignment_id')
          .in('assignment_id', assignmentIds);

        const formatted = assignmentsData.map(d => {
          const qCount = (questionsData || []).filter(q => q.assignment_id === d.id).length;
          return {
            ...d,
            total_questions: qCount > 0 ? qCount : 1 
          };
        });
        
        setAssignments(formatted);
      } catch (err) { 
        console.error("Error fetching assignments for monitor:", err); 
      } finally { 
        setLoading(false); 
      }
    };

    fetchAssignments();
  }, [user?.id, currentRole]);

  const fetchProgress = async (assignment: any) => {
    setRefreshing(true);
    setSelectedAssignment(assignment);
    
    try {
      let sectionIds: string[] = [];
      const { data: v2Secs } = await supabase.from('assignment_sections_v2').select('section_id').eq('assignment_id', assignment.id);
      
      if (v2Secs && v2Secs.length > 0) {
        sectionIds = v2Secs.map(s => s.section_id);
      } else {
        const { data: v1Secs } = await supabase.from('assignment_sections').select('section_id').eq('assignment_id', assignment.id);
        if (v1Secs && v1Secs.length > 0) sectionIds = v1Secs.map(s => s.section_id);
      }

      if (sectionIds.length === 0 && assignment.teacher_id) {
         const { data: tSecs } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', assignment.teacher_id);
         if (tSecs) sectionIds = tSecs.map(ts => ts.section_id);
      }

      let targetStudents: any[] = [];
      if (sectionIds.length > 0) {
        const { data: stData } = await supabase.from('students').select('id, user_id, section_id').in('section_id', sectionIds);
        targetStudents = stData || [];
      }

      const { data: progData } = await supabase.from('student_progress_v2').select('*').eq('assignment_id', assignment.id);
      const progressRecords = progData || [];

      if (targetStudents.length === 0 && progressRecords.length > 0) {
         const pStuIds = progressRecords.map(p => p.student_id);
         const { data: missingSt } = await supabase.from('students').select('id, user_id').in('id', pStuIds);
         targetStudents = missingSt || progressRecords.map(p => ({ id: p.student_id, user_id: p.student_id }));
      }

      let usersData: any[] = [];
      const userIdsToFetch = [...new Set(targetStudents.map(s => s.user_id || s.id))].filter(Boolean);
      
      if (userIdsToFetch.length > 0) {
         const { data: uData } = await supabase.from('users').select('id, full_name').in('id', userIdsToFetch);
         usersData = uData || [];
      }

      const studentsToDisplay = targetStudents.map(student => {
        const progress = progressRecords.find(p => p.student_id === student.id);
        const userInfo = usersData.find(u => u.id === (student.user_id || student.id));
        
        let percentage = progress ? (progress.is_completed ? 100 : Math.round((progress.current_index / assignment.total_questions) * 100)) : 0;
        if (isNaN(percentage)) percentage = 0;

        return {
          id: student.id,
          student_id: student.id,
          student_name: userInfo?.full_name || 'طالب غير معروف',
          percentage: Math.min(percentage, 100),
          correct_score: progress?.correct_score || 0,
          wrong_score: progress?.wrong_score || 0,
          teacher_feedback: progress?.teacher_feedback || null,
          has_started: !!progress
        };
      });

      const uniqueStudents = Array.from(new Map(studentsToDisplay.map(item => [item.student_id, item])).values());
      uniqueStudents.sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return a.student_name.localeCompare(b.student_name);
      });

      setStudentsProgress(uniqueStudents);

    } catch (err) { 
      console.error("Error fetching progress:", err); 
    } finally { 
      setRefreshing(false); 
    }
  };

  const saveFeedback = async () => {
    if (!selectedStudent || !selectedAssignment) return;
    setSavingFeedback(true);
    try {
      const { error } = await supabase
        .from('student_progress_v2')
        .upsert({ 
           student_id: selectedStudent.student_id, 
           assignment_id: selectedAssignment.id,
           teacher_feedback: feedbackText, 
           updated_at: new Date().toISOString() 
        }, { onConflict: 'student_id, assignment_id' });

      if (error) throw error;
      
      setStudentsProgress(prev => prev.map(p => p.student_id === selectedStudent.student_id ? { ...p, teacher_feedback: feedbackText, has_started: true } : p));
      setFeedbackModalOpen(false);
      setFeedbackText('');
    } catch (err) { 
      alert("حدث خطأ أثناء حفظ الملاحظة."); 
    } finally { 
      setSavingFeedback(false); 
    }
  };

  const openFeedbackModal = (student: any) => {
    setSelectedStudent(student);
    setFeedbackText(student.teacher_feedback || '');
    setFeedbackModalOpen(true);
  };

  if (currentRole !== 'admin' && currentRole !== 'management' && currentRole !== 'teacher') return <div className="p-10 text-center font-cairo font-bold">غير مصرح لك بالدخول.</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-indigo-500 font-bold flex flex-col items-center gap-2"><Activity className="w-8 h-8"/> جاري تهيئة الرادار...</div></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-cairo" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <BarChart className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">رادار المتابعة الحية</h1>
              <p className="text-sm font-bold text-slate-500">اختر درساً لمراقبة إنجازات الطلاب وإرسال الملاحظات.</p>
            </div>
          </div>
          
          <div className="w-full md:w-auto min-w-[300px]">
            <select 
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-black p-3.5 rounded-xl outline-none focus:border-indigo-500 shadow-inner appearance-none cursor-pointer"
              onChange={(e) => {
                const assign = assignments.find(a => a.id === e.target.value);
                if (assign) fetchProgress(assign);
              }}
              defaultValue=""
            >
              <option value="" disabled>اختر التحدي / الدرس...</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>{a.is_practice_mode ? '🎮' : '📝'} {a.title}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedAssignment && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
               <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-500"/> {selectedAssignment.title}
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">يحتوي على {selectedAssignment.total_questions} سؤال</p>
               </div>
               
               {/* 🚀 زر معاينة المعلم للدرس */}
               <button 
                  onClick={() => router.push(`/practice/${selectedAssignment.id}?preview=true`)} 
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black rounded-xl border border-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
               >
                 <Eye className="w-5 h-5" /> معاينة الدرس كطالب
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0"><Users className="w-6 h-6"/></div>
                <div>
                  <div className="text-2xl font-black text-slate-800">{studentsProgress.length}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">الطلاب المستهدفين</div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6"/></div>
                <div>
                  <div className="text-2xl font-black text-slate-800">
                    {studentsProgress.filter(p => p.percentage === 100).length}
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase">أكملوا التدريب (100%)</div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0"><Activity className="w-6 h-6"/></div>
                <div>
                  <div className="text-2xl font-black text-slate-800">
                    {studentsProgress.filter(p => p.has_started && p.percentage < 100).length}
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase">قيد التنفيذ حالياً</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-lg text-slate-800">سجل الإنجاز والمتابعة</h3>
                <button onClick={() => fetchProgress(selectedAssignment)} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors active:scale-95">
                  <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> تحديث البيانات
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-black uppercase">
                      <th className="p-4 rounded-tr-3xl">اسم الطالب</th>
                      <th className="p-4">نسبة الإنجاز</th>
                      <th className="p-4 text-center">النقاط (صح / خطأ)</th>
                      <th className="p-4">حالة الملاحظة</th>
                      <th className="p-4 text-center rounded-tl-3xl">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-slate-700">
                    {studentsProgress.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold bg-slate-50/50">لا يوجد طلاب مسجلين في الفصول المخصصة لهذا التحدي، ولم يقم أحد بحله بعد.</td></tr>
                    ) : (
                      studentsProgress.map((student) => (
                        <tr key={student.student_id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${!student.has_started ? 'opacity-60' : ''}`}>
                          <td className="p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 shadow-inner ${student.percentage === 100 ? 'bg-emerald-100 text-emerald-700' : student.has_started ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                              {student.student_name.charAt(0)}
                            </div>
                            <div>
                              <span className="truncate max-w-[150px] font-black block">{student.student_name}</span>
                              {!student.has_started && <span className="text-[10px] text-slate-400">لم يبدأ بعد</span>}
                            </div>
                          </td>
                          <td className="p-4 w-48">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                                <div className={`h-full rounded-full ${student.percentage === 100 ? 'bg-emerald-500' : student.has_started ? 'bg-amber-400' : 'bg-transparent'}`} style={{ width: `${student.percentage}%` }}></div>
                              </div>
                              <span className={`text-xs font-black w-8 ${student.percentage === 100 ? 'text-emerald-600' : student.has_started ? 'text-amber-600' : 'text-slate-400'}`}>{student.percentage}%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {student.has_started ? (
                              <div className="flex items-center justify-center gap-2">
                                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm font-black"><CheckCircle2 className="w-3 h-3"/> {student.correct_score}</span>
                                <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 shadow-sm font-black"><XCircle className="w-3 h-3"/> {student.wrong_score}</span>
                              </div>
                            ) : (
                              <div className="text-center text-slate-400">-</div>
                            )}
                          </td>
                          <td className="p-4">
                            {student.teacher_feedback ? (
                              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-1 w-fit shadow-sm font-black"><CheckCircle2 className="w-3 h-3"/> تم إرسال ملاحظة</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 border border-slate-200 px-2 py-1 rounded-lg bg-white shadow-sm font-bold">لا توجد ملاحظات</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => openFeedbackModal(student)} className="bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl text-slate-500 transition-all shadow-sm active:scale-95">
                              <MessageSquareHeart className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {feedbackModalOpen && selectedStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setFeedbackModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-slate-100" dir="rtl">
              
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner border border-indigo-200"><Sparkles className="w-5 h-5"/></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">رسالة للمعلم</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">إلى: {selectedStudent.student_name}</p>
                  </div>
                </div>
                <button onClick={() => setFeedbackModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 bg-white rounded-full shadow-sm border border-slate-200 transition-colors active:scale-90"><X className="w-5 h-5"/></button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex justify-between items-center text-sm font-bold shadow-inner">
                  <span>إنجاز الطالب: <span className="text-indigo-600 font-black">{selectedStudent.percentage}%</span></span>
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {selectedStudent.correct_score} صح</span>
                  <span className="text-rose-600 flex items-center gap-1"><XCircle className="w-4 h-4"/> {selectedStudent.wrong_score} خطأ</span>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1">اكتب ملاحظتك التوجيهية أو التشجيعية:</label>
                  <textarea 
                    value={feedbackText} 
                    onChange={(e) => setFeedbackText(e.target.value)} 
                    placeholder="مثال: أداء ممتاز يا بطل! راجع قانون نيوتن الثاني وركز في الإشارات السلبية..."
                    className="w-full h-32 bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 resize-none shadow-inner leading-relaxed transition-all focus:bg-white"
                  ></textarea>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <button onClick={() => setFeedbackModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 border border-slate-200 font-black rounded-xl hover:bg-slate-200 transition-colors active:scale-95 text-sm shadow-sm">إلغاء</button>
                <button onClick={saveFeedback} disabled={savingFeedback} className="flex-[2] py-3.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm disabled:opacity-70 border border-indigo-500">
                  {savingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} حفظ وإرسال للطالب
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
