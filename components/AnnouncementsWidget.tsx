'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, Calendar, Users, ArrowLeft, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';

type Announcement = {
  id: string;
  title: string;
  content: string;
  target_role: string;
  created_at: string;
  image_url?: string;
};

export default function AnnouncementsWidget({ limit = 3, role }: { limit?: number; role: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        let query = supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (role && role !== 'admin' && role !== 'management') {
          query = query.or(`target_role.eq.${role},target_role.is.null`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error fetching widget announcements:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, [limit, role]);

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-sm ring-1 ring-slate-200/50 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-lg mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-3xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (announcements.length === 0) return null;

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-sm ring-1 ring-slate-200/50">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
            <Megaphone className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">آخر الإعلانات</h2>
        </div>
        <Link href="/announcements" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
          عرض الكل
        </Link>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement, i) => (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setSelectedAnnouncement(announcement)}
            className="group p-5 rounded-3xl border border-slate-100 bg-white/50 hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                <Bell className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {announcement.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(announcement.created_at).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {announcement.content}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog.Root open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white p-10 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" dir="rtl">
            {selectedAnnouncement && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Bell className="h-8 w-8" />
                    </div>
                    <div>
                      <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                        {selectedAnnouncement.title}
                      </Dialog.Title>
                      <p className="text-sm text-slate-500 font-bold mt-1">
                        {new Date(selectedAnnouncement.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="h-6 w-6 text-slate-400" />
                  </Dialog.Close>
                </div>

                {selectedAnnouncement.image_url && (
                  <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
                    <Image 
                      src={selectedAnnouncement.image_url} 
                      alt={selectedAnnouncement.title} 
                      fill
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="prose prose-lg prose-slate max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100/50">
                  {selectedAnnouncement.content}
                </div>

                <div className="flex justify-center">
                  <Dialog.Close asChild>
                    <button className="px-10 py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                      إغلاق
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
