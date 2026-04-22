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
  UserPlus, AlertTriangle, CalendarDays, GraduationCap,
  Calculator, Activity, UserCheck, PlusCircle, X, ShieldAlert,
  BarChart3, MessageSquare, Megaphone, TrendingUp, ChevronLeft, MapPin
} from 'lucide-react';

// 🧩 مكون إحصائية سريعة
const StatCard = ({ icon: Icon, title, value, trend, color, delay }: any) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass-panel p-6 rounded-[2rem] border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-all bg-[#0a0d16]/80">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/10 rounded-full blur-[40px] pointer-events-none group-hover:scale-150 transition-transform duration-500`}></div>
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-white drop-shadow-sm">{value}</h3>
      </div>
      <div className={`h-14 w-14 rounded-[1.2rem] bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-400 shadow-inner group-hover:scale-110 transition-transform`}>
        <Icon className="h-7 w-7 drop-shadow-md" />
      </div>
    </div>
    {trend && (
      <div className={`mt-4 flex items-center gap-1.5 text-xs font-bold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
        <span>{Math.abs(trend)}% مقارنة بالشهر الماضي</span>
      </div>
    )}
  </motion.div>
);

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

  // دالة الإضافة للقائمة (مربوطة مع الخلفية القديمة)
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
      const { data: existingParent } = await supabase.from('parents').select('id').eq('national_id', parentForm.national_id).maybeSingle();
      let targetParentId = null;

      if (existingParent) {
        targetParentId = existingParent.id;
        const { data: userData } = await supabase.from('users').select('full_name').eq('id', targetParentId).maybeSingle();
        const parentName = userData?.full_name || 'مسجل مسبقاً';
        setLinkStatus({type: 'success', msg: `تم إيجاد حساب ولي الأمر (${parentName}) وجاري ربط الأبناء...`});
      } else {
        if (!parentForm.full_name) { setLinkStatus({type: 'error', msg: 'ولي الأمر جديد، يرجى إدخال اسمه الكامل.'}); return; }
        const email = parentForm.email || `${parentForm.national_id}@alrefaa.edu`;
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ email: email, password: '123456', full_name: parentForm.full_name, national_id: parentForm.national_id, phone: parentForm.phone || '', role: 'parent' }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        targetParentId = result.user.id;
        await supabase.from('parents').upsert({ id: targetParentId, national_id: parentForm.national_id, job_title: parentForm.job_title || '', address: parentForm.address || '' });
        setLinkStatus({type: 'success', msg: `تم إنشاء حساب ولي الأمر وربط الأبناء بنجاح! (كلمة المرور: 123456)`});
      }

      if (targetParentId) {
        const studentIds = selectedStudents.map(s => s.id);
        const { error: linkError } = await supabase.from('students').update({ parent_id: targetParentId }).in('id', studentIds);
        if (linkError) throw linkError;
      }
      setTimeout(() => {
        setSelectedStudents([]); setSearchStudentId('');
        setParentForm({ full_name: '', national_id: '', phone: '', email: '', job_title: '', address: '' });
        setLinkStatus({type: 'idle', msg: ''});
      }, 5000);
    } catch (err: any) {
      console.error(err); setLinkStatus({type: 'error', msg: err.message || 'حدث خطأ أثناء الربط.'});
    }
  };

  if (isChecking || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo text-white">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تأمين قمرة القيادة...</p>
        </div>
      </div>
    );
  }

  if (!staffData) return null;
  const hasPerm = (key: string) => staffData.permissions[key] === true;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-[#090b14] pb-24 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6 relative overflow-hidden" dir="rtl">
      
      {/* Background Ambience */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>

      <div className="relative z-10 space-y-8">
        
        {/* 🚀 1. الهيدر الفخم (قمرة القيادة) */}
        <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-[#02040a] via-[#0a0d1a] to-[#02040a] border border-white/10 p-8 sm:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 text-center md:text-right">
            <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
              <div className="relative group shrink-0">
                <div className="h-24 w-24 sm:h-28 sm:w-28 bg-gradient-to-br from-indigo-500 to-violet-600 text-slate-950 rounded-[2rem] flex items-center justify-center text-4xl sm:text-5xl font-black shadow-[0_0_30px_rgba(99,102,241,0.3)] border-2 border-indigo-300/50 group-hover:scale-105 transition-transform duration-500">
                  {staffData.users?.full_name?.charAt(0)}
                </div>
              </div>
              <div>
                <div className="flex flex-col md:flex-row items-center md:items-center flex-wrap gap-2 sm:gap-3 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest shadow-inner">
                    <Shield className="w-3.5 h-3.5" /> القيادة والتحكم
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">{staffData.users?.full_name}</h1>
                </div>
                <p className="text-indigo-400 font-black text-base sm:text-lg mt-1">{staffData.job_title} - {staffData.job_category}</p>
              </div>
            </div>
            
            <div className="bg-[#0f1423]/80 p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 text-center min-w-[200px] shadow-inner">
              <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" /> نطاق الصلاحيات الشاملة
              </div>
              <div className="text-sm sm:text-base font-black text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 shadow-inner">
                {staffData.scope_stage}
              </div>
            </div>
          </div>
        </div>

        {/* 🚀 2. الإحصائيات السريعة (مؤشرات الأداء) */}
        {hasPerm('global_read_only') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={Users} title="إجمالي الطلاب" value="1,240" trend={2.4} color="indigo" delay={0.1} />
            <StatCard icon={GraduationCap} title="الكادر التعليمي" value="85" trend={0} color="blue" delay={0.2} />
            <StatCard icon={Activity} title="نسبة الحضور اليوم" value="96%" trend={1.2} color="emerald" delay={0.3} />
            <StatCard icon={Bell} title="إعلانات نشطة" value="4" trend={0} color="amber" delay={0.4} />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          
          {/* 🚀 3. العمود الأيمن الرئيسي (بوابة عين الرفعة + ربط الآباء) */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* بوابة المراقبة الشاملة (للمشرفين) */}
            {hasPerm('global_read_only') && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-indigo-500/30 relative overflow-hidden bg-gradient-to-br from-[#0a0d1a] to-[#02040a]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-8 relative z-10 text-center sm:text-right">
                  <div>
                    <h3 className="font-black text-2xl mb-2 flex items-center justify-center sm:justify-start gap-3 text-white drop-shadow-md">
                      <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-inner">
                        <Activity className="w-6 h-6"/>
                      </div> 
                      بوابة عين الرفعة المركزية
                    </h3>
                    <p className="text-slate-400 text-sm font-bold opacity-90 max-w-xl leading-relaxed">
                      وصول كامل وسريع لجميع مفاصل المنصة، يمكنك المراقبة، التوجيه، وإرسال التعاميم بصلاحية القيادة العليا.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                  {/* أزرار البوابة المركزية */}
                  <Link href="/hierarchy" className="p-5 rounded-2xl bg-[#0f1423]/80 border border-white/5 hover:border-indigo-500/50 hover:bg-[#0f1423] transition-all group shadow-inner">
                    <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Building2 className="w-6 h-6" /></div>
                    <h4 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">الهيكل الأكاديمي</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">عرض الأقسام والمعلمين</p>
                  </Link>

                  <Link href="/attendance/reports" className="p-5 rounded-2xl bg-[#0f1423]/80 border border-white/5 hover:border-emerald-500/50 hover:bg-[#0f1423] transition-all group shadow-inner">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><CalendarDays className="w-6 h-6" /></div>
                    <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">سجل الحضور والغياب</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">مراقبة غياب وتأخير الطلاب</p>
                  </Link>

                  <Link href="/gradebook" className="p-5 rounded-2xl bg-[#0f1423]/80 border border-white/5 hover:border-blue-500/50 hover:bg-[#0f1423] transition-all group shadow-inner">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Calculator className="w-6 h-6" /></div>
                    <h4 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">السجل الأكاديمي</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">الاطلاع على درجات جميع الفصول</p>
                  </Link>

                  <Link href="/messages" className="p-5 rounded-2xl bg-[#0f1423]/80 border border-white/5 hover:border-violet-500/50 hover:bg-[#0f1423] transition-all group shadow-inner">
                    <div className="w-12 h-12 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><MessageSquare className="w-6 h-6" /></div>
                    <h4 className="text-sm font-black text-white group-hover:text-violet-400 transition-colors">مراسلات المجالس</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">دخول مجالس الفصول والتوجيه</p>
                  </Link>

                  <Link href="/announcements" className="p-5 rounded-2xl bg-[#0f1423]/80 border border-white/5 hover:border-amber-500/50 hover:bg-[#0f1423] transition-all group shadow-inner">
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Megaphone className="w-6 h-6" /></div>
                    <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">التعاميم والإعلانات</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">نشر وتعديل الإعلانات المدرسية</p>
                  </Link>

                  {hasPerm('write_evaluations') && (
                    <Link href="/admin/teachers-monitor" className="p-5 rounded-2xl bg-[#0f1423]/80 border border-white/5 hover:border-rose-500/50 hover:bg-[#0f1423] transition-all group shadow-inner">
                      <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><FileText className="w-6 h-6" /></div>
                      <h4 className="text-sm font-black text-white group-hover:text-rose-400 transition-colors">التقييمات والتقارير</h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">تقييم الكادر التدريسي</p>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}

            {/* مكتب ربط أولياء الأمور */}
            {hasPerm('link_parents') && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-8 relative z-10 gap-4 text-center sm:text-right">
                  <div>
                    <h3 className="font-black text-2xl mb-2 flex items-center justify-center sm:justify-start gap-3 text-white drop-shadow-md">
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
                        <UserPlus className="w-6 h-6"/>
                      </div> 
                      مكتب استقبال الآباء (الربط الشامل)
                    </h3>
                    <p className="text-slate-400 text-sm font-bold opacity-90 max-w-xl mx-auto sm:mx-0 leading-relaxed">أدخل الرقم المدني للطالب لإضافته لقائمة الربط، ثم سجل بيانات ولي الأمر لإنشاء حسابه وربطه آلياً.</p>
                  </div>
                </div>
                
                <div className="space-y-8 relative z-10">
                  <div className="bg-[#0f1423]/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                    <form onSubmit={handleAddStudentToList} className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1 group/search">
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/search:text-emerald-400 transition-colors" />
                        <input type="text" value={searchStudentId} onChange={(e) => setSearchStudentId(e.target.value)} placeholder="الرقم المدني للطالب..." className="w-full bg-[#02040a]/60 border border-white/5 text-white placeholder:text-slate-500 rounded-2xl py-4 pr-12 pl-4 font-bold outline-none focus:bg-[#02040a]/80 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-base shadow-inner" dir="ltr" style={{ textAlign: 'right' }} />
                      </div>
                      <button type="submit" disabled={linkStatus.type === 'loading' || !searchStudentId} className="bg-emerald-600 text-white font-black px-8 py-4 rounded-2xl hover:bg-emerald-500 active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.4)] whitespace-nowrap transition-all border border-emerald-400/50">إضافة للقائمة</button>
                    </form>
                  </div>

                  <AnimatePresence>
                    {selectedStudents.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[#02040a]/60 border border-white/10 p-8 rounded-[2rem] shadow-inner">
                        <div className="mb-8 pb-8 border-b border-white/5">
                          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">الأبناء المراد ربطهم ({selectedStudents.length})</h4>
                          <div className="flex flex-wrap gap-3">
                            {selectedStudents.map(student => (
                              <div key={student.id} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-inner">
                                <UserCheck className="w-4 h-4"/>
                                <span className="font-bold text-sm truncate max-w-[150px]">{student.users?.full_name?.split(' ')[0]}</span>
                                <button onClick={() => handleRemoveStudent(student.id)} className="ml-2 text-slate-500 hover:text-rose-400 bg-[#0f1423] p-1 rounded-md transition-colors"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <form onSubmit={handleCreateParent} className="space-y-6">
                          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">بيانات ولي الأمر (الأب/الأم)</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">الاسم الكامل <span className="text-rose-500">*</span></label>
                              <input type="text" required value={parentForm.full_name} onChange={e => setParentForm({...parentForm, full_name: e.target.value})} className="w-full bg-[#0f1423]/60 border border-white/5 rounded-2xl px-4 py-3.5 font-bold outline-none focus:border-emerald-500/50 focus:bg-[#02040a] focus:ring-2 focus:ring-emerald-500/20 text-white shadow-inner transition-all" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">الرقم المدني <span className="text-rose-500">*</span></label>
                              <input type="text" required value={parentForm.national_id} onChange={e => setParentForm({...parentForm, national_id: e.target.value})} className="w-full bg-[#0f1423]/60 border border-white/5 rounded-2xl px-4 py-3.5 font-bold outline-none focus:border-emerald-500/50 focus:bg-[#02040a] focus:ring-2 focus:ring-emerald-500/20 text-white shadow-inner transition-all" dir="ltr" style={{ textAlign: 'right' }} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">رقم الهاتف</label>
                              <input type="text" value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="w-full bg-[#0f1423]/60 border border-white/5 rounded-2xl px-4 py-3.5 font-bold outline-none focus:border-emerald-500/50 focus:bg-[#02040a] focus:ring-2 focus:ring-emerald-500/20 text-white shadow-inner transition-all" dir="ltr" style={{ textAlign: 'right' }} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 uppercase ml-1">البريد الإلكتروني (اختياري)</label>
                              <input type="email" value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="w-full bg-[#0f1423]/60 border border-white/5 rounded-2xl px-4 py-3.5 font-bold outline-none focus:border-emerald-500/50 focus:bg-[#02040a] focus:ring-2 focus:ring-emerald-500/20 text-white shadow-inner transition-all" dir="ltr" style={{ textAlign: 'right' }} />
                            </div>
                          </div>
                          <button type="submit" disabled={linkStatus.type === 'loading'} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black px-6 py-4 rounded-2xl hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-8 border border-emerald-400/50 transition-all">
                            {linkStatus.type === 'loading' ? <Loader2 className="w-6 h-6 animate-spin"/> : <><PlusCircle className="w-6 h-6"/> اعتماد التسجيل وإنشاء الحساب</>}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {linkStatus.msg && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`overflow-hidden rounded-2xl border mt-5 ${linkStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : linkStatus.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 text-indigo-300 border-white/10'}`}>
                        <div className="p-5 font-bold text-sm leading-relaxed flex items-center gap-3">
                          {linkStatus.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : linkStatus.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <Loader2 className="w-5 h-5 shrink-0 animate-spin" />}
                          {linkStatus.msg}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>

          {/* 🚀 4. العمود الأيسر (إحصائيات بيانية وتقارير النظام) */}
          <div className="space-y-8 w-full">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-8 rounded-[2.5rem] shadow-xl border border-white/10 relative overflow-hidden bg-[#0a0d16]/80">
               <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
               <div className="relative z-10">
                 <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 drop-shadow-sm">
                   <BarChart3 className="w-6 h-6 text-indigo-400" /> تحليل النظام المباشر
                 </h3>
                 
                 {/* CSS Charts Simulation */}
                 <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                        <span>المتوسط</span>
                        <span className="text-emerald-400">98%</span>
                      </div>
                      <div className="w-full bg-[#02040a] rounded-full h-3 border border-white/5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '98%' }} transition={{ duration: 1, delay: 0.5 }} className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></motion.div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                        <span>الثانوي</span>
                        <span className="text-blue-400">92%</span>
                      </div>
                      <div className="w-full bg-[#02040a] rounded-full h-3 border border-white/5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1, delay: 0.6 }} className="bg-gradient-to-r from-blue-600 to-sky-400 h-full rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]"></motion.div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">نشاط المنصة اليوم</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="flex-1 bg-[#02040a]/60 p-4 rounded-2xl border border-white/5 text-center">
                           <div className="text-xl font-black text-indigo-400">14</div>
                           <div className="text-[10px] text-slate-500 font-bold mt-1">واجب مسلّم</div>
                         </div>
                         <div className="flex-1 bg-[#02040a]/60 p-4 rounded-2xl border border-white/5 text-center">
                           <div className="text-xl font-black text-rose-400">3</div>
                           <div className="text-[10px] text-slate-500 font-bold mt-1">إنذارات غياب</div>
                         </div>
                      </div>
                    </div>
                 </div>
               </div>
            </motion.div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
