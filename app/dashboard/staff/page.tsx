/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { useUsersSystem } from '@/hooks/useUsersSystem'; 
import Link from 'next/link';
import { 
  Shield, Users, Loader2, Sparkles, 
  FileText, Bell, CheckCircle, Search, 
  UserPlus, AlertTriangle, CalendarDays, GraduationCap, ClipboardList,
  Settings, Building2, Calculator, HeartPulse, Activity, UserCheck, PlusCircle, X, ShieldAlert
} from 'lucide-react';

export default function StaffDashboardPage() {
  const { user, isChecking } = useAuth();
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { students: allStudents, fetchStudents } = useUsersSystem();

  const [searchStudentId, setSearchStudentId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  
  const [parentForm, setParentForm] = useState({ 
    full_name: '', national_id: '', phone: '', email: '', job_title: '', address: ''    
  });

  const [linkStatus, setLinkStatus] = useState<{type: 'idle'|'loading'|'success'|'error', msg: string}>({type: 'idle', msg: ''});

  useEffect(() => {
    async function loadWorkspace() {
      if (!user) return;
      try {
        const { data, error } = await supabase.from('school_staff').select('*, users!school_staff_id_fkey(full_name, email)').eq('id', user.id).single();
        if (!error && data) {
          data.permissions = data.permissions || {};
          setStaffData(data);
          if (data.permissions['link_parents']) fetchStudents();
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    if (!isChecking) loadWorkspace();
  }, [user, isChecking, fetchStudents]);

  const handleAddStudentToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchStudentId) return;
    setLinkStatus({type: 'loading', msg: 'جاري البحث...'});
    
    const student = allStudents.find(s => s.national_id === searchStudentId);
    if (student) {
      if (selectedStudents.some(s => s.id === student.id)) {
        setLinkStatus({type: 'error', msg: 'الطالب مضاف للقائمة بالفعل.'}); return;
      }
      setSelectedStudents(prev => [...prev, student]);
      if (selectedStudents.length === 0) {
        const parts = student.users?.full_name?.split(' ') || [];
        const defaultName = parts.length > 2 ? `${parts[1]} ${parts[2]} ${parts[3] || ''}`.trim() : '';
        setParentForm(prev => ({ ...prev, full_name: defaultName }));
      }
      setSearchStudentId('');
      setLinkStatus({type: 'success', msg: `تمت إضافة ${student.users?.full_name} للقائمة.`});
      setTimeout(() => setLinkStatus({type: 'idle', msg: ''}), 2000);
    } else {
      setLinkStatus({type: 'error', msg: 'لم يتم العثور على طالب بالرقم المدني المدخل.'});
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0 || !parentForm.national_id) {
      setLinkStatus({type: 'error', msg: 'يرجى إضافة طالب وإدخال الرقم المدني لولي الأمر.'}); return;
    }

    setLinkStatus({type: 'loading', msg: 'جاري التحقق والتسجيل والربط الشامل...'});

    try {
      const { data: existingParent } = await supabase
        .from('parents')
        .select('id')
        .eq('national_id', parentForm.national_id)
        .maybeSingle();

      let targetParentId = null;

      if (existingParent) {
        targetParentId = existingParent.id;
        
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', targetParentId)
          .maybeSingle();

        const parentName = userData?.full_name || 'مسجل مسبقاً';
        setLinkStatus({type: 'success', msg: `تم إيجاد حساب ولي الأمر (${parentName}) وجاري ربط الأبناء...`});
      } else {
        if (!parentForm.full_name) {
          setLinkStatus({type: 'error', msg: 'ولي الأمر جديد، يرجى إدخال اسمه الكامل.'}); return;
        }

        const email = parentForm.email || `${parentForm.national_id}@alrefaa.edu`;
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            email: email,
            password: '123456',
            full_name: parentForm.full_name,
            national_id: parentForm.national_id,
            phone: parentForm.phone || '',
            role: 'parent'
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        targetParentId = result.user.id;

        await supabase.from('parents').upsert({
          id: targetParentId,
          national_id: parentForm.national_id,
          job_title: parentForm.job_title || '',
          address: parentForm.address || ''
        });

        setLinkStatus({type: 'success', msg: `تم إنشاء حساب ولي الأمر وربط الأبناء بنجاح! (كلمة المرور: 123456)`});
      }

      if (targetParentId) {
        const studentIds = selectedStudents.map(s => s.id);
        const { error: linkError } = await supabase
          .from('students')
          .update({ parent_id: targetParentId })
          .in('id', studentIds);

        if (linkError) throw linkError;
      }

      setTimeout(() => {
        setSelectedStudents([]);
        setSearchStudentId('');
        setParentForm({ full_name: '', national_id: '', phone: '', email: '', job_title: '', address: '' });
        setLinkStatus({type: 'idle', msg: ''});
      }, 5000);

    } catch (err: any) {
      console.error(err);
      setLinkStatus({type: 'error', msg: err.message || 'حدث خطأ أثناء الربط.'});
    }
  };

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تجهيز مساحة العمل...</p>
        </div>
      </div>
    );
  }

  if (!staffData) return null;

  const hasPerm = (key: string) => staffData.permissions[key] === true;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6 relative z-10" dir="rtl">
      
      {/* الهيدر الفخم */}
      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-[#02040a] via-[#0a0d1a] to-[#02040a] border border-white/10 p-6 sm:p-10 lg:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-8">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 text-center md:text-right">
          
          <div className="flex flex-col md:flex-row items-center gap-6 z-10 w-full md:w-auto">
            <div className="relative group shrink-0">
              <div className="h-24 w-24 sm:h-28 sm:w-28 bg-gradient-to-br from-indigo-500 to-violet-600 text-slate-950 rounded-[2rem] flex items-center justify-center text-4xl sm:text-5xl font-black shadow-[0_0_30px_rgba(99,102,241,0.3)] border-2 border-indigo-300/50 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500">
                {staffData.users?.full_name?.charAt(0)}
              </div>
              <div className="absolute inset-0 bg-indigo-500/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
            </div>
            <div>
              <div className="flex flex-col md:flex-row items-center md:items-center flex-wrap gap-2 sm:gap-3 mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest shadow-inner">
                  <Shield className="w-3.5 h-3.5" /> مساحة الفريق الإداري
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">{staffData.users?.full_name}</h1>
                <span className="px-3 py-1 sm:py-1.5 bg-[#0f1423] text-slate-300 text-[10px] sm:text-xs font-black rounded-lg border border-white/5 shadow-inner mt-2 md:mt-0">{staffData.job_category}</span>
              </div>
              <p className="text-indigo-400 font-black text-base sm:text-lg drop-shadow-sm">{staffData.job_title}</p>
            </div>
          </div>
          
          <div className="bg-[#0f1423]/80 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 text-center min-w-[150px] sm:min-w-[180px] z-10 shadow-inner w-full md:w-auto">
            <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5 drop-shadow-sm">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" /> نطاق الصلاحيات
            </div>
            <div className="text-sm sm:text-base font-black text-indigo-400 bg-indigo-500/10 px-3 sm:px-4 py-2 rounded-xl border border-indigo-500/20 shadow-inner truncate max-w-full">
              {staffData.scope_stage}
            </div>
          </div>

        </div>
        <div className="absolute -left-10 -bottom-10 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        {/* 🚀 Main Workspace Area */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          <h2 className="text-lg sm:text-xl font-black text-white px-2 flex items-center gap-2 drop-shadow-sm">
            <Settings className="w-5 h-5 text-indigo-400"/> أدوات مساحة العمل المعتمدة لك
          </h2>

          <div className="grid grid-cols-1 gap-6">
            
            {/* 🚀 أدوات المراقبة (عين الرفعة) - للمشرفين الإداريين */}
            {hasPerm('global_read_only') && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] shadow-xl border border-indigo-500/20 relative overflow-hidden group bg-[#0a0d1a]/80">
                <div className="absolute top-0 left-0 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-8 relative z-10 gap-4 text-center sm:text-right">
                  <div>
                    <h3 className="font-black text-xl sm:text-2xl mb-2 flex items-center justify-center sm:justify-start gap-2 sm:gap-3 text-white drop-shadow-md">
                      <div className="p-2 sm:p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-inner shrink-0">
                        <Activity className="w-5 h-5 sm:w-6 sm:h-6"/>
                      </div> 
                      مركز المراقبة الشاملة
                    </h3>
                    <p className="text-slate-400 text-xs sm:text-sm font-bold opacity-90 max-w-xl mx-auto sm:mx-0 leading-relaxed">
                      نظرة عامة على جميع العمليات الأكاديمية والسلوكية في المنصة للاطلاع والتدقيق.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  <Link href="/gradebook" className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-[#02040a]/60 border border-white/5 hover:border-indigo-500/30 hover:bg-[#02040a]/90 transition-all group/item shadow-inner active:scale-95">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover/item:scale-110 transition-transform border border-blue-500/20 shadow-inner shrink-0">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white group-hover/item:text-blue-400 transition-colors">السجلات الأكاديمية</h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">مراقبة درجات وتقييمات الفصول</p>
                    </div>
                  </Link>

                  <Link href="/attendance/reports" className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-[#02040a]/60 border border-white/5 hover:border-indigo-500/30 hover:bg-[#02040a]/90 transition-all group/item shadow-inner active:scale-95">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover/item:scale-110 transition-transform border border-rose-500/20 shadow-inner shrink-0">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white group-hover/item:text-rose-400 transition-colors">سجل الحضور والغياب</h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">متابعة الحضور اليومي للمدرسة</p>
                    </div>
                  </Link>

                  {hasPerm('write_evaluations') && (
                    <Link href="/admin/teachers-monitor" className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-[#02040a]/60 border border-white/5 hover:border-indigo-500/30 hover:bg-[#02040a]/90 transition-all group/item shadow-inner active:scale-95 sm:col-span-2">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover/item:scale-110 transition-transform border border-amber-500/20 shadow-inner shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover/item:text-amber-400 transition-colors">تقييم الكادر التعليمي</h4>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">زيارات الفصول، كتابة التقارير، وتقييم الأداء</p>
                      </div>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}

            {/* 🚀 مكتب استقبال أولياء الأمور */}
            {hasPerm('link_parents') && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] shadow-xl border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-6 sm:mb-8 relative z-10 gap-4 text-center sm:text-right">
                  <div>
                    <h3 className="font-black text-xl sm:text-2xl mb-2 flex items-center justify-center sm:justify-start gap-2 sm:gap-3 text-white drop-shadow-md">
                      <div className="p-2 sm:p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shadow-inner shrink-0">
                        <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400"/>
                      </div> 
                      مكتب استقبال أولياء الأمور
                    </h3>
                    <p className="text-slate-400 text-xs sm:text-sm font-bold opacity-90 max-w-xl mx-auto sm:mx-0 leading-relaxed">ابحث عن الطلاب (يمكنك إضافة أكثر من طالب/إخوة)، ثم قم بربطهم جميعاً بملف ولي الأمر بضغطة واحدة.</p>
                  </div>
                </div>
                
                <div className="space-y-6 sm:space-y-8 relative z-10">
                  <div className="bg-[#0f1423]/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-inner">
                    <form onSubmit={handleAddStudentToList} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="relative flex-1 group/search">
                        <Search className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" />
                        <input 
                          type="text" 
                          value={searchStudentId} 
                          onChange={(e) => setSearchStudentId(e.target.value)} 
                          placeholder="الرقم المدني للطالب..." 
                          className="w-full bg-[#02040a]/60 border border-white/5 text-white placeholder:text-slate-500 rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pr-12 pl-4 font-bold outline-none focus:bg-[#02040a]/80 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm sm:text-base shadow-inner" 
                          dir="ltr" 
                          style={{ textAlign: 'right' }} 
                        />
                      </div>
                      <button type="submit" disabled={linkStatus.type === 'loading' || !searchStudentId} className="bg-indigo-600 text-white font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-indigo-500 active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.4)] whitespace-nowrap transition-all border border-indigo-400/50 text-sm sm:text-base w-full sm:w-auto">
                        إضافة للقائمة
                      </button>
                    </form>
                  </div>

                  <AnimatePresence>
                    {selectedStudents.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[#02040a]/60 border border-white/10 p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-inner">
                        <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-white/5">
                          <h4 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">الطلاب المراد ربطهم ({selectedStudents.length})</h4>
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            {selectedStudents.map(student => (
                              <div key={student.id} className="flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-indigo-500/20 shadow-inner">
                                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400"/>
                                <span className="font-bold text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{student.users?.full_name?.split(' ')[0]}</span>
                                <button onClick={() => handleRemoveStudent(student.id)} className="ml-1 sm:ml-2 text-slate-500 hover:text-rose-400 bg-[#02040a]/50 p-1 rounded-md transition-colors"><X className="w-3 h-3 sm:w-4 sm:h-4"/></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <form onSubmit={handleCreateParent} className="space-y-5 sm:space-y-6">
                          <h4 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-4 flex items-center gap-2">بيانات ولي الأمر</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="space-y-1.5 sm:space-y-2">
                              <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase ml-1">الاسم الكامل لولي الأمر <span className="text-rose-500">*</span></label>
                              <input type="text" required value={parentForm.full_name} onChange={e => setParentForm({...parentForm, full_name: e.target.value})} className="w-full bg-[#0f1423]/60 border border-white/5 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 font-bold outline-none focus:border-indigo-500/50 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/20 text-white shadow-inner transition-all text-sm sm:text-base" />
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                              <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase ml-1">الرقم المدني <span className="text-rose-500">*</span></label>
                              <input type="text" required value={parentForm.national_id} onChange={e => setParentForm({...parentForm, national_id: e.target.value})} className="w-full bg-[#0f1423]/60 border border-white/5 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 font-bold outline-none focus:border-indigo-500/50 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/20 text-white shadow-inner transition-all text-left text-sm sm:text-base" dir="ltr" />
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                              <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase ml-1">رقم الهاتف</label>
                              <input type="text" value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="w-full bg-[#0f1423]/60 border border-white/5 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 font-bold outline-none focus:border-indigo-500/50 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/20 text-white shadow-inner transition-all text-left text-sm sm:text-base" dir="ltr" />
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                              <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase ml-1">البريد الإلكتروني</label>
                              <input type="email" value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="w-full bg-[#0f1423]/60 border border-white/5 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-3.5 font-bold outline-none focus:border-indigo-500/50 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/20 text-white shadow-inner transition-all text-left text-sm sm:text-base" dir="ltr" />
                            </div>
                          </div>
                          <button type="submit" disabled={linkStatus.type === 'loading'} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-black px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-6 sm:mt-8 text-sm sm:text-base border border-emerald-400/50 transition-all">
                            {linkStatus.type === 'loading' ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin"/> : <><PlusCircle className="w-5 h-5 sm:w-6 sm:h-6"/> تسجيل واعتماد ربط {selectedStudents.length > 1 ? 'الأبناء' : 'الابن'}</>}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {linkStatus.msg && (
                      <motion.div initial={{ opacity: 0, height: 0, scale: 0.95 }} animate={{ opacity: 1, height: 'auto', scale: 1 }} exit={{ opacity: 0, height: 0, scale: 0.95 }} className={`overflow-hidden rounded-xl sm:rounded-2xl border mt-4 sm:mt-5 ${linkStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : linkStatus.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.2)]' : 'bg-white/5 text-indigo-300 border-white/10'}`}>
                        <div className="p-4 sm:p-5 font-bold text-xs sm:text-sm leading-relaxed flex items-start sm:items-center gap-3">
                          {linkStatus.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : linkStatus.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <Loader2 className="w-5 h-5 shrink-0 animate-spin" />}
                          {linkStatus.msg}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* 🚀 سجل الطلاب */}
            {hasPerm('view_students') && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-sm hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-right">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 w-full">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/10 text-blue-400 rounded-xl sm:rounded-2xl border border-blue-500/20 flex items-center justify-center shrink-0 shadow-inner"><Users className="w-6 h-6 sm:w-7 sm:h-7"/></div>
                    <div>
                      <h3 className="font-black text-white text-lg sm:text-xl mb-1 drop-shadow-sm">سجل الطلاب الشامل</h3>
                      <p className="text-slate-400 text-xs sm:text-sm font-bold">استعراض وتعديل بيانات جميع الطلاب المسجلين في المنصة.</p>
                    </div>
                  </div>
                  <button className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-[#02040a]/80 hover:bg-[#0f1423] text-blue-400 hover:text-blue-300 border border-blue-500/30 font-black text-xs sm:text-sm rounded-xl transition-all shadow-inner active:scale-95 shrink-0 whitespace-nowrap">فتح السجل</button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* 🌟 Column 2: Narrow Area - Side Panel */}
        <div className="space-y-6 lg:space-y-8 w-full mt-6 lg:mt-0">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 sm:p-8 rounded-[2rem] shadow-sm border border-white/10 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
             <div className="relative z-10">
               <div className="inline-flex items-center gap-2 bg-[#02040a]/60 text-slate-400 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black mb-5 sm:mb-6 w-fit border border-white/5 shadow-inner"><Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400"/> مساحة مشتركة</div>
               <h3 className="text-lg sm:text-xl font-black text-white mb-4 sm:mb-5 flex items-center gap-2 drop-shadow-sm"><Bell className="w-5 h-5 text-amber-500" /> التعاميم الداخلية</h3>
               <button className="w-full text-center sm:text-right px-4 sm:px-5 py-3 sm:py-3.5 bg-[#02040a]/60 hover:bg-[#0f1423] border border-white/5 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-400 font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-inner active:scale-95">تقديم طلب إجازة</button>
             </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
