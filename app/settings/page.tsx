'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Save, 
  Upload, 
  Camera 
} from 'lucide-react';

type Tab = 'school' | 'profile' | 'notifications' | 'security' | 'platform';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  const [platformSettings, setPlatformSettings] = useState({
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

  const [profileSettings, setProfileSettings] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    zoom_link: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email, phone, role')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          let zoomLink = '';
          if (userData.role === 'teacher') {
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('zoom_link')
              .eq('id', user.id)
              .single();
            if (teacherData) {
              zoomLink = teacherData.zoom_link || '';
            }
          }

          setProfileSettings({
            full_name: userData.full_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            role: userData.role || '',
            zoom_link: zoomLink
          });
        }
        
        if (userData?.role === 'admin' || userData?.role === 'management') {
          setIsAdmin(true);
          setActiveTab('school');
        } else if (userData?.role === 'student') {
          setIsStudent(true);
          setActiveTab('security');
        }
      }

      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setPlatformSettings({
          id: data.id,
          is_open: data.is_open,
          open_date: data.open_date ? new Date(data.open_date).toISOString().slice(0, 16) : '',
          close_date: data.close_date ? new Date(data.close_date).toISOString().slice(0, 16) : '',
          message: data.message || 'المنصة مغلقة حاليا للصيانة'
        });
        
        setSchoolSettings({
          name: data.school_name || 'مدرسة الرفعة النموذجية',
          academic_year: data.academic_year || '2025 - 2026',
          semester: data.semester || 'الفصل الدراسي الأول',
          address: data.address || 'شارع الملك فهد، حي الياسمين، الرياض',
          phone: data.phone || '0112345678',
          email: data.email || 'info@alrifaa.edu'
        });
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      if (activeTab === 'security') {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          throw new Error('كلمات المرور الجديدة غير متطابقة');
        }
        if (passwordData.newPassword.length < 6) {
          throw new Error('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
        }

        const { error } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });
        if (error) throw error;

        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else if (isAdmin && (activeTab === 'platform' || activeTab === 'school')) {
        let updateData: any = {
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        };

        if (activeTab === 'platform') {
          updateData = {
            ...updateData,
            is_open: platformSettings.is_open,
            message: platformSettings.message,
            open_date: platformSettings.open_date ? new Date(platformSettings.open_date).toISOString() : null,
            close_date: platformSettings.close_date ? new Date(platformSettings.close_date).toISOString() : null,
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

        if (platformSettings.id) {
          const { error } = await supabase
            .from('platform_settings')
            .update(updateData)
            .eq('id', platformSettings.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('platform_settings')
            .insert([updateData]);
          if (error) throw error;
        }
      } else if (activeTab === 'profile') {
        // Update user profile
        const { error: userError } = await supabase
          .from('users')
          .update({
            full_name: profileSettings.full_name,
            phone: profileSettings.phone
          })
          .eq('id', user.id);
        if (userError) throw userError;

        // Update teacher specific data if applicable
        if (profileSettings.role === 'teacher') {
          const { error: teacherError } = await supabase
            .from('teachers')
            .update({
              zoom_link: profileSettings.zoom_link
            })
            .eq('id', user.id);
          if (teacherError) throw teacherError;
        }
      } else {
        // For other tabs, simulate save
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      setMessage({ text: 'تم حفظ الإعدادات بنجاح', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error: any) {
      console.error(error);
      setMessage({ text: error.message || 'حدث خطأ أثناء حفظ الإعدادات', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الإعدادات</h1>
          <p className="text-slate-500">إدارة تفضيلات النظام والملف الشخصي</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="mr-2 h-4 w-4 ml-2" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('school')}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'school' 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Building2 className={`h-5 w-5 ${activeTab === 'school' ? 'text-indigo-700' : 'text-slate-400'}`} />
                إعدادات المدرسة
              </button>
            )}
            {!isStudent && (
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'profile' 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <User className={`h-5 w-5 ${activeTab === 'profile' ? 'text-indigo-700' : 'text-slate-400'}`} />
                الملف الشخصي
              </button>
            )}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'notifications' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Bell className={`h-5 w-5 ${activeTab === 'notifications' ? 'text-indigo-700' : 'text-slate-400'}`} />
              الإشعارات
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'security' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Shield className={`h-5 w-5 ${activeTab === 'security' ? 'text-indigo-700' : 'text-slate-400'}`} />
              الأمان وكلمة المرور
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('platform')}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'platform' 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Building2 className={`h-5 w-5 ${activeTab === 'platform' ? 'text-indigo-700' : 'text-slate-400'}`} />
                حالة المنصة
              </button>
            )}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
            
            {/* School Settings */}
            {activeTab === 'school' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">المعلومات الأساسية للمدرسة</h3>
                  <p className="mt-1 text-sm text-slate-500">تحديث اسم المدرسة، الشعار، وبيانات التواصل الرسمية.</p>
                </div>

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">شعار المدرسة</label>
                    <div className="mt-2 flex items-center gap-x-3">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <Building2 className="h-8 w-8 text-slate-300" />
                      </div>
                      <button type="button" className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                        تغيير الشعار
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">اسم المدرسة</label>
                    <input 
                      type="text" 
                      value={schoolSettings.name}
                      onChange={(e) => setSchoolSettings({...schoolSettings, name: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">العام الدراسي الحالي</label>
                    <select 
                      value={schoolSettings.academic_year}
                      onChange={(e) => setSchoolSettings({...schoolSettings, academic_year: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    >
                      <option value="2025 - 2026">2025 - 2026</option>
                      <option value="2026 - 2027">2026 - 2027</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">الفصل الدراسي</label>
                    <select 
                      value={schoolSettings.semester}
                      onChange={(e) => setSchoolSettings({...schoolSettings, semester: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    >
                      <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                      <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">العنوان</label>
                    <input 
                      type="text" 
                      value={schoolSettings.address}
                      onChange={(e) => setSchoolSettings({...schoolSettings, address: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">رقم الهاتف الرسمي</label>
                    <input 
                      type="text" 
                      value={schoolSettings.phone}
                      onChange={(e) => setSchoolSettings({...schoolSettings, phone: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">البريد الإلكتروني الرسمي</label>
                    <input 
                      type="email" 
                      value={schoolSettings.email}
                      onChange={(e) => setSchoolSettings({...schoolSettings, email: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">الملف الشخصي</h3>
                  <p className="mt-1 text-sm text-slate-500">تحديث بياناتك الشخصية وصورتك الرمزية.</p>
                </div>

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">الصورة الشخصية</label>
                    <div className="mt-2 flex items-center gap-x-3">
                      <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                        أ
                      </div>
                      <button type="button" className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        تغيير الصورة
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">الاسم الكامل</label>
                    <input 
                      type="text" 
                      value={profileSettings.full_name}
                      onChange={(e) => setProfileSettings({...profileSettings, full_name: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      value={profileSettings.email}
                      onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">رقم الهاتف</label>
                    <input 
                      type="text" 
                      value={profileSettings.phone}
                      onChange={(e) => setProfileSettings({...profileSettings, phone: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  {profileSettings.role === 'teacher' && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-slate-900">رابط برنامج زوم (Zoom)</label>
                      <input 
                        type="url" 
                        value={profileSettings.zoom_link}
                        onChange={(e) => setProfileSettings({...profileSettings, zoom_link: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                        placeholder="https://zoom.us/j/..."
                      />
                      <p className="mt-1 text-xs text-slate-500">سيظهر هذا الرابط للطلاب في جدول الحصص الخاص بهم.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">تفضيلات الإشعارات</h3>
                  <p className="mt-1 text-sm text-slate-500">اختر متى وكيف تريد أن تتلقى الإشعارات.</p>
                </div>

                <div className="space-y-6">
                  <fieldset>
                    <legend className="text-sm font-semibold leading-6 text-slate-900">إشعارات البريد الإلكتروني</legend>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input id="comments" name="comments" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="mr-3 text-sm leading-6">
                          <label htmlFor="comments" className="font-medium text-slate-900">الرسائل الجديدة</label>
                          <p className="text-slate-500">استلام بريد إلكتروني عند وصول رسالة جديدة في النظام.</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input id="candidates" name="candidates" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="mr-3 text-sm leading-6">
                          <label htmlFor="candidates" className="font-medium text-slate-900">الإعلانات الهامة</label>
                          <p className="text-slate-500">استلام بريد إلكتروني عند نشر تعميم إداري جديد.</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input id="offers" name="offers" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="mr-3 text-sm leading-6">
                          <label htmlFor="offers" className="font-medium text-slate-900">التقارير الأسبوعية</label>
                          <p className="text-slate-500">استلام ملخص أسبوعي عن أداء المدرسة والحضور.</p>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">الأمان وكلمة المرور</h3>
                  <p className="mt-1 text-sm text-slate-500">تحديث كلمة المرور الخاصة بك وتأمين حسابك.</p>
                </div>

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="••••••••" 
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">تأكيد كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="••••••••" 
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-4">ملاحظة: عند تغيير كلمة المرور، ستحتاج إلى تسجيل الدخول مرة أخرى باستخدام كلمة المرور الجديدة.</p>
                </div>
              </div>
            )}
            {/* Platform Settings */}
            {activeTab === 'platform' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">حالة المنصة</h3>
                  <p className="mt-1 text-sm text-slate-500">التحكم في فتح وإغلاق المنصة وجدولة أوقات العمل.</p>
                </div>

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                  <div className="sm:col-span-2 flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div>
                      <h4 className="text-base font-medium text-slate-900">حالة المنصة الحالية</h4>
                      <p className="text-sm text-slate-500">
                        {platformSettings.is_open ? 'المنصة مفتوحة وتعمل بشكل طبيعي' : 'المنصة مغلقة حالياً'}
                      </p>
                    </div>
                    <button
                      onClick={() => setPlatformSettings({...platformSettings, is_open: !platformSettings.is_open})}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${platformSettings.is_open ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      role="switch"
                      aria-checked={platformSettings.is_open}
                    >
                      <span className="sr-only">تفعيل المنصة</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${platformSettings.is_open ? '-translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium leading-6 text-slate-900">تاريخ ووقت الفتح التلقائي</label>
                    <input 
                      type="datetime-local" 
                      value={platformSettings.open_date}
                      onChange={(e) => setPlatformSettings({...platformSettings, open_date: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium leading-6 text-slate-900">تاريخ ووقت الإغلاق التلقائي</label>
                    <input 
                      type="datetime-local" 
                      value={platformSettings.close_date}
                      onChange={(e) => setPlatformSettings({...platformSettings, close_date: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">رسالة الإغلاق</label>
                    <p className="mt-1 text-sm text-slate-500">تظهر للمستخدمين عندما تكون المنصة مغلقة.</p>
                    <textarea 
                      rows={3} 
                      value={platformSettings.message}
                      onChange={(e) => setPlatformSettings({...platformSettings, message: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
