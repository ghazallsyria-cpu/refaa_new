'use client';

import { useState, useEffect } from 'react';
import { useBadgesSystem, Badge } from '@/hooks/useBadgesSystem';
import { useAuth } from '@/context/auth-context'; 
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
  const { authRole, isChecking } = useAuth() as any; 

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

  useEffect(() => {
    setIsMounted(true);
    // 🚀 استدعاء مباشر ونظيف (الـ fetchAvailableBadges محصن بـ useCallback في الهوك)
    if (!isChecking && (authRole === 'admin' || authRole === 'management')) {
      fetchAvailableBadges();
    }
  }, [authRole, isChecking, fetchAvailableBadges]);

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
        
        // 🚀 تنظيف الصورة القديمة من Cloudinary فقط إذا تم تغييرها!
        if (originalBadge?.image_url && originalBadge.image_url !== currentBadge.image_url) {
          try { await deleteFromCloudinary(originalBadge.image_url); } 
          catch(e) { console.warn("Cloudinary delete ignored", e); }
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
    
    setIsSubmitting(true);
    try {
      if (badgeToDelete.image_url) {
         try { await deleteFromCloudinary(badgeToDelete.image_url); }
         catch(e) { console.warn("Cloudinary delete ignored", e); }
      }
      const result = await deleteAdminBadge(badgeToDelete.id);
      if (!result.success) throw new Error(result.error);

      showNotification('success', 'تم حذف الوسام نهائياً');
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsSubmitting(false);
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

  if (isChecking || hookLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
          <p className="text-amber-500 font-bold animate-pulse">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 h-[100dvh] flex items-center justify-center bg-[#090b14]">هذه الصفحة مخصصة لفريق الإدارة فقط.</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-[#090b14] pb-24 relative overflow-hidden font-cairo" dir="rtl">
      {/* Mesh Gradient Background - Adjusted for Dark Mode */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent -z-10 blur-3xl rounded-b-[100px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        
        <div className="mb-2">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-amber-500 font-bold bg-[#131836]/60 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-white/10 transition-all w-fit group">
            <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
          </Link>
        </div>

        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`fixed top-10 left-1/2 z-[150] -translate-x-1/2 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 backdrop-blur-xl border ${
                notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-red-950/90 border-red-500/50 text-red-400'
              }`}
            >
              <div className="h-10 w-10 rounded-2xl bg-[#02040a]/40 flex items-center justify-center border border-white/5">
                {notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>
              <div className="font-bold text-sm sm:text-base text-white">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white">
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-[#131836]/60 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-amber-500/10 text-amber-500 text-sm font-black tracking-widest border border-amber-500/20 shadow-inner">
              <Award className="h-5 w-5" />
              إدارة التحفيز والتميز
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">أوسمة <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">الطلاب</span></h1>
            <p className="text-sm sm:text-base text-slate-400 font-bold max-w-2xl leading-relaxed">أضف أوسمة جديدة، حدد نقاطها، وارفع صورها الجذابة ليتمكن المعلمون من منحها للمتميزين.</p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.03, translateY: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={openAddModal}
            className="group relative inline-flex items-center justify-center gap-3 rounded-[2rem] bg-[#02040a] px-10 py-5 text-sm sm:text-base font-black text-white shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all duration-300 overflow-hidden border border-amber-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Plus className="relative z-10 h-5 w-5" />
            <span className="relative z-10">ابتكار وسام جديد</span>
          </motion.button>
        </motion.div>

        {availableBadges.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 sm:py-32 bg-[#131836]/40 backdrop-blur-sm rounded-[3rem] border border-dashed border-white/10 shadow-inner px-4"
          >
            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-[#0f1423] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/5">
               <Medal className="h-10 w-10 sm:h-12 sm:w-12 text-slate-500 drop-shadow-md" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">لا توجد أوسمة بعد</h3>
            <p className="text-slate-400 font-bold text-sm sm:text-base max-w-md mx-auto">قم بإنشاء أول وسام لتفعيل نظام النقاط والمكافآت في المدرسة.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
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
                    className={`group bg-[#0f1423]/80 rounded-[2rem] sm:rounded-[2.5rem] shadow-lg border border-white/5 overflow-hidden hover:border-${theme.value}-500/50 hover:shadow-[0_0_30px_rgba(var(--${theme.value}-500),0.15)] transition-all duration-300 flex flex-col`}
                  >
                    <div className={`p-6 sm:p-8 pb-0 flex justify-center items-center relative overflow-hidden h-40 sm:h-48 bg-[#02040a]/40`}>
                      <div className={`absolute inset-0 bg-gradient-to-t from-[#0f1423]/80 to-${theme.value}-500/10 z-0`}></div>
                      
                      {badge.image_url ? (
                        <div className="relative h-28 w-28 sm:h-32 sm:w-32 z-10 group-hover:scale-110 transition-transform duration-500">
                          <Image 
                            src={badge.image_url} 
                            alt={badge.name} 
                            fill 
                            unoptimized
                            referrerPolicy="no-referrer"
                            className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                          />
                        </div>
                      ) : (
                        <Medal className={`h-20 w-20 sm:h-24 sm:w-24 z-10 text-slate-500 opacity-50`} />
                      )}
                      
                      <div className={`absolute top-4 left-4 bg-[#02040a] px-3 sm:px-4 py-1.5 sm:py-2 rounded-[1rem] sm:rounded-2xl shadow-inner font-black ${theme.text} z-10 border border-white/5 flex items-center gap-1`}>
                        <span className="text-sm sm:text-lg drop-shadow-sm">{badge.points}</span>
                        <span className="text-[10px] sm:text-xs opacity-70">نقطة</span>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 flex-1 flex flex-col bg-transparent relative z-10">
                      <h3 className="text-lg sm:text-xl font-black text-white mb-2 drop-shadow-sm">{badge.name}</h3>
                      <p className="text-slate-400 font-bold text-xs sm:text-sm leading-relaxed mb-6 flex-1 line-clamp-3">{badge.description}</p>
                      
                      <div className="flex gap-2 sm:gap-3 pt-5 border-t border-white/5">
                        <button 
                          onClick={() => openEditModal(badge)}
                          className="flex-1 py-2.5 sm:py-3 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-[1rem] sm:rounded-2xl transition-all font-black text-xs sm:text-sm bg-[#02040a]/40 border border-white/5 shadow-inner flex justify-center items-center gap-2 active:scale-95"
                        >
                          <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> تعديل
                        </button>
                        <button 
                          onClick={() => setBadgeToDelete(badge)}
                          className="p-2.5 sm:p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-[1rem] sm:rounded-2xl transition-all bg-[#02040a]/40 border border-white/5 shadow-inner active:scale-95"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
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
            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[201] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[3rem] bg-[#0f1423] p-6 sm:p-8 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 focus:outline-none max-h-[90dvh] overflow-y-auto custom-scrollbar" dir="rtl">
              <Dialog.Description className="sr-only">نافذة إدارة الوسام</Dialog.Description>
              
              <div className="flex items-center justify-between mb-6 sm:mb-8 bg-[#02040a]/40 -mx-6 sm:-mx-8 md:-mx-10 -mt-6 sm:-mt-8 md:-mt-10 p-5 sm:p-6 md:p-8 border-b border-white/5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-inner">
                    <Award className="h-5 w-5 sm:h-7 sm:w-7" />
                  </div>
                  <div>
                    <Dialog.Title className="text-lg sm:text-2xl font-black text-white drop-shadow-sm">
                      {currentBadge.id ? 'تعديل الوسام' : 'تصميم وسام جديد'}
                    </Dialog.Title>
                  </div>
                </div>
                <Dialog.Close className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-full bg-[#02040a] border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 transition-all shadow-inner active:scale-95">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Dialog.Close>
              </div>

              <form onSubmit={handleSaveBadge} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">اسم الوسام</label>
                  <input 
                    type="text" required placeholder="مثال: الوسام الماسي..."
                    className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-amber-500/50 font-bold transition-all shadow-inner outline-none text-sm sm:text-base placeholder:text-slate-600"
                    value={currentBadge.name || ''} onChange={e => setCurrentBadge({...currentBadge, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">النقاط (القيمة)</label>
                    <input 
                      type="number" required min="0" placeholder="0"
                      className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-amber-500/50 font-black transition-all shadow-inner outline-none text-base sm:text-lg placeholder:text-slate-600 text-center sm:text-right"
                      value={currentBadge.points || ''} onChange={e => setCurrentBadge({...currentBadge, points: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">لون الخلفية (السمة)</label>
                    <select 
                      className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-amber-500/50 font-bold transition-all shadow-inner outline-none text-sm sm:text-base appearance-none [&>option]:bg-[#0f1423]"
                      value={currentBadge.color_theme || 'amber'} onChange={e => setCurrentBadge({...currentBadge, color_theme: e.target.value})}
                    >
                      {COLOR_THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">وصف الوسام وإنجازه</label>
                  <textarea 
                    required rows={3} placeholder="متى يمنح هذا الوسام؟ اشرح بإيجاز..."
                    className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-amber-500/50 font-bold transition-all shadow-inner outline-none text-sm sm:text-base placeholder:text-slate-600 resize-none leading-relaxed"
                    value={currentBadge.description || ''} onChange={e => setCurrentBadge({...currentBadge, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1">صورة الوسام <span className="text-amber-500 text-[10px]">(PNG شفافة مفضلة)</span></label>
                  <div className="bg-[#02040a]/40 border-2 border-dashed border-white/10 rounded-2xl sm:rounded-3xl p-2 sm:p-3 hover:border-amber-500/30 transition-colors shadow-inner">
                    <ImageUpload 
                      initialImageUrl={currentBadge.image_url ?? undefined}
                      onUploadSuccess={(url) => setCurrentBadge({...currentBadge, image_url: url || undefined})}
                      label="ارفع صورة الوسام هنا"
                    />
                  </div>
                </div>

                <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 border-t border-white/5 mt-4 sm:mt-6">
                  <button type="submit" disabled={isSubmitting} className="flex-[2] py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 font-black text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95 transition-all text-sm sm:text-base">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Award className="h-5 w-5"/> حفظ بيانات الوسام</>}
                  </button>
                  <Dialog.Close asChild>
                    <button type="button" className="flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a] border border-white/10 shadow-inner font-black text-slate-300 hover:bg-white/5 hover:text-white active:scale-95 transition-all text-sm sm:text-base">إلغاء</button>
                  </Dialog.Close>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Delete Modal */}
        <Dialog.Root open={!!badgeToDelete} onOpenChange={(open) => !open && !isSubmitting && setBadgeToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-[200]" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[201] w-[95vw] max-w-sm sm:max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[3rem] bg-[#0f1423] border border-white/10 p-6 sm:p-8 md:p-10 text-center shadow-[0_30px_60px_rgba(0,0,0,0.8)]" dir="rtl">
              <Dialog.Description className="sr-only">تأكيد حذف الوسام</Dialog.Description>
              <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-5 sm:mb-6 shadow-inner">
                <Trash2 className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow-md" />
              </div>
              <Dialog.Title className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 drop-shadow-sm">حذف الوسام نهائياً؟</Dialog.Title>
              <p className="text-sm sm:text-base text-slate-400 mb-6 sm:mb-8 font-bold leading-relaxed">أنت على وشك مسح وسام "<span className="text-white">{badgeToDelete?.name}</span>". سيتم حذفه من النظام ولن يتمكن المعلمون من منحه مجدداً.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} disabled={isSubmitting} className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 border border-rose-500 text-white font-black hover:from-rose-500 hover:to-red-500 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50">
                   {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'نعم، احذف الوسام'}
                </button>
                <Dialog.Close asChild>
                  <button disabled={isSubmitting} className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a] border border-white/10 text-slate-300 font-black hover:bg-white/5 hover:text-white shadow-inner transition-all active:scale-95 text-sm sm:text-base disabled:opacity-50">تراجع</button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
      `}} />
    </div>
  );
}
