'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare,
  Heart, Bell, Award, ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';

export default function ParentDashboard() {
  const [parentData, setParentData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch parent profile
      const { data: parent } = await supabase
        .from('parents')
        .select('*, users(*)')
        .eq('id', user.id)
        .single();
      
      setParentData(parent);

      if (parent) {
        // Fetch children linked to this parent
        const { data: childrenData } = await supabase
          .from('students')
          .select('*, users(*), sections(*, classes(*))')
          .eq('parent_id', user.id);
        
        setChildren(childrenData || []);

        // Mock notifications for now
        setNotifications([
          { id: 1, title: 'غياب بدون عذر', student: 'محمد', date: 'اليوم', type: 'warning' },
          { id: 2, title: 'نتيجة اختبار جديدة', student: 'سارة', date: 'أمس', type: 'info' },
          { id: 3, title: 'شهادة تقدير', student: 'محمد', date: 'منذ يومين', type: 'success' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching parent dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">مرحباً، {parentData?.users?.full_name}</h1>
          <p className="text-slate-500 mt-1">تابع تقدم أبنائك الدراسي وحضورهم اليومي.</p>
        </div>
        <div className="flex gap-3">
          <button className="relative p-2.5 rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-all">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
          </button>
          <Link 
            href="/messages"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            <MessageSquare className="h-4 w-4" />
            تواصل مع المدرسة
          </Link>
        </div>
      </div>

      {/* Children Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {children.map((child) => (
          <div key={child.id} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden group hover:shadow-md transition-all">
            <div className="p-6 border-b border-slate-100/50 bg-white/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-xl ring-1 ring-slate-100">
                  {child.users?.full_name?.[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{child.users?.full_name}</h2>
                  <p className="text-sm text-slate-500">{child.sections?.classes?.name} - {child.sections?.name}</p>
                </div>
              </div>
              <Link 
                href={`/dashboard/student?id=${child.id}`}
                className="p-2 rounded-xl bg-white text-slate-400 hover:text-indigo-600 shadow-sm ring-1 ring-slate-100 transition-all"
              >
                <TrendingUp className="h-5 w-5" />
              </Link>
            </div>
            
            <div className="p-6 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                <p className="text-xs font-medium text-emerald-600 mb-1">نسبة الحضور</p>
                <p className="text-xl font-bold text-emerald-700">96%</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
                <p className="text-xs font-medium text-indigo-600 mb-1">المعدل العام</p>
                <p className="text-xl font-bold text-indigo-700">88.5</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-center">
                <p className="text-xs font-medium text-amber-600 mb-1">الترتيب</p>
                <p className="text-xl font-bold text-amber-700">5</p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-900">آخر التقييمات</p>
                  <Award className="h-4 w-4 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">الرياضيات (اختبار شهري)</span>
                    <span className="font-bold text-emerald-600">95/100</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">اللغة العربية (مشاركة)</span>
                    <span className="font-bold text-indigo-600">10/10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Notifications */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden hover:shadow-md transition-all">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Bell className="h-5 w-5 text-indigo-600" />
              </div>
              تنبيهات هامة
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.map((note) => (
              <div key={note.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  note.type === 'warning' ? 'bg-red-50 text-red-600' :
                  note.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  {note.type === 'warning' ? <ShieldCheck className="h-5 w-5" /> : 
                   note.type === 'success' ? <Award className="h-5 w-5" /> : 
                   <Bell className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-900">{note.title}</p>
                    <span className="text-xs text-slate-400">{note.date}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">الابن: {note.student}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links & Support */}
        <div className="space-y-8">
          
          {/* Announcements Widget */}
          <AnnouncementsWidget role="parent" />

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm ring-1 ring-slate-200/50 p-6 hover:shadow-md transition-all">
            <h2 className="text-xl font-bold text-slate-900 mb-6">روابط سريعة</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/reports" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 text-center transition-all group">
                <FileText className="h-6 w-6 mx-auto mb-2 text-slate-400 group-hover:text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">التقارير</span>
              </Link>
              <Link href="/calendar" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 text-center transition-all group">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-slate-400 group-hover:text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">التقويم</span>
              </Link>
              <Link href="/fees" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 text-center transition-all group">
                <Award className="h-6 w-6 mx-auto mb-2 text-slate-400 group-hover:text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">الرسوم</span>
              </Link>
              <Link href="/settings" className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 text-center transition-all group">
                <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-slate-400 group-hover:text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">الإعدادات</span>
              </Link>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">هل تحتاج للمساعدة؟</h3>
              <p className="text-indigo-100 text-sm mb-4">فريق الدعم الفني متواجد دائماً للإجابة على استفساراتكم.</p>
              <button className="w-full py-2.5 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all">
                تحدث معنا الآن
              </button>
            </div>
            <Heart className="absolute -bottom-4 -right-4 h-24 w-24 text-indigo-500/30 rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
