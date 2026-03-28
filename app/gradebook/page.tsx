'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { BookOpen, Users, Download, Search, Filter, Award, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

export default function GradebookPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchTeacherSections();
  }, [user]);

  const fetchTeacherSections = async () => {
    try {
      const { data } = await supabase
        .from('teacher_sections')
        .select('section_id, sections(id, name, classes(name))')
        .eq('teacher_id', user!.id);
        
      if (data) {
        // تنظيف البيانات القادمة من Supabase
        const cleanedSections = data.map((d: any) => d.sections || d.section).filter(Boolean);
        setSections(cleanedSections);
        if (cleanedSections.length > 0) {
          setSelectedSection(cleanedSections[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  useEffect(() => {
    if (!selectedSection) return;
    fetchGradebookData();
  }, [selectedSection]);

  const fetchGradebookData = async () => {
    setLoading(true);
    try {
      // 1. جلب طلاب هذا الفصل
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, users(full_name, email)')
        .eq('section_id', selectedSection)
        .order('created_at');

      // 2. جلب الاختبارات التي تم نشرها لهذا الفصل
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, title, total_marks')
        .eq('section_id', selectedSection);

      // 3. جلب درجات الطلاب (محاولات الاختبار)
      const examIds = (examsData || []).map(e => e.id);
      let attemptsData: any = { data: [] };
      
      if (examIds.length > 0) {
        attemptsData = await supabase
          .from('exam_attempts')
          .select('student_id, exam_id, score')
          .in('exam_id', examIds);
      }

      setStudents(studentsData || []);
      setExams(examsData || []);
      setGrades(attemptsData.data || []);

    } catch (error) {
      console.error('Error fetching gradebook:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentScore = (studentId: string, examId: string) => {
    const attempt = grades.find(g => g.student_id === studentId && g.exam_id === examId);
    return attempt ? attempt.score : '-';
  };

  // دالة لتصدير الجدول (كمثال وهمي أو يمكن ربطها بمكتبة لاحقاً)
  const handleExport = () => {
    alert("سيتم تصدير سجل الأداء كملف Excel أو PDF في التحديث القادم.");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 px-4 md:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto py-10 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Award className="text-indigo-600" size={36} /> سجل الأداء والدرجات
            </h1>
            <p className="text-slate-500 mt-2 font-medium">دفتر أعمال المعلم لمتابعة نتائج الطلاب بشكل شامل</p>
          </div>
          
          <div className="flex gap-3">
            <button onClick={handleExport} className="h-14 px-6 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
              <Download size={20} className="text-slate-400" /> تصدير السجل
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">الفصل الدراسي</label>
            <div className="relative">
               <select 
                 value={selectedSection}
                 onChange={(e) => setSelectedSection(e.target.value)}
                 className="w-full h-14 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl px-5 font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-600 transition-all"
               >
                 {sections.map(s => (
                   <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
                 ))}
                 {sections.length === 0 && <option value="">لا توجد فصول مسندة</option>}
               </select>
               <ChevronDown size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">بحث عن طالب</label>
            <div className="relative">
              <Search size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="اسم الطالب..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pr-12 pl-5 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-600 transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Gradebook Table */}
        <div className="bg-white rounded-[40px] shadow-2xl border border-white overflow-hidden">
          {loading ? (
             <div className="py-32 text-center text-slate-400 font-bold flex flex-col items-center">
                <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                جاري تحميل السجل...
             </div>
          ) : students.length === 0 ? (
             <div className="py-32 text-center text-slate-400 font-bold">
                لا يوجد طلاب مسجلين في هذا الفصل
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 border-collapse table-fixed">
                <thead className="bg-slate-50/80 backdrop-blur-md">
                  <tr>
                    <th className="py-6 px-8 text-right text-xs font-black text-slate-500 uppercase w-[300px] border-l border-slate-200">
                      اسم الطالب
                    </th>
                    {exams.map(exam => (
                      <th key={exam.id} className="py-6 px-4 text-center border-l border-slate-100 min-w-[150px]">
                        <span className="text-sm font-black text-slate-900 block truncate" title={exam.title}>{exam.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold">الدرجة العظمى: {exam.total_marks || 100}</span>
                      </th>
                    ))}
                    {exams.length === 0 && (
                      <th className="py-6 px-4 text-center text-xs font-bold text-slate-400">لا توجد اختبارات مسجلة</th>
                    )}
                    <th className="py-6 px-6 text-center text-xs font-black text-indigo-600 uppercase w-32 bg-indigo-50/30">
                      المتوسط
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students
                    .filter(s => s.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((student, idx) => {
                      
                      // حساب المتوسط للطالب
                      let totalAttempted = 0;
                      let totalScore = 0;
                      exams.forEach(ex => {
                         const s = getStudentScore(student.id, ex.id);
                         if (s !== '-') {
                           totalAttempted++;
                           totalScore += Number(s);
                         }
                      });
                      const studentAvg = totalAttempted > 0 ? Math.round(totalScore / totalAttempted) : '-';

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 px-8 border-l border-slate-50">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-black text-slate-900">{student.users?.full_name}</p>
                              </div>
                            </div>
                          </td>
                          
                          {exams.map(exam => {
                            const score = getStudentScore(student.id, exam.id);
                            const isPassing = score !== '-' && Number(score) >= 50;
                            
                            return (
                              <td key={`${student.id}-${exam.id}`} className="p-4 text-center border-l border-slate-50">
                                {score === '-' ? (
                                  <span className="text-slate-300 font-bold">-</span>
                                ) : (
                                  <span className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-black shadow-sm ${
                                    isPassing ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                  }`}>
                                    {score}%
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {exams.length === 0 && <td></td>}

                          <td className="p-4 text-center bg-indigo-50/10">
                            <span className="text-lg font-black text-indigo-700">
                              {studentAvg !== '-' ? `${studentAvg}%` : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


