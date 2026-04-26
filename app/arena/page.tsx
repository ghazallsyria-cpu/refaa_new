// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import { Gamepad2, FileText, ChevronLeft, Sparkles, BrainCircuit, Clock } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function StudentArenaDashboard() {
  const router = useRouter();
  const { user, userRole } = useAuth() as any;
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArenaMissions = async () => {
      try {
        // جلب جميع الواجبات وبنوك التدريب (V2) المنشورة فقط
        const { data, error } = await supabase
          .from('assignments_v2')
          .select(`
            id, 
            title, 
            description, 
            is_practice_mode, 
            due_date,
            created_at,
            subjects ( name ),
            users ( full_name )
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAssignments(data || []);
      } catch (err) {
        console.error('Error fetching arena missions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArenaMissions();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-indigo-500 font-bold flex flex-col items-center gap-2"><Sparkles className="w-8 h-8"/> جاري تحميل ساحة التحديات...</div></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-cairo" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* هيدر ساحة التحديات */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-white/20 backdrop-blur-md rounded-2xl mb-4">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black mb-2">ساحة التدريب والتحديات</h1>
            <p className="text-indigo-100 font-bold text-sm max-w-lg leading-relaxed">
              مرحباً بك في ساحتك التفاعلية! هنا يمكنك حل الواجبات الرسمية، أو الدخول إلى بنوك الأسئلة للتدرب المفتوح واكتشاف أخطائك فوراً.
            </p>
          </div>
          <BrainCircuit className="absolute -left-10 -bottom-10 w-64 h-64 text-white opacity-5" />
        </div>

        {/* قائمة المهام والتدريبات */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 px-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> المهام المتاحة ({assignments.length})
          </h2>
          
          {assignments.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-200">
              <p className="font-bold text-slate-500">لا توجد تحديات أو واجبات متاحة حالياً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignments.map((mission) => (
                <motion.div 
                  whileHover={{ y: -5 }}
                  key={mission.id} 
                  onClick={() => router.push(`/practice/${mission.id}`)}
                  className={`bg-white rounded-3xl p-5 shadow-sm border cursor-pointer transition-all hover:shadow-md flex flex-col justify-between h-full ${mission.is_practice_mode ? 'border-emerald-200 hover:border-emerald-400' : 'border-indigo-200 hover:border-indigo-400'}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 ${mission.is_practice_mode ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {mission.is_practice_mode ? <><Gamepad2 className="w-3 h-3"/> بنك تدريب</> : <><FileText className="w-3 h-3"/> واجب رسمي</>}
                      </span>
                      {mission.subjects?.name && (
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{mission.subjects.name}</span>
                      )}
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-2 leading-snug">{mission.title}</h3>
                    <p className="text-xs font-bold text-slate-500 line-clamp-2 mb-4">{mission.description}</p>
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t border-slate-50 mt-auto">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> تم النشر: {new Date(mission.created_at).toLocaleDateString('ar-KW')}
                    </div>
                    <div className={`p-2 rounded-full ${mission.is_practice_mode ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
                      <ChevronLeft className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
