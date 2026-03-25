'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, ArrowRight, User
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [studentData, setStudentData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [absentDates, setAbsentDates] = useState<string[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch student profile
      const { data: student } = await supabase
        .from('students')
        .select('*, users(*), sections(*, classes(*))')
        .eq('id', studentId)
        .single();
      
      setStudentData(student);

      if (student) {
        // Fetch attendance stats
        const { data: attendance } = await supabase
          .from('attendance')
          .select('status, date')
          .eq('student_id', student.id);
        
        if (attendance) {
          const total = attendance.length;
          const present = attendance.filter(a => a.status === 'present').length;
          const late = attendance.filter(a => a.status === 'late').length;
          const absent = attendance.filter(a => a.status === 'absent');
          
          setAttendanceStats({
            total,
            present,
            late,
            absent: absent.length,
            rate: total > 0 ? Math.round((present / total) * 100) : 100
          });
          setAbsentDates(absent.map(a => a.date));
        }

        // Fetch recent grades
        const { data: grades } = await supabase
          .from('exam_attempts')
          .select('*, exam:exams(title, subject:subjects(name))')
          .eq('student_id', student.id)
          .order('completed_at', { ascending: false })
          .limit(5);
        
        setRecentGrades(grades || []);
      }
    } catch (error) {
      console.error('Error fetching student profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;
  if (!studentData) return <div className="p-10 text-center">الطالب غير موجود</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold">
            {studentData.users?.full_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{studentData.users?.full_name}</h1>
            <p className="text-slate-500">{studentData.sections?.classes?.name} - {studentData.sections?.name}</p>
          </div>
        </div>
        <button 
          onClick={() => router.back()} 
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all"
        >
          رجوع
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-slate-100">
          <h3 className="text-lg font-bold mb-4">إحصائيات الحضور</h3>
          {attendanceStats && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>نسبة الحضور:</span>
                <span className="font-bold text-indigo-600">{attendanceStats.rate}%</span>
              </div>
              <div className="flex justify-between">
                <span>حاضر:</span>
                <span className="font-bold text-emerald-600">{attendanceStats.present}</span>
              </div>
              <div className="flex justify-between">
                <span>غائب:</span>
                <span className="font-bold text-red-600">{attendanceStats.absent}</span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-100">
          <h3 className="text-lg font-bold mb-4">تواريخ الغياب</h3>
          {absentDates.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {absentDates.map((date, index) => (
                <span key={index} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-sm font-bold text-center border border-red-100">
                  {format(new Date(date), 'yyyy-MM-dd')}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 font-bold">لا يوجد أيام غياب مسجلة.</p>
          )}
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-100">
        <h3 className="text-lg font-bold mb-4">آخر الدرجات</h3>
        <table className="w-full text-right">
          <thead>
            <tr className="border-b">
              <th className="py-2">الاختبار</th>
              <th className="py-2">المادة</th>
              <th className="py-2">الدرجة</th>
            </tr>
          </thead>
          <tbody>
            {recentGrades.map((grade) => (
              <tr key={grade.id} className="border-b">
                <td className="py-3">{grade.exam?.title}</td>
                <td className="py-3">{grade.exam?.subject?.name}</td>
                <td className="py-3 font-bold">{grade.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
