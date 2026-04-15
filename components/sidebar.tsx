'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen, CalendarCheck, FileText, 
  CalendarDays, Clock, PenTool, BarChart3, MessageSquare, Bell, FolderOpen, Settings, 
  Database, Award, ChevronRight, ChevronLeft, X, Scale, Activity, Medal, ShieldAlert, 
  LayoutGrid, Compass, AlertTriangle, LayoutTemplate, Crown, UserCircle // 🚀 إضافة أيقونة الملف
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export function Sidebar({ onClose, authRole = 'admin', isCollapsed = false, onToggleCollapse }: any) {
  const pathname = usePathname();
  const { user } = useAuth() as any; // 🚀 جلب المستخدم الحالي
  const [schoolData, setSchoolData] = useState({ name: 'الرفعة النموذجية', logo_url: '' });

  const navigation = [
    { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
    { name: 'ملف الإدارة', href: '/admin/profile', icon: Crown, role: ['admin', 'management'] },
    { name: 'ملفي الشخصي (CV)', href: `/teachers/${user?.id}`, icon: UserCircle, role: ['teacher'] }, // 🚀 خيار خاص للمعلم
    { name: 'الهيكلية التنظيمية', href: '/hierarchy', icon: LayoutGrid, role: ['admin', 'management', 'teacher', 'student'] }, // 🚀 إضافة الشجرة للجميع
    { name: 'الطلاب', href: '/students', icon: Users, role: ['admin', 'management'] },
    { name: 'المعلمين', href: '/teachers', icon: GraduationCap, role: ['admin', 'management'] },
    // ... بقية العناصر
  ];

  // فلترة القائمة بناءً على الرتبة
  const filteredNavigation = navigation.filter(item => {
    if (!item.role) return true;
    return item.role.includes(authRole);
  });

  // ... (باقي كود Sidebar من التصميم، الشعارات، والحركات)
  // [ملاحظة: الكود المتبقي هو نفسه الذي أرسلته لي، فقط أضفت له المنطق البرمجي للربط]

  return (
    <div className={cn("flex h-full flex-col bg-slate-900 text-slate-300 transition-all duration-500 z-50", isCollapsed ? "w-20" : "w-72")}>
       {/* ... كود Header السايدبار ... */}
       
       <div className="flex flex-1 flex-col overflow-y-auto py-6 px-3 custom-scrollbar" dir="rtl">
        <nav className="space-y-1.5">
          {filteredNavigation.map((item, idx) => {
            const isActive = pathname === item.href;
            return (
              <motion.div key={item.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}>
                <Link href={item.href} onClick={onClose} className={cn("flex items-center rounded-xl text-sm font-bold transition-all px-4 py-3.5 group", isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "hover:bg-white/5 hover:text-white text-slate-400")}>
                  <item.icon className={cn("h-5 w-5 ml-3.5", isActive ? "text-white" : "group-hover:text-indigo-400")} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>

      {/* ... كود Footer السايدبار ... */}
    </div>
  );
}
