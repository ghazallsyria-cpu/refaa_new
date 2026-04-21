import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Message, User, Section } from '@/types';

export function useMessagesSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teacherSections, setTeacherSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚀 1. جلب الرسائل الذكي (المعدل لدعم الغرف الجماعية الموحدة)
  const fetchMessages = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      // أ. استخراج الغرف (الفصول) التي ينتمي إليها المستخدم ليرى رسائلها
      let userSectionIds: string[] = [];
      
      if (currentRole === 'student') {
        const { data } = await supabase.from('students').select('section_id').eq('id', user.id).maybeSingle();
        if (data?.section_id) userSectionIds.push(data.section_id);
      } else if (currentRole === 'teacher') {
        const { data } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', user.id);
        if (data) userSectionIds = data.map(d => d.section_id);
      } else if (currentRole === 'parent') {
        const { data } = await supabase.from('students').select('section_id').eq('parent_id', user.id);
        if (data) userSectionIds = data.map(d => d.section_id).filter(Boolean);
      }

      // ب. بناء الاستعلام
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(full_name, avatar_url, role),
          receiver:receiver_id(full_name, avatar_url, role),
          section:section_id(name, classes(name))
        `)
        .order('created_at', { ascending: false })
        .limit(2000); // حماية للمتصفح من الاختناق

      // ج. تطبيق الصلاحيات (دستور الرفعة)
      if (['admin', 'management', 'staff'].includes(currentRole)) {
        // الإدارة ترى رسائلها الخاصة + جميع رسائل الغرف المدرسية للرقابة
        query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},section_id.not.is.null`);
      } else {
        // المعلم والطلاب والأولياء يرون رسائلهم الخاصة + غرفهم فقط
        if (userSectionIds.length > 0) {
          query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},section_id.in.(${userSectionIds.join(',')})`);
        } else {
          query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setMessages((data as unknown) as Message[] || []);
    } catch (err: unknown) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  }, [user, currentRole]);

  // 🚀 2. جدار الحماية لجلب جهات الاتصال (محدّث)
  const fetchUsers = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      if (currentRole === 'student') {
        const { data: s1 } = await supabase.from('students').select('section_id').eq('id', user.id).maybeSingle();
        if (s1?.section_id) {
          const { data: teacherSectionsData } = await supabase.from('teacher_sections').select('teacher_id').eq('section_id', s1.section_id);
          const teacherIds = teacherSectionsData?.map(ts => ts.teacher_id) || [];
          
          const query = supabase.from('users').select('id, full_name, role, avatar_url').order('full_name');
          if (teacherIds.length > 0) query.or(`id.in.(${teacherIds.join(',')}),role.in.(admin,management)`);
          else query.in('role', ['admin', 'management']);
          
          const { data, error } = await query;
          if (error) throw error;
          setUsers((data as unknown) as User[] || []);
        }
      } 
      else if (currentRole === 'parent') {
        const { data: childrenData } = await supabase.from('students').select('section_id').eq('parent_id', user.id);
        const childSectionIds = childrenData?.map(c => c.section_id).filter(Boolean) || [];

        let teacherIds: string[] = [];
        if (childSectionIds.length > 0) {
           const { data: tsData } = await supabase.from('teacher_sections').select('teacher_id').in('section_id', childSectionIds);
           teacherIds = Array.from(new Set(tsData?.map(ts => ts.teacher_id) || []));
        }

        const query = supabase.from('users').select('id, full_name, role, avatar_url').order('full_name');
        if (teacherIds.length > 0) query.or(`id.in.(${teacherIds.join(',')}),role.in.(admin,management)`);
        else query.in('role', ['admin', 'management']);

        const { data, error } = await query;
        if (error) throw error;
        
        const safeUsers = (data || []).filter(u => u.role !== 'student' && u.role !== 'parent');
        setUsers((safeUsers as unknown) as User[] || []);
      } 
      else {
        const { data, error } = await supabase.from('users').select('id, full_name, role, avatar_url').order('full_name');
        if (error) throw error;
        setUsers((data as unknown) as User[] || []);
      }
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      setError('Error fetching users');
    }
  }, [user, currentRole]);

  const fetchTeacherSections = useCallback(async (): Promise<void> => {
    if (!user || currentRole !== 'teacher') return;
    try {
      let teacherProfile = null;
      const { data: tp } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
      if (tp) teacherProfile = tp;

      if (!teacherProfile) return;

      const { data: sectionsData } = await supabase
        .from('teacher_sections')
        .select(`section_id, section:sections(id, name, classes(name))`)
        .eq('teacher_id', teacherProfile.id);
      
      const uniqueSections = Array.from(new Set((sectionsData || []).map(s => s.section_id)))
        .map(id => {
          const s = sectionsData?.find(item => item.section_id === id);
          const section = Array.isArray(s?.section) ? s.section[0] : s?.section;
          if (!section) return null;
          const classes = Array.isArray((section as any).classes) ? (section as any).classes[0] : (section as any).classes;
          return ({ id: (section as any).id, name: (section as any).name, classes: classes } as unknown) as Section;
        });
      
      setTeacherSections(uniqueSections.filter((s): s is Section => s !== null));
    } catch (err: unknown) {
      console.error('Error fetching teacher sections:', err);
    }
  }, [user, currentRole]);

  const loadInitialData = useCallback(async (): Promise<void> => {
    setLoading(true);
    await Promise.all([fetchMessages(), fetchUsers(), fetchTeacherSections()]);
    setLoading(false);
  }, [fetchMessages, fetchUsers, fetchTeacherSections]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const fetchStudentsBySection = useCallback(async (sectionId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('students').select(`id, users(id, full_name, role, avatar_url)`).eq('section_id', sectionId);
      if (error) throw error;
      return data?.map(s => {
        const u = Array.isArray(s.users) ? s.users[0] : s.users;
        if (u) return ({ ...u, id: s.id } as unknown) as User;
        return null;
      }).filter((u): u is User => u !== null) || [];
    } catch (error) { console.error('Error fetching students:', error); return []; }
  }, []);

  const sendMessage = useCallback(async (receiverId: string, subject: string, content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, subject, content, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send message');
      
      // التحديث يتم تلقائياً عبر الـ Realtime، لكن نطلبه هنا كإجراء احترازي
      await fetchMessages();
    } catch (err) { throw err; }
  }, [user, fetchMessages]);

  const sendGroupMessage = useCallback(async (sectionId: string, subject: string, content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    const response = await fetch('/api/messages/send-group', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId, subject, content, senderId: user.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'حدث خطأ');
    
    await fetchMessages();
  }, [user, fetchMessages]);

  const markAsRead = useCallback(async (messageIds: string[]): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/messages/mark-read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await fetchMessages();
    } catch (err) { throw err; }
  }, [user, fetchMessages]);

  const deleteMessages = useCallback(async (messageIds: string[]): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/messages/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await fetchMessages();
    } catch (err) { throw err; }
  }, [user, fetchMessages]);

  const updateMessage = useCallback(async (messageId: string, content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/messages/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, content, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await fetchMessages();
    } catch (err) { throw err; }
  }, [user, fetchMessages]);

  return { messages, users, teacherSections, loading, error, fetchMessages, fetchStudentsBySection, sendMessage, sendGroupMessage, markAsRead, deleteMessages, updateMessage } as const;
}
