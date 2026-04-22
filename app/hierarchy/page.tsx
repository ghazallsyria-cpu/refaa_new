/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Crown, ShieldCheck, ChevronDown, ChevronUp, 
  Sparkles, GraduationCap, MapPin, Mail, Award, 
  Edit2, Image as ImageIcon, Loader2, X, UploadCloud, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHierarchySystem } from '@/hooks/useHierarchySystem';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

// 🧩 1. بطاقة الإدارة (محمية الخصوصية)
const AdminCard = ({ user, role, delay }: any) => {
  const isImage = user?.avatar_url?.trim();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="w-full sm:w-80 relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
      <div className="relative flex flex-col items-center p-8 bg-[#0a0d16] rounded-[2.5rem] border border-white/10 shadow-2xl h-full overflow-hidden">
        <Crown className="absolute -top-5 text-yellow-500 h-10 w-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
        <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-5 overflow-hidden shadow-inner border border-indigo-500/30">
          {isImage ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : <Users className="h-10 w-10 text-indigo-400" />}
        </div>
        <h3 className="font-black text-xl text-white text-center truncate w-full drop-shadow-sm">{user?.full_name}</h3>
        <span className="text-[10px] font-black px-4 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 mt-4 border border-indigo-500/20 uppercase tracking-widest">{role}</span>
      </div>
    </motion.div>
  );
};

