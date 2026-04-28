/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export interface ChatRoom { id: string; name: string; className: string; type: 'group'; }

export function useMessagesSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 حارس لمنع الاستدعاءات المتكررة
  const isFetchingRooms = useRef(false);

  const fetchChatRooms = useCallback(async () => {
    if (!user || isFetchingRooms.current) return;
    isFetchingRooms.current = true;
    try {
      let rooms: ChatRoom[] = [];
      if (currentRole === 'student') {
        const { data } = await supabase.from('students').select('section_id, sections(name, classes(name))').eq('id', user.id).maybeSingle();
        if (data?.sections && data.section_id) {
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
    } catch (error) { console.error("Error fetching chat rooms:", error); } finally {
      isFetchingRooms.current = false;
    }
  }, [user, currentRole]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('users').select('id, full_name, role, avatar_url').order('full_name');
      
      if (currentRole === 'student') {
        const { data: s } = await supabase.from('students').select('section_id').eq('id', user.id).maybeSingle();
        if(s?.section_id) {
            const { data: ts } = await supabase.from('teacher_sections').select('teacher_id').eq('section_id', s.section_id);
            const tIds = ts?.map((t: any) => t.teacher_id) || [];
            if (tIds.length > 0) query.or(`id.in.(${tIds.join(',')}),role.in.(admin,management)`);
            else query.in('role', ['admin', 'management']);
        } else query.in('role', ['admin', 'management']);
      } 
      else if (currentRole === 'parent') {
        const { data: kids } = await supabase.from('students').select('section_id').eq('parent_id', user.id);
        const secIds = kids?.map((k: any) => k.section_id).filter(Boolean) || [];
        if(secIds.length > 0) {
            const { data: ts } = await supabase.from('teacher_sections').select('teacher_id').in('section_id', secIds);
            const tIds = Array.from(new Set(ts?.map((t: any) => t.teacher_id) || []));
            if (tIds.length > 0) query.or(`id.in.(${tIds.join(',')}),role.in.(admin,management)`);
            else query.in('role', ['admin', 'management']);
        } else query.in('role', ['admin', 'management']);
      }
      else if (currentRole === 'teacher') {
        const { data: ts } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', user.id);
        const secIds = ts?.map((t: any) => t.section_id) || [];
        if(secIds.length > 0) {
            const { data: st } = await supabase.from('students').select('id').in('section_id', secIds);
            const sIds = st?.map((s: any) => s.id) || [];
            if (sIds.length > 0) query.or(`id.in.(${sIds.join(',')}),role.in.(admin,management,teacher,staff)`);
            else query.in('role', ['admin', 'management', 'teacher', 'staff']);
        } else query.in('role', ['admin', 'management', 'teacher', 'staff']);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers((data || []).filter(u => u.id !== user.id && u.role !== 'parent'));
    } catch (err) { console.error('Error fetching users:', err); }
  }, [user, currentRole]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('messages').select(`*, sender:sender_id(full_name, avatar_url, role), receiver:receiver_id(full_name, avatar_url, role)`).order('created_at', { ascending: false }).limit(2000);
      
      if (!['admin', 'management', 'staff'].includes(currentRole)) {
        let orString = `sender_id.eq.${user.id},receiver_id.eq.${user.id}`;
        const roomIds = chatRooms.map(r => r.id);
        if (roomIds.length > 0) {
          const roomOrs = roomIds.map(id => `section_id.eq.${id}`).join(',');
          orString += `,${roomOrs}`;
        }
        query = query.or(orString);
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
    if (user?.id) load();
  }, [fetchChatRooms, fetchUsers, user?.id]);

  useEffect(() => {
    if (chatRooms.length > 0 || currentRole) { fetchMessages(); }
  }, [chatRooms, fetchMessages, currentRole]);

  const sendMessage = async (receiverId: string, subject: string, content: string) => {
    const response = await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId, subject, content, userId: user.id }) });
    if (!response.ok) {
      const data = await response.json().catch(()=>({}));
      throw new Error(data.error || 'حدث خطأ أثناء الإرسال');
    }
    fetchMessages();
  };

  const sendGroupMessage = async (sectionId: string, subject: string, content: string) => {
    const response = await fetch('/api/messages/send-group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectionId, subject, content, senderId: user.id }) });
    if (!response.ok) {
      const data = await response.json().catch(()=>({}));
      throw new Error(data.error || 'حدث خطأ أثناء إرسال الرسالة الجماعية');
    }
    fetchMessages();
  };

  const sendBroadcastMessage = async (subject: string, content: string) => {
    if (!user) throw new Error('User not authenticated');
    const { data: sections } = await supabase.from('sections').select('id');
    if (!sections || sections.length === 0) throw new Error('لا توجد فصول للإرسال إليها');
    
    const promises = sections.map(sec => 
      fetch('/api/messages/send-group', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ sectionId: sec.id, subject, content, senderId: user.id }) 
      })
    );
    
    await Promise.all(promises);
    fetchMessages();
  };

  const markAsRead = async (messageIds: string[]) => {
    await fetch('/api/messages/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds, userId: user.id }) });
    fetchMessages();
  };

  // 🚀 دالة الحذف الذكية الجديدة (Delete from DB & Storage)
  const deleteMessages = async (messageIds: string[]) => {
    if (!messageIds || messageIds.length === 0) return;

    // 1. جلب الرسائل أولاً للبحث عن روابط الصور بداخلها
    const { data: msgsToDelete } = await supabase
      .from('messages')
      .select('content')
      .in('id', messageIds);

    // 2. البحث عن مسارات الصور المخزنة في Supabase/Cloudinary باستخدام RegEx
    if (msgsToDelete && msgsToDelete.length > 0) {
      const imageUrls: string[] = [];
      msgsToDelete.forEach((msg) => {
        if (msg.content) {
          // استخراج جميع مسارات الـ src من الـ HTML
          const regex = /<img[^>]+src="([^">]+)"/g;
          let match;
          while ((match = regex.exec(msg.content)) !== null) {
            imageUrls.push(match[1]);
          }
        }
      });

      // 3. مسح الصور من الـ Storage إذا تم العثور عليها
      for (const url of imageUrls) {
        // التحقق مما إذا كان الرابط تابعاً لـ Supabase Storage 
        if (url.includes('supabase.co/storage/v1/object/public/')) {
          const pathParts = url.split('/public/');
          if (pathParts.length > 1) {
            const fullPath = pathParts[1]; // مثلاً: questions_images/file.png
            const bucketName = fullPath.split('/')[0];
            const fileName = fullPath.substring(bucketName.length + 1);
            
            await supabase.storage.from(bucketName).remove([fileName]);
          }
        }
        // ملاحظة: Cloudinary لا يوفر واجهة حذف للصور عبر Client-side لدواعي أمنية.
        // يجب مسحها عبر Server Route (API) خاص بـ Cloudinary إذا كنت تستخدمه بشكل صريح.
      }
    }

    // 4. حذف الرسالة نهائياً من قاعدة البيانات
    await fetch('/api/messages/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds, userId: user.id }) });
    fetchMessages();
  };

  // 🚀 دالة لحذف رسالة فردية واحدة (للمدير والمعلم)
  const deleteSingleMessage = async (messageId: string) => {
    await deleteMessages([messageId]);
  };

  return { messages, users, chatRooms, loading, fetchMessages, sendMessage, sendGroupMessage, sendBroadcastMessage, markAsRead, deleteMessages, deleteSingleMessage } as const;
}
