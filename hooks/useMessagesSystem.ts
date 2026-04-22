/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export interface ChatRoom {
  id: string;
  name: string;
  className: string;
  type: 'group';
}

export function useMessagesSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]); // 🚀 الغرف الثابتة (مجالس الرفعة)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚀 1. جلب الغرف الثابتة (مجالس الفصول) بناءً على الرتبة
  const fetchChatRooms = useCallback(async () => {
    if (!user) return;
    try {
      let rooms: ChatRoom[] = [];

      if (currentRole === 'student') {
        const { data } = await supabase.from('students').select('section_id, sections(name, classes(name))').eq('id', user.id).maybeSingle();
        if (data?.sections && data.section_id) {
           const classObj = Array.isArray(data.sections.classes) ? data.sections.classes[0] : data.sections.classes;
           rooms = [{ id: data.section_id, name: data.sections.name, className: classObj?.name || '', type: 'group' }];
        }
      } 
      else if (currentRole === 'teacher') {
        const { data } = await supabase.from('teacher_sections').select('section_id, sections(name, classes(name))').eq('teacher_id', user.id);
        if (data) {
          const uniqueRooms = new Map(); // لمنع التكرار إذا كان المعلم يدرس مادتين لنفس الصف
          data.forEach((d: any) => {
            if (d.sections && d.section_id && !uniqueRooms.has(d.section_id)) {
              const classObj = Array.isArray(d.sections.classes) ? d.sections.classes[0] : d.sections.classes;
              uniqueRooms.set(d.section_id, { id: d.section_id, name: d.sections.name, className: classObj?.name || '', type: 'group' });
            }
          });
          rooms = Array.from(uniqueRooms.values());
        }
      } 
      else if (['admin', 'management', 'staff'].includes(currentRole)) {
        const { data } = await supabase.from('sections').select('id, name, classes(name)');
        if (data) {
          rooms = data.map((d: any) => {
             const classObj = Array.isArray(d.classes) ? d.classes[0] : d.classes;
             return { id: d.id, name: d.name, className: classObj?.name || '', type: 'group' };
          });
        }
      }

      setChatRooms(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
    }
  }, [user, currentRole]);

  // 🚀 2. جلب جهات الاتصال للرسائل الفردية (معزولة بقوانين دستور الرفعة)
  const fetchUsers = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      if (currentRole === 'student') {
        const { data: s1 } = await supabase.from('students').select('section_id').eq('id', user.id).maybeSingle();
        if (s1?.section_id) {
          const { data: teacherSectionsData } = await supabase.from('teacher_sections').select('teacher_id').eq('section_id', s1.section_id);
          const teacherIds = teacherSectionsData?.map((ts: any) => ts.teacher_id) || [];
          
          const query = supabase.from('users').select('id, full_name, role, avatar_url').order('full_name');
          if (teacherIds.length > 0) query.or(`id.in.(${teacherIds.join(',')}),role.in.(admin,management)`);
          else query.in('role', ['admin', 'management']);
          
          const { data, error } = await query;
          if (error) throw error;
          setUsers(data || []);
        }
      } 
      else if (currentRole === 'parent') {
        const { data: childrenData } = await supabase.from('students').select('section_id').eq('parent_id', user.id);
        const childSectionIds = childrenData?.map((c: any) => c.section_id).filter(Boolean) || [];

        let teacherIds: string[] = [];
        if (childSectionIds.length > 0) {
           const { data: tsData } = await supabase.from('teacher_sections').select('teacher_id').in('section_id', childSectionIds);
           teacherIds = Array.from(new Set(tsData?.map((ts: any) => ts.teacher_id) || []));
        }

        const query = supabase.from('users').select('id, full_name, role, avatar_url').order('full_name');
        if (teacherIds.length > 0) query.or(`id.in.(${teacherIds.join(',')}),role.in.(admin,management)`);
        else query.in('role', ['admin', 'management']);

        const { data, error } = await query;
        if (error) throw error;
        
        const safeUsers = (data || []).filter((u: any) => u.role !== 'student' && u.role !== 'parent');
        setUsers(safeUsers || []);
      } 
      else {
        const { data, error } = await supabase.from('users').select('id, full_name, role, avatar_url').order('full_name');
        if (error) throw error;
        setUsers(data || []);
      }
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
    }
  }, [user, currentRole]);

  // 🚀 3. جلب الرسائل (الموحدة) للمجالس والخاصة
  const fetchMessages = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(full_name, avatar_url, role),
          receiver:receiver_id(full_name, avatar_url, role),
          section:section_id(name, classes(name))
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      // إذا كان الإداري، يرى كل شيء، وإلا يرى رسائله وغرفه فقط
      if (!['admin', 'management', 'staff'].includes(currentRole)) {
         query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},section_id.not.is.null`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      // التصفية النهائية في الواجهة الأمامية للغرف التي لا ينتمي لها
      setMessages(data || []);
    } catch (err: unknown) {
      console.error("Error fetching messages:", err);
    }
  }, [user, currentRole]);

  const loadInitialData = useCallback(async (): Promise<void> => {
    setLoading(true);
    await Promise.all([fetchChatRooms(), fetchUsers(), fetchMessages()]);
    setLoading(false);
  }, [fetchChatRooms, fetchUsers, fetchMessages]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // الدوال التشغيلية (إرسال، تحديد كمقروء، حذف)
  const sendMessage = useCallback(async (receiverId: string, subject: string, content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, subject, content, userId: user.id }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      await fetchMessages();
    } catch (err) { throw err; }
  }, [user, fetchMessages]);

  const sendGroupMessage = useCallback(async (sectionId: string, subject: string, content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    const response = await fetch('/api/messages/send-group', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId, subject, content, senderId: user.id }),
    });
    if (!response.ok) throw new Error('حدث خطأ أثناء الإرسال');
    await fetchMessages();
  }, [user, fetchMessages]);

  const markAsRead = useCallback(async (messageIds: string[]): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, userId: user.id }),
      });
      await fetchMessages();
    } catch (err) { throw err; }
  }, [user, fetchMessages]);

  const deleteMessages = useCallback(async (messageIds: string[]): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      await fetch('/api/messages/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, userId: user.id }),
      });
      await fetchMessages();
    } catch (err) { throw err; }
  }, [user, fetchMessages]);

  return { messages, users, chatRooms, loading, error, fetchMessages, sendMessage, sendGroupMessage, markAsRead, deleteMessages } as const;
}
