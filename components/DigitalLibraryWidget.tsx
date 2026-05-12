// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Folder, FileArchive, ExternalLink, ChevronLeft, Loader2, Library } from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  created_at: string;
  target_role: string;
}

export default function DigitalLibraryWidget({ userRole }: { userRole: 'student' | 'teacher' | 'parent' }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        // 🚀 جلب المستندات الموجهة للجميع (all) أو الموجهة لهذا المستخدم تحديداً
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .or(`target_role.eq.all,target_role.eq.${userRole}`)
          .order('created_at', { ascending: false })
          .limit(8); // نعرض أحدث 8 مستندات فقط في الرئيسية

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Error fetching documents for widget:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [userRole]);

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'forms': return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: <FileText className="h-5 w-5 text-blue-400" /> };
      case 'policies': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: <Folder className="h-5 w-5 text-amber-400" /> };
      case 'educational': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: <FileArchive className="h-5 w-5 text-emerald-400" /> };
      default: return { bg: 'bg-slate-500/10', border: 'border-white/10', text: 'text-slate-400', icon: <FileText className="h-5 w-5 text-slate-400" /> };
    }
  };

  if (loading) {
    return (
      <div className="bg-[#131836]/60 backdrop-blur-md border border-white/5 rounded-[2rem] lg:rounded-[2.5rem] p-8 flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // إذا لم يكن هناك مستندات، يختفي المكون بصمت (أو يمكننا إظهار رسالة فارغة أنيقة)
  if (documents.length === 0) return null;

  return (
    <div className="bg-[#131836]/60 backdrop-blur-md border border-white/5 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none -z-10"></div>
      
      {/* 🏷️ هيدر الودجت */}
      <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl sm:rounded-2xl border border-indigo-500/20 shadow-inner">
             <Library className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400 drop-shadow-md" />
          </div> 
          المكتبة والمستندات
        </h2>
        {/* زر لعرض كل المستندات في حال أردنا إضافة صفحة كاملة مستقبلاً */}
        <button className="text-xs sm:text-sm font-bold text-indigo-400 flex items-center gap-1 opacity-50 cursor-not-allowed">
          أحدث الملفات المُضافة
        </button>
      </div>

      {/* 📁 شريط تمرير المستندات */}
      <div className="p-5 sm:p-6 lg:p-8 flex overflow-x-auto gap-4 snap-x snap-mandatory custom-scrollbar pb-6 relative z-10" dir="rtl">
        {documents.map((doc) => {
          const styles = getCategoryStyles(doc.category);
          return (
            <div 
              key={doc.id} 
              className="snap-center shrink-0 w-[260px] sm:w-[300px] bg-[#0F172A]/80 border border-white/5 rounded-2xl sm:rounded-3xl p-5 flex flex-col hover:border-indigo-500/40 hover:bg-[#0F172A] transition-all shadow-lg group relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none"></div>
              
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl border shadow-inner shrink-0 ${styles.bg} ${styles.border}`}>
                  {styles.icon}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors" title={doc.title}>
                    {doc.title}
                  </h3>
                </div>
              </div>
              
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 line-clamp-2 leading-relaxed mb-6 flex-1">
                {doc.description || 'لا يوجد وصف مضاف لهذا المستند.'}
              </p>
              
              <a 
                href={doc.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 rounded-xl bg-white/5 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs sm:text-sm font-black transition-all border border-white/10 hover:border-indigo-500 active:scale-95 shadow-sm"
              >
                فتح المستند <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
