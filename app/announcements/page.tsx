'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, Megaphone, Bell, X, Users, Calendar, Filter, AlertCircle, ArrowRight } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { deleteFromCloudinary } from '@/lib/cloudinary';

import ImageUpload from '@/components/ImageUpload';

type Announcement = {
  id: string;
  title: string;
  content: string;
  target_role: string;
  created_at: string;
  author_id?: string;
  image_url?: string;
  users?: { full_name: string };
};

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'الجميع' },
  { value: 'teacher', label: 'المعلمين' },
  { value: 'student', label: 'الطلاب' },
  { value: 'parent', label: 'أولياء الأمور' },
];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all_types');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<Announcement>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      
      let role = null;
      if (session?.user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        role = userData?.role || null;
        setUserRole(role);
      }

      let query = supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          target_role,
          image_url,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (role !== 'admin' && role !== 'management') {
        if (role) {
          query = query.or(`target_role.eq.${role},target_role.is.null`);
        } else {
          // If no role found, only show public announcements (target_role is null)
          query = query.is('target_role', null);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching announcements:', error);
        showNotification('error', 'حدث خطأ أثناء جلب الإعلانات: ' + error.message);
        setAnnouncements([]);
      } else {
        setAnnouncements((data as unknown) as Announcement[] || []);
      }
    } catch (error: any) {
      console.error('Error:', error);
      showNotification('error', 'حدث خطأ غير متوقع: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnnouncement.title || !currentAnnouncement.content || !currentAnnouncement.target_role) {
      showNotification('error', 'يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: currentAnnouncement.title,
        content: currentAnnouncement.content,
        target_role: currentAnnouncement.target_role === 'all' ? null : currentAnnouncement.target_role,
        image_url: currentAnnouncement.image_url || null,
      };

      if (currentAnnouncement.id) {
        // Update
        // Delete old image if it's being replaced
        if (currentAnnouncement.image_url && currentAnnouncement.image_url !== payload.image_url) {
          await deleteFromCloudinary(currentAnnouncement.image_url);
        }

        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', currentAnnouncement.id);
          
        if (error) throw error;
      } else {
        // Insert
        const { data: newAnn, error } = await supabase
          .from('announcements')
          .insert([payload])
          .select()
          .single();
          
        if (error) throw error;

        // Send Notifications to target audience
        try {
          let usersQuery = supabase.from('users').select('id');
          if (payload.target_role) {
            usersQuery = usersQuery.eq('role', payload.target_role);
          }
          const { data: targetUsers } = await usersQuery;

          if (targetUsers && targetUsers.length > 0) {
            const notificationPayloads = targetUsers.map(user => ({
              user_id: user.id,
              title: 'إعلان جديد',
              content: payload.title,
              type: 'announcement',
              link: '/announcements'
            }));
            await supabase.from('notifications').insert(notificationPayloads);
          }
        } catch (notifErr) {
          console.error('Error sending announcement notifications:', notifErr);
        }
      }

      await fetchAnnouncements();
      setIsModalOpen(false);
      setCurrentAnnouncement({});
      showNotification('success', 'تم حفظ الإعلان بنجاح!');
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
      // Get the announcement to find its image_url
      const annToDelete = announcements.find(a => a.id === announcementToDelete);

      const { error } = await supabase.from('announcements').delete().eq('id', announcementToDelete);
      if (error) throw error;

      // Delete from Cloudinary if it's a Cloudinary URL
      if (annToDelete?.image_url) {
        await deleteFromCloudinary(annToDelete.image_url);
      }

      await fetchAnnouncements();
      showNotification('success', 'تم حذف الإعلان بنجاح');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showNotification('error', 'حدث خطأ أثناء حذف الإعلان');
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

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAudience = audienceFilter === 'all_types' || a.target_role === audienceFilter;
    return matchesSearch && matchesAudience;
  });

  const getAudienceLabel = (value: string) => {
    return AUDIENCE_OPTIONS.find(opt => opt.value === value)?.label || 'الجميع';
  };

  const getAudienceColor = (value: string) => {
    switch (value) {
      case 'all': return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
      case 'teacher': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'student': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'parent': return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      default: return 'bg-slate-50 text-slate-700 ring-slate-600/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-12">
        
        {/* Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className={`fixed top-8 left-1/2 z-50 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 ${
                notification.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-red-500 text-white shadow-red-100'
              }`}
            >
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                {notification.type === 'success' ? <Bell className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>
              <div className="font-black tracking-tight">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest">
              <Megaphone className="h-4 w-4" />
              مركز التواصل
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">الإعلانات والتعاميم</h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl">إدارة ونشر الإعلانات الموجهة لمجتمع المدرسة بكفاءة وشفافية.</p>
          </div>
          
          { (userRole === 'admin' || userRole === 'management') && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-3 rounded-3xl bg-indigo-600 px-10 py-5 text-base font-black text-white shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all self-start md:self-end"
            >
              <Plus className="h-6 w-6" />
              إضافة إعلان جديد
            </motion.button>
          )}
        </motion.div>

        {/* Filters Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/60"
        >
          <div className="flex flex-col md:flex-row gap-8">
            <div className="relative flex-1 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Search className="h-6 w-6" />
              </div>
              <input
                type="text"
                className="block w-full rounded-3xl border-0 py-5 pr-14 pl-6 text-slate-900 bg-slate-50/50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-base transition-all font-bold"
                placeholder="البحث عن إعلان بالكلمة المفتاحية..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative md:w-80 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Filter className="h-6 w-6" />
              </div>
              <select
                className="block w-full rounded-3xl border-0 py-5 pr-14 pl-6 text-slate-900 bg-slate-50/50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-base transition-all font-bold appearance-none"
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
              >
                <option value="all_types">جميع الفئات المستهدفة</option>
                {AUDIENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-40 gap-6">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-500 font-black text-lg animate-pulse">جاري جلب آخر الإعلانات...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-40 glass-card rounded-[3rem] border border-white/60 shadow-2xl shadow-slate-200/50"
          >
            <div className="h-32 w-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Megaphone className="h-16 w-16 text-slate-200" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">لا توجد إعلانات حالياً</h3>
            <p className="text-slate-500 mt-4 text-lg font-medium">ابدأ بنشر أول إعلان للمدرسة لإبلاغ الجميع بالمستجدات.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            <AnimatePresence mode="popLayout">
              {filteredAnnouncements.map((announcement, index) => {
                const dateObj = new Date(announcement.created_at);
                
                return (
                  <motion.div 
                    key={announcement.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="group glass-card rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white/60 overflow-hidden flex flex-col lg:flex-row transition-all hover:shadow-2xl hover:-translate-y-1"
                  >
                    <div className="p-10 flex-1">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                        <div className="flex items-center gap-6">
                          <div className={`h-16 w-16 rounded-3xl flex items-center justify-center shadow-xl ${getAudienceColor(announcement.target_role).split(' ')[0]}`}>
                            <Bell className={`h-8 w-8 ${getAudienceColor(announcement.target_role).split(' ')[1]}`} />
                          </div>
                          <div>
                            <h3 className="text-3xl font-black text-slate-900 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">
                              {announcement.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-bold text-slate-500">
                              <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-100">
                                <Calendar className="h-4 w-4 text-indigo-500" />
                                <span dir="ltr">{dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl border ${getAudienceColor(announcement.target_role)}`}>
                                <Users className="h-4 w-4" />
                                <span>{getAudienceLabel(announcement.target_role)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        { (userRole === 'admin' || userRole === 'management') && (
                          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => openEditModal(announcement)}
                              className="h-12 w-12 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100"
                            >
                              <Edit2 className="h-5 w-5" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setAnnouncementToDelete(announcement.id)}
                              className="h-12 w-12 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100"
                            >
                              <Trash2 className="h-5 w-5" />
                            </motion.button>
                          </div>
                        )}
                      </div>
                      
                      <div className="prose prose-xl prose-slate max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50/30 p-8 rounded-[2rem] border border-slate-100/50">
                        {announcement.content}
                      </div>

                      {announcement.image_url && (
                        <div className="mt-6 relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
                          <Image 
                            src={announcement.image_url} 
                            alt={announcement.title} 
                            fill
                            className="object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div className="mt-8 flex items-center justify-between">
                        <div className="flex -space-x-2 rtl:space-x-reverse">
                          {[1,2,3].map(i => (
                            <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                              U{i}
                            </div>
                          ))}
                          <div className="h-8 w-8 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600">
                            +12
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedAnnouncement(announcement)}
                          className="text-indigo-600 font-black text-sm flex items-center gap-2 hover:gap-3 transition-all"
                        >
                          عرض التفاصيل
                          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                        </button>
                      </div>
                    </div>
                    
                    <div className={`w-full lg:w-4 ${getAudienceColor(announcement.target_role).split(' ')[0]} hidden lg:block opacity-40`}></div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Announcement Detail Modal */}
        <Dialog.Root open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-[3.5rem] bg-white p-12 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" dir="rtl">
              {selectedAnnouncement && (
                <div className="space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className={`h-20 w-20 rounded-[2.5rem] flex items-center justify-center shadow-xl ${getAudienceColor(selectedAnnouncement.target_role).split(' ')[0]}`}>
                        <Bell className={`h-10 w-10 ${getAudienceColor(selectedAnnouncement.target_role).split(' ')[1]}`} />
                      </div>
                      <div>
                        <Dialog.Title className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                          {selectedAnnouncement.title}
                        </Dialog.Title>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-bold text-slate-500">
                          <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-100">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            <span dir="ltr">{new Date(selectedAnnouncement.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl border ${getAudienceColor(selectedAnnouncement.target_role)}`}>
                            <Users className="h-4 w-4" />
                            <span>{getAudienceLabel(selectedAnnouncement.target_role)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Dialog.Close className="h-12 w-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 transition-colors">
                      <X className="h-8 w-8 text-slate-400" />
                    </Dialog.Close>
                  </div>

                  {selectedAnnouncement.image_url && (
                    <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                      <Image 
                        src={selectedAnnouncement.image_url} 
                        alt={selectedAnnouncement.title} 
                        fill
                        className="object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="prose prose-2xl prose-slate max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50/30 p-10 rounded-[3rem] border border-slate-100/50">
                    {selectedAnnouncement.content}
                  </div>

                  <div className="flex justify-center pt-4">
                    <Dialog.Close asChild>
                      <button className="px-12 py-5 rounded-3xl bg-indigo-600 text-white font-black shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                        إغلاق الإعلان
                      </button>
                    </Dialog.Close>
                  </div>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Delete Confirmation Modal */}
        <Dialog.Root open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white p-10 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-[2rem] bg-red-50 flex items-center justify-center mb-6">
                  <Trash2 className="h-10 w-10 text-red-600" />
                </div>
                <Dialog.Title className="text-3xl font-black text-slate-900 tracking-tight mb-4">
                  تأكيد الحذف
                </Dialog.Title>
                <p className="text-slate-500 mb-10 font-medium text-lg leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف هذا الإعلان؟ سيتم إزالته نهائياً من جميع لوحات التحكم.
                </p>
                <div className="flex flex-col w-full gap-4">
                  <button
                    onClick={confirmDelete}
                    className="w-full rounded-2xl bg-red-600 py-5 text-base font-black text-white shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                  >
                    تأكيد الحذف النهائي
                  </button>
                  <Dialog.Close asChild>
                    <button className="w-full rounded-2xl bg-slate-100 py-5 text-base font-black text-slate-700 hover:bg-slate-200 transition-all active:scale-95">
                      إلغاء
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Add/Edit Announcement Modal */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-[3.5rem] bg-white p-12 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" dir="rtl">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center shadow-inner">
                    <Megaphone className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div>
                    <Dialog.Title className="text-3xl font-black text-slate-900 tracking-tight">
                      {currentAnnouncement.id ? 'تعديل الإعلان' : 'نشر إعلان جديد'}
                    </Dialog.Title>
                    <p className="text-slate-500 font-bold mt-1">أكمل البيانات التالية لنشر الإعلان</p>
                  </div>
                </div>
                <Dialog.Close className="h-12 w-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 transition-colors">
                  <X className="h-8 w-8 text-slate-400" />
                </Dialog.Close>
              </div>
              
              <form onSubmit={handleSaveAnnouncement} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">عنوان الإعلان</label>
                    <input 
                      type="text" 
                      required
                      placeholder="مثال: موعد اختبارات نهاية الفصل" 
                      className="block w-full rounded-3xl border-0 py-5 px-6 text-slate-900 bg-slate-50/50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-base transition-all font-bold"
                      value={currentAnnouncement.title || ''}
                      onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">الفئة المستهدفة</label>
                    <div className="relative group">
                      <select 
                        required
                        className="block w-full rounded-3xl border-0 py-5 px-6 text-slate-900 bg-slate-50/50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-base transition-all font-bold appearance-none"
                        value={currentAnnouncement.target_role || ''}
                        onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, target_role: e.target.value})}
                      >
                        {AUDIENCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-6 text-slate-400">
                        <ArrowRight className="h-5 w-5 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">محتوى الإعلان</label>
                  <textarea 
                    required
                    rows={8}
                    placeholder="اكتب تفاصيل الإعلان هنا بوضوح..." 
                    className="block w-full rounded-[2rem] border-0 py-6 px-8 text-slate-900 bg-slate-50/50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-base transition-all font-bold resize-none leading-relaxed"
                    value={currentAnnouncement.content || ''}
                    onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, content: e.target.value})}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">صورة الإعلان (اختياري)</label>
                  <ImageUpload 
                    initialImageUrl={currentAnnouncement.image_url}
                    onUploadSuccess={(url) => setCurrentAnnouncement({...currentAnnouncement, image_url: url || undefined})}
                    label="إرفاق صورة مع الإعلان"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-6 pt-6">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="flex-1 rounded-3xl bg-slate-100 py-5 text-base font-black text-slate-700 hover:bg-slate-200 transition-all active:scale-95"
                    >
                      إلغاء
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-3xl bg-indigo-600 py-5 text-base font-black text-white shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        جاري النشر...
                      </>
                    ) : (
                      <>
                        <Megaphone className="h-5 w-5" />
                        نشر الإعلان الآن
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}
