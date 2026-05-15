import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 🚀 تعريف هيكل بيانات المادة المتوافق مع شاشة المحاكاة الجديدة
export interface SubjectAnalysis {
  subject_name: string;
  coursework_max: number;
  exam_max: number;
  total_max: number;
  passing_mark: number;
  real_coursework: number;
  predicted_coursework: number;
  predicted_exam: number;
  status: string;
  message: string;
}

export function useAcademicCompass() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SubjectAnalysis[]>([]);
  const [studentStage, setStudentStage] = useState<string>('');

  // 🧠 الدالة الذكية للتعرف على مرحلة الطالب (تمنع خطأ القيمة الافتراضية)
  const fetchStudentStage = useCallback(async (studentId: string) => {
    try {
      // استعلام واسع يغطي جميع احتمالات حفظ بيانات المرحلة في قاعدة بياناتك
      const { data, error } = await supabase
        .from('students')
        .select(`
          track,
          grade_level,
          next_year_track,
          sections (
            classes ( level, name )
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) {
         console.warn("⚠️ تنبيه: تعذر جلب بيانات الطالب، سنستخدم 12 علمي كافتراضي.", error);
         return '12_scientific';
      }

      const rawData = data as any;
      
      // 1. محاولة استخراج الصف 
      let rawLevel = rawData?.grade_level; 
      
      if (!rawLevel) {
        if (Array.isArray(rawData?.sections) && rawData.sections.length > 0) {
          rawLevel = rawData.sections[0]?.classes?.level || rawData.sections[0]?.classes?.name;
        } else if (rawData?.sections?.classes) {
          rawLevel = rawData.sections.classes.level || rawData.sections.classes.name;
        }
      }

      // 2. محاولة استخراج المسار
      const rawTrack = rawData?.track || rawData?.next_year_track || 'scientific';

      // 3. تحويل القيم لنصوص لتطبيق المطابقة الذكية
      const levelStr = String(rawLevel || '').toLowerCase(); 
      const trackStr = String(rawTrack || '').toLowerCase();

      let stage = '12_scientific'; // الحماية الأخيرة

      // 4. خوارزمية المطابقة (Fuzzy Matching) لدعم الأرقام والنصوص العربية
      if (levelStr.includes('10') || levelStr.includes('عاشر')) {
        stage = '10';
      } 
      else if (levelStr.includes('11') || levelStr.includes('حادي')) {
        stage = (trackStr.includes('lit') || trackStr.includes('أدبي')) ? '11_literary' : '11_scientific';
      } 
      else if (levelStr.includes('12') || levelStr.includes('ثاني')) {
        stage = (trackStr.includes('lit') || trackStr.includes('أدبي')) ? '12_literary' : '12_scientific';
      }

      setStudentStage(stage);
      return stage;
      
    } catch (err) {
      console.error("Error in fetchStudentStage:", err);
      return '12_scientific';
    }
  }, []);

  // 📡 الدالة الأساسية لجلب اللوائح والدرجات
  const calculateCompass = useCallback(async (studentId: string, manualStage?: string) => {
    setLoading(true);
    try {
      // استخدم المرحلة اليدوية (للمدير) أو اجلب مرحلة الطالب الحقيقية
      const targetStage = manualStage || await fetchStudentStage(studentId);
      setStudentStage(targetStage); 

      // جلب اللوائح والأوزان الخاصة بالمرحلة
      const { data: rules } = await supabase
        .from('kuwait_grading_rules')
        .select('*')
        .eq('academic_stage', targetStage)
        .order('subject_name');

      // جلب درجات الطالب المرصودة سابقاً (للبدء منها في المحاكاة)
      const { data: grades } = await supabase
        .from('grades')
        .select('score, subjects(name)')
        .eq('student_id', studentId);

      // ترتيب الدرجات في قاموس لسرعة الوصول
      const gradesMap = new Map<string, number>();
      if (grades) {
        grades.forEach(g => {
          const subjectData = g.subjects as any;
          if (subjectData && typeof subjectData.name === 'string') {
            gradesMap.set(subjectData.name, g.score || 0);
          }
        });
      }

      // دمج اللوائح مع درجات الطالب الحقيقية
      const generated: SubjectAnalysis[] = (rules || []).map(rule => {
        const realScore = gradesMap.get(rule.subject_name) || 0;
        return {
          subject_name: rule.subject_name,
          coursework_max: rule.coursework_max,
          exam_max: rule.exam_max,
          total_max: rule.total_max,
          passing_mark: rule.passing_mark,
          real_coursework: realScore, // الدرجة الحقيقية إن وجدت
          predicted_coursework: realScore, // التوقع يبدأ من الدرجة الحقيقية
          predicted_exam: 0, // يبدأ من صفر ليقوم الطالب بتحريكه
          status: 'SAFE',
          message: ''
        };
      });

      setAnalysis(generated);
      return { generated, targetStage };
      
    } finally {
      setLoading(false);
    }
  }, [fetchStudentStage]);

  return { calculateCompass, analysis, loading, studentStage };
}
