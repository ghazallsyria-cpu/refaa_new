'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Beaker, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/context/notification-context';

/* ================= TYPES ================= */

type Step = 'selection' | 'confirming' | 'success' | 'already-selected' | 'not-eligible';
type Track = 'scientific' | 'literary';

/* ================= PAGE ================= */

export default function TrackPage() {
  const { user, userRole } = useAuth();
  const { fetchStudentProfile, selectTrack } = useUsersSystem();
  const { showNotification } = useNotifications();
  const router = useRouter();

  const [step, setStep] = useState<Step>('selection');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!user) return;
      
      if (userRole !== 'student') {
        setStep('not-eligible');
        setLoading(false);
        return;
      }

      try {
        const profile = await fetchStudentProfile(user.id);
        const student = profile.student;
        setStudentData(student);

        // Check if student is in 10th grade
        // Assuming class level 10 is 10th grade
        const classLevel = student.sections?.classes?.level;
        
        if (classLevel !== 10) {
          setStep('not-eligible');
        } else if (student.next_year_track) {
          setStep('already-selected');
          setSelectedTrack(student.next_year_track as Track);
        } else {
          setStep('selection');
        }
      } catch (err) {
        console.error("Error checking eligibility:", err);
        setError("حدث خطأ أثناء التحقق من الأهلية");
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, [user, userRole, fetchStudentProfile]);

  const handleSelect = (track: Track) => {
    setSelectedTrack(track);
  };

  const confirmSelection = async () => {
    if (!studentData || !selectedTrack) return;

    setLoading(true);
    setError(null);

    try {
      await selectTrack(studentData.id, selectedTrack);
      setStep('success');
      showNotification('success', 'تم حفظ اختيارك بنجاح');
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء حفظ اختيارك. يرجى المحاولة مرة أخرى.");
      showNotification('error', 'فشل حفظ الاختيار');
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 'selection') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (step === 'not-eligible') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center border border-slate-100">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-4">غير متاح</h2>
          <p className="text-slate-600 mb-8 text-lg">
            عذراً، هذه الميزة متاحة فقط لطلاب الصف العاشر لتحديد مسارهم للعام القادم.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (step === 'already-selected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center border border-slate-100">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-4">تم الاختيار مسبقاً</h2>
          <p className="text-slate-600 mb-8 text-lg">
            لقد قمت بالفعل باختيار <span className="font-bold text-blue-600">{selectedTrack === 'scientific' ? 'المسار العلمي' : 'المسار الأدبي'}</span>.
            لا يمكن تغيير الاختيار إلا من خلال الإدارة.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block p-3 bg-blue-100 rounded-full mb-4"
          >
            <GraduationCap className="w-8 h-8 text-blue-600" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl md:text-4xl font-bold text-slate-900 mb-2"
          >
            تحديد المسار الأكاديمي (الصف العاشر)
          </motion.h1>

          <p className="text-slate-500 text-lg font-medium">
            مستقبلك يبدأ بقرارك اليوم، اختر مسارك للحادي عشر
          </p>
        </header>

        <AnimatePresence mode="wait">
          {step === 'selection' && (
            <motion.div 
              key="selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -100 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <TrackOption 
                title="المسار العلمي"
                desc="للراغبين في تخصصات الطب، الهندسة، والعلوم الطبيعية."
                icon={<Beaker className="w-12 h-12" />}
                isSelected={selectedTrack === 'scientific'}
                onSelect={() => handleSelect('scientific')}
                color="blue"
              />

              <TrackOption 
                title="المسار الأدبي"
                desc="للراغبين في تخصصات القانون، الإعلام، والعلوم الإنسانية."
                icon={<BookOpen className="w-12 h-12" />}
                isSelected={selectedTrack === 'literary'}
                onSelect={() => handleSelect('literary')}
                color="purple"
              />

              <div className="md:col-span-2 flex justify-center mt-8">
                <button
                  onClick={() => selectedTrack && setStep('confirming')}
                  disabled={!selectedTrack}
                  className={`px-12 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-3 shadow-lg ${
                    selectedTrack 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  متابعة التأكيد
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'confirming' && (
            <motion.div 
              key="confirming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto bg-white p-8 rounded-3xl shadow-xl text-center border border-slate-100"
            >
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />

              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                تأكيد الرغبة
              </h2>

              <p className="text-slate-600 mb-8 text-lg">
                هل أنت متأكد من اختيار{" "}
                <span className="font-bold text-blue-600">
                  {selectedTrack === 'scientific' ? 'المسار العلمي' : 'المسار الأدبي'}
                </span>؟
              </p>
              
              {error && <p className="text-red-500 mb-4 text-sm font-bold">{error}</p>}

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmSelection}
                  disabled={loading}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-md active:scale-95"
                >
                  {loading 
                    ? <Loader2 className="animate-spin w-5 h-5" /> 
                    : <CheckCircle2 className="w-5 h-5" />}
                  تأكيد نهائي وحفظ
                </button>

                <button
                  onClick={() => setStep('selection')}
                  disabled={loading}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  تغيير الاختيار
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto bg-white p-12 rounded-3xl shadow-2xl text-center border border-green-100"
            >
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                تم الحفظ بنجاح
              </h2>

              <p className="text-slate-600 mb-8 text-lg">
                شكراً لك، تم تسجيل رغبتك بنجاح في نظام المدرسة.
              </p>

              <button
                onClick={() => router.push('/')}
                className="px-10 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all active:scale-95"
              >
                العودة للرئيسية
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */

type TrackOptionProps = {
  title: string;
  desc: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  color: 'blue' | 'purple';
};

function TrackOption({
  title,
  desc,
  icon,
  isSelected,
  onSelect,
  color
}: TrackOptionProps) {

  const activeClass = color === 'blue' 
    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100/50 shadow-blue-100 shadow-lg' 
    : 'border-purple-500 bg-purple-50 ring-4 ring-purple-100/50 shadow-purple-100 shadow-lg';
  
  const iconClass = color === 'blue' 
    ? 'bg-blue-100 text-blue-600' 
    : 'bg-purple-100 text-purple-600';

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`cursor-pointer p-8 rounded-[2.5rem] border-2 transition-all relative ${
        isSelected 
          ? activeClass 
          : "bg-white border-slate-100 hover:border-slate-300 shadow-sm"
      }`}
    >
      <div className={`mb-6 p-4 rounded-2xl inline-block transition-all ${
        isSelected ? 'bg-white shadow-sm' : iconClass
      }`}>
        {icon}
      </div>

      <h3 className="text-2xl font-bold mb-3 text-slate-800">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-lg">{desc}</p>

      {isSelected && (
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          className="absolute top-6 left-6"
        >
          <CheckCircle2 className={`w-8 h-8 ${
            color === 'blue' ? 'text-blue-600' : 'text-purple-600'
          }`} />
        </motion.div>
      )}
    </motion.div>
  );
}
