
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Users, Target, CheckCircle2, XCircle, 
  MessageSquareHeart, Send, X, Sparkles, Activity, Loader2, Eye, RefreshCcw, FileText, CheckSquare, BrainCircuit, AlertTriangle, UserMinus, Filter, ChevronDown, RotateCcw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

const createMarkup = (htmlString: string) => {
  return { __html: htmlString };
};

export default function ArenaMonitorDashboard() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [studentsProgress, setStudentsProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // حالة فلتر الفصول
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [availableClasses, setAvailableClasses] = useState<{id: string, name: string, count: number}[]>([]);

  // Modal States
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  
  // Grading States
  const [studentAnswers, setStudentAnswers] = useState<any[]>([]);
  const [assignmentQuestions, setAssignmentQuestions] = useState<any[]>([]);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  const [manualGrades, setManualGrades] = useState<Record<string, number>>({});

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'management' && currentRole !== 'teacher') return;

    const fetchAssignments = async () => {
      try {
        let actualTeacherId = null;
        if (currentRole === 'teacher' && user?.id) {
          const { data: tByUserId } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
          if (tByUserId?.id) actualTeacherId = tByUserId.id;
          else {
             const { data: tById } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
             if (tById?.id) actualTeacherId = tById.id;
          }
        }

        let query = supabase.from('assignments_v2')
          .select('id, title, is_practice_mode, created_at, teacher_id, subject_id, description') 
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (currentRole === 'teacher') {
          if (actualTeacherId) query = query.eq('teacher_id', actualTeacherId);
          else query = query.eq('teacher_id', user.id); 
        }

        const { data: assignmentsData, error: assignErr } = await query;
        if (assignErr) throw assignErr;

        if (!assignmentsData || assignmentsData.length === 0) {
           setAssignments([]); setLoading(false); return;
        }

        const assignmentIds = assignmentsData.map(a => a.id);
        const { data: questionsData } = await supabase.from('assignment_questions_v2').select('id, assignment_id, points').in('assignment_id', assignmentIds);

        const formatted = assignmentsData.map(d => {
          const qsForThis = (questionsData || []).filter(q => q.assignment_id === d.id);
          const totalPoints = qsForThis.reduce((sum, q) => sum + (q.points || 1), 0);
          
          let maxScore = 100;
          try { if (d.description && d.description.startsWith('{')) maxScore = JSON.parse(d.description).maxScore || 100; } catch(e) {}
          
          return {
            ...d,
            total_questions: qsForThis.length > 0 ? qsForThis.length : 1,
            max_points: maxScore 
          };
        });
        
        setAssignments(formatted);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchAssignments();
  }, [user?.id, currentRole]);

  const fetchProgress = async (assignment: any) => {
    setRefreshing(true);
    setSelectedAssignment(assignment);
    setSelectedClassFilter('all'); 
    
    try {
      let sectionIds: string[] = [];
      const { data: v2Secs } = await supabase.from('assignment_sections_v2').select('section_id').eq('assignment_id', assignment.id);
      
      if (v2Secs && v2Secs.length > 0) sectionIds = v2Secs.map(s => s.section_id);
      else {
        const { data: v1Secs } = await supabase.from('assignment_sections').select('section_id').eq('assignment_id', assignment.id);
        if (v1Secs && v1Secs.length > 0) sectionIds = v1Secs.map(s => s.section_id);
      }

      if (sectionIds.length === 0 && assignment.teacher_id) {
         const { data: tSecs } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', assignment.teacher_id);
         if (tSecs) sectionIds = tSecs.map(ts => ts.section_id);
      }

      let targetStudents: any[] = [];
      if (sectionIds.length > 0) {
        // 🚀 التأكد التام من استخراج اسم الفصل بشكل صحيح
        const { data: stData } = await supabase.from('students').select('id, user_id, section_id, sections(id, name, classes(name))').in('section_id', sectionIds);
        targetStudents = stData || [];
      }

      const { data: progData } = await supabase.from('student_progress_v2').select('*').eq('assignment_id', assignment.id);
      const progressRecords = progData || [];

      if (targetStudents.length === 0 && progressRecords.length > 0) {
         const pStuIds = progressRecords.map(p => p.student_id);
         const { data: missingSt } = await supabase.from('students').select('id, user_id, section_id, sections(id, name, classes(name))').in('id', pStuIds);
         targetStudents = missingSt || progressRecords.map(p => ({ id: p.student_id, user_id: p.student_id, sections: null }));
      }

      let usersData: any[] = [];
      const userIdsToFetch = [...new Set(targetStudents.map(s => s.user_id || s.id))].filter(Boolean);
      
      if (userIdsToFetch.length > 0) {
         const { data: uData } = await supabase.from('users').select('id, full_name').in('id', userIdsToFetch);
         usersData = uData || [];
      }

      const uniqueClassesMap = new Map();

      const studentsToDisplay = targetStudents.map(student => {
        const progress = progressRecords.find(p => p.student_id === student.id);
        const userInfo = usersData.find(u => u.id === (student.user_id || student.id));
        
        let percentage = progress ? (progress.is_completed ? 100 : Math.round((progress.current_index / assignment.total_questions) * 100)) : 0;
        if (isNaN(percentage)) percentage = 0;

        // 🚀 معالجة استخراج الفصول بدقة
        let secName = 'فصل غير محدد';
        let secId = 'unknown';
        
        if (student.sections) {
          const sData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
          if (sData) {
              const cData = Array.isArray(sData.classes) ? sData.classes[0] : sData.classes;
              const className = cData?.name || '';
              secName = className ? `${className} - ${sData.name}` : sData.name;
              secId = sData.id;
          }
        }
        
        if (secId !== 'unknown' && !uniqueClassesMap.has(secId)) {
           uniqueClassesMap.set(secId, { id: secId, name: secName, count: 0 });
        }
        if (uniqueClassesMap.has(secId)) {
           uniqueClassesMap.get(secId).count++;
        }

        return {
          id: student.id,
          student_id: student.id,
          user_id: student.user_id || student.id, 
          student_name: userInfo?.full_name || 'طالب غير معروف',
          section_name: secName,
          section_id: secId, 
          percentage: Math.min(percentage, 100),
          correct_score: progress?.correct_score || 0,
          wrong_score: progress?.wrong_score || 0,
          teacher_feedback: progress?.teacher_feedback || null,
          has_started: !!progress,
          is_completed: progress?.is_completed || false,
          is_graded: progress?.teacher_feedback?.includes('[تم رصد الدرجة]') 
        };
      });

      const uniqueStudents = Array.from(new Map(studentsToDisplay.map(item => [item.student_id, item])).values());
      
      // الفرز الأبجدي (الفصل ثم اسم الطالب)
      uniqueStudents.sort((a, b) => {
        const secCompare = a.section_name.localeCompare(b.section_name, 'ar');
        if (secCompare !== 0) return secCompare; 
        return a.student_name.localeCompare(b.student_name, 'ar'); 
      });

      setStudentsProgress(uniqueStudents);
      
      const sortedClasses = Array.from(uniqueClassesMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      setAvailableClasses(sortedClasses);

    } catch (err) { console.error(err); } finally { setRefreshing(false); }
  };

  // 🚀 مسح إجابات طالب وإعادة فتح الواجب له
  const handleResetStudentProgress = async (studentId: string, studentName: string) => {
    if (!confirm(`هل أنت متأكد من مسح تسليم الطالب (${studentName}) وإعادة فتح الواجب له ليعيد المحاولة من الصفر؟\n(سيتم حذف درجاته وإجاباته السابقة)`)) return;
    
    setRefreshing(true);
    try {
      // حذف من student_progress_v2
      await supabase.from('student_progress_v2').delete().eq('student_id', studentId).eq('assignment_id', selectedAssignment.id);
      // حذف من grades
      await supabase.from('grades').delete().eq('student_id', studentId).eq('exam_type', 'assignment').eq('title', selectedAssignment.title);
      // حذف من student_answers_v2 (إن وجدت)
      await supabase.from('student_answers_v2').delete().eq('student_id', studentId).eq('assignment_id', selectedAssignment.id);

      alert('تم إعادة فتح الواجب للطالب بنجاح.');
      fetchProgress(selectedAssignment); // إعادة جلب البيانات
    } catch(err) {
      alert('حدث خطأ أثناء محاولة إرجاع الواجب للطالب.');
    } finally {
      setRefreshing(false);
    }
  };

  const saveFeedback = async () => {
    if (!selectedStudent || !selectedAssignment) return;
    setSavingFeedback(true);
    try {
      const { error } = await supabase.from('student_progress_v2').upsert({ 
           student_id: selectedStudent.student_id, 
           assignment_id: selectedAssignment.id,
           teacher_feedback: feedbackText, 
           updated_at: new Date().toISOString() 
        }, { onConflict: 'student_id, assignment_id' });

      if (error) throw error;
      setStudentsProgress(prev => prev.map(p => p.student_id === selectedStudent.student_id ? { ...p, teacher_feedback: feedbackText, has_started: true } : p));
      setFeedbackModalOpen(false);
    } catch (err) { alert("حدث خطأ أثناء حفظ الملاحظة."); } finally { setSavingFeedback(false); }
  };

  const openGradingModal = async (student: any) => {
    if (currentRole === 'admin' || currentRole === 'management') {
       alert("التصحيح والرصد من صلاحيات معلم المادة فقط.");
       return;
    }
    
    setIsGrading(true);
    try {
      const { data: questions } = await supabase.from('assignment_questions_v2').select('*').eq('assignment_id', selectedAssignment.id).order('order_index', { ascending: true });
      setAssignmentQuestions(questions || []);

      const { data: answers } = await supabase.from('student_answers_v2').select('*').eq('assignment_id', selectedAssignment.id).eq('student_id', student.user_id);
      setStudentAnswers(answers || []);

      const initialGrades: Record<string, number> = {};
      if (answers) {
         answers.forEach(ans => {
            if (ans.points_earned !== null) initialGrades[ans.question_id] = ans.points_earned;
            else initialGrades[ans.question_id] = 0;
         });
      }
      setManualGrades(initialGrades);

      setSelectedStudent(student);
      setGradingModalOpen(true);
    } catch (err) { alert("حدث خطأ أثناء جلب إجابات الطالب."); } finally { setIsGrading(false); }
  };

  const submitFinalGrades = async () => {
    setSavingFeedback(true);
    try {
      let totalEssayPoints = 0;
      const updates = [];

      for (const [qId, points] of Object.entries(manualGrades)) {
        totalEssayPoints += points;
        updates.push(
          supabase.from('student_answers_v2').update({ points_earned: points, is_graded: true }).eq('student_id', selectedStudent.user_id).eq('question_id', qId)
        );
      }
      
      if (updates.length > 0) await Promise.all(updates);

      const finalScore = selectedStudent.correct_score + totalEssayPoints; 
      const newFeedback = `[تم رصد الدرجة] النتيجة المعتمدة: ${finalScore} / ${selectedAssignment.max_points}`;

      await supabase.from('student_progress_v2').upsert({ 
           student_id: selectedStudent.student_id, 
           assignment_id: selectedAssignment.id,
           teacher_feedback: newFeedback, 
           updated_at: new Date().toISOString() 
      }, { onConflict: 'student_id, assignment_id' });

      if (selectedAssignment.subject_id && selectedStudent.section_id && selectedStudent.section_id !== 'unknown') {
         await supabase.from('grades').upsert({
            student_id: selectedStudent.student_id,
            subject_id: selectedAssignment.subject_id,
            section_id: selectedStudent.section_id,
            score: finalScore,
            max_score: selectedAssignment.max_points || 10,
            exam_type: 'assignment',
            title: selectedAssignment.title,
            recorded_by: user.id,
            created_at: new Date().toISOString()
         }, { onConflict: 'student_id, subject_id, section_id, title' });
      }

      setStudentsProgress(prev => prev.map(p => p.student_id === selectedStudent.student_id ? { ...p, is_graded: true, teacher_feedback: newFeedback } : p));
      setGradingModalOpen(false);
      alert('تم تصحيح الواجب ورصد الدرجة بنجاح في سجل الدرجات!');

    } catch (err) { alert("حدث خطأ أثناء اعتماد الدرجات."); } finally { setSavingFeedback(false); }
  };

  const displayedStudents = useMemo(() => {
    if (selectedClassFilter === 'all') return studentsProgress;
    return studentsProgress.filter(s => s.section_id === selectedClassFilter);
  }, [studentsProgress, selectedClassFilter]);

  const handleZeroOutMissing = async () => {
    const missingStudents = displayedStudents.filter(s => (!s.has_started || !s.is_completed) && !s.is_graded);
    
    if (missingStudents.length === 0) {
      alert("لا يوجد طلاب متأخرين عن التسليم في هذا الفصل/الواجب.");
      return;
    }

    const classNameAlert = selectedClassFilter === 'all' ? 'جميع الفصول' : availableClasses.find(c => c.id === selectedClassFilter)?.name;

    if (!confirm(`تحذير إداري: أنت على وشك رصد الدرجة (صفر) لعدد ${missingStudents.length} طلاب لعدم تسليمهم الواجب في (${classNameAlert}). هل أنت متأكد؟ هذا الإجراء سيرسل صفر لسجل الدرجات الرسمي ولن يتمكنوا من التعديل.`)) return;

    setRefreshing(true);
    try {
      const feedbackZero = `[تم رصد الدرجة] لم يقم بالتسليم. الدرجة: 0 / ${selectedAssignment.max_points}`;
      
      const progressUpdates = missingStudents.map(s => ({
        student_id: s.student_id,
        assignment_id: selectedAssignment.id,
        current_index: 0,
        correct_score: 0,
        wrong_score: 0,
        is_completed: true,
        teacher_feedback: feedbackZero,
        updated_at: new Date().toISOString()
      }));

      const gradesInserts = missingStudents.filter(s => selectedAssignment.subject_id && s.section_id !== 'unknown').map(s => ({
        student_id: s.student_id,
        subject_id: selectedAssignment.subject_id,
        section_id: s.section_id,
        score: 0,
        max_score: selectedAssignment.max_points || 10,
        exam_type: 'assignment',
        title: selectedAssignment.title,
        recorded_by: user.id,
        created_at: new Date().toISOString()
      }));

      await supabase.from('student_progress_v2').upsert(progressUpdates, { onConflict: 'student_id, assignment_id' });
      
      if (gradesInserts.length > 0) {
        await supabase.from('grades').insert(gradesInserts);
      }

      setStudentsProgress(prev => prev.map(p => missingStudents.find(m => m.student_id === p.student_id) ? { ...p, is_graded: true, teacher_feedback: feedbackZero, has_started: true, is_completed: true } : p));
      
      alert(`تم بنجاح تصفير وإغلاق الواجب لعدد ${missingStudents.length} طلاب في ${classNameAlert}.`);
    } catch (err) {
      alert("حدث خطأ أثناء تصفير الطلاب.");
    } finally {
      setRefreshing(false);
    }
  };

  const isOfficialMode = selectedAssignment && selectedAssignment.is_practice_mode === false;
  
  const statsCounts = useMemo(() => {
    return {
      total: displayedStudents.length,
      completed: displayedStudents.filter(s => s.is_completed || s.percentage === 100).length,
      graded: displayedStudents.filter(s => s.is_graded).length,
      missing: displayedStudents.filter(s => !s.has_started || (!s.is_completed && !s.is_graded)).length
    };
  }, [displayedStudents]);

  if (currentRole !== 'admin' && currentRole !== 'management' && currentRole !== 'teacher') return <div className="p-10 text-center font-cairo font-bold">غير مصرح لك بالدخول.</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-indigo-500 font-bold flex flex-col items-center gap-2"><Activity className="w-8 h-8"/> جاري تهيئة الرادار...</div></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-cairo" dir="rtl">
      
      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: ltr !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: ltr !important; text-align: left !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: ltr !important; }
        .tiptap-content table { border-collapse: collapse !important; width: 100% !important; margin: 15px 0 !important; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: white; }
        .tiptap-content td, .tiptap-content th { border: 2px solid #cbd5e1 !important; padding: 12px !important; text-align: center !important; vertical-align: middle !important; min-width: 2em; }
        .tiptap-content th { background-color: #f8fafc !important; font-weight: 900 !important; color: #334155; }
        .tiptap-content img { max-width: 100% !important; height: auto !important; border-radius: 12px !important; margin: 10px auto !important; display: block !important; box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important; }
        .tiptap-content p { margin-bottom: 0.5em !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 10px; }
      `}} />

      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <BarChart className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">رادار المتابعة الحية</h1>
              <p className="text-sm font-bold text-slate-500">مراقبة إنجازات الطلاب، وتقييم الواجبات الرسمية.</p>
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
              <option value="" disabled>اختر التحدي / الواجب...</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>{a.is_practice_mode ? '🎮 تدريب:' : '📝 واجب:'} {a.title}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedAssignment && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
               <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    {isOfficialMode ? <FileText className="w-5 h-5 text-indigo-500"/> : <Target className="w-5 h-5 text-indigo-500"/>} 
                    {selectedAssignment.title}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md ${isOfficialMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isOfficialMode ? 'واجب رسمي (يتطلب تصحيح)' : 'تدريب تفاعلي ذاتي'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">يحتوي على {selectedAssignment.total_questions} سؤال</span>
                    {isOfficialMode && <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">الدرجة العظمى: {selectedAssignment.max_points}</span>}
                  </div>
               </div>
               
               <button 
                  onClick={() => router.push(`/practice/${selectedAssignment.id}?preview=true`)} 
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black rounded-xl border border-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
               >
                 <Eye className="w-5 h-5" /> معاينة كطالب
               </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0"><Users className="w-5 h-5"/></div>
                <div><div className="text-xl font-black text-slate-800 leading-none mb-1">{statsCounts.total}</div><div className="text-[10px] font-bold text-slate-500 uppercase">إجمالي الطلاب</div></div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5"/></div>
                <div><div className="text-xl font-black text-slate-800 leading-none mb-1">{statsCounts.completed}</div><div className="text-[10px] font-bold text-slate-500 uppercase">أتموا التسليم</div></div>
              </div>
              {isOfficialMode && (
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0"><CheckSquare className="w-5 h-5"/></div>
                  <div><div className="text-xl font-black text-slate-800 leading-none mb-1">{statsCounts.graded}</div><div className="text-[10px] font-bold text-slate-500 uppercase">رُصدت درجاتهم</div></div>
                </div>
              )}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shrink-0"><UserMinus className="w-5 h-5"/></div>
                <div><div className="text-xl font-black text-slate-800 leading-none mb-1">{statsCounts.missing}</div><div className="text-[10px] font-bold text-slate-500 uppercase">لم يسلموا</div></div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 shrink-0">
                    <Database className="w-5 h-5 text-indigo-500" /> سجل الإنجاز
                  </h3>
                  
                  {availableClasses.length > 0 && (
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm relative w-full sm:w-auto">
                      <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                      <select 
                        value={selectedClassFilter} 
                        onChange={e => setSelectedClassFilter(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm font-black text-indigo-700 outline-none cursor-pointer w-full appearance-none pr-2"
                      >
                        <option value="all">عرض جميع الفصول (كل الطلاب)</option>
                        {availableClasses.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name} ({cls.count})</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto">
                  {isOfficialMode && (
                    <button onClick={handleZeroOutMissing} disabled={refreshing} className="flex-1 lg:flex-none bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm">
                      <UserMinus className="w-4 h-4" /> تصفير المتأخرين
                    </button>
                  )}
                  <button onClick={() => fetchProgress(selectedAssignment)} className="flex-1 lg:flex-none text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm">
                    <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> تحديث
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                      <th className="p-4 rounded-tr-3xl">اسم الطالب / الفصل</th>
                      <th className="p-4">نسبة الإنجاز</th>
                      {!isOfficialMode && <th className="p-4 text-center">التقييم الآلي</th>}
                      <th className="p-4">حالة الواجب / الدرجة</th>
                      <th className="p-4 text-center rounded-tl-3xl">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-slate-700">
                    {displayedStudents.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold bg-slate-50/50">لا يوجد طلاب مطابقين للفرز في هذا الواجب.</td></tr>
                    ) : (
                      displayedStudents.map((student) => (
                        <tr key={student.student_id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${!student.has_started ? 'opacity-60 bg-slate-50/30' : ''}`}>
                          <td className="p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 shadow-inner ${student.percentage === 100 ? 'bg-emerald-100 text-emerald-700' : student.has_started ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                              {student.student_name.charAt(0)}
                            </div>
                            <div>
                              <span className="truncate max-w-[150px] font-black block text-slate-800">{student.student_name}</span>
                              <span className="text-[10px] text-indigo-600 font-black block bg-indigo-50 px-2 py-0.5 rounded-md mt-1 w-fit border border-indigo-100 shadow-sm">{student.section_name}</span>
                            </div>
                          </td>
                          
                          <td className="p-4 w-48">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                                <div className={`h-full rounded-full ${student.percentage === 100 ? 'bg-emerald-500' : student.has_started ? 'bg-amber-400' : 'bg-transparent'}`} style={{ width: `${student.percentage}%` }}></div>
                              </div>
                              <span className={`text-[10px] font-black w-8 ${student.percentage === 100 ? 'text-emerald-600' : student.has_started ? 'text-amber-600' : 'text-slate-400'}`}>{student.percentage}%</span>
                            </div>
                          </td>
                          
                          {!isOfficialMode && (
                            <td className="p-4">
                              {student.has_started ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm font-black text-[10px]"><CheckCircle2 className="w-3 h-3"/> {student.correct_score}</span>
                                  <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 shadow-sm font-black text-[10px]"><XCircle className="w-3 h-3"/> {student.wrong_score}</span>
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 font-black">-</div>
                              )}
                            </td>
                          )}

                          <td className="p-4">
                            {isOfficialMode ? (
                               student.is_graded ? (
                                  <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit shadow-sm font-black"><CheckCircle2 className="w-3.5 h-3.5"/> {student.teacher_feedback?.replace('[تم رصد الدرجة]', '') || 'تم التصحيح'}</span>
                               ) : student.is_completed ? (
                                  <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit shadow-sm font-black"><Activity className="w-3.5 h-3.5 animate-pulse"/> بانتظار التصحيح</span>
                               ) : (
                                  <span className="text-[10px] text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg bg-slate-100 shadow-sm font-black">لم يسلم الواجب</span>
                               )
                            ) : (
                              student.teacher_feedback ? (
                                <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-1 w-fit shadow-sm font-black"><CheckCircle2 className="w-3 h-3"/> أُرسلت ملاحظة</span>
                              ) : (
                                <span className="text-[10px] text-slate-400 border border-slate-200 px-2 py-1 rounded-lg bg-white shadow-sm font-bold">لا توجد ملاحظات</span>
                              )
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* 🚀 زر إعادة الفتح وحذف التسليم */}
                              {student.has_started && (
                                <button 
                                  onClick={() => handleResetStudentProgress(student.student_id, student.student_name)}
                                  className="bg-white border border-rose-200 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl text-rose-400 transition-all shadow-sm active:scale-95"
                                  title="حذف التسليم وإعادة فتح الواجب"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}

                              {isOfficialMode ? (
                                <button 
                                  onClick={() => openGradingModal(student)} 
                                  disabled={!student.is_completed || isGrading}
                                  className={`bg-white border px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95 font-black text-xs flex items-center gap-2 justify-center w-24 ${
                                    !student.is_completed ? 'opacity-50 cursor-not-allowed border-slate-200 text-slate-400' :
                                    student.is_graded ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' :
                                    'border-amber-200 text-amber-600 hover:bg-amber-50'
                                  }`}
                                >
                                  {isGrading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckSquare className="w-4 h-4" />} 
                                  {student.is_graded ? 'تعديل الدرجة' : 'تصحيح الإجابة'}
                                </button>
                              ) : (
                                <button onClick={() => { setSelectedStudent(student); setFeedbackText(student.teacher_feedback || ''); setFeedbackModalOpen(true); }} className="bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl text-slate-500 transition-all shadow-sm active:scale-95">
                                  <MessageSquareHeart className="w-5 h-5" />
                                </button>
                              )}
                            </div>
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

      {/* مودال إرسال الملاحظات (لوضع التدريب) */}
      <AnimatePresence>
        {feedbackModalOpen && selectedStudent && !isOfficialMode && (
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
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1">اكتب ملاحظتك التوجيهية:</label>
                  <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="مثال: راجع قانون نيوتن الثاني..." className="w-full h-32 bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 resize-none shadow-inner leading-relaxed transition-all focus:bg-white"></textarea>
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

      {/* 🚀 مودال نظام التصحيح والتقييم (لوضع الواجبات الرسمية) */}
      <AnimatePresence>
        {gradingModalOpen && selectedStudent && isOfficialMode && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 250 }} className="fixed bottom-0 left-0 w-full h-[95vh] bg-slate-100 rounded-t-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden" dir="rtl">
              
              <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white rounded-t-[2rem] shrink-0">
                <button onClick={() => setGradingModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
                <div className="text-center">
                   <h3 className="font-black text-slate-800 text-lg">تصحيح واجب: {selectedStudent.student_name}</h3>
                   <p className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 inline-block mt-1">النقاط الآلية: {selectedStudent.correct_score}</p>
                </div>
                <button onClick={submitFinalGrades} disabled={savingFeedback} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2 border border-indigo-500">
                  {savingFeedback ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckSquare className="w-4 h-4"/>} اعتماد ورصد الدرجة
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 space-y-6 bg-slate-100/50 custom-scrollbar">
                
                {assignmentQuestions.filter(q => q.question_type === 'essay').length === 0 && (
                   <div className="text-center p-10 bg-white rounded-2xl border border-slate-200 shadow-sm font-bold text-slate-500">
                     لا يحتوي هذا الواجب على أسئلة مقالية تتطلب تصحيحاً يدوياً. الدرجة المعتمدة حالياً هي درجة أسئلة الاختيار التلقائية.
                   </div>
                )}

                {assignmentQuestions.filter(q => q.question_type === 'essay').map((q, idx) => {
                  const studentAnsObj = studentAnswers.find(a => a.question_id === q.id);
                  const studentText = studentAnsObj?.text_answer || studentAnsObj?.answer_text || 'لم يقم الطالب بالإجابة على هذا السؤال.';
                  const maxPts = q.points || 1;
                  
                  return (
                    <div key={q.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-6">
                      <div className="flex-1 space-y-5 min-w-0">
                        <div className="border-b border-slate-100 pb-4">
                          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg mb-3 inline-block">السؤال المقالي {idx + 1}</span>
                          <div className="font-bold text-slate-800 prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={createMarkup(q.content_html)} />
                        </div>
                        <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm relative">
                          <div className="absolute top-0 right-6 -mt-3 bg-white px-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">إجابة الطالب</div>
                          <div className="font-bold text-slate-700 prose prose-sm max-w-none tiptap-content overflow-x-auto custom-scrollbar break-words" dangerouslySetInnerHTML={createMarkup(studentText)} />
                        </div>
                      </div>
                      
                      <div className="xl:w-96 shrink-0 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex flex-col h-full shadow-inner">
                        <div className="mb-6 flex-1 min-h-[200px]">
                           <p className="text-xs font-black text-indigo-500 mb-3 flex items-center gap-1.5"><BrainCircuit className="w-4 h-4"/> الإجابة النموذجية كمرجع:</p>
                           <div className="font-bold text-indigo-900 text-sm max-h-48 overflow-y-auto custom-scrollbar prose prose-sm max-w-none tiptap-content bg-white/50 p-4 rounded-xl border border-indigo-100 break-words" dangerouslySetInnerHTML={createMarkup(q.model_answer_html)} />
                        </div>
                        
                        <div className="mt-auto border-t border-indigo-200 pt-5">
                           <label className="block text-xs font-black text-slate-600 mb-2 flex items-center justify-between">
                             <span>رصد الدرجة لهذا السؤال</span>
                             <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">من {maxPts}</span>
                           </label>
                           <div className="relative">
                             <input 
                               type="number" 
                               min="0" max={maxPts} 
                               value={manualGrades[q.id] !== undefined ? manualGrades[q.id] : 0} 
                               onChange={(e) => {
                                 let val = Number(e.target.value);
                                 if (val > maxPts) val = maxPts;
                                 if (val < 0) val = 0;
                                 setManualGrades(prev => ({...prev, [q.id]: val}));
                               }}
                               className="w-full bg-white border-2 border-indigo-200 text-center font-black text-2xl p-3 rounded-xl shadow-sm focus:border-indigo-500 outline-none text-indigo-700 pr-10" 
                             />
                             <CheckCircle2 className="w-5 h-5 text-indigo-300 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}


