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
  Camera,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  MapPin,
  Clock,
  Video,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ImageUpload from '@/components/ImageUpload';
import Image from 'next/image';

type Tab = 'school' | 'profile' | 'notifications' | 'security' | 'platform';

// توسيع النوع المحلي ليدعم الصورة الشخصية
interface ExtendedProfileSettings extends ProfileSettings {
  avatar_url?: string;
}

export default function SettingsPage() {
  const { userRole } = useAuth();
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
  
  const isAdmin = userRole === 'admin' || userRole === 'management';
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
    email: 'info@alrifaa.edu'
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
        name: platform.school_name,
        academic_year: platform.academic_year,
        semester: platform.semester,
        address: platform.address,
        phone: platform.phone,
        email: platform.email
      });
    }

    if (isAdmin) {
      setActiveTab('school');
    } else if (isStudent) {
      setActiveTab('security');
    }
  }, [fetchProfile, fetchPlatformSettings, isAdmin, isStudent]);

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
          };
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
    ...(isAdmin ? [{ id: 'school', label: 'إعدادات المدرسة', icon: Building2, desc: 'الهوية وبيانات التواصل' }] : []),
    ...(!isStudent ? [{ id: 'profile', label: 'الملف الشخصي', icon: User, desc: 'معلوماتك الشخصية والصورة' }] : []),
    { id: 'notifications', label: 'الإشعارات', icon: Bell, desc: 'تفضيلات التنبيهات' },
    { id: 'security', label: 'الأمان', icon: Shield, desc: 'كلمة المرور والحماية' },
    ...(isAdmin ? [{ id: 'platform', label: 'حالة المنصة', icon: Clock, desc: 'أوقات العمل والصيانة' }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 p-4 sm:p-6 lg:p-8" dir="rtl">
      
      {/* Toast Notification */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <Settings className="h-8 w-8 text-indigo-600" />
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
        
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3">
          <nav className="flex flex-col gap-2 sticky top-8">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-[2rem] transition-all text-right group relative overflow-hidden ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  {isActive && <motion.div layoutId="activeTab" className="absolute inset-0 bg-indigo-600 -z-10" />}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors z-10 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600'
                  }`}>
                    <tab.icon className="h-5 w-5" />
                  </div>
                  <div className="z-10">
                    <p className="text-sm font-black tracking-tight">{tab.label}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>{tab.desc}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
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
              {/* Profile Settings 🚀 (تحديث الصورة هنا) */}
              {activeTab === 'profile' && (
                <div className="space-y-10">
                  <div className="border-b border-slate-100 pb-6 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl"><User className="h-6 w-6 text-indigo-600" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات الملف الشخصي</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">تحديث معلوماتك، وطرق التواصل، وصورتك الرمزية التي تظهر للطلاب.</p>
                    </div>
                  </div>

                  {(isAdmin || isTeacher) && (
                    <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                      <div className="shrink-0 relative group">
                        <div className="h-32 w-32 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center relative z-10">
                          {profileSettings.avatar_url ? (
                            <Image src={profileSettings.avatar_url} alt="Profile" width={128} height={128} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-5xl font-black text-indigo-400 opacity-50">{profileSettings.full_name?.charAt(0) || 'م'}</span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-indigo-500 rounded-[2rem] blur-xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity"></div>
                      </div>
                      
                      <div className="flex-1 w-full text-center sm:text-right space-y-4">
                        <div>
                          <h4 className="text-lg font-black text-slate-900">الصورة الشخصية</h4>
                          <p className="text-xs font-bold text-slate-500 mt-1">يُفضل استخدام صورة مربعة (1:1) تظهر ملامحك بوضوح لتسهيل تواصل الطلاب معك.</p>
                        </div>
                        <div className="max-w-md mx-auto sm:mx-0">
                          <ImageUpload
                            initialImageUrl={profileSettings.avatar_url}
                            onUploadSuccess={(url) => setProfileSettings({...profileSettings, avatar_url: url})}
                            label="تغيير الصورة الشخصية"
                          />
                        </div>
                      </div>
                    </div>
                  )}

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

              {/* School Settings */}
              {activeTab === 'school' && (
                <div className="space-y-10">
                  <div className="border-b border-slate-100 pb-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl"><Building2 className="h-6 w-6 text-blue-600" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">المعلومات الأساسية للمدرسة</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">تحديث اسم المدرسة، الشعار، وبيانات التواصل التي تظهر في التقارير والشهادات.</p>
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

              {/* Notifications Settings */}
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
                      { id: 'rep', title: 'التقارير الدورية', desc: 'استلام ملخص أسبوعي عن أداء النظام والمهام المعلقة.' }
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

              {/* Security Settings */}
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

              {/* Platform Settings */}
              {activeTab === 'platform' && (
                <div className="space-y-10">
                  <div className="border-b border-slate-100 pb-6 flex items-center gap-4">
                    <div className="p-3 bg-rose-50 rounded-2xl"><Clock className="h-6 w-6 text-rose-600" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">إدارة حالة المنصة</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">التحكم المركزي في فتح وإغلاق المنصة أمام الطلاب والمعلمين.</p>
                    </div>
                  </div>

                  <div className={`p-8 rounded-[2rem] border-2 transition-colors flex flex-col sm:flex-row items-center justify-between gap-6 ${platformSettings.is_open ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                    <div>
                      <h4 className={`text-xl font-black mb-1 ${platformSettings.is_open ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {platformSettings.is_open ? 'المنصة نشطة وتعمل بكامل طاقتها' : 'المنصة مغلقة في وضع الصيانة'}
                      </h4>
                      <p className={`text-sm font-bold ${platformSettings.is_open ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {platformSettings.is_open ? 'يمكن للجميع الدخول والتفاعل مع النظام.' : 'لا يمكن لأحد الدخول باستثناء المديرين.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={platformSettings.is_open}
                        onChange={() => setPlatformSettings({...platformSettings, is_open: !platformSettings.is_open})}
                      />
                      <div className="w-20 h-10 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-10 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-8 after:w-8 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">جدولة الفتح التلقائي</label>
                      <input 
                        type="datetime-local" 
                        value={platformSettings.open_date}
                        onChange={(e) => setPlatformSettings({...platformSettings, open_date: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none font-bold text-slate-900 transition-all text-left" 
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">جدولة الإغلاق التلقائي</label>
                      <input 
                        type="datetime-local" 
                        value={platformSettings.close_date}
                        onChange={(e) => setPlatformSettings({...platformSettings, close_date: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none font-bold text-slate-900 transition-all text-left" 
                        dir="ltr"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-2 pt-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">الرسالة المعروضة أثناء الإغلاق</label>
                      <textarea 
                        rows={3} 
                        value={platformSettings.message}
                        onChange={(e) => setPlatformSettings({...platformSettings, message: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none font-bold text-slate-900 transition-all resize-none leading-relaxed" 
                        placeholder="نعتذر، المنصة مغلقة حالياً..."
                      />
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
