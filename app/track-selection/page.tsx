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

type Step =
  | 'selection'
  | 'confirming'
  | 'success'
  | 'already-selected'
  | 'not-eligible';

type Track = 'scientific' | 'literary';

/* ================= PAGE ================= */

export default function TrackPage() {
  const { user, userRole } = useAuth();
  const { fetchStudentProfile, selectTrack } = useUsersSystem();
  const { sendNotification } = useNotifications() as any;
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

        const classLevel = student?.sections?.classes?.level;

        if (classLevel !== 10) {
          setStep('not-eligible');
        } else if (student?.next_year_track) {
          setStep('already-selected');
          setSelectedTrack(student.next_year_track as Track);
        } else {
          setStep('selection');
        }
      } catch (err) {
        console.error('Error checking eligibility:', err);
        setError('حدث خطأ أثناء التحقق من الأهلية');
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
      sendNotification('success', 'تم حفظ اختيارك بنجاح');
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ اختيارك. يرجى المحاولة مرة أخرى.');
      sendNotification('error', 'فشل حفظ الاختيار');
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
            هذه الميزة متاحة فقط لطلاب الصف العاشر.
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
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            تم الاختيار مسبقاً
          </h2>
          <p className="text-slate-600 mb-8 text-lg">
            تم اختيار المسار مسبقاً.
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
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-blue-600" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            تحديد المسار الأكاديمي
          </h1>

          <p className="text-slate-500 text-lg font-medium">
            اختر مسارك للمرحلة القادمة
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
                desc="للعلوم والتخصصات الطبية والهندسية"
                icon={<Beaker className="w-12 h-12" />}
                isSelected={selectedTrack === 'scientific'}
                onSelect={() => handleSelect('scientific')}
                color="blue"
              />

              <TrackOption
                title="المسار الأدبي"
                desc="للعلوم الإنسانية والاجتماعية"
                icon={<BookOpen className="w-12 h-12" />}
                isSelected={selectedTrack === 'literary'}
                onSelect={() => handleSelect('literary')}
                color="purple"
              />

              <div className="md:col-span-2 flex justify-center mt-8">
                <button
                  onClick={() => selectedTrack && setStep('confirming')}
                  disabled={!selectedTrack}
                  className="px-12 py-4 rounded-2xl font-bold text-lg bg-blue-600 text-white disabled:opacity-50"
                >
                  متابعة
                </button>
              </div>
            </motion.div>
          )}

          {step === 'confirming' && (
            <motion.div
              key="confirming"
              className="max-w-xl mx-auto bg-white p-8 rounded-3xl shadow-xl text-center"
            >
              <h2 className="text-2xl font-bold mb-4">تأكيد الاختيار</h2>

              <p className="mb-8">
                تأكيد اختيار:
                <span className="font-bold">
                  {selectedTrack === 'scientific'
                    ? ' العلمي'
                    : ' الأدبي'}
                </span>
              </p>

              {error && <p className="text-red-500 mb-4">{error}</p>}

              <button
                onClick={confirmSelection}
                disabled={loading}
                className="w-full py-4 bg-green-600 text-white rounded-xl"
              >
                {loading ? 'جاري الحفظ...' : 'تأكيد'}
              </button>

              <button
                onClick={() => setStep('selection')}
                className="w-full mt-3 py-4 bg-slate-200 rounded-xl"
              >
                رجوع
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              className="max-w-xl mx-auto bg-white p-12 rounded-3xl text-center"
            >
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />

              <h2 className="text-2xl font-bold mb-4">
                تم الحفظ
              </h2>

              <button
                onClick={() => router.push('/')}
                className="px-10 py-3 bg-slate-900 text-white rounded-xl"
              >
                الرئيسية
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
  return (
    <div
      onClick={onSelect}
      className={`p-8 rounded-3xl border cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'bg-white'
      }`}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-500">{desc}</p>
    </div>
  );
}
