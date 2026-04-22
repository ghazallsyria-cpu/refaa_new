import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export interface ChatRoom { id: string; name: string; className: string; type: 'group'; }

export function useMessagesSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]); // 🚀 مجالس الفصول الثابتة
  const [loading, setLoading] = useState(true);

// 🚀 1. جلب المجالس الثابتة (تظهر حتى لو كانت فارغة من الرسائل)
  const fetchChatRooms = useCallback(async () => {
    if (!user) return;
    try {
      let rooms: ChatRoom[] = [];
      if (currentRole === 'student') {
        const { data } = await supabase.from('students').select('section_id, sections(name, classes(name))').eq('id', user.id).maybeSingle();
        if (data?.sections && data.section_id) {
           // 🛡️ تجاوز تدقيق TypeScript الصارم هنا باستخدام as any
           const secData = data.sections as any;
           const classObj = Array.isArray(secData.classes) ? secData.classes[0] : secData.classes;
           rooms = [{ id: data.section_id, name: secData.name, className: classObj?.name || '', type: 'group' }];
        }
      } 
      else if (currentRole === 'teacher') {
        const { data } = await supabase.from('teacher_sections').select('section_id, sections(name, classes(name))').eq('teacher_id', user.id);
        if (data) {
          const uniqueRooms = new Map();
          data.forEach((d: any) => {
            if (d.sections && d.section_id && !uniqueRooms.has(d.section_id)) {
              // 🛡️ تجاوز تدقيق TypeScript الصارم هنا
              const secData = d.sections as any;
              const classObj = Array.isArray(secData.classes) ? secData.classes[0] : secData.classes;
              uniqueRooms.set(d.section_id, { id: d.section_id, name: secData.name, className: classObj?.name || '', type: 'group' });
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
    } catch (error) { console.error("Error fetching chat rooms:", error); }
  }, [user, currentRole]);

  // 2. جلب جهات الاتصال للمراسلات الخاصة (مفلترة حسب الرتبة)
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('users').select('id, full_name, role, avatar_url').order('full_name');
      
      if (currentRole === 'student') {
        const { data: s } = await supabase.from('students').select('section_id').eq('id', user.id).maybeSingle();
        const { data: ts } = await supabase.from('teacher_sections').select('teacher_id').eq('section_id', s?.section_id);
        const tIds = ts?.map((t: any) => t.teacher_id) || [];
        if (tIds.length > 0) query.or(`id.in.(${tIds.join(',')}),role.in.(admin,management)`);
        else query.in('role', ['admin', 'management']);
      } 
      else if (currentRole === 'parent') {
        const { data: kids } = await supabase.from('students').select('section_id').eq('parent_id', user.id);
        const secIds = kids?.map((k: any) => k.section_id).filter(Boolean) || [];
        const { data: ts } = await supabase.from('teacher_sections').select('teacher_id').in('section_id', secIds);
        const tIds = Array.from(new Set(ts?.map((t: any) => t.teacher_id) || []));
        if (tIds.length > 0) query.or(`id.in.(${tIds.join(',')}),role.in.(admin,management)`);
        else query.in('role', ['admin', 'management']);
      }
      else if (currentRole === 'teacher') {
        // المعلم يرى طلابه، الإدارة، وزملاءه المعلمين
        const { data: ts } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', user.id);
        const secIds = ts?.map((t: any) => t.section_id) || [];
        const { data: st } = await supabase.from('students').select('id').in('section_id', secIds);
        const sIds = st?.map((s: any) => s.id) || [];
        if (sIds.length > 0) query.or(`id.in.(${sIds.join(',')}),role.in.(admin,management,teacher,staff)`);
        else query.in('role', ['admin', 'management', 'teacher', 'staff']);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers((data || []).filter(u => u.id !== user.id && u.role !== 'parent')); // استبعاد ولي الأمر من الظهور
    } catch (err) { console.error('Error fetching users:', err); }
  }, [user, currentRole]);

  // 3. جلب جميع الرسائل المتعلقة بالمستخدم
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('messages').select(`*, sender:sender_id(full_name, avatar_url, role), receiver:receiver_id(full_name, avatar_url, role)`).order('created_at', { ascending: false }).limit(2000);
      
      if (!['admin', 'management', 'staff'].includes(currentRole)) {
        // الطلاب والمعلمين يرون غرفهم ورسائلهم الخاصة فقط
        const roomIds = chatRooms.map(r => r.id);
        if (roomIds.length > 0) query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},section_id.in.(${roomIds.join(',')})`);
        else query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch (err) { console.error("Error fetching messages:", err); }
  }, [user, currentRole, chatRooms]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchChatRooms();
      await fetchUsers();
      setLoading(false);
    };
    load();
  }, [fetchChatRooms, fetchUsers]);

  // جلب الرسائل بعد تحميل الغرف
  useEffect(() => {
    if (chatRooms.length > 0 || currentRole) { fetchMessages(); }
  }, [chatRooms, fetchMessages, currentRole]);

  const sendMessage = async (receiverId: string, subject: string, content: string) => {
    await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId, subject, content, userId: user.id }) });
    fetchMessages();
  };

  const sendGroupMessage = async (sectionId: string, subject: string, content: string) => {
    await fetch('/api/messages/send-group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectionId, subject, content, senderId: user.id }) });
    fetchMessages();
  };

  const markAsRead = async (messageIds: string[]) => {
    await fetch('/api/messages/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds, userId: user.id }) });
    fetchMessages();
  };

  const deleteMessages = async (messageIds: string[]) => {
    await fetch('/api/messages/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds, userId: user.id }) });
    fetchMessages();
  };

  return { messages, users, chatRooms, loading, fetchMessages, sendMessage, sendGroupMessage, markAsRead, deleteMessages } as const;
}