// 🧩 2. بطاقة القسم الملكية (تدعم الصور السينمائية)
const DepartmentCard = ({ dept, delay, isAdmin, onEditImage }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const hod = dept.hod;
  const members = dept.members;
  const hasImage = dept.image_url?.trim();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="bg-[#05070e]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-xl overflow-hidden group hover:border-white/10 transition-all relative flex flex-col h-full">
      
      {/* الخلفية السينمائية */}
      <div className="relative h-36 overflow-hidden bg-[#0a0d16]">
        {hasImage ? (
          <img src={dept.image_url} alt={dept.name} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-purple-900/20 flex items-center justify-center">
            <Sparkles className="text-white/5 w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070e] via-[#05070e]/40 to-transparent"></div>
        
        {isAdmin && (
          <button onClick={() => onEditImage(dept)} className="absolute top-4 left-4 p-2.5 bg-white/10 hover:bg-indigo-600 backdrop-blur-md rounded-xl border border-white/10 text-white transition-all active:scale-90 z-20 shadow-lg group/btn">
             <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
          </button>
        )}

        <div className="absolute bottom-4 right-6 z-10">
          <h2 className="text-xl font-black text-white drop-shadow-lg flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            قسم {dept.name}
          </h2>
        </div>
      </div>

      <div className="p-6 flex flex-col items-center relative z-10 -mt-6">
        {hod ? (
          <div className="flex flex-col items-center w-full">
            <div className="w-20 h-20 rounded-[1.5rem] bg-[#05070e] flex items-center justify-center mb-4 overflow-hidden shadow-2xl border-2 border-white/10 relative">
              {hod.users?.avatar_url ? <img src={hod.users.avatar_url} alt="HOD" className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-indigo-400">{hod.users?.full_name?.charAt(0)}</span>}
            </div>
            <h3 className="font-black text-lg text-white text-center truncate w-full">{hod.users?.full_name}</h3>
            <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-2 border border-emerald-500/20">رئيس القسم</span>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-500 text-xs font-bold">بانتظار تعيين رئيس قسم</div>
        )}

        <button onClick={() => setIsOpen(!isOpen)} className="w-full mt-6 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between group/toggle">
          <span className="text-xs font-black text-slate-300 group-hover/toggle:text-white">طاقم التدريس ({members.length})</span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-full overflow-hidden">
              <div className="pt-4 space-y-2">
                {members.map((member: any) => (
                  <Link href={`/teachers/${member.id}`} key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-600/10 border border-transparent hover:border-indigo-500/20 transition-all group/member">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#02040a] border border-white/5 shrink-0">
                      {member.users?.avatar_url ? <img src={member.users.avatar_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black text-indigo-500">{member.users?.full_name?.charAt(0)}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-white truncate group-hover/member:text-indigo-400 transition-colors">{member.users?.full_name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{member.specialization || 'معلم'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default function HierarchyPage() {
  const { authRole } = useAuth() as any;
  const { loading, fetchHierarchyData } = useHierarchySystem();
  const [data, setData] = useState<any>(null);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchHierarchyData().then(setData);
  }, [fetchHierarchyData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingDept) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const response = await fetch('/api/departments/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result, departmentId: editingDept.id }),
        });
        if (response.ok) {
          const result = await response.json();
          setData((prev: any) => ({
            ...prev,
            departments: prev.departments.map((d: any) => d.id === editingDept.id ? { ...d, image_url: result.url } : d)
          }));
          setEditingDept(null);
        }
      } catch (err) { alert('خطأ في الرفع'); } 
      finally { setIsUploading(false); }
    };
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090b14] gap-5">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
        <p className="text-indigo-400 font-black animate-pulse tracking-widest">جاري بناء الهيكل الأكاديمي...</p>
      </div>
    );
  }

  const isAdmin = authRole === 'admin' || authRole === 'management';

  return (
    <div className="min-h-screen bg-[#090b14] py-12 px-4 sm:px-6 lg:px-8 font-cairo text-slate-200 relative overflow-hidden" dir="rtl">
      
      {/* الخلفية المضيئة */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-20 relative z-10">
        
        {/* قسم الإدارة */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl shadow-xl mb-4"><Crown className="w-10 h-10" /></div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">القيادة العليا للمنصة</h1>
            <p className="text-slate-400 font-bold max-w-2xl mx-auto">شؤون الإدارة والتدقيق العام لضمان سير العملية التعليمية وفق دستور الرفعة.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {data.admins.map((admin: any, idx: number) => (
              <AdminCard key={admin.id} user={admin} role="شؤون الإدارة" delay={idx * 0.1} />
            ))}
          </div>
        </section>

        {/* الأقسام الأكاديمية */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl shadow-xl mb-4"><GraduationCap className="w-10 h-10" /></div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">الأقسام العلمية والأدبية</h2>
            <p className="text-slate-400 font-bold max-w-2xl mx-auto">صُناع الأثر الأكاديمي، مرتبين حسب التخصص والريادة العلمية.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.departments.map((dept: any, idx: number) => (
              <DepartmentCard key={dept.id} dept={dept} isAdmin={isAdmin} onEditImage={setEditingDept} delay={idx * 0.05} />
            ))}
          </div>
        </section>
      </div>

      {/* 🚀 مودال رفع الصور للمدير */}
      <AnimatePresence>
        {editingDept && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#02040a]/90 backdrop-blur-md" onClick={() => setEditingDept(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-[#0f1423] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl z-10 text-center">
              <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                <ImageIcon className="text-indigo-400 w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">تغيير خلفية القسم</h3>
              <p className="text-slate-400 text-sm font-bold mb-8 leading-relaxed">قسم {editingDept.name} يستحق هوية بصرية متميزة. اختر صورة سينمائية تعكس روح المادة.</p>
              
              <label className="relative group cursor-pointer block">
                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={isUploading} />
                <div className="py-6 px-4 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl group-hover:border-indigo-500/50 group-hover:bg-white/10 transition-all">
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-3 text-indigo-400 font-black">
                      <Loader2 className="animate-spin w-5 h-5" /> جاري الرفع لكلاودينري...
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                       <span className="text-slate-300 font-black text-sm">انقر لاختيار صورة من جهازك</span>
                    </div>
                  )}
                </div>
              </label>
              
              <button onClick={() => setEditingDept(null)} className="mt-8 text-slate-500 font-black text-xs hover:text-rose-400 transition-colors flex items-center justify-center gap-2 mx-auto">
                <X className="w-4 h-4" /> إلغاء العملية
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
