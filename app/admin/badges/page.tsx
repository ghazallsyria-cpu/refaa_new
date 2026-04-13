'use client';

import { useState, useEffect, useRef } from 'react';
import { useBadgesSystem, Badge } from '@/hooks/useBadgesSystem';
import { useAuth } from '@/context/auth-context'; // 🚀 استيراد جدار الحماية
import { Plus, Edit2, Trash2, Award, Medal, X, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import ImageUpload from '@/components/ImageUpload';

const COLOR_THEMES = [
  { value: 'amber', label: 'ذهبي (Amber)', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  { value: 'cyan', label: 'ماسي (Cyan)', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  { value: 'slate', label: 'فضي (Slate)', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  { value: 'emerald', label: 'زمردي (Emerald)', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { value: 'violet', label: 'بنفسجي (Violet)', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  { value: 'rose', label: 'وردي (Rose)', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
];

export default function AdminBadgesPage() {
  const { authRole, isChecking } = useAuth(); // 🚀 تفعيل الحماية

  const { 
    availableBadges, 
    loading: hookLoading, 
    fetchAvailableBadges, 
    createBadge, 
    updateBadge, 
    deleteAdminBadge 
  } = useBadgesSystem();

  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBadge, setCurrentBadge] = useState<Partial<Badge>>({ color_theme: 'amber', points: 10 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [badgeToDelete, setBadgeToDelete] = useState<Badge | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const fetchRef = useRef(fetchAvailableBadges);

  useEffect(() => {
    fetchRef.current = fetchAvailableBadges;
  }, [fetchAvailableBadges]);

  useEffect(() => {
    setIsMounted(true);
    // 🚀 لا نطلب البيانات من السيرفر إلا إذا كان المستخدم ضمن الإدارة
    if (authRole === 'admin' || authRole === 'management') {
      fetchRef.current();
    }
  }, [authRole]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBadge.name || !currentBadge.image_url || !currentBadge.points) {
      showNotification('error', 'يرجى تعبئة جميع الحقول وإرفاق صورة الوسام');
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentBadge.id) {
        // === حالة التعديل ===
        const originalBadge = availableBadges.find(b => b.id === currentBadge.id);
        if (originalBadge?.image_url && originalBadge.image_url !== currentBadge.image_url) {
          await deleteFromCloudinary(originalBadge.image_url);
        }
        
        const result = await updateBadge(currentBadge.id, currentBadge);
        if (!result.success) throw new Error(result.error); 
        
        showNotification('success', 'تم تحديث الوسام بنجاح');
      } else {
        // === حالة الإضافة الجديدة ===
        const result = await createBadge(currentBadge);
        if (!result.success) throw new Error(result.error); 
        
        showNotification('success', 'تم إنشاء الوسام الجديد بنجاح');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Database Error:", error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الوسام في قاعدة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!badgeToDelete) return;
    
    try {
      if (badgeToDelete.image_url) {
        await deleteFromCloudinary(badgeToDelete.image_url);
      }
      const result = await deleteAdminBadge(badgeToDelete.id);
      if (!result.success) throw new Error(result.error);

      showNotification('success', 'تم حذف الوسام نهائياً');
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setBadgeToDelete(null);
    }
  };

  const openAddModal = () => {
    setCurrentBadge({ color_theme: 'amber', points: 10 });
    setIsModalOpen(true);
  };

  const openEditModal = (badge: Badge) => {
    setCurrentBadge(badge);
    setIsModalOpen(true);
  };

  const getThemeStyles = (themeValue: string) => {
    return COLOR_THEMES.find(t => t.value === themeValue) || COLOR_THEMES[0];
  };

  if (!isMounted) return null;

  // 🚀 شاشة التحميل وحماية الوصول
  if (isChecking || hookLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-screen flex items-center justify-center bg-slate-50">هذه الصفحة مخصصة لفريق الإدارة فقط.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 relative overflow-hidden font-cairo" dir="rtl">
      {/* Mesh Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-amber-100/40 via-orange-50/40 to-yellow-50/40 -z-10 blur-3xl rounded-b-[100px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        
        {/* 🚀 زر العودة الموحد */}
        <div className="mb-2">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-amber-600 font-bold bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200 transition-all w-fit group">
            <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
          </Link>
        </div>

        {/* Toast Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`fixed top-10 left-1/2 z-[150] -translate-x-1/2 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 backdrop-blur-xl border ${
                notification.type === 'success' ? 'bg-emerald-500/95 border-emerald-400 text-white shadow-emerald-500/30' : 'bg-red-500/95 border-red-400 text-white shadow-red-500/30'
              }`}
            >
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                {notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>
              <div className="font-bold text-lg">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-white/60 backdrop-blur-2xl p-10 rounded-[3rem] border border-white shadow-xl shadow-amber-200/20"
        >
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-amber-50 text-amber-700 text-sm font-black tracking-widest border border-amber-100">
              <Award className="h-5 w-5" />
              إدارة التحفيز والتميز
            </div>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">أوسمة <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">الطلاب</span></h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl">أضف أوسمة جديدة، حدد نقاطها، وارفع صورها الجذابة ليتمكن المعلمون من منحها للمتميزين.</p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.03, translateY: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={openAddModal}
            className="group relative inline-flex items-center justify-center gap-3 rounded-[2rem] bg-slate-900 px-10 py-6 text-lg font-black text-white shadow-2xl shadow-slate-900/30 hover:bg-amber-500 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Plus className="relative z-10 h-6 w-6" />
            <span className="relative z-10">ابتكار وسام جديد</span>
          </motion.button>
        </motion.div>

        {/* Content */}
        {availableBadges.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-[3rem] border border-white shadow-xl"
          >
            <Medal className="h-24 w-24 text-slate-300 mx-auto mb-6" />
            <h3 className="text-3xl font-black text-slate-900">لا توجد أوسمة بعد</h3>
            <p className="text-slate-500 mt-4 text-xl">قم بإنشاء أول وسام لتفعيل نظام النقاط والمكافآت في المدرسة.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {availableBadges.map((badge, index) => {
                const theme = getThemeStyles(badge.color_theme);
                return (
                  <motion.div 
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-white rounded-[2.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col"
                  >
                    <div className={`p-8 pb-0 flex justify-center items-center relative overflow-hidden h-48 ${theme.bg}`}>
                      {/* خلفية مشعة للوسام */}
                      <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent z-0"></div>
                      
                      {badge.image_url ? (
                        <div className="relative h-32 w-32 z-10 group-hover:scale-110 transition-transform duration-500">
                          <Image 
                            src={badge.image_url} 
                            alt={badge.name} 
                            fill 
                            unoptimized
                            referrerPolicy="no-referrer"
                            className="object-contain drop-shadow-2xl" 
                          />
                        </div>
                      ) : (
                        <Medal className={`h-24 w-24 z-10 ${theme.text} opacity-50`} />
                      )}
                      
                      {/* نقاط الوسام العائمة */}
                      <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-2xl shadow-md font-black text-slate-800 z-10 border border-slate-100 flex items-center gap-1">
                        <span className="text-xl">{badge.points}</span>
                        <span className="text-xs text-slate-400">نقطة</span>
                      </div>
                    </div>

                    <div className="p-8 flex-1 flex flex-col">
                      <h3 className="text-2xl font-black text-slate-900 mb-2">{badge.name}</h3>
                      <p className="text-slate-500 font-medium leading-relaxed mb-6 flex-1">{badge.description}</p>
                      
                      <div className="flex gap-3 pt-6 border-t border-slate-100">
                        <button 
                          onClick={() => openEditModal(badge)}
                          className="flex-1 py-3 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-colors font-bold text-sm bg-slate-50 border border-slate-100 flex justify-center items-center gap-2"
                        >
                          <Edit2 className="h-4 w-4" /> تعديل
                        </button>
                        <button 
                          onClick={() => setBadgeToDelete(badge)}
                          className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors bg-slate-50 border border-slate-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white p-8 md:p-10 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto custom-scrollbar" dir="rtl">
              <Dialog.Description className="sr-only">نافذة إدارة الوسام</Dialog.Description>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Award className="h-7 w-7" />
                  </div>
                  <div>
                    <Dialog.Title className="text-2xl font-black text-slate-900">
                      {currentBadge.id ? 'تعديل الوسام' : 'تصميم وسام جديد'}
                    </Dialog.Title>
                  </div>
                </div>
                <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>

              <form onSubmit={handleSaveBadge} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">اسم الوسام</label>
                  <input 
                    type="text" required placeholder="مثال: الوسام الماسي"
                    className="w-full rounded-2xl border-0 py-4 px-5 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-amber-500 font-bold"
                    value={currentBadge.name || ''} onChange={e => setCurrentBadge({...currentBadge, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700">النقاط (القيمة)</label>
                    <input 
                      type="number" required min="0" placeholder="0"
                      className="w-full rounded-2xl border-0 py-4 px-5 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-amber-500 font-bold text-lg"
                      value={currentBadge.points || ''} onChange={e => setCurrentBadge({...currentBadge, points: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700">لون الخلفية (السمة)</label>
                    <select 
                      className="w-full rounded-2xl border-0 py-4 px-5 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-amber-500 font-bold"
                      value={currentBadge.color_theme || 'amber'} onChange={e => setCurrentBadge({...currentBadge, color_theme: e.target.value})}
                    >
                      {COLOR_THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">وصف الوسام وإنجازه</label>
                  <textarea 
                    required rows={3} placeholder="متى يمنح هذا الوسام؟"
                    className="w-full rounded-2xl border-0 py-4 px-5 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-amber-500 font-bold resize-none"
                    value={currentBadge.description || ''} onChange={e => setCurrentBadge({...currentBadge, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">صورة الوسام (شفافة PNG مفضلة)</label>
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-2 hover:bg-slate-100 transition-colors">
                    <ImageUpload 
                      initialImageUrl={currentBadge.image_url ?? undefined}
                      onUploadSuccess={(url) => setCurrentBadge({...currentBadge, image_url: url || undefined})}
                      label="ارفع صورة الوسام هنا"
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <Dialog.Close asChild>
                    <button type="button" className="flex-1 py-4 rounded-2xl bg-slate-100 font-black text-slate-600 hover:bg-slate-200">إلغاء</button>
                  </Dialog.Close>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 rounded-2xl bg-amber-500 font-black text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 disabled:opacity-50 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Award className="h-5 w-5"/> حفظ الوسام</>}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Delete Modal */}
        <Dialog.Root open={!!badgeToDelete} onOpenChange={() => setBadgeToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white p-8 text-center shadow-2xl" dir="rtl">
              <Dialog.Description className="sr-only">تأكيد حذف الوسام</Dialog.Description>
              <div className="mx-auto h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="h-10 w-10" />
              </div>
              <Dialog.Title className="text-2xl font-black text-slate-900 mb-3">حذف الوسام نهائياً؟</Dialog.Title>
              <p className="text-slate-500 mb-8 font-medium">سيتم حذف هذا الوسام من النظام، ولن يتمكن المعلمون من منحه مجدداً.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full py-4 rounded-2xl bg-red-500 text-white font-black hover:bg-red-600 shadow-lg shadow-red-500/20">نعم، احذف الوسام</button>
                <Dialog.Close asChild>
                  <button className="w-full py-4 rounded-2xl bg-slate-50 text-slate-600 font-black hover:bg-slate-100">إلغاء</button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
    </div>
  );
}
