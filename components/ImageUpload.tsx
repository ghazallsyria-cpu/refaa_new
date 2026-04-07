```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSettingsSystem, PlatformSettings, ProfileSettings } from '@/hooks/useSettingsSystem';
import { useAuth } from '@/context/auth-context';
import { 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  MapPin,
  Clock,
  Video,
  Settings,
  Power,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUpload from '@/components/ImageUpload';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type Tab = 'school' | 'profile' | 'notifications' | 'security' | 'platform';

// توسيع النوع المحلي ليدعم الصورة الشخصية
interface ExtendedProfileSettings extends ProfileSettings {
  avatar_url?: string;
}

export default function SettingsPage() {
  // 🚀 جلب كافة المتغيرات الخاصة بالمدير
  const { authRole, isAdminByEmail } = useAuth(); 
  const userRole = authRole; 

  const { 
    loading, 
    error: systemError, 
    fetchProfile, 
    fetchPlatformSettings, 
    updateProfile, 
    updatePlatformSettings, 
    updatePassword 
  } = useSettingsSystem();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // 🚀 تعريف صارم للمدير يضمن ظهور كافة الصلاحيات
  const isAdmin = userRole === 'admin' || userRole === 'management' || isAdminByEmail === true;
  const isStudent = userRole === 'student';
  const isTeacher = userRole === 'teacher';

  const [platformSettings, setPlatformSettings] = useState<Partial<PlatformSettings>>({
    id: '',
    is_open: true,
    open_date: '',
    close_date: '',
    message: 'المنصة مغلقة حاليا للصيانة'
  });

  const [schoolSettings, setSchoolSettings] = useState({
    name: 'مدرسة الرفعة النموذجية',
    academic_year: '2025 - 2026',
    semester: 'الفصل الدراسي الأول',
    address: 'شارع الملك فهد، حي الياسمين، الرياض',
    phone: '0112345678',
    email: 'info@alrifaa.edu',
    logo_url: '' 
  });

  const [profileSettings, setProfileSettings] = useState<ExtendedProfileSettings>({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    zoom_link: '',
    avatar_url: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const loadSettings = useCallback(async () => {
    const [profile, platform] = await Promise.all([
      fetchProfile(),
      fetchPlatformSettings()
    ]);

    if (profile) setProfileSettings({ ...profile, avatar_url: (profile as any).avatar_url || '' });
    
    if (platform) {
      setPlatformSettings({
        id: platform.id,
        is_open: platform.is_open,
        open_date: platform.open_date,
        close_date: platform.close_date,
        message: platform.message
      });
      setSchoolSettings({
        name: platform.school_name || 'مدرسة الرفعة النموذجية',
        academic_year: platform.academic_year || '2025 - 2026',
        semester: platform.semester || 'الفصل الدراسي الأول',
        address: platform.address || '',
        phone: platform.phone || '',
        email: platform.email || '',
        logo_url: (platform as any).logo_url || '' 
      });
    }

    if (isAdmin) {
      setActiveTab('school');
    } else {
      setActiveTab('profile');
    }
  }, [fetchProfile, fetchPlatformSettings, isAdmin]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      if (activeTab === 'security') {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          throw new Error('كلمات المرور الجديدة غير متطابقة');
        }
        if (passwordData.newPassword.length < 6) {
          throw new Error('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
        }

        await updatePassword(passwordData.newPassword);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else if (isAdmin && (activeTab === 'platform' || activeTab === 'school')) {
        let updateData: Partial<PlatformSettings> = {
          id: platformSettings.id
        };

        if (activeTab === 'platform') {
          updateData = {
            ...updateData,
            is_open: platformSettings.is_open,
            message: platformSettings.message,
            open_date: platformSettings.open_date,
            close_date: platformSettings.close_date,
          };
        } else if (activeTab === 'school') {
          updateData = {
            ...updateData,
            school_name: schoolSettings.name,
            academic_year: schoolSettings.academic_year,
            semester: schoolSettings.semester,
            address: schoolSettings.address,
            phone: schoolSettings.phone,
            email: schoolSettings.email,
            logo_url: schoolSettings.logo_url, 
          } as any;
        }

        await updatePlatformSettings(updateData);
      } else if (activeTab === 'profile') {
        await updateProfile(profileSettings);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      setMessage({ text: 'تم حفظ الإعدادات بنجاح', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (error: any) {
      console.error(error);
      setMessage({ text: error.message || 'حدث خطأ أثناء حفظ الإعدادات', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    ...(isAdmin ? [{ id: 'school', label: 'إعدادات المدرسة', icon: Building2, desc: 'تحديث هوية وشعار المدرسة' }] : []),
    { id: 'profile', label: 'الملف الشخصي', icon: User, desc: 'معلوماتك الشخصية والصورة' },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, desc: 'تفضيلات التنبيهات' },
    { id: 'security', label: 'الأمان', icon: Shield, desc: 'كلمة المرور والحماية' },
    ...(isAdmin ? [{ id: 'platform', label: 'حالة المنصة', icon: Power, desc: 'غرفة التحكم المركزية' }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 p-4 sm:p-6 lg:p-8" dir="rtl">
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-xl ${
              message.type === 'success' 
                ? 'bg-emerald-500/90 text-white border-emerald-400/50' 
                : 'bg-rose-500/90 text-white border-rose-400/50'
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="font-black text-sm uppercase tracking-widest">{message.text}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <Settings className="h-8 w-8 text-indigo-600 animate-[spin_10s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">إعدادات النظام</h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">إدارة تفضيلات الحساب، الأمان، وخصائص المنصة المركزية.</p>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-3 rounded-[2rem] bg-indigo-600 px-10 py-5 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? (
            <div className="flex items-center gap-3">
               <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               جاري الحفظ التلقائي...
            </div>
          ) : (
            <>
               <Save className="h-5 w-5" />
               حفظ التغييرات
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3">
          <nav className="flex flex-col gap-2 sticky top-8">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isPlatformClosed = tab.id === 'platform' && !platformSettings.is_open;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-[2rem] transition-all text-right group relative overflow-hidden ${
                    isActive 
                      ? isPlatformClosed ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : isPlatformClosed ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 animate-pulse' : 'bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  {isActive && <motion.div layoutId="activeTab" className={`absolute inset-0 -z-10 ${isPlatformClosed ? 'bg-rose-600' : 'bg-indigo-600'}`} />}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors z-10 ${
                    isActive ? 'bg-white/20 text-white' : isPlatformClosed ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600'
                  }`}>
                    <tab.icon className="h-5 w-5" />
                  </div>
                  <div className="z-10">
                    <p className="text-sm font-black tracking-tight">{tab.label}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-white/80' : isPlatformClosed ? 'text-rose-400' : 'text-slate-400'}`}>{tab.desc}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white shadow-sm ring-1 ring-slate-100 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden"
            >
              {activeTab === 'profile' && (
                <div className="space-y-10">
                  <div className="border-b border-slate-100 pb-6 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl"><User className="h-6 w-6 text-indigo-600" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات الملف الشخصي</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">تحديث معلوماتك، وطرق التواصل، وصورتك الرمزية.</p>
                    </div>
                  </div>

                  {/* 🚀 إظهار مكون الرفع للجميع */}
                  <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                    <div className="shrink-0 relative group">
                      <div className="h-32 w-32 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center relative z-10">
                        {profileSettings.avatar_url ? (
                          <Image src={profileSettings.avatar_url} alt="Profile" fill className="object-cover" />
                        ) : (
                          <span className="text-5xl font-black text-indigo-400 opacity-50">{profileSettings.full_name?.charAt(0) || 'م'}</span>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-indigo-500 rounded-[2rem] blur-xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity"></div>
                    </div>
                    
                    <div className="flex-1 w-full text-center sm:text-right space-y-4">
                      <div>
                        <h4 className="text-lg font-black text-slate-900">الصورة الشخصية</h4>
                        <p className="text-xs font-bold text-slate-500 mt-1">يُفضل استخدام صورة مربعة (1:1) تظهر ملامحك بوضوح لتسهيل التواصل.</p>
                      </div>
                      <div className="max-w-md mx-auto sm:mx-0">
                        {/* 🚀 استدعاء المكون الخاص بك لرفع الصورة الشخصية */}
                        <ImageUpload
                          initialImageUrl={profileSettings.avatar_url}
                          onUploadSuccess={(url) => setProfileSettings({...profileSettings, avatar_url: url})}
                          label="تغيير الصورة الشخصية"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">الاسم الكامل</label>
                      <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text" 
                          value={profileSettings.full_name}
                          onChange={(e) => setProfileSettings({...profileSettings, full_name: e.target.value})}
                          className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-900 transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">البريد الإلكتروني</label>
                      <div className="relative">
                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="email" 
                          value={profileSettings.email}
                          onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
                          className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-900 transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">رقم الهاتف</label>
                      <div className="relative">
                        <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text" 
                          value={profileSettings.phone}
                          onChange={(e) => setProfileSettings({...profileSettings, phone: e.target.value})}
                          className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-900 transition-all" 
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {isTeacher && (
                      <div className="sm:col-span-2 space-y-2 pt-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">رابط غرفة الزووم (Zoom) الشخصية</label>
                        <div className="relative">
                          <Video className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
                          <input 
                            type="url" 
                            value={profileSettings.zoom_link}
                            onChange={(e) => setProfileSettings({...profileSettings, zoom_link: e.target.value})}
                            className="w-full pr-12 pl-4 py-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-indigo-900 transition-all" 
                            placeholder="https://zoom.us/j/..."
                            dir="ltr"
                          />
                        </div>
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mt-2">
                           <AlertCircle className="w-3.5 h-3.5" /> سيظهر هذا الرابط لطلابك مباشرة في جداولهم الدراسية للدخول للحصص الافتراضية.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'school' && (
                <div className="space-y-10">
                  <div className="border-b border-slate-100 pb-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl"><Building2 className="h-6 w-6 text-blue-600" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">المعلومات الأساسية للمدرسة</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">تحديث اسم المدرسة، الشعار، وبيانات التواصل التي تظهر في التقارير والشهادات.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-8 bg-blue-50/30 p-8 rounded-3xl border border-blue-100 mb-6">
                    <div className="shrink-0 relative group">
                      <div className="h-32 w-32 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative z-10">
                        {schoolSettings.logo_url ? (
                          <Image src={schoolSettings.logo_url} alt="School Logo" fill className="object-contain p-3 bg-white" />
                        ) : (
                          <Building2 className="h-12 w-12 text-blue-400 opacity-50" />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-blue-500 rounded-[2rem] blur-xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity"></div>
                    </div>
                    
                    <div className="flex-1 w-full text-center sm:text-right space-y-4">
                      <div>
                        <h4 className="text-lg font-black text-slate-900">شعار المدرسة الرسمي</h4>
                        <p className="text-xs font-bold text-slate-500 mt-1">سيتم عرض هذا الشعار في صفحة تسجيل الدخول والواجهات الرئيسية للنظام.</p>
                      </div>
                      <div className="max-w-md mx-auto sm:mx-0">
                        {/* 🚀 استدعاء المكون الخاص بك لرفع الشعار */}
                        <ImageUpload
                          initialImageUrl={schoolSettings.logo_url}
                          onUploadSuccess={(url) => setSchoolSettings({...schoolSettings, logo_url: url})}
                          label="رفع شعار جديد للمدرسة"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">اسم المدرسة / المؤسسة</label>
                      <div className="relative">
                        <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text" 
                          value={schoolSettings.name}
                          onChange={(e) => setSchoolSettings({...schoolSettings, name: e.target.value})}
                          className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-black text-slate-900 text-lg transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">العام الدراسي الحالي</label>
                      <select 
                        value={schoolSettings.academic_year}
                        onChange={(e) => setSchoolSettings({...schoolSettings, academic_year: e.target.value})}
                        className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold text-slate-900 transition-all cursor-pointer appearance-none"
                      >
                        <option value="2025 - 2026">2025 - 2026</option>
                        <option value="2026 - 2027">2026 - 2027</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">الفصل الدراسي النشط</label>
                      <select 
                        value={schoolSettings.semester}
                        onChange={(e) => setSchoolSettings({...schoolSettings, semester: e.target.value})}
                        className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold text-slate-900 transition-all cursor-pointer appearance-none"
                      >
                        <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                        <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">عنوان المدرسة الفعلي</label>
                      <div className="relative">
                        <MapPin className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                        <textarea 
                          rows={2}
                          value={schoolSettings.address}
                          onChange={(e) => setSchoolSettings({...schoolSettings, address: e.target.value})}
                          className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold text-slate-900 transition-all resize-none" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">رقم الهاتف الرسمي</label>
                      <div className="relative">
                        <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text" 
                          value={schoolSettings.phone}
                          onChange={(e) => setSchoolSettings({...schoolSettings, phone: e.target.value})}
                          className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold text-slate-900 transition-all" 
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">البريد الإلكتروني الرسمي</label>
                      <div className="relative">
                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="email" 
                          value={schoolSettings.email}
                          onChange={(e) => setSchoolSettings({...schoolSettings, email: e.target.value})}
                          className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold text-slate-900 transition-all" 
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-10">
                  <div className="border-b border-slate-100 pb-6 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-2xl"><Bell className="h-6 w-6 text-amber-600" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">تفضيلات الإشعارات والتنبيهات</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">التحكم في متى وكيف يقوم النظام بإزعاجك.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {[
                      { id: 'msgs', title: 'الرسائل المباشرة', desc: 'استلام بريد إلكتروني عند وصول رسالة جديدة من الإدارة أو الطلاب.' },
                      { id: 'ann', title: 'التعاميم والإعلانات', desc: 'تنبيه فوري عند نشر تعميم إداري جديد يخص قسمك.' },
                      { id: 'rep', title: 'التقارير الدورية', desc: 'استلام ملخص أسبوعي عن أداء المدرسة والحضور.' }
                    ].map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors">
                        <div>
                          <h4 className="text-base font-black text-slate-900">{item.title}</h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-10">
                  <div className="border-b border-slate-100 pb-6 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl"><Shield className="h-6 w-6 text-emerald-600" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات الأمان</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">تحديث كلمة المرور الخاصة بك وتأمين حسابك من الاختراق.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">كلمة المرور الجديدة</label>
                      <input 
                        type="password" 
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-bold text-slate-900 transition-all text-left" 
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">تأكيد كلمة المرور</label>
                      <input 
                        type="password" 
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-bold text-slate-900 transition-all text-left" 
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex items-start gap-3 text-emerald-800">
                    <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold leading-relaxed">
                      يُنصح باستخدام كلمة مرور معقدة تحتوي على أرقام وحروف. عند تغيير كلمة المرور بنجاح، قد تحتاج إلى تسجيل الدخول مرة أخرى لتأكيد هويتك.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'platform' && (
                <div className="space-y-10">
                  <div className="border-b border-slate-100 pb-6 flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-2xl shadow-md"><Power className="h-6 w-6 text-white" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">غرفة التحكم المركزية</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">السيطرة الكاملة على صلاحيات الدخول وإغلاق المنصة للطوارئ أو الصيانة.</p>
                    </div>
                  </div>

                  <motion.div 
                    animate={{ 
                      background: platformSettings.is_open 
                        ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' 
                        : 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
                      borderColor: platformSettings.is_open ? '#bbf7d0' : '#fecdd3'
                    }}
                    className="relative overflow-hidden rounded-[2.5rem] border-2 p-8 sm:p-12 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col lg:flex-row items-center justify-between gap-8 transition-colors duration-500"
                  >
                    <div className={cn(
                      "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-50 pointer-events-none transition-colors duration-1000",
                      platformSettings.is_open ? "bg-emerald-400" : "bg-rose-500 animate-pulse"
                    )} />

                    <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-6 w-full lg:w-auto">
                      <div className={cn(
                        "h-20 w-20 sm:h-24 sm:w-24 rounded-full flex items-center justify-center shadow-inner border-4 transition-all duration-500 shrink-0",
                        platformSettings.is_open ? "bg-emerald-500 border-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.5)]" : "bg-rose-600 border-rose-100 shadow-[0_0_30px_rgba(225,29,72,0.6)]"
                      )}>
                         {platformSettings.is_open ? <Unlock className="h-8 w-8 sm:h-10 sm:w-10 text-white" /> : <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-white" />}
                      </div>
                      <div className="pt-2">
                        <motion.h4 
                          key={platformSettings.is_open ? 'open' : 'closed'}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("text-2xl sm:text-3xl font-black tracking-tight mb-2 drop-shadow-sm", platformSettings.is_open ? 'text-emerald-900' : 'text-rose-900')}
                        >
                          {platformSettings.is_open ? 'المنصة نشطة وتعمل بالكامل' : 'المنصة مغلقة (وضع الصيانة)'}
                        </motion.h4>
                        <p className={cn("text-sm font-bold bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl inline-block border", platformSettings.is_open ? 'text-emerald-700 border-emerald-100' : 'text-rose-700 border-rose-100')}>
                          {platformSettings.is_open 
                            ? 'جميع المعلمين والطلاب يمكنهم الدخول والتفاعل بحرية.' 
                            : 'لا يمكن لأي مستخدم الدخول باستثناء فريق الإدارة العليا.'}
                        </p>
                      </div>
                    </div>

                    <div className="relative z-10 shrink-0 mt-4 lg:mt-0 bg-white/50 p-4 rounded-3xl border shadow-sm backdrop-blur-md">
                       <label className="relative inline-flex items-center cursor-pointer group">
                         <input 
                           type="checkbox" 
                           className="sr-only peer" 
                           checked={platformSettings.is_open}
                           onChange={() => setPlatformSettings({...platformSettings, is_open: !platformSettings.is_open})}
                         />
                         <div className="w-36 h-16 bg-rose-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-20 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-14 after:w-14 after:transition-all after:duration-500 after:shadow-md peer-checked:bg-emerald-500 shadow-inner flex items-center justify-between px-5">
                            <span className={cn("text-sm font-black z-0 transition-opacity duration-300", platformSettings.is_open ? "opacity-100 text-emerald-50 drop-shadow-md" : "opacity-0")}>ON</span>
                            <span className={cn("text-sm font-black z-0 transition-opacity duration-300", !platformSettings.is_open ? "opacity-100 text-rose-700" : "opacity-0")}>OFF</span>
                         </div>
                       </label>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                    <div className="sm:col-span-2 border-b border-slate-200 pb-4 mb-2">
                       <h4 className="text-lg font-black text-slate-800 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500"/> الجدولة التلقائية</h4>
                       <p className="text-xs font-bold text-slate-500">سيقوم النظام بتغيير حالة المنصة آلياً عند وصول هذا التوقيت.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-emerald-600 uppercase tracking-widest block bg-emerald-50 w-fit px-2 py-1 rounded-md border border-emerald-100">موعد الفتح التلقائي</label>
                      <input 
                        type="datetime-local" 
                        value={platformSettings.open_date}
                        onChange={(e) => setPlatformSettings({...platformSettings, open_date: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none font-bold text-slate-900 shadow-sm transition-all text-left hover:border-emerald-300" 
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-rose-600 uppercase tracking-widest block bg-rose-50 w-fit px-2 py-1 rounded-md border border-rose-100">موعد الإغلاق التلقائي</label>
                      <input 
                        type="datetime-local" 
                        value={platformSettings.close_date}
                        onChange={(e) => setPlatformSettings({...platformSettings, close_date: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none font-bold text-slate-900 shadow-sm transition-all text-left hover:border-rose-300" 
                        dir="ltr"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-2 pt-6">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500"/> رسالة الإغلاق المخصصة
                      </label>
                      <textarea 
                        rows={3} 
                        value={platformSettings.message}
                        onChange={(e) => setPlatformSettings({...platformSettings, message: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-900 shadow-sm transition-all resize-none leading-relaxed text-lg" 
                        placeholder="نعتذر، المنصة مغلقة حالياً..."
                      />
                      <p className="text-[10px] font-bold text-slate-400">هذه الرسالة ستظهر في منتصف شاشة المستخدمين أثناء إغلاق المنصة.</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


```
