// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Loader2, Search, Trash2, PrinterIcon, Contact, Crown, FileKey, 
  Database, UserCheck, FileArchive, Plus, X, AlertTriangle, CheckCircle2,
  KeyRound, MonitorCheck, ClipboardSignature, Edit3
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

// 🚀 التصنيفات البرمجية المتوافقة تماماً مع قيود قاعدة البيانات الصارمة
const BASE_ROLES = [
  { id: 'head', defaultName: 'رئيس الكنترول', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'secret_numbering', defaultName: 'مسؤول الأرقام السرية', icon: KeyRound, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'data_entry', defaultName: 'مسؤول الرصد والإدخال', icon: MonitorCheck, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'auditor', defaultName: 'مراجع ومُدقق الدرجات', icon: ClipboardSignature, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'archiver', defaultName: 'مسؤول الحفظ والأرشيف', icon: FileArchive, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
];

export default function ControlTeamManagement() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBaseRole, setSelectedBaseRole] = useState<any>(null);
  const [customRoleTitle, setCustomRoleTitle] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: team } = await supabase
        .from('exam_control_team')
        .select('*, users!exam_control_team_user_id_fkey(full_name, avatar_url)')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('created_at', { ascending: true });

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

  const openAssignModal = (baseRole: any) => {
    setSelectedBaseRole(baseRole);
    setCustomRoleTitle(baseRole.defaultName);
    setSelectedUserId('');
    setSearchTerm('');
    setIsAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedUserId || !selectedBaseRole || !customRoleTitle.trim() || !user?.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('exam_control_team').insert({
        user_id: selectedUserId,
        role_id: selectedBaseRole.id, // 🚀 يطابق قاعدة البيانات حرفياً لتجاوز الحظر
        role_name: customRoleTitle.trim(), // 🚀 يُطبع على البطاقة حسب رغبة المدير
        academic_year: currentYear,
        semester: currentSemester,
        assigned_by: user.id
      });
      
      if (error) throw error;

      setIsAssignModalOpen(false); 
      fetchData();
    } catch (error: any) {
      console.error("Assignment Error:", error);
      alert('تعذر التكليف! تأكد من أن المعلم غير مكلف مسبقاً في الكنترول.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من إعفاء (${name}) من فريق الكنترول؟`)) return;
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
          const canvas = await html2canvas(pages[i] as HTMLElement, { 
            scale: 2, 
            useCORS: true, 
            allowTaint: false, 
            logging: false, 
            width: 794, 
            height: 1122, 
            backgroundColor: '#ffffff' 
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 1.0); 
          if (i > 0) pdf.addPage(); 
          pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        }
        pdf.save(`هويات_فريق_الكنترول_VIP_${currentSemester}.pdf`);
      } catch (err: any) { 
        alert('حدث خطأ أثناء التصدير.'); 
      } finally { 
        setIsPrinting(false); 
      }
    }, 2000); 
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  const filteredStaff = availableStaff.filter(s => {
    const isAlreadyInTeam = teamMembers.some(tm => tm.user_id === s.id);
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return !isAlreadyInTeam && matchesSearch;
  });

  const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10 font-cairo pb-20" dir="rtl">
      
      <AnimatePresence>
        { (isLoading || isPrinting) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-16 h-16 animate-spin text-rose-500 mb-6" />
            <h2 className="text-2xl font-black mb-2 animate-pulse text-center px-4">
              {isPrinting ? 'جاري تجهيز هويات الكنترول السرية (VIP)...' : 'تجهيز غرفة العمليات...'}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8 relative">
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-rose-50/50 pointer-events-none">
            <ShieldCheck className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-6 sm:pb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-rose-600" /> إدارة فريق الكنترول السري
              </h1>
              <p className="text-slate-500 font-bold text-sm">تشكيل وتكليف فريق الكنترول، مع إمكانية إسناد مسميات مخصصة وطباعة الهويات.</p>
            </div>
            <div className="w-full lg:w-auto">
              <button onClick={printBadges} disabled={teamMembers.length === 0} className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                <PrinterIcon className="w-5 h-5" /> طباعة الهويات الأمنية
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
             {BASE_ROLES.map(role => {
               const membersInRole = teamMembers.filter(tm => tm.role_id === role.id);
               const Icon = role.icon;

               return (
                 <div key={role.id} className={cn("rounded-3xl p-6 border shadow-sm transition-all flex flex-col h-full", role.bg, role.border)}>
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-3">
                          <div className={cn("p-3 rounded-xl bg-white shadow-sm", role.color)}><Icon className="w-6 h-6" /></div>
                          <h3 className={cn("font-black text-lg", role.color)}>{role.defaultName}</h3>
                       </div>
                    </div>

                    <div className="space-y-3 flex-1">
                       {membersInRole.map(member => (
                         <div key={member.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="flex items-center gap-3 relative z-10 w-full min-w-0 pr-1">
                               {member.users?.avatar_url ? (
                                  <img src={member.users.avatar_url} className="w-12 h-12 shrink-0 rounded-full object-cover border-2 border-slate-100" alt="av" />
                               ) : (
                                  <div className={cn("w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-black", role.bg, role.color)}>
                                     {String(member.users?.full_name).charAt(0) || 'م'}
                                  </div>
                               )}
                               <div className="min-w-0">
                                  <p className="font-black text-slate-800 text-sm line-clamp-1">{member.users?.full_name}</p>
                                  <p className={cn("text-[10px] font-black mt-1 bg-slate-50 px-2 py-0.5 rounded border inline-block truncate max-w-full", role.color, role.border)} title={member.role_name}>
                                    {member.role_name}
                                  </p>
                               </div>
                            </div>
                            <button onClick={() => handleRemove(member.id, member.users?.full_name)} className="p-2 shrink-0 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-xl transition-colors active:scale-90 relative z-10" title="إلغاء التكليف">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                         </div>
                       ))}
                       
                       {membersInRole.length === 0 && (
                          <div className="h-20 border-2 border-dashed border-slate-300/50 rounded-2xl flex items-center justify-center">
                             <p className="text-xs font-bold text-slate-400">لا يوجد أعضاء مكلفين</p>
                          </div>
                       )}
                    </div>

                    <button 
                       onClick={() => openAssignModal(role)} 
                       className={cn("w-full py-3.5 mt-4 rounded-2xl border-2 border-dashed font-black text-sm flex items-center justify-center gap-2 transition-colors bg-white/50 hover:bg-white active:scale-95 shadow-sm", role.color, role.border)}
                    >
                       <Plus className="w-5 h-5" /> إضافة {role.defaultName}
                    </button>
                 </div>
               )
             })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAssignModalOpen && selectedBaseRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              
              <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                   {React.createElement(selectedBaseRole.icon, { className: cn("w-6 h-6", selectedBaseRole.color) })}
                   تكليف عضو بالكنترول
                </h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors active:scale-90">
                  <X className="w-5 h-5"/>
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
                
                <div className="mb-4 shrink-0">
                   <label className="block text-xs font-black text-slate-500 mb-2 px-1 flex items-center gap-1.5"><Edit3 className="w-4 h-4"/> المسمى الوظيفي في بطاقة الكنترول:</label>
                   <input 
                      type="text" 
                      className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl py-3 px-4 text-sm font-black text-indigo-900 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner" 
                      placeholder="اكتب المسمى الوظيفي..." 
                      value={customRoleTitle} 
                      onChange={(e) => setCustomRoleTitle(e.target.value)} 
                   />
                   <p className="text-[10px] font-bold text-slate-400 mt-1.5 px-1">يمكنك تخصيص المسمى كما ترغب ليظهر على البطاقة.</p>
                </div>

                <div className="relative mb-4 shrink-0 mt-2">
                   <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
                   <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-400 transition-colors" 
                      placeholder="ابحث عن اسم المعلم أو الإداري..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                   />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                   {filteredStaff.map((staff) => {
                      const isSelected = selectedUserId === staff.id;
                      const initialChar = String(staff.full_name).charAt(0) || 'م';
                      return (
                         <div key={staff.id} onClick={() => setSelectedUserId(staff.id)} className={cn("p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all", isSelected ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-sm" : "bg-white hover:border-slate-300 border-slate-200 shadow-sm")}>
                            <div className="flex items-center gap-3">
                               {staff.avatar_url ? <img src={staff.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="av" /> : <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">{initialChar}</div>}
                               <div>
                                  <p className="text-sm font-black text-slate-800">{staff.full_name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">الصفة: {staff.role === 'teacher' ? 'معلم' : staff.role === 'staff' ? 'إداري' : 'مدير'}</p>
                               </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                         </div>
                      );
                   })}
                   {filteredStaff.length === 0 && <div className="text-center text-slate-400 py-10"><UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20"/><p className="text-sm font-bold">لا توجد نتائج، أو أن الكادر مكلف مسبقاً.</p></div>}
                </div>

                <div className="pt-4 shrink-0 border-t border-slate-100 mt-4">
                  <button onClick={handleAssign} disabled={!selectedUserId || !customRoleTitle.trim() || isSubmitting} className={cn("w-full py-4 text-white font-black rounded-xl disabled:opacity-50 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95", selectedBaseRole.bg.replace('/10', ''), "hover:opacity-90")}>
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5" />} 
                    اعتماد التكليف الرسمي
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -9999, opacity: 1, pointerEvents: 'none' }}>
         <div ref={printRef} className="flex flex-col gap-10" dir="rtl">
            {chunkArray(teamMembers, 6).map((chunk, pageIndex) => (
               <div key={pageIndex} className="print-page-wrapper bg-white mx-auto relative" style={{ width: '794px', height: '1122px', padding: '40px', boxSizing: 'border-box' }}>
                  <div className="flex flex-wrap gap-8 justify-center content-start">
                     {chunk.map((member:any) => {
                        const safeAvatar = member.users?.avatar_url ? `${member.users.avatar_url}?t=${new Date().getTime()}` : null;
                        const qrPayload = `raf-control:${member.user_id}`;
                        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}&margin=0`;

                        return (
                           <div key={member.id} className="w-[65mm] h-[100mm] border-[4px] border-slate-900 rounded-3xl relative overflow-hidden flex flex-col items-center text-center shadow-lg bg-white" style={{ pageBreakInside: 'avoid' }}>
                              
                              <div className="absolute top-0 left-0 w-full h-[35mm] bg-slate-900 shrink-0 flex flex-col items-center justify-start pt-4">
                                 <p className="text-white font-black text-[14px]">مدرسة الرفعة النموذجية</p>
                                 <div className="mt-2 bg-rose-600 px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                                    <ShieldCheck className="w-3 h-3 text-white" />
                                    <p className="text-white font-black text-[10px]">غرفة العمليات المركزية (VIP)</p>
                                 </div>
                              </div>
                              
                              <div className="relative z-10 w-[26mm] h-[26mm] mt-[20mm] mb-3 rounded-full bg-white border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                                 {safeAvatar ? <img src={safeAvatar} crossOrigin="anonymous" alt="Staff" className="w-full h-full object-cover" /> : <ShieldCheck className="w-10 h-10 text-slate-300" />}
                              </div>

                              <div className="relative z-10 w-full px-4 flex-1 flex flex-col items-center">
                                 <h2 className="text-[18px] font-black text-slate-900 mb-1 leading-tight line-clamp-2">{member.users?.full_name}</h2>
                                 <p className="text-[11px] font-black text-rose-600 mb-2 border-b-2 border-slate-200 pb-2 w-full">{member.role_name}</p>
                                 
                                 <div className="mt-auto mb-4 flex flex-col items-center">
                                    <div className="w-[22mm] h-[22mm] bg-white p-1 rounded-xl border-[3px] border-slate-900 mb-1">
                                       <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase">Secured Access Only</p>
                                 </div>
                              </div>
                              
                              <div className="w-full h-3 bg-rose-600 shrink-0"></div>
                           </div>
                        )
                     })}
                  </div>
               </div>
            ))}
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}
