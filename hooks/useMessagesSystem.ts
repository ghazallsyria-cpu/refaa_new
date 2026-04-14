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

  const fetchMessages = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(full_name, avatar_url, role),
          receiver:receiver_id(full_name, avatar_url, role),
          section:section_id(name, classes(name))
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMessages((data as unknown) as Message[] || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      console.error("Error fetching messages:", err);
      setError(errorMessage);
    }
  }, [user]);

  const fetchUsers = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      if (currentRole === 'student') {
        let studentData = null;
        // 🚀 الإصلاح: البحث عن قسم الطالب باستخدام الـ id فقط
        const { data: s1 } = await supabase.from('students').select('section_id').eq('id', user.id).maybeSingle();
        if (s1) studentData = s1;

        if (studentData?.section_id) {
          const { data: teacherSectionsData } = await supabase
            .from('teacher_sections')
            .select('teacher_id')
            .eq('section_id', studentData.section_id);

          const teacherIds = teacherSectionsData?.map(ts => ts.teacher_id) || [];
          
          if (teacherIds.length > 0) {
            const { data, error } = await supabase
              .from('users')
              .select('id, full_name, role, avatar_url')
              .or(`id.in.(${teacherIds.join(',')}),role.in.(admin,management)`)
              .order('full_name');
            if (error) throw error;
            setUsers((data as unknown) as User[] || []);
          } else {
            const { data, error } = await supabase
              .from('users')
              .select('id, full_name, role, avatar_url')
              .in('role', ['admin', 'management'])
              .order('full_name');
            if (error) throw error;
            setUsers((data as unknown) as User[] || []);
          }
        } else {
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name, role, avatar_url')
            .in('role', ['admin', 'management'])
            .order('full_name');
          if (error) throw error;
          setUsers((data as unknown) as User[] || []);
        }
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, role, avatar_url')
          .order('full_name');
        if (error) throw error;
        setUsers((data as unknown) as User[] || []);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching users';
      console.error('Error fetching users:', err);
      setError(errorMessage);
    }
  }, [user, currentRole]);

  const fetchTeacherSections = useCallback(async (): Promise<void> => {
    if (!user || currentRole !== 'teacher') return;
    try {
      let teacherProfile = null;
      // 🚀 الإصلاح הגذري: إزالة البحث بـ user_id المعطوب، والاعتماد كلياً على الـ id 
      const { data: tp } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
      if (tp) teacherProfile = tp;

      if (!teacherProfile) return;

      const { data: sectionsData } = await supabase
        .from('teacher_sections')
        .select(`
          section_id,
          section:sections(id, name, classes(name))
        `)
        .eq('teacher_id', teacherProfile.id);
      
      const uniqueSections = Array.from(new Set((sectionsData || []).map(s => s.section_id)))
        .map(id => {
          const s = sectionsData?.find(item => item.section_id === id);
          const section = Array.isArray(s?.section) ? s.section[0] : s?.section;
          if (!section) return null;
          const classes = Array.isArray((section as any).classes) ? (section as any).classes[0] : (section as any).classes;
          
          return ({
            id: (section as any).id,
            name: (section as any).name,
            classes: classes
          } as unknown) as Section;
        });
      
      setTeacherSections(uniqueSections.filter((s): s is Section => s !== null));
    } catch (err: unknown) {
      console.error('Error fetching teacher sections:', err);
    }
  }, [user, currentRole]);

  const loadInitialData = useCallback(async (): Promise<void> => {
    setLoading(true);
    await Promise.all([
      fetchMessages(),
      fetchUsers(),
      fetchTeacherSections()
    ]);
    setLoading(false);
  }, [fetchMessages, fetchUsers, fetchTeacherSections]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const fetchStudentsBySection = useCallback(async (sectionId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          users!fk_students_users(id, full_name, role, avatar_url)
        `)
        .eq('section_id', sectionId);
      
      if (error) throw error;
      
      return data?.map(s => {
        const u = Array.isArray(s.users) ? s.users[0] : s.users;
        if (u) {
            return ({ ...u, id: s.id } as unknown) as User;
        }
        return null;
      }).filter((u): u is User => u !== null) || [];
    } catch (error) {
      console.error('Error fetching students by section:', error);
      return [];
    }
  }, []);

  const sendMessage = useCallback(async (receiverId: string, subject: string, content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          subject,
          content,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send message');

      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [user, fetchMessages]);

  const sendGroupMessage = useCallback(async (sectionId: string, subject: string, content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    const response = await fetch('/api/messages/send-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionId,
        subject,
        content,
        senderId: user.id,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'حدث خطأ أثناء إرسال الرسالة الجماعية');
    
    await fetchMessages();
  }, [user, fetchMessages]);

  const markAsRead = useCallback(async (messageIds: string[]): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to mark messages as read');

      await fetchMessages();
    } catch (err) {
      console.error('Error marking messages as read:', err);
      throw err;
    }
  }, [user, fetchMessages]);

  const deleteMessages = useCallback(async (messageIds: string[]): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete messages');

      await fetchMessages();
    } catch (err) {
      console.error('Error deleting messages:', err);
      throw err;
    }
  }, [user, fetchMessages]);

  const updateMessage = useCallback(async (messageId: string, content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await fetch('/api/messages/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          content,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update message');

      await fetchMessages();
    } catch (err) {
      console.error('Error updating message:', err);
      throw err;
    }
  }, [user, fetchMessages]);

  return { 
    messages, 
    users, 
    teacherSections, 
    loading, 
    error, 
    fetchMessages, 
    fetchStudentsBySection,
    sendMessage, 
    sendGroupMessage,
    markAsRead, 
    deleteMessages, 
    updateMessage
  } as const;
}
