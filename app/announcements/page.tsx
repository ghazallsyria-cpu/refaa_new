/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAnnouncementsSystem, Announcement } from '@/hooks/useAnnouncementsSystem';
import { useAuth } from '@/context/auth-context';
import { Plus, Search, Edit2, Trash2, Megaphone, Bell, X, Users, Calendar, Filter, AlertCircle, ArrowRight, CheckCircle2, Loader2, Sparkles, ShieldAlert, ChevronLeft } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import ImageUpload from '@/components/ImageUpload';

// 🚀 ألوان الفئات الملكية
const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'الجميع', color: 'indigo', icon: Users },
  { value: 'teacher', label: 'المعلمين', color: 'emerald', icon: Users },
  { value: 'student', label: 'الطلاب', color: 'blue', icon: Users },
  { value: 'parent', label: 'أولياء الأمور', color: 'amber', icon: Users },
];

export default function AnnouncementsPage() {
  const { authRole, isChecking } = useAuth(); 
  const { 
    announcements, 
    loading, 
    fetchAnnouncements, 
    saveAnnouncement, 
    deleteAnnouncement 
  } = useAnnouncementsSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all_types');
  const [isMounted, setIsMounted] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<Announcement>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchRef = useRef(fetchAnnouncements);

  useEffect(() => {
    fetchRef.current = fetchAnnouncements;
  }, [fetchAnnouncements]);

  useEffect(() => {
    setIsMounted(true);
    if (!isChecking) {
       fetchRef.current(authRole);
    }
  }, [authRole, isChecking]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnnouncement.title || !currentAnnouncement.content) {
      showNotification('error', 'يرجى تعبئة العنوان والمحتوى للإعلان');
      return;
    }

    setIsSubmitting(true);
    try {
      const originalAnn = announcements.find(a => a.id === currentAnnouncement.id);
      if (originalAnn?.image_url && originalAnn.image_url !== currentAnnouncement.image_url) {
        await deleteFromCloudinary(originalAnn.image_url);
      }

      await saveAnnouncement(currentAnnouncement);
      await fetchRef.current(authRole);
      
      setIsModalOpen(false);
      setCurrentAnnouncement({});
      showNotification('success', 'تم حفظ الإعلان بنجاح وتحديث اللوحة!');
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الإعلان');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    
    try {
      const annToDelete = announcements.find(a => a.id === announcementToDelete);
      await deleteAnnouncement(announcementToDelete, annToDelete?.image_url);
      await fetchRef.current(authRole);
      
      showNotification('success', 'تم حذف الإعلان نهائياً');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showNotification('error', 'حدث خطأ أثناء الحذف، يرجى المحاولة لاحقاً');
    } finally {
      setAnnouncementToDelete(null);
    }
  };

  const openAddModal = () => {
    setCurrentAnnouncement({ target_role: 'all' });
    setIsModalOpen(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setIsModalOpen(true);
  };

  // 🚀 فلترة آمنة ومريحة للمستخدم (Front-end Filtering)
  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = (a.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (a.content?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesAudience = audienceFilter === 'all_types' || a.target_role === audienceFilter;
    return matchesSearch && matchesAudience;
  });

  const getAudienceLabel = (value: string) => {
    return AUDIENCE_OPTIONS.find(opt => opt.value === value)?.label || 'الجميع';
  };

  const getAudienceTheme = (value: string) => {
    switch (value) {
      case 'all': return { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' };
      case 'teacher': return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'student': return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
      case 'parent': return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
      default: return { bg: 'bg-[#0f1423]/80', text: 'text-slate-300', border: 'border-white/10' };
    }
  };

  if (!isMounted) return null;

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo text-slate-100">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الصلاحيات لجلب الإعلانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 pb-24 relative overflow-hidden font-cairo pt-6" dir="rtl">
      
      <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 relative z-10">
        
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[150] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.5rem] sm:rounded-3xl shadow-2xl flex items-center gap-3 sm:gap-4 transition-all backdrop-blur-3xl border w-[90%] sm:w-auto ${
                notification.type === 'success' 
                  ? 'bg-[#02040a]/90 text-emerald-400 border-emerald-500/50 shadow-[0_20px_50px_rgba(16,185,129,0.3)]' 
                  : 'bg-[#02040a]/90 text-rose-400 border-rose-500/50 shadow-[0_20px_50px_rgba(244,63,94,0.3)]'
              }`}
            >
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" /> : <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400" />}
              </div>
              <div className="font-black tracking-tight text-xs sm:text-sm md:text-base text-white drop-shadow-sm leading-snug">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-auto text-white active:scale-90">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -mr-10 -mt-10"></div>
          <div className="space-y-4 sm:space-y-5 relative z-10 text-center lg:text-right w-full lg:w-auto">
            <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 shadow-[0_0_15px_rgba(99,102,241,0.2)] text-indigo-400 mx-auto lg:mx-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> مركز التواصل الرقمي
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
              الإعلانات <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">والتعاميم</span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-400 font-bold max-w-2xl leading-relaxed mx-auto lg:mx-0 drop-shadow-sm">
              نافذتك المباشرة للتواصل مع مجتمع المدرسة بفاعلية، وضوح، وشفافية مطلقة.
            </p>
          </div>
          
          { (authRole === 'admin' || authRole === 'management') && (
            <button 
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95 border border-indigo-400/50 relative z-10 w-full lg:w-auto"
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6" /> إضافة إعلان جديد
            </button>
          )}
        </motion.div>

        {/* 🚀 فلاتر البحث المتقدمة */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-4 sm:p-5 lg:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col md:flex-row gap-4 sm:gap-5"
        >
          <div className="relative flex-1 group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <input
              type="text"
              className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 text-sm sm:text-base transition-all font-bold outline-none shadow-inner placeholder:text-slate-500"
              placeholder="ابحث عن إعلان، تعميم، أو قرار..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* السماح للإدارة فقط بفرز الإعلانات حسب الفئة */}
          { (authRole === 'admin' || authRole === 'management') && (
            <div className="relative md:w-72 lg:w-80 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors z-10">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <select
                className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 pr-10 sm:pr-12 pl-10 text-white bg-[#02040a]/60 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 text-sm sm:text-base transition-all font-bold appearance-none outline-none shadow-inner cursor-pointer [&>option]:bg-[#0f1423]"
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
              >
                <option value="all_types">جميع الإعلانات والتعاميم</option>
                {AUDIENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5 text-slate-500 pointer-events-none">
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 -rotate-90" />
              </div>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 sm:py-32 gap-5 relative z-10">
            <Loader2 className="animate-spin h-14 w-14 sm:h-16 sm:w-16 text-indigo-500 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
            <p className="text-slate-400 font-black animate-pulse tracking-widest text-sm sm:text-base">جاري تحميل الإعلانات والتعاميم...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 sm:py-32 glass-panel rounded-[2rem] sm:rounded-[3rem] border border-dashed border-white/10 shadow-inner px-4 relative z-10"
          >
            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-[#0f1423]/50 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 border border-white/5 shadow-inner">
              <Megaphone className="h-10 w-10 sm:h-12 sm:w-12 text-slate-500 drop-shadow-md" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mb-2 sm:mb-3 drop-shadow-sm">لا توجد إعلانات مطابقة</h3>
            <p className="text-slate-400 text-xs sm:text-sm lg:text-base font-bold max-w-md mx-auto leading-relaxed">
              لم نعثر على أي إعلانات تطابق بحثك الحالي في النظام.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 relative z-10">
            <AnimatePresence mode="popLayout">
              {filteredAnnouncements.map((announcement, index) => {
                const theme = getAudienceTheme(announcement.target_role || 'all');
                
                return (
                  <motion.div 
                    key={announcement.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
                    className="group glass-panel rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col bg-[#0f1423]/40 hover:bg-[#0f1423]/80 hover:border-indigo-500/40 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.3)] transition-all duration-300"
                  >
                    <div className="p-6 sm:p-8 flex-1 flex flex-col relative z-10">
                      <div className="flex justify-between items-start gap-4 mb-5 sm:mb-6">
                        <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl ${theme.bg} ${theme.text} border ${theme.border} text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-inner`}>
                          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>{getAudienceLabel(announcement.target_role || 'all')}</span>
                        </div>
                        
                        {/* 🛡️ إخفاء أزرار التعديل والحذف إلا للإدارة */}
                        { (authRole === 'admin' || authRole === 'management') && (
                          <div className="flex gap-1.5 sm:gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={() => openEditModal(announcement)} className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-lg sm:rounded-xl transition-all shadow-inner bg-[#02040a]/60 border border-white/5 active:scale-95" title="تعديل">
                              <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                            <button onClick={() => setAnnouncementToDelete(announcement.id)} className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg sm:rounded-xl transition-all shadow-inner bg-[#02040a]/60 border border-white/5 active:scale-95" title="حذف">
                              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-snug mb-3 sm:mb-4 group-hover:text-indigo-400 transition-colors line-clamp-2 drop-shadow-sm">
                        {announcement.title}
                      </h3>
                      
                      <p className="text-slate-400 font-bold leading-relaxed mb-6 sm:mb-8 line-clamp-3 flex-1 text-xs sm:text-sm">
                        {announcement.content}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-5 sm:pt-6 border-t border-white/5">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 text-[10px] sm:text-xs font-black bg-[#02040a]/60 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-400" />
                          <span suppressHydrationWarning>
                            {new Date(announcement.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        
                        <button 
                          onClick={() => setSelectedAnnouncement(announcement)}
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-inner active:scale-90"
                          title="قراءة المزيد"
                        >
                          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 -rotate-45" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* 🚀 المودال الخاص بالتفاصيل */}
        <Dialog.Root open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-40 animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[3rem] bg-[#0f1423] p-1 sm:p-2 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 focus:outline-none max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300" dir="rtl">
              
              <Dialog.Description className="sr-only">نافذة عرض تفاصيل الإعلان</Dialog.Description>
              
              {selectedAnnouncement && (
                <div className="flex flex-col h-full max-h-[calc(95vh-1rem)] overflow-y-auto custom-scrollbar rounded-[1.5rem] sm:rounded-[2.5rem] bg-[#0f1423] p-5 sm:p-8 lg:p-12 relative">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                  
                  <div className="flex items-start justify-between mb-8 sm:mb-10 gap-4 sm:gap-6 relative z-10">
                    <div className="w-full min-w-0">
                      <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl ${getAudienceTheme(selectedAnnouncement.target_role || 'all').bg} ${getAudienceTheme(selectedAnnouncement.target_role || 'all').text} border ${getAudienceTheme(selectedAnnouncement.target_role || 'all').border} text-[10px] sm:text-xs font-black mb-4 sm:mb-6 uppercase tracking-widest shadow-inner`}>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>موجه لـ: {getAudienceLabel(selectedAnnouncement.target_role || 'all')}</span>
                      </div>
                      <Dialog.Title className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md break-words">
                        {selectedAnnouncement.title}
                      </Dialog.Title>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-4 sm:mt-6 text-slate-400 font-bold bg-[#02040a]/60 w-fit px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner text-[10px] sm:text-xs">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
                        <span suppressHydrationWarning>
                          نُشر في: {new Date(selectedAnnouncement.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <Dialog.Close className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl bg-[#02040a] hover:bg-rose-500/10 hover:text-rose-400 border border-white/5 transition-colors text-slate-400 shadow-inner active:scale-90">
                      <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Dialog.Close>
                  </div>

                  {selectedAnnouncement.image_url && (
                    <div className="relative w-full min-h-[300px] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden mb-8 sm:mb-10 bg-[#02040a]/80 border border-white/5 shadow-inner flex items-center justify-center p-2 relative z-10">
                      <Image 
                        src={selectedAnnouncement.image_url} 
                        alt={selectedAnnouncement.title} 
                        fill
                        className="object-contain hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* 🚀 الحفاظ على الفواصل (Line Breaks) في العرض */}
                  <div className="text-slate-300 whitespace-pre-wrap leading-relaxed sm:leading-loose font-bold bg-[#02040a]/40 p-6 sm:p-8 md:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 shadow-inner relative z-10 text-sm sm:text-lg">
                    {selectedAnnouncement.content}
                  </div>

                  <div className="flex justify-center pt-8 sm:pt-10 mt-auto relative z-10">
                    <Dialog.Close asChild>
                      <button className="px-10 sm:px-14 py-4 sm:py-5 rounded-[1.5rem] sm:rounded-full bg-indigo-600 text-white text-sm sm:text-lg font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50 hover:bg-indigo-500 transition-all duration-300 active:scale-95 w-full sm:w-auto">
                        إغلاق الإعلان
                      </button>
                    </Dialog.Close>
                  </div>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* 🚀 المودال الخاص بالحذف */}
        {/* ... (نفس الكود للـ Delete Modal) ... */}
        <Dialog.Root open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-[100] animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] p-6 sm:p-8 shadow-[0_20px_60px_rgba(225,29,72,0.2)] border border-rose-500/20 focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
              <Dialog.Description className="sr-only">تأكيد عملية حذف الإعلان</Dialog.Description>
              
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl sm:rounded-[2rem] bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-5 sm:mb-6 shadow-inner">
                  <Trash2 className="h-8 w-8 sm:h-10 sm:w-10 text-rose-400 drop-shadow-md" />
                </div>
                <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3 sm:mb-4 drop-shadow-sm">
                  تأكيد الحذف
                </Dialog.Title>
                <p className="text-slate-400 mb-6 sm:mb-8 font-bold text-sm sm:text-base leading-relaxed px-2 sm:px-0">
                  هل أنت متأكد من رغبتك في حذف هذا الإعلان نهائياً؟ هذا الإجراء لا يمكن التراجع عنه وسيحذف المرفق إن وجد.
                </p>
                <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
                  <button
                    onClick={confirmDelete}
                    className="w-full rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 py-3.5 sm:py-4 text-sm sm:text-base font-black text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-400/50 hover:from-rose-500 hover:to-red-500 transition-all active:scale-95"
                  >
                    نعم، احذف الإعلان
                  </button>
                  <Dialog.Close asChild>
                    <button className="w-full rounded-xl sm:rounded-2xl bg-[#02040a]/80 py-3.5 sm:py-4 text-sm sm:text-base font-black text-slate-300 hover:bg-white/5 transition-all border border-white/5 shadow-inner active:scale-95">
                      إلغاء وتراجع
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* 🚀 المودال الخاص بالإضافة والتعديل */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-[100] animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] sm:w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[3rem] bg-[#0f1423] p-6 sm:p-8 md:p-10 lg:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 focus:outline-none max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300" dir="rtl">
              <Dialog.Description className="sr-only">نموذج إضافة أو تعديل الإعلان</Dialog.Description>
              
              <div className="flex items-start sm:items-center justify-between mb-8 sm:mb-10 pb-5 sm:pb-6 border-b border-white/5 gap-4">
                <div className="flex items-center gap-3 sm:gap-5">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner shrink-0">
                    <Edit2 className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400 drop-shadow-md" />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                      {currentAnnouncement.id ? 'تحديث الإعلان' : 'صياغة إعلان جديد'}
                    </Dialog.Title>
                    <p className="text-slate-400 font-bold mt-1 text-[10px] sm:text-xs md:text-sm">تأكد من وضوح الرسالة وتحديد الفئة الصحيحة.</p>
                  </div>
                </div>
                <Dialog.Close className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl bg-[#02040a] hover:bg-rose-500/10 hover:text-rose-400 border border-white/5 transition-colors text-slate-400 shadow-inner active:scale-90">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Dialog.Close>
              </div>
              
              <form onSubmit={handleSaveAnnouncement} className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-2 sm:space-y-3 glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest px-1 sm:px-2 flex items-center gap-1.5 sm:gap-2 mb-1">
                      عنوان الإعلان <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="اكتب عنواناً جذاباً وواضحاً..." 
                      className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-sm sm:text-base transition-all font-bold placeholder:font-medium placeholder:text-slate-500 shadow-inner outline-none"
                      value={currentAnnouncement.title || ''}
                      onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3 glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest px-1 sm:px-2 flex items-center gap-1.5 sm:gap-2 mb-1">
                      الفئة المستهدفة <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative group">
                      <select 
                        required
                        className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 pl-10 sm:pl-14 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-sm sm:text-base transition-all font-bold appearance-none cursor-pointer shadow-inner outline-none [&>option]:bg-[#0f1423]"
                        value={currentAnnouncement.target_role || 'all'} // افتراضياً للجميع
                        onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, target_role: e.target.value})}
                      >
                        {AUDIENCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5 text-slate-500 pointer-events-none">
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 -rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest px-1 sm:px-2 flex items-center gap-1.5 sm:gap-2 mb-1">
                    تفاصيل ومحتوى الإعلان <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    required
                    rows={6}
                    placeholder="سرد التفاصيل، المواعيد، أو التعليمات..." 
                    className="block w-full rounded-xl sm:rounded-2xl border-0 py-4 sm:py-5 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-sm sm:text-base transition-all font-bold resize-none leading-relaxed placeholder:font-medium placeholder:text-slate-500 custom-scrollbar shadow-inner outline-none"
                    value={currentAnnouncement.content || ''}
                    onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, content: e.target.value})}
                  />
                </div>

                <div className="space-y-2 sm:space-y-3 glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                  <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest px-1 sm:px-2 mb-1 block">إرفاق صورة توضيحية (اختياري)</label>
                  <div className="p-1.5 sm:p-2 border border-white/5 rounded-xl sm:rounded-2xl bg-[#02040a]/60 shadow-inner">
                    <ImageUpload 
                      initialImageUrl={currentAnnouncement.image_url ?? undefined}
                      onUploadSuccess={(url) => setCurrentAnnouncement({...currentAnnouncement, image_url: url || undefined})}
                      label="انقر هنا لاختيار صورة، أو قم بالسحب والإفلات"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 sm:pt-8 mt-8 sm:mt-10 border-t border-white/5">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="flex-1 rounded-xl sm:rounded-2xl bg-[#02040a]/80 py-3.5 sm:py-4 text-sm sm:text-base font-black text-slate-400 hover:bg-white/5 hover:text-white transition-all border border-white/5 shadow-inner active:scale-95"
                    >
                      إلغاء الأمر
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 border border-indigo-400/50 py-3.5 sm:py-4 text-sm sm:text-base font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2 sm:gap-3 active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 sm:h-5 sm:w-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
                        {currentAnnouncement.id ? 'حفظ التعديلات' : 'نشر الإعلان الآن'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 12px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 1px solid #02040a; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
        `}} />
      </div>
    </div>
  );
}
