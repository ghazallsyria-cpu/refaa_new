// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Users, Target, CheckCircle2, XCircle, 
  MessageSquareHeart, Send, X, Sparkles, Activity, Loader2, Eye, RefreshCcw, FileText, CheckSquare, BrainCircuit, AlertTriangle, UserMinus, Filter, ChevronDown, RotateCcw, Database,
  Settings2, PenTool, Award // 🚀 أضفنا Award هنا
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog'; // 🚀 أضفنا استيراد Dialog هنا

// إعدادات الحركة
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

const renderHTMLWithMath = (html: string) => {
  if (!html) return { __html: '' };
  let parsed = html;
  if (typeof window !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(parsed, 'text/html');
      const images = doc.querySelectorAll('img');
      images.forEach((img) => {
        if (img.src && img.src.startsWith('http')) img.setAttribute('crossorigin', 'anonymous');
      });
      parsed = doc.body.innerHTML;
    } catch (e) {}
  }
  const renderMath = (match: string, mathString: string, isDisplay: boolean) => {
    try {
      let cleanMath = mathString.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      cleanMath = cleanMath.replace(/\\mu_o/g, '\\mu_0').replace(/mu_o/g, '\\mu_0').replace(/\\pi\\0\.001/g, '0.001\\pi').replace(/\\ /g, ' ');
      return katex.renderToString(cleanMath, { displayMode: isDisplay, throwOnError: false, direction: 'ltr' });
    } catch (e) { return match; }
  };
  parsed = parsed.replace(/\$\$(.*?)\$\$/gs, (m, math) => renderMath(m, math, true));
  parsed = parsed.replace(/\$(.*?)\$/gs, (m, math) => renderMath(m, math, false));
  return { __html: parsed };
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
  
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [availableClasses, setAvailableClasses] = useState<{id: string, name: string, count: number}[]>([]);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  
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

  const handleResetStudentProgress = async (studentId: string, studentName: string) => {
    if (!confirm(`هل أنت متأكد من مسح تسليم الطالب (${studentName}) وإعادة فتح الواجب له ليعيد المحاولة من الصفر؟\n(سيتم حذف درجاته وإجاباته السابقة)`)) return;
    
    setRefreshing(true);
    try {
      await supabase.from('student_progress_v2').delete().eq('student_id', studentId).eq('assignment_id', selectedAssignment.id);
      await supabase.from('grades').delete().eq('student_id', studentId).eq('exam_type', 'assignment').eq('title', selectedAssignment.title);
      await supabase.from('student_answers_v2').delete().eq('student_id', studentId).eq('assignment_id', selectedAssignment.id);

      alert('تم إعادة فتح الواجب للطالب بنجاح.');
      fetchProgress(selectedAssignment); 
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
      const { data: existingProg } = await supabase.from('student_progress_v2')
         .select('id').eq('student_id', selectedStudent.student_id).eq('assignment_id', selectedAssignment.id).maybeSingle();

      if (existingProg) {
         await supabase.from('student_progress_v2')
            .update({ teacher_feedback: feedbackText, updated_at: new Date().toISOString() })
            .eq('id', existingProg.id);
      } else {
         await supabase.from('student_progress_v2')
            .insert({ 
               student_id: selectedStudent.student_id, 
               assignment_id: selectedAssignment.id, 
               teacher_feedback: feedbackText, 
               current_index: 0, 
               correct_score: 0, 
               wrong_score: 0, 
               is_completed: false 
            });
      }

      setStudentsProgress(prev => prev.map(p => p.student_id === selectedStudent.student_id ? { ...p, teacher_feedback: feedbackText, has_started: true } : p));
      setFeedbackModalOpen(false);
    } catch (err) { 
      console.error(err);
      alert("حدث خطأ أثناء حفظ الملاحظة."); 
    } finally { 
      setSavingFeedback(false); 
    }
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
      let finalScore = 0;

      for (const q of assignmentQuestions) {
        const isEssay = q.question_type === 'essay';
        
        const points = isEssay 
           ? (manualGrades[q.id] || 0) 
           : (studentAnswers.find(a => a.question_id === q.id)?.points_earned || 0);
        
        finalScore += points;

        if (isEssay) {
          const existingAnswer = studentAnswers.find(a => a.question_id === q.id);
          if (existingAnswer) {
            await supabase.from('student_answers_v2')
               .update({ points_earned: points, is_graded: true })
               .eq('id', existingAnswer.id);
          } else {
            await supabase.from('student_answers_v2')
               .insert({ 
                  student_id: selectedStudent.user_id,
                  assignment_id: selectedAssignment.id,
                  question_id: q.id,
                  answer_text: 'لم يقم بالإجابة',
                  points_earned: points,
                  is_graded: true
               });
          }
        }
      }
      
      const newFeedback = `[تم رصد الدرجة] النتيجة المعتمدة: ${finalScore} / ${selectedAssignment.max_points}`;

      const { data: existingProg } = await supabase.from('student_progress_v2')
         .select('id').eq('student_id', selectedStudent.student_id).eq('assignment_id', selectedAssignment.id).maybeSingle();

      if (existingProg) {
         await supabase.from('student_progress_v2')
            .update({ teacher_feedback: newFeedback, updated_at: new Date().toISOString() })
            .eq('id', existingProg.id);
      } else {
         await supabase.from('student_progress_v2')
            .insert({ 
               student_id: selectedStudent.student_id, 
               assignment_id: selectedAssignment.id, 
               teacher_feedback: newFeedback, 
               current_index: 0, 
               correct_score: selectedStudent.correct_score, 
               wrong_score: 0, 
               is_completed: true 
            });
      }

      if (selectedAssignment.subject_id && selectedStudent.section_id && selectedStudent.section_id !== 'unknown') {
         const { data: existingGrade } = await supabase.from('grades')
           .select('id')
           .eq('student_id', selectedStudent.student_id)
           .eq('subject_id', selectedAssignment.subject_id)
           .eq('section_id', selectedStudent.section_id)
           .eq('title', selectedAssignment.title)
           .maybeSingle();

         if (existingGrade) {
            await supabase.from('grades')
              .update({ score: finalScore, max_score: selectedAssignment.max_points || 10, recorded_by: user.id })
              .eq('id', existingGrade.id);
         } else {
            await supabase.from('grades')
              .insert({
                student_id: selectedStudent.student_id,
                subject_id: selectedAssignment.subject_id,
                section_id: selectedStudent.section_id,
                score: finalScore,
                max_score: selectedAssignment.max_points || 10,
                exam_type: 'assignment',
                title: selectedAssignment.title,
                recorded_by: user.id,
                created_at: new Date().toISOString()
              });
         }
      }

      setStudentsProgress(prev => prev.map(p => p.student_id === selectedStudent.student_id ? { ...p, is_graded: true, teacher_feedback: newFeedback } : p));
      setGradingModalOpen(false);
      alert('تم اعتماد درجة الواجب الشاملة بنجاح!');

    } catch (err) { 
       console.error("Grading Error:", err);
       alert("حدث خطأ أثناء اعتماد الدرجات. يرجى المحاولة مرة أخرى."); 
    } finally { 
       setSavingFeedback(false); 
    }
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
      
      for (const s of missingStudents) {
         const { data: existingProg } = await supabase.from('student_progress_v2')
            .select('id').eq('student_id', s.student_id).eq('assignment_id', selectedAssignment.id).maybeSingle();
         
         if (existingProg) {
            await supabase.from('student_progress_v2').update({
                current_index: 0, correct_score: 0, wrong_score: 0,
                is_completed: true, teacher_feedback: feedbackZero, updated_at: new Date().toISOString()
            }).eq('id', existingProg.id);
         } else {
            await supabase.from('student_progress_v2').insert({
                student_id: s.student_id, assignment_id: selectedAssignment.id,
                current_index: 0, correct_score: 0, wrong_score: 0,
                is_completed: true, teacher_feedback: feedbackZero
            });
         }

         if (selectedAssignment.subject_id && s.section_id && s.section_id !== 'unknown') {
             const { data: existingGrade } = await supabase.from('grades')
               .select('id').eq('student_id', s.student_id).eq('subject_id', selectedAssignment.subject_id)
               .eq('section_id', s.section_id).eq('title', selectedAssignment.title).maybeSingle();
             
             if (existingGrade) {
                 await supabase.from('grades').update({ score: 0, max_score: selectedAssignment.max_points || 10, recorded_by: user.id }).eq('id', existingGrade.id);
             } else {
                 await supabase.from('grades').insert({
                     student_id: s.student_id, subject_id: selectedAssignment.subject_id,
                     section_id: s.section_id, score: 0, max_score: selectedAssignment.max_points || 10,
                     exam_type: 'assignment', title: selectedAssignment.title, recorded_by: user.id, created_at: new Date().toISOString()
                 });
             }
         }
      }

      setStudentsProgress(prev => prev.map(p => missingStudents.find(m => m.student_id === p.student_id) ? { ...p, is_graded: true, teacher_feedback: feedbackZero, has_started: true, is_completed: true } : p));
      alert(`تم بنجاح تصفير وإغلاق الواجب لعدد ${missingStudents.length} طلاب في ${classNameAlert}.`);
    } catch (err) {
      console.error(err);
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

  if (currentRole !== 'admin' && currentRole !== 'management' && currentRole !== 'teacher') return <div className="p-10 text-center font-cairo font-black text-white">غير مصرح لك بالدخول.</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><div className="animate-pulse text-indigo-400 font-black flex flex-col items-center gap-4"><Activity className="w-12 h-12 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"/> جاري تهيئة الرادار...</div></div>;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-transparent text-slate-100 py-8 px-4 font-sans relative overflow-x-hidden" dir="rtl">
      
      {/* 🌌 الإضاءة المحيطية */}
      <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0"></div>

      {/* Tiptap overrides for dark theme */}
      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: ltr !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: ltr !important; text-align: left !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: ltr !important; }
        .tiptap-content table { border-collapse: collapse !important; width: 100% !important; margin: 15px 0 !important; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.3); background: transparent; }
        .tiptap-content td, .tiptap-content th { border: 1px solid rgba(255,255,255,0.1) !important; padding: 12px !important; text-align: center !important; vertical-align: middle !important; min-width: 2em; color: #e2e8f0; }
        .tiptap-content th { background-color: rgba(255,255,255,0.05) !important; font-weight: 900 !important; color: #fff; }
        .tiptap-content img { max-width: 100% !important; height: auto !important; border-radius: 12px !important; margin: 10px auto !important; display: block !important; box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important; mix-blend-mode: luminosity; }
        .tiptap-content p { margin-bottom: 0.5em !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }
      `}} />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* 🚀 Header Hero */}
        <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen transition-transform duration-1000 group-hover:scale-125"></div>
          
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-right relative z-10 w-full md:w-auto">
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <BarChart className="w-8 h-8 drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md tracking-tight">رادار المتابعة الحية</h1>
              <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">مراقبة إنجازات الطلاب، وتقييم الواجبات الرسمية بدقة.</p>
            </div>
          </div>
          
          <div className="w-full md:w-auto min-w-[300px] relative z-10">
            <div className="relative">
              <select 
                className="w-full bg-[#02040a]/60 border border-white/10 text-white font-black p-4 pr-4 pl-10 rounded-2xl outline-none focus:border-indigo-500/50 shadow-inner appearance-none cursor-pointer backdrop-blur-md transition-all [&>option]:bg-[#0f1423]"
                onChange={(e) => {
                  const assign = assignments.find(a => a.id === e.target.value);
                  if (assign) fetchProgress(assign);
                }}
                defaultValue=""
              >
                <option value="" disabled>اختر التحدي / الواجب للمراقبة...</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>{a.is_practice_mode ? '🎮 تدريب:' : '📝 واجب:'} {a.title}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 pointer-events-none drop-shadow-sm" />
            </div>
          </div>
        </motion.div>

        {selectedAssignment && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Assignment Details */}
            <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border-white/10 shadow-inner flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
               <div className="text-center md:text-right">
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center md:justify-start gap-3 drop-shadow-md">
                    {isOfficialMode ? <FileText className="w-6 h-6 text-indigo-400"/> : <Target className="w-6 h-6 text-emerald-400"/>} 
                    {selectedAssignment.title}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                    <span className={`text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-lg border shadow-inner ${isOfficialMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}>
                      {isOfficialMode ? 'واجب رسمي (يتطلب تصحيح)' : 'تدريب تفاعلي ذاتي'}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">يحتوي على {selectedAssignment.total_questions} سؤال</span>
                    {isOfficialMode && <span className="text-[10px] sm:text-xs font-black text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30 shadow-inner flex items-center gap-1.5"><Award className="w-3.5 h-3.5"/> الدرجة العظمى: {selectedAssignment.max_points}</span>}
                  </div>
               </div>
               
               <button 
                  onClick={() => router.push(`/practice/${selectedAssignment.id}?preview=true`)} 
                  className="w-full md:w-auto px-8 py-4 bg-indigo-600/90 backdrop-blur-md hover:bg-indigo-500 text-white font-black rounded-2xl border border-indigo-400/50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
               >
                 <Eye className="w-5 h-5 drop-shadow-sm" /> معاينة كطالب
               </button>
            </div>

            {/* 🚀 Holographic Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative z-10">
              <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] border-blue-500/20 shadow-inner flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-[40px] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner relative z-10"><Users className="w-6 h-6 drop-shadow-sm"/></div>
                <div className="relative z-10"><div className="text-2xl sm:text-3xl font-black text-white leading-none mb-1 drop-shadow-md">{statsCounts.total}</div><div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">إجمالي الطلاب</div></div>
              </div>
              <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] border-emerald-500/20 shadow-inner flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner relative z-10"><CheckCircle2 className="w-6 h-6 drop-shadow-sm"/></div>
                <div className="relative z-10"><div className="text-2xl sm:text-3xl font-black text-white leading-none mb-1 drop-shadow-md">{statsCounts.completed}</div><div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">أتموا التسليم</div></div>
              </div>
              {isOfficialMode ? (
                <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] border-indigo-500/20 shadow-inner flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner relative z-10"><CheckSquare className="w-6 h-6 drop-shadow-sm"/></div>
                  <div className="relative z-10"><div className="text-2xl sm:text-3xl font-black text-white leading-none mb-1 drop-shadow-md">{statsCounts.graded}</div><div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">رُصدت درجاتهم</div></div>
                </div>
              ) : (
                <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] border-amber-500/20 shadow-inner flex items-center gap-4 relative overflow-hidden group opacity-50">
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><Activity className="w-6 h-6 drop-shadow-sm"/></div>
                  <div><div className="text-2xl sm:text-3xl font-black text-white leading-none mb-1 drop-shadow-md">-</div><div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">التصحيح آلي</div></div>
                </div>
              )}
              <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] border-rose-500/20 shadow-inner flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-[40px] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>
                <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner relative z-10"><UserMinus className="w-6 h-6 drop-shadow-sm"/></div>
                <div className="relative z-10"><div className="text-2xl sm:text-3xl font-black text-white leading-none mb-1 drop-shadow-md">{statsCounts.missing}</div><div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">لم يسلموا</div></div>
              </div>
            </div>

            {/* 🚀 Main Data Table Container */}
            <div className="glass-panel rounded-[2.5rem] border-white/10 shadow-2xl overflow-hidden relative z-10">
              
              <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-[#02040a]/40 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h3 className="font-black text-xl text-white flex items-center gap-3 shrink-0 drop-shadow-md">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-inner"><Database className="w-5 h-5 text-indigo-400" /></div> سجل الإنجاز
                  </h3>
                  
                  {availableClasses.length > 0 && (
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 shadow-inner relative w-full sm:w-auto">
                      <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                      <select 
                        value={selectedClassFilter} 
                        onChange={e => setSelectedClassFilter(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm font-black text-indigo-300 outline-none cursor-pointer w-full appearance-none pr-2 [&>option]:bg-[#0f1423]"
                      >
                        <option value="all">عرض جميع الفصول (كل الطلاب)</option>
                        {availableClasses.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name} ({cls.count})</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none absolute left-3" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
                  {isOfficialMode && (
                    <button onClick={handleZeroOutMissing} disabled={refreshing} className="w-full sm:w-auto bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white px-5 py-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-inner backdrop-blur-sm">
                      <UserMinus className="w-4 h-4" /> تصفير المتأخرين
                    </button>
                  )}
                  <button onClick={() => fetchProgress(selectedAssignment)} className="w-full sm:w-auto text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-inner backdrop-blur-sm">
                    <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> تحديث البيانات
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto custom-scrollbar p-1">
                <table className="min-w-full text-right whitespace-nowrap">
                  <thead className="bg-white/5 backdrop-blur-md border-b border-white/10">
                    <tr className="text-slate-300 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      <th className="p-5 pl-4 pr-6">اسم الطالب / الفصل</th>
                      <th className="p-5 px-4 text-center">نسبة الإنجاز</th>
                      {!isOfficialMode && <th className="p-5 px-4 text-center">التقييم الآلي</th>}
                      <th className="p-5 px-4 text-center">حالة الواجب / الدرجة</th>
                      <th className="p-5 px-6 text-center">إجراءات المراقبة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-transparent text-sm font-bold text-slate-300">
                    {displayedStudents.length === 0 ? (
                      <tr><td colSpan={5} className="p-16 text-center text-slate-500 font-bold bg-[#02040a]/40">لا يوجد طلاب مطابقين للفرز في هذا الواجب.</td></tr>
                    ) : (
                      displayedStudents.map((student) => (
                        <tr key={student.student_id} className={`hover:bg-white/5 transition-colors group ${!student.has_started ? 'opacity-50 grayscale' : ''}`}>
                          <td className="p-4 px-6 flex items-center gap-4">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black shrink-0 shadow-inner border group-hover:scale-110 transition-transform ${student.percentage === 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : student.has_started ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-[#0f1423] text-slate-500 border-white/5'}`}>
                              {student.student_name.charAt(0)}
                            </div>
                            <div className="min-w-0 pr-1">
                              <span className="truncate max-w-[200px] font-black block text-white drop-shadow-sm group-hover:text-indigo-100 transition-colors">{student.student_name}</span>
                              <span className="text-[9px] sm:text-[10px] text-indigo-300 font-black block bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 mt-1.5 w-fit shadow-inner">{student.section_name}</span>
                            </div>
                          </td>
                          
                          <td className="p-4 px-4 w-56 align-middle">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex-1 h-2.5 sm:h-3 bg-[#02040a] rounded-full overflow-hidden shadow-inner border border-white/5">
                                <div className={`h-full rounded-full shadow-[0_0_10px_currentColor] transition-all duration-500 ${student.percentage === 100 ? 'bg-emerald-500 text-emerald-500' : student.has_started ? 'bg-amber-500 text-amber-500' : 'bg-transparent'}`} style={{ width: `${student.percentage}%` }}></div>
                              </div>
                              <span className={`text-[10px] sm:text-xs font-black w-10 text-center ${student.percentage === 100 ? 'text-emerald-400' : student.has_started ? 'text-amber-400' : 'text-slate-500'}`}>{student.percentage}%</span>
                            </div>
                          </td>
                          
                          {!isOfficialMode && (
                            <td className="p-4 px-4 align-middle">
                              {student.has_started ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-inner font-black text-[10px] sm:text-xs"><CheckCircle2 className="w-3.5 h-3.5 drop-shadow-md"/> {student.correct_score}</span>
                                  <span className="flex items-center gap-1.5 text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 shadow-inner font-black text-[10px] sm:text-xs"><XCircle className="w-3.5 h-3.5 drop-shadow-md"/> {student.wrong_score}</span>
                                </div>
                              ) : (
                                <div className="text-center text-slate-600 font-black">-</div>
                              )}
                            </td>
                          )}

                          <td className="p-4 px-4 align-middle text-center">
                            <div className="flex justify-center">
                               {isOfficialMode ? (
                                  student.is_graded ? (
                                     <span className="text-[10px] sm:text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 w-fit shadow-inner font-black"><CheckCircle2 className="w-4 h-4"/> {student.teacher_feedback?.replace('[تم رصد الدرجة]', '') || 'تم التصحيح'}</span>
                                  ) : student.is_completed ? (
                                     <span className="text-[10px] sm:text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 w-fit shadow-inner font-black"><Activity className="w-4 h-4 animate-pulse"/> بانتظار التصحيح</span>
                                  ) : (
                                     <span className="text-[10px] sm:text-xs text-slate-400 border border-white/10 px-3 py-1.5 rounded-xl bg-white/5 shadow-inner font-black">لم يسلم الواجب</span>
                                  )
                               ) : (
                                 student.teacher_feedback ? (
                                   <span className="text-[10px] sm:text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 w-fit shadow-inner font-black"><CheckCircle2 className="w-4 h-4"/> أُرسلت ملاحظة</span>
                                 ) : (
                                   <span className="text-[10px] sm:text-xs text-slate-500 border border-white/5 px-3 py-1.5 rounded-xl bg-[#0f1423] shadow-inner font-bold">لا توجد ملاحظات</span>
                                 )
                               )}
                            </div>
                          </td>

                          <td className="p-4 px-6 align-middle">
                            <div className="flex items-center justify-center gap-2 sm:gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              {student.has_started && (
                                <button 
                                  onClick={() => handleResetStudentProgress(student.student_id, student.student_name)}
                                  className="bg-white/5 border border-rose-500/30 hover:border-rose-400 hover:text-rose-100 hover:bg-rose-500 p-2 sm:p-2.5 rounded-xl text-rose-400 transition-all shadow-inner active:scale-90"
                                  title="حذف التسليم وإعادة فتح الواجب"
                                >
                                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              )}

                              {isOfficialMode ? (
                                <button 
                                  onClick={() => openGradingModal(student)} 
                                  disabled={!student.is_completed || isGrading}
                                  className={`border px-4 py-2 sm:py-2.5 rounded-xl transition-all shadow-inner active:scale-95 font-black text-xs sm:text-sm flex items-center gap-2 justify-center min-w-[120px] ${
                                    !student.is_completed ? 'opacity-50 cursor-not-allowed border-white/10 text-slate-500 bg-[#0f1423]' :
                                    student.is_graded ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white' :
                                    'border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500 hover:text-white'
                                  }`}
                                >
                                  {isGrading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckSquare className="w-4 h-4" />} 
                                  {student.is_graded ? 'مراجعة / تعديل' : 'تصحيح الإجابة'}
                                </button>
                              ) : (
                                <button onClick={() => { setSelectedStudent(student); setFeedbackText(student.teacher_feedback || ''); setFeedbackModalOpen(true); }} className="bg-white/5 border border-white/10 hover:border-indigo-400 hover:text-white hover:bg-indigo-500 p-2 sm:p-2.5 rounded-xl text-slate-400 transition-all shadow-inner active:scale-90" title="إرسال ملاحظة للطالب">
                                  <MessageSquareHeart className="w-4 h-4 sm:w-5 sm:h-5" />
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

      {/* 🚀 النوافذ المنبثقة (Glass Modals) */}
      
      {/* نافذة الملاحظات (Feedback Modal) */}
      <AnimatePresence>
        {feedbackModalOpen && selectedStudent && !isOfficialMode && (
          <Dialog.Root open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
             <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg glass-panel rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden border border-indigo-500/30 animate-in zoom-in-95 duration-300" dir="rtl">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
                  
                  <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl shadow-inner border border-indigo-500/20"><Sparkles className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md"/></div>
                      <div>
                        <Dialog.Title className="font-black text-white text-lg sm:text-xl drop-shadow-md">رسالة توجيهية</Dialog.Title>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">إلى: {selectedStudent.student_name}</p>
                      </div>
                    </div>
                    <Dialog.Close className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 bg-white/5 rounded-xl shadow-inner border border-white/10 transition-colors active:scale-90"><X className="w-5 h-5"/></Dialog.Close>
                  </div>
                  
                  <div className="p-6 sm:p-8 space-y-4 relative z-10">
                    <div className="space-y-2">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest pl-1 drop-shadow-sm">اكتب ملاحظتك التوجيهية:</label>
                      <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="مثال: أداء ممتاز، لكن راجع قانون نيوتن الثاني..." className="w-full h-32 bg-[#02040a]/60 border border-white/10 p-4 sm:p-5 rounded-2xl font-bold text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 resize-none shadow-inner leading-relaxed transition-all placeholder:text-slate-600 custom-scrollbar text-sm"></textarea>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8 pt-0 flex flex-col-reverse sm:flex-row gap-3 relative z-10">
                    <Dialog.Close asChild>
                       <button className="flex-1 py-3.5 sm:py-4 bg-white/5 text-slate-300 border border-white/10 font-black rounded-xl hover:bg-white/10 transition-all active:scale-95 text-xs sm:text-sm shadow-inner">إلغاء</button>
                    </Dialog.Close>
                    <button onClick={saveFeedback} disabled={savingFeedback} className="flex-[2] py-3.5 sm:py-4 bg-indigo-600/90 backdrop-blur-md text-white font-black rounded-xl hover:bg-indigo-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 border border-indigo-400/50">
                      {savingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 drop-shadow-md" />} حفظ وإرسال للطالب
                    </button>
                  </div>
                </Dialog.Content>
             </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة التصحيح المتقدمة (Mega Grading Modal) */}
      <AnimatePresence>
        {gradingModalOpen && selectedStudent && isOfficialMode && (
          <Dialog.Root open={gradingModalOpen} onOpenChange={setGradingModalOpen}>
             <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-xl z-40 animate-in fade-in duration-300" />
                <Dialog.Content className="fixed bottom-0 left-0 w-full h-[95vh] glass-panel border-t border-white/10 rounded-t-[2.5rem] sm:rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-500" dir="rtl">
                  
                  {/* Grading Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-center p-5 sm:p-6 lg:p-8 border-b border-white/5 bg-[#0f1423]/80 backdrop-blur-2xl shrink-0 gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                       <Dialog.Close className="p-2 sm:p-2.5 text-slate-400 hover:text-rose-400 bg-white/5 border border-white/10 rounded-xl shadow-inner transition-colors active:scale-90"><X className="w-5 h-5 sm:w-6 sm:h-6" /></Dialog.Close>
                       <div className="text-right">
                          <Dialog.Title className="font-black text-white text-lg sm:text-xl drop-shadow-md">مراجعة وتصحيح: <span className="text-indigo-300">{selectedStudent.student_name}</span></Dialog.Title>
                          <p className="text-[10px] sm:text-xs font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 shadow-inner inline-flex items-center gap-1.5 mt-1.5"><BrainCircuit className="w-3 h-3"/> النقاط الآلية المكتسبة: {selectedStudent.correct_score}</p>
                       </div>
                    </div>
                    
                    <button onClick={submitFinalGrades} disabled={savingFeedback} className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600/90 backdrop-blur-md text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 border border-indigo-400/50">
                      {savingFeedback ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/> : <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md"/>} اعتماد ورصد الدرجة الشاملة
                    </button>
                  </div>

                  {/* Grading Content */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-32 space-y-6 sm:space-y-8 bg-transparent custom-scrollbar relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none z-0"></div>
                    
                    <div className="relative z-10 space-y-6 sm:space-y-8 max-w-6xl mx-auto">
                      {assignmentQuestions.map((q, idx) => {
                        const studentAnsObj = studentAnswers.find(a => a.question_id === q.id);
                        const studentText = studentAnsObj?.text_answer || studentAnsObj?.answer_text || 'لم يقم الطالب بالإجابة على هذا السؤال.';
                        const maxPts = q.points || 1;
                        const isEssay = q.question_type === 'essay';
                        
                        return (
                          <div key={q.id} className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white/5 shadow-lg flex flex-col xl:flex-row gap-6 lg:gap-8 bg-[#02040a]/60">
                            
                            {/* Question & Answer Area */}
                            <div className="flex-1 space-y-5 sm:space-y-6 min-w-0">
                              <div className="border-b border-white/10 pb-5">
                                <span className={`text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-xl mb-4 inline-flex items-center gap-2 border shadow-inner ${isEssay ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'}`}>
                                   {isEssay ? <><PenTool className="w-3.5 h-3.5"/> سؤال مقالي (يتطلب تصحيح) - {idx + 1}</> : <><Settings2 className="w-3.5 h-3.5"/> سؤال آلي التقييم - {idx + 1}</>}
                                </span>
                                <div className="font-bold text-white prose prose-sm max-w-none break-words tiptap-content drop-shadow-sm" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.content_html) }} />
                              </div>
                              
                              <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-[1.5rem] border shadow-inner relative ${isEssay ? 'bg-[#0f1423] border-indigo-500/30' : 'bg-white/5 border-white/10'}`}>
                                <div className="absolute top-0 right-6 -mt-3 bg-[#0f1423] px-3 py-0.5 rounded-md border border-white/10 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">إجابة الطالب</div>
                                <div className="font-bold text-slate-300 prose prose-sm max-w-none tiptap-content overflow-x-auto custom-scrollbar break-words" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(studentText) }} />
                              </div>
                            </div>
                            
                            {/* Grading Sidebar per question */}
                            <div className={`xl:w-[400px] shrink-0 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border flex flex-col h-full shadow-inner ${isEssay ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/5 border-white/5'}`}>
                              <div className="mb-6 flex-1 min-h-[150px]">
                                 <p className={`text-[10px] sm:text-xs font-black mb-3 flex items-center gap-1.5 drop-shadow-sm ${isEssay ? 'text-indigo-400' : 'text-slate-400'}`}><BrainCircuit className="w-4 h-4"/> الإجابة النموذجية كمرجع:</p>
                                 <div className="font-bold text-slate-300 text-xs sm:text-sm max-h-48 overflow-y-auto custom-scrollbar prose prose-sm max-w-none tiptap-content bg-[#02040a]/40 p-4 sm:p-5 rounded-2xl border border-white/5 break-words shadow-inner" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.model_answer_html || 'غير متوفرة')} />
                              </div>
                              
                              <div className={`mt-auto border-t pt-5 sm:pt-6 ${isEssay ? 'border-indigo-500/20' : 'border-white/10'}`}>
                                 <label className="block text-xs sm:text-sm font-black text-slate-300 mb-3 flex items-center justify-between drop-shadow-sm">
                                   <span>تقييم السؤال</span>
                                   <span className={`${isEssay ? 'text-indigo-300 bg-indigo-500/20 border-indigo-500/30' : 'text-slate-400 bg-white/10 border-white/10'} px-2.5 py-1 rounded-lg border text-[10px] sm:text-xs shadow-inner`}>من {maxPts}</span>
                                 </label>
                                 
                                 {isEssay ? (
                                   <div className="relative group">
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
                                       className="w-full bg-[#02040a]/60 border border-indigo-500/30 text-center font-black text-3xl sm:text-4xl py-4 sm:py-5 rounded-2xl shadow-inner focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none text-indigo-300 pr-10 transition-all custom-scrollbar" 
                                     />
                                     <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500/50 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none group-focus-within:text-indigo-400 transition-colors" />
                                   </div>
                                 ) : (
                                   <div className="w-full bg-white/5 border border-white/10 text-center font-black text-3xl sm:text-4xl py-4 sm:py-5 rounded-2xl shadow-inner text-slate-500 flex items-center justify-center gap-2 cursor-not-allowed">
                                      {studentAnsObj?.points_earned || 0} 
                                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 mt-2">/ رصد آلي</span>
                                   </div>
                                 )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Dialog.Content>
             </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

    </div>
  );
}
