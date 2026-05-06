// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Loader2, Search, Trash2, PrinterIcon, Contact, Crown, FileKey, 
  Database, UserCheck, FileArchive, Plus, X, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

// هيكلية مناصب الكنترول الثابتة
const CONTROL_ROLES = [
  { id: 'head', name: 'رئيس الكنترول', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'secret_numbering', name: 'مسؤول الأرقام السرية', icon: FileKey, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'data_entry', name: 'مسؤول الرصد والإدخال', icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'auditor', name: 'مراجع الدرجات', icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'archiver', name: 'مسؤول الحفظ والأرشيف', icon: FileArchive, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' }
];

export default function ControlTeamManagement() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRoleForAssign, setSelectedRoleForAssign] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // جلب أعضاء الكنترول الحاليين
      const { data: team } = await supabase
        .from('exam_control_team')
        .select('*, users!exam_control_team_user_id_fkey(full_name, avatar_url)')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester);

      // جلب المعلمين والإداريين للتكليف
      const { data: staff } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, role')
        .in('role', ['teacher', 'staff', 'management'])
        .order('full_name');

      setTeamMembers(team || []);
      setAvailableStaff(staff || []);
    } catch (error) {
      console.error('Error fetching control team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'management'].includes(currentRole)) fetchData();
  }, [currentRole]);

  const handleAssign = async () => {
    if (!selectedUserId || !selectedRoleForAssign || !user?.id) return;
    try {
      await supabase.from('exam_control_team').insert({
        user_id: selectedUserId,
        role_id: selectedRoleForAssign.id,
        role_name: selectedRoleForAssign.name,
        academic_year: currentYear,
        semester: currentSemester,
        assigned_by: user.id
      });
      setIsAssignModalOpen(false); setSelectedUserId(''); setSearchTerm(''); fetchData();
    } catch (error) {
      alert('لا يمكن تكليف هذا المعلم، قد يكون مكلفاً بمنصب آخر في الكنترول!');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('هل أنت متأكد من إعفاء هذا العضو من فريق الكنترول؟')) return;
    await supabase.from('exam_control_team').delete().eq('id', id);
    fetchData();
  };

  const printBadges = async () => {
    if (teamMembers.length === 0) { alert('لا يوجد أعضاء في الكنترول لطباعة هوياتهم!'); return; }
    setIsPrinting(true);
    setTimeout(async () => {
      if (!printRef.current) return;
      try {
        window.scrollTo(0, 0);
        const pages = printRef.current.querySelectorAll('.print-page-wrapper');
        const pdf = new jsPDF('p', 'mm', 'a4');
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, useCORS: true, allowTaint: false, logging: false, width: 794, height: 1122, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/jpeg', 0.85); 
          if (i > 0) pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        }
        pdf.save(`هويات_فريق_الكنترول_${currentSemester}.pdf`);
      } catch (err: any) { alert('حدث خطأ أثناء التصدير.'); } finally { setIsPrinting(false); }
    }, 2000);
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  const filteredStaff = availableStaff.filter(s => {
    const isAlreadyInTeam = teamMembers.some(tm => tm.user_id === s.id);
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return !isAlreadyInTeam && matchesSearch;
  });

  // تقسيم المصفوفة للطباعة
  const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo" dir="rtl">
      
      { (isLoading || isPrinting) && (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 animate-spin text-rose-500 mb-6" />
          <h2 className="text-2xl font-black mb-2 animate-pulse text-center px-4">{isPrinting ? 'جاري تجهيز هويات الكنترول السرية (VIP)...' : 'تحميل بيانات الكنترول...'}</h2>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 relative">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-rose-50/50 pointer-events-none"><ShieldCheck className="w-64 h-64" /></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-slate-100 pb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-rose-600" /> إدارة فريق الكنترول السري
              </h1>
              <p className="text-slate-500 font-bold text-sm">تشكيل وتكليف فريق الكنترول المركزي للامتحانات النهائية وإصدار بطاقات الدخول (VIP).</p>
            </div>
            <div className="flex gap-3">
              <button onClick={printBadges} disabled={teamMembers.length === 0} className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                <Contact className="w-4 h-4" /> طباعة هويات الكنترول (VIP)
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
             {CONTROL_ROLES.map(role => {
               const membersInRole = teamMembers.filter(tm => tm.role_id === role.id);
               const Icon = role.icon;

               return (
                 <div key={role.id} className={cn("rounded-3xl p-6 border shadow-sm transition-all", role.bg, role.border)}>
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-3">
                          <div className={cn("p-3 rounded-xl bg-white shadow-sm", role.color)}><Icon className="w-6 h-6" /></div>
                          <h3 className={cn("font-black text-lg", role.color)}>{role.name}</h3>
                       </div>
                    </div>

                    <div className="space-y-3">
                       {membersInRole.map(member => (
                         <div key={member.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-3">
                               {member.users?.avatar_url ? (
                                  <img src={member.users.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-slate-100" alt="av" />
                               ) : (
                                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black", role.bg, role.color)}>
                                     {String(member.users?.full_name).charAt(0) || 'م'}
                                  </div>
                               )}
                               <p className="font-black text-slate-800 text-sm">{member.users?.full_name}</p>
                            </div>
                            <button onClick={() => handleRemove(member.id)} className="p-2 bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                         </div>
                       ))}

                       <button onClick={() => { setSelectedRoleForAssign(role); setIsAssignModalOpen(true); }} className={cn("w-full py-3 rounded-2xl border-2 border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-colors bg-white/50 hover:bg-white", role.color, role.border)}>
                         <Plus className="w-4 h-4" /> تكليف {role.name}
                       </button>
                    </div>
                 </div>
               )
             })}
          </div>
        </div>
      </div>

      {/* نافذة التكليف المنبثقة */}
      {isAssignModalOpen && selectedRoleForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => {setIsAssignModalOpen(false); setSelectedUserId(''); setSearchTerm('');}}>
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                 {React.createElement(selectedRoleForAssign.icon, { className: cn("w-6 h-6", selectedRoleForAssign.color) })}
                 تكليف {selectedRoleForAssign.name}
              </h3>
              <button onClick={() => {setIsAssignModalOpen(false); setSelectedUserId(''); setSearchTerm('');}} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
              <div className="relative mb-4 shrink-0">
                 <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
                 <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500" placeholder="ابحث عن اسم المعلم أو الإداري..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                 {filteredStaff.map((staff) => {
                    const isSelected = selectedUserId === staff.id;
                    const initialChar = String(staff.full_name).charAt(0) || 'م';
                    return (
                       <div key={staff.id} onClick={() => setSelectedUserId(staff.id)} className={cn("p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all", isSelected ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "bg-white hover:border-indigo-300 border-slate-200 shadow-sm")}>
                          <div className="flex items-center gap-3">
                             {staff.avatar_url ? <img src={staff.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="av" /> : <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">{initialChar}</div>}
                             <div>
                                <p className="text-sm font-black text-slate-800">{staff.full_name}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">الصفة: {staff.role === 'teacher' ? 'معلم' : staff.role === 'staff' ? 'إداري' : 'مدير'}</p>
                             </div>
                          </div>
                       </div>
                    );
                 })}
                 {filteredStaff.length === 0 && <p className="text-center text-sm font-bold text-slate-400 py-8">لا يوجد نتائج أو جميعهم مكلفون مسبقاً.</p>}
              </div>

              <div className="pt-4 shrink-0 border-t border-slate-100 mt-4">
                <button onClick={handleAssign} disabled={!selectedUserId} className={cn("w-full py-4 text-white font-black rounded-2xl disabled:opacity-50 shadow-md flex items-center justify-center gap-2 transition-all", selectedRoleForAssign.bg.replace('/10', ''), "hover:opacity-90")}>
                  <CheckCircle2 className="w-5 h-5" /> اعتماد التكليف الرسمي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ قوالب الطباعة لهويات الكنترول (تصميم VIP) */}
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, opacity: 0.01, pointerEvents: 'none' }}>
         <div ref={printRef} className="flex flex-col gap-10" dir="rtl">
            {chunkArray(teamMembers, 6).map((chunk, pageIndex) => (
               <div key={pageIndex} className="print-page-wrapper bg-white mx-auto relative" style={{ width: '794px', height: '1122px', padding: '40px', boxSizing: 'border-box' }}>
                  <div className="flex flex-wrap gap-8 justify-center content-start">
                     {chunk.map((member:any) => {
                        const safeAvatar = member.users?.avatar_url ? `${member.users.avatar_url}?t=${new Date().getTime()}` : null;
                        
                        // باركود الكنترول الخاص به
                        const qrPayload = `raf-control:${member.user_id}`;
                        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}&margin=0`;

                        return (
                           <div key={member.id} className="w-[60mm] h-[95mm] border-[4px] border-rose-900 rounded-2xl relative overflow-hidden flex flex-col items-center text-center shadow-lg bg-white" style={{ pageBreakInside: 'avoid' }}>
                              
                              {/* هيدر البطاقة بلون روز داكن مخصص للكنترول */}
                              <div className="absolute top-0 left-0 w-full h-[30mm] bg-rose-900 shrink-0 flex flex-col items-center justify-start pt-3">
                                 <p className="text-white font-black text-[12px] mt-1">مدرسة الرفعة النموذجية</p>
                                 <p className="text-rose-200 font-bold text-[9px] mt-1 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800">غرفة الكنترول السرية (VIP)</p>
                              </div>
                              
                              <div className="relative z-10 w-[24mm] h-[24mm] mt-[16mm] mb-2 rounded-full bg-white border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                                 {safeAvatar ? <img src={safeAvatar} crossOrigin="anonymous" alt="Staff" className="w-full h-full object-cover" /> : <ShieldCheck className="w-10 h-10 text-slate-300" />}
                              </div>

                              <div className="relative z-10 w-full px-3 flex-1 flex flex-col items-center">
                                 <h2 className="text-[16px] font-black text-slate-900 mb-1 leading-tight line-clamp-2">{member.users?.full_name}</h2>
                                 <p className="text-[11px] font-black text-rose-600 mb-2 border-b border-slate-200 pb-2 w-full">{member.role_name}</p>
                                 
                                 <div className="mt-auto mb-3 flex flex-col items-center">
                                    <div className="w-[20mm] h-[20mm] bg-white p-1 rounded-lg border-2 border-rose-200 mb-1">
                                       <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-[8px] font-black text-slate-400">تصريح دخول الكنترول</p>
                                 </div>
                              </div>
                              
                              <div className="w-full h-2 bg-rose-600 shrink-0"></div>
                           </div>
                        )
                     })}
                  </div>
               </div>
            ))}
         </div>
      </div>

    </div>
  );
}
