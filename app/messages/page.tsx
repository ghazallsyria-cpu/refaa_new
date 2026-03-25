'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Megaphone, Plus, Search, Send, User, Clock, Check, CheckCheck, X, UserPlus, Filter, Mail, Bell, ArrowRight, Users, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'messages' | 'announcements';

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState<any[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState<'teacher' | 'student' | ''>('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newMessage, setNewMessage] = useState({ receiver_id: '', subject: '', content: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', target_role: 'all', content: '' });
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);


  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeThread) return;

    setIsReplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      const isGroup = !!activeThread.section_id;
      
      if (isGroup && currentUser?.role === 'teacher') {
        // Teacher replying to a group thread -> send to all students in section
        const response = await fetch('/api/messages/send-group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId: activeThread.section_id,
            subject: activeThread.subject,
            content: replyContent,
            senderId: user.id,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'حدث خطأ أثناء إرسال الرد الجماعي');
      } else {
        // Private reply or student replying to group thread
        // If it's a group thread and a student is replying, they reply to the original sender (teacher)
        const receiverId = isGroup 
          ? activeThread.sender_id 
          : (activeThread.sender_id === user.id ? activeThread.receiver_id : activeThread.sender_id);

        const { data: sentMsg, error } = await supabase
          .from('messages')
          .insert([{
            sender_id: user.id,
            receiver_id: receiverId,
            section_id: activeThread.section_id || null,
            subject: activeThread.subject,
            content: replyContent,
            is_read: false
          }])
          .select()
          .single();

        if (error) throw error;

        // Send notification to receiver
        await supabase.from('notifications').insert([{
          user_id: receiverId,
          type: 'message',
          title: 'رسالة جديدة',
          content: `لديك رسالة جديدة من ${currentUser?.full_name || 'مستخدم'}: ${activeThread.subject}`,
          link: '/messages',
          is_read: false
        }]);
      }

      setReplyContent('');
      fetchMessages(); // Refresh inbox
      fetchThread(activeThread.convId); // Refresh current thread
      showNotification('success', 'تم إرسال الرد بنجاح');
    } catch (error: any) {
      console.error('Error sending reply:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء إرسال الرد');
    } finally {
      setIsReplying(false);
    }
  };
  useEffect(() => {
    if (!messages.length || !currentUser) {
      setGroupedMessages([]);
      return;
    }

    const conversations = messages.reduce((acc: any, msg) => {
      let convId;
      if (msg.section_id) {
        convId = `group-${msg.section_id}`;
      } else {
        const ids = [msg.sender_id, msg.receiver_id].sort();
        convId = `private-${ids.join('-')}`;
      }

      if (!acc[convId]) {
        acc[convId] = { 
          ...msg, 
          allIds: [msg.id],
          msgCount: 1,
          convId
        };
      } else {
        // Keep the latest message as the representative
        if (new Date(msg.created_at) > new Date(acc[convId].created_at)) {
          const allIds = [...acc[convId].allIds, msg.id];
          const msgCount = acc[convId].msgCount + 1;
          acc[convId] = { ...msg, allIds, msgCount, convId };
        } else {
          acc[convId].allIds.push(msg.id);
          acc[convId].msgCount += 1;
        }
      }
      return acc;
    }, {});

    setGroupedMessages(Object.values(conversations).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  }, [messages, currentUser]);

  const markAsRead = async (messageIds: string[]) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds)
        .eq('is_read', false);
      
      if (error) throw error;
      fetchMessages();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const fetchThread = (convId: string) => {
    let thread = messages.filter(msg => {
      if (msg.section_id) {
        return `group-${msg.section_id}` === convId;
      } else {
        const ids = [msg.sender_id, msg.receiver_id].sort();
        return `private-${ids.join('-')}` === convId;
      }
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // Deduplicate group messages sent by the current user (teacher)
    if (convId.startsWith('group-')) {
      const uniqueMessages = [];
      const seenContents = new Set();
      for (const msg of thread) {
        if (msg.sender_id === currentUser?.id) {
          // Use a combination of content, subject, and timestamp (rounded to minute) to deduplicate
          // This ensures that if a teacher sends multiple group messages with same content at different times, they show up
          const date = new Date(msg.created_at);
          const timeKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
          const key = `${msg.content}-${msg.subject}-${timeKey}`;
          if (!seenContents.has(key)) {
            seenContents.add(key);
            uniqueMessages.push(msg);
          }
        } else {
          uniqueMessages.push(msg);
        }
      }
      thread = uniqueMessages;
    }

    setThreadMessages(thread);

    // Mark unread messages as read
    const unreadIds = thread
      .filter(msg => !msg.is_read && msg.sender_id !== currentUser?.id)
      .map(msg => msg.id);
    
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };
  const handleDeleteMessage = async (messageIds: string[]) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسائل؟')) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .in('id', messageIds);
      
      if (error) throw error;
      
      showNotification('success', 'تم حذف الرسائل بنجاح');
      if (activeThread && messageIds.some(id => activeThread.allIds.includes(id))) {
        setActiveThread(null);
      }
      fetchMessages();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      showNotification('error', 'حدث خطأ أثناء حذف الرسالة');
    }
  };

  const handleUpdateMessage = async () => {
    if (!editContent.trim() || !editingMessage) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: editContent })
        .eq('id', editingMessage.id);

      if (error) throw error;

      showNotification('success', 'تم تحديث الرسالة بنجاح');
      setEditingMessage(null);
      setEditContent('');
      fetchMessages();
      if (activeThread) {
        fetchThread(activeThread.convId);
      }
    } catch (error: any) {
      console.error('Error updating message:', error);
      showNotification('error', 'حدث خطأ أثناء تحديث الرسالة');
    }
  };

  const resetMessageForm = () => {
    setNewMessage({ receiver_id: '', subject: '', content: '' });
    setRecipientType('');
    setSelectedSectionId('');
    setIsGroupMessage(false);
    setStep(1);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchUsers = useCallback(async (currentUserData?: any) => {
    try {
      if (currentUserData?.role === 'student') {
        // Fetch student's section
        const { data: studentData } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', currentUserData.id)
          .single();

        if (studentData?.section_id) {
          // Fetch teachers for this section
          const { data: teacherSections } = await supabase
            .from('teacher_sections')
            .select('teacher_id')
            .eq('section_id', studentData.section_id);

          const teacherIds = teacherSections?.map(ts => ts.teacher_id) || [];
          
          if (teacherIds.length > 0) {
            const { data, error } = await supabase
              .from('users')
              .select('id, full_name, role')
              .or(`id.in.(${teacherIds.join(',')}),role.in.(admin,management)`)
              .order('full_name');
            if (error) throw error;
            setUsers(data || []);
          } else {
            const { data, error } = await supabase
              .from('users')
              .select('id, full_name, role')
              .in('role', ['admin', 'management'])
              .order('full_name');
            setUsers(data || []);
          }
        } else {
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name, role')
            .in('role', ['admin', 'management'])
            .order('full_name');
          setUsers(data || []);
        }
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, role')
          .order('full_name');
        if (error) throw error;
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchAnnouncements = useCallback(async (currentUserData?: any) => {
    try {
      let query = supabase
        .from('announcements')
        .select(`
          *,
          author:author_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (currentUserData?.role === 'student') {
        query = query.or(`target_role.eq.student,target_role.is.null`);
      } else if (currentUserData?.role === 'parent') {
        query = query.or(`target_role.eq.parent,target_role.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');
      
      console.log('Fetching messages for user:', user.id);

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(full_name),
          receiver:receiver_id(full_name),
          section:section_id(name, classes(name))
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      showNotification('error', 'حدث خطأ أثناء جلب الرسائل');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(userData);

        if (userData.role === 'teacher') {
          const { data: sectionsData } = await supabase
            .from('teacher_sections')
            .select(`
              section_id,
              section:sections(id, name, classes(name))
            `)
            .eq('teacher_id', user.id);
          
          // Deduplicate sections
          const uniqueSections = Array.from(new Set((sectionsData || []).map(s => s.section_id)))
            .map(id => {
              const s = sectionsData?.find(item => item.section_id === id);
              const section = Array.isArray(s?.section) ? s.section[0] : s?.section;
              if (!section) return null;
              const classes = Array.isArray(section.classes) ? section.classes[0] : section.classes;
              return {
                id: section.id,
                name: section.name,
                classes: classes
              };
            });
          
          setTeacherSections(uniqueSections.filter(Boolean));
        }
        fetchMessages();
        fetchAnnouncements(userData);
        fetchUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }, [fetchUsers, fetchAnnouncements, fetchMessages]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const getFilteredRecipients = () => {
    if (!recipientType) return [];
    
    if (recipientType === 'teacher') {
      return users.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'management');
    }
    
    if (recipientType === 'student') {
      if (currentUser?.role === 'admin' || currentUser?.role === 'management') {
        return users.filter(u => u.role === 'student');
      }
      
      // For teachers, we use filteredStudents which is fetched when a section is selected
      return filteredStudents;
    }
    
    return [];
  };

  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);

  useEffect(() => {
    if (recipientType === 'student' && selectedSectionId) {
      fetchStudentsBySection(selectedSectionId);
    } else {
      setFilteredStudents([]);
    }
  }, [recipientType, selectedSectionId]);

  const fetchStudentsBySection = async (sectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          users(id, full_name, role)
        `)
        .eq('section_id', sectionId);
      
      if (error) throw error;
      
      const studentsList = data?.map(s => {
        const user = Array.isArray(s.users) ? s.users[0] : s.users;
        return user;
      }).filter(Boolean) || [];
      
      setFilteredStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students by section:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab, fetchMessages, fetchAnnouncements]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGroupMessage && !selectedSectionId) {
      showNotification('error', 'الرجاء اختيار الصف للمراسلة الجماعية');
      return;
    }

    if (!isGroupMessage && !newMessage.receiver_id) {
      showNotification('error', 'الرجاء اختيار المستلم');
      return;
    }

    if (!newMessage.subject || !newMessage.content) {
      showNotification('error', 'الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      if (isGroupMessage) {
        // Use the new API route for group messages
        const response = await fetch('/api/messages/send-group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId: selectedSectionId,
            subject: newMessage.subject,
            content: newMessage.content,
            senderId: user.id,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'حدث خطأ أثناء إرسال الرسالة الجماعية');
      } else {
        // Individual message
        const { data: sentMsg, error } = await supabase
          .from('messages')
          .insert([{
            sender_id: user.id,
            receiver_id: newMessage.receiver_id,
            subject: newMessage.subject,
            content: newMessage.content,
            is_read: false
          }])
          .select()
          .single();

        if (error) throw error;

        // Send notification to receiver
        await supabase.from('notifications').insert([{
          user_id: newMessage.receiver_id,
          type: 'message',
          title: 'رسالة جديدة',
          content: `لديك رسالة جديدة من ${currentUser?.full_name || 'مستخدم'}: ${newMessage.subject}`,
          link: '/messages',
          is_read: false
        }]);
      }
      
      showNotification('success', isGroupMessage ? 'تم إرسال الرسالة الجماعية بنجاح' : 'تم إرسال الرسالة بنجاح');
      setShowNewMessage(false);
      resetMessageForm();
      fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) {
      showNotification('error', 'الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      const { error } = await supabase
        .from('announcements')
        .insert([{
          author_id: user.id,
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          target_role: newAnnouncement.target_role === 'all' ? null : newAnnouncement.target_role
        }]);

      if (error) throw error;
      
      try {
        let usersQuery = supabase.from('users').select('id');
        if (newAnnouncement.target_role !== 'all') {
          usersQuery = usersQuery.eq('role', newAnnouncement.target_role);
        }
        const { data: targetUsers } = await usersQuery;

        if (targetUsers && targetUsers.length > 0) {
          const notifications = targetUsers.map(u => ({
            user_id: u.id,
            type: 'announcement',
            title: 'إعلان جديد',
            content: `تم نشر إعلان جديد: ${newAnnouncement.title}`,
            link: '/messages',
            is_read: false
          }));
          
          await supabase.from('notifications').insert(notifications);
        }
      } catch (notifErr) {
        console.error('Error sending announcement notifications:', notifErr);
      }

      showNotification('success', 'تم نشر الإعلان بنجاح');
      setShowNewAnnouncement(false);
      setNewAnnouncement({ title: '', target_role: 'all', content: '' });
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Error sending announcement:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء نشر الإعلان');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMessages = groupedMessages.filter(m => {
    const searchLower = searchTerm.toLowerCase();
    const subjectMatch = m.subject?.toLowerCase().includes(searchLower);
    const senderMatch = m.sender?.full_name?.toLowerCase().includes(searchLower);
    const receiverMatch = m.receiver?.full_name?.toLowerCase().includes(searchLower);
    const sectionMatch = m.section?.name?.toLowerCase().includes(searchLower) || 
                        m.section?.classes?.name?.toLowerCase().includes(searchLower);
    
    return subjectMatch || senderMatch || receiverMatch || sectionMatch;
  });

  const filteredAnnouncements = announcements.filter(a => 
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-20">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-xl ${
              notification.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'
            }`}
          >
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {notification.type === 'success' ? '✓' : '!'}
            </div>
            <div className="font-bold text-sm tracking-wide">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-black text-slate-900 tracking-tight"
          >
            الرسائل والإعلانات
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 mt-2 font-medium"
          >
            مركز التواصل الداخلي وإعلانات مدرسة الرفعة
          </motion.p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'messages' ? (
            <button 
              onClick={() => setShowNewMessage(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95"
            >
              <Plus className="ml-2 h-5 w-5" />
              رسالة جديدة
            </button>
          ) : (currentUser?.role === 'admin' || currentUser?.role === 'management') ? (
            <button 
              onClick={() => setShowNewAnnouncement(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-95"
            >
              <Plus className="ml-2 h-5 w-5" />
              نشر إعلان جديد
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs & Search Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white flex flex-col md:flex-row items-stretch md:items-center gap-2"
      >
        <div className="flex p-1 bg-slate-100 rounded-[2rem] flex-1 md:flex-none">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 md:flex-none px-8 py-3 rounded-[1.75rem] text-sm font-black transition-all flex items-center justify-center gap-3 ${
              activeTab === 'messages' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            صندوق الوارد
          </button>
          {currentUser?.role !== 'teacher' && (
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 md:flex-none px-8 py-3 rounded-[1.75rem] text-sm font-black transition-all flex items-center justify-center gap-3 ${
                activeTab === 'announcements' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Megaphone className="h-4 w-4" />
              لوحة الإعلانات
            </button>
          )}
        </div>

        <div className="relative flex-1 group px-2">
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center pr-3">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-[1.75rem] border-0 py-3.5 pr-12 pl-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
            placeholder={`البحث في ${activeTab === 'messages' ? 'الرسائل' : 'الإعلانات'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Content Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden min-h-[500px]"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[500px] gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-slate-50"></div>
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">جاري التحميل...</span>
          </div>
        ) : activeTab === 'messages' ? (
          /* Messages List */
          <div className="divide-y divide-slate-50">
            {groupedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[500px] gap-6">
                <div className="h-24 w-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center">
                  <Mail className="h-10 w-10 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-slate-900">لا توجد رسائل</p>
                  <p className="text-sm font-medium text-slate-400 mt-1">صندوق الوارد الخاص بك فارغ حالياً</p>
                </div>
              </div>
            ) : (
              groupedMessages.map((message, idx) => {
                const isSender = message.sender_id === currentUser?.id;
                const otherUser = isSender ? message.receiver : message.sender;
                
                // Handle potential array responses from Supabase for relations
                const section = Array.isArray(message.section) ? message.section[0] : message.section;
                const classes = section ? (Array.isArray(section.classes) ? section.classes[0] : section.classes) : null;
                
                const displayName = message.section_id 
                  ? `رسالة جماعية: ${classes?.name || ''} - ${section?.name || ''}`
                  : (otherUser?.full_name || 'مستخدم غير معروف');

                return (
                  <motion.div 
                    key={message.convId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setActiveThread(message);
                      fetchThread(message.convId);
                    }}
                    className={`p-6 hover:bg-slate-50/80 cursor-pointer transition-all relative group ${!message.is_read && !isSender ? 'bg-indigo-50/20' : ''}`}
                  >
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0 relative">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center text-indigo-600 font-black text-lg border border-indigo-100 shadow-sm group-hover:scale-110 transition-transform">
                          {isSender ? (message.receiver?.full_name?.charAt(0) || '؟') : (message.sender?.full_name?.charAt(0) || '؟')}
                        </div>
                        {!message.is_read && !isSender && (
                          <div className="absolute -top-1 -left-1 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full shadow-sm" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-3">
                            <p className={`text-sm font-black ${!message.is_read && !isSender ? 'text-slate-900' : 'text-slate-700'}`}>
                              {displayName}
                              {message.msgCount > 1 && <span className="text-xs text-slate-400 mr-2">({message.msgCount} رسائل)</span>}
                            </p>
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {isSender ? 'أنت' : (message.sender?.role === 'admin' ? 'إدارة' : message.sender?.role === 'teacher' ? 'معلم' : 'طالب')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Clock className="h-3 w-3" />
                            {new Date(message.created_at).toLocaleDateString('ar-EG')}
                          </div>
                        </div>
                        <p className={`text-base mb-2 ${!message.is_read && !isSender ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                          {message.subject || 'بدون عنوان'}
                        </p>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                      <div className="flex-shrink-0 self-center flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(message.allIds);
                          }}
                          className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        ) : (
          /* Announcements List */
          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredAnnouncements.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center h-[400px] gap-6">
                <div className="h-24 w-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center">
                  <Bell className="h-10 w-10 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-slate-900">لا توجد إعلانات</p>
                  <p className="text-sm font-medium text-slate-400 mt-1">لم يتم نشر أي إعلانات في هذه الفئة</p>
                </div>
              </div>
            ) : (
              filteredAnnouncements.map((announcement, idx) => (
                <motion.div 
                  key={announcement.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600">
                        <Megaphone className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors">{announcement.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {new Date(announcement.created_at).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700 uppercase tracking-widest border border-emerald-200 shadow-sm">
                      {announcement.target_role === 'student' ? 'للطلاب' : 
                       announcement.target_role === 'teacher' ? 'للمعلمين' : 
                       announcement.target_role === 'parent' ? 'لأولياء الأمور' : 'للجميع'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-8 whitespace-pre-line relative z-10 font-medium">
                    {announcement.content}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-200/60 pt-6 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                      <span>{announcement.author?.full_name || 'الإدارة'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(announcement.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* Thread Modal */}
      <AnimatePresence>
        {activeThread && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={() => setActiveThread(null)}
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-white"
              >
                <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                        {activeThread.subject}
                      </h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">
                        {activeThread.section_id 
                          ? `رسالة جماعية: ${activeThread.section?.classes?.name || ''} - ${activeThread.section?.name || ''}`
                          : `مع: ${activeThread.sender_id === currentUser?.id ? activeThread.receiver?.full_name : activeThread.sender?.full_name}`}
                      </p>
                    </div>
                    <button onClick={() => setActiveThread(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-6 max-h-[500px] overflow-y-auto mb-8 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                    {threadMessages.map(msg => {
                      const isMe = msg.sender_id === currentUser?.id;
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                        >
                          <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm relative ${
                            isMe ? 'bg-indigo-600 text-white rounded-tl-none' : 'bg-white text-slate-900 rounded-tr-none border border-slate-100'
                          }`}>
                            <div className="flex items-center justify-between gap-4 mb-1">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                {isMe ? 'أنت' : (msg.sender?.full_name || 'مستخدم')}
                              </p>
                              <p className="text-[9px] opacity-50">
                                {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {editingMessage?.id === msg.id ? (
                              <div className="space-y-2">
                                <textarea 
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full text-sm rounded-lg border-0 bg-white/10 text-white placeholder:text-white/50 focus:ring-1 focus:ring-white"
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingMessage(null)} className="text-[10px] hover:underline">إلغاء</button>
                                  <button onClick={handleUpdateMessage} className="text-[10px] font-bold hover:underline">حفظ</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            )}
                            
                            {isMe && !editingMessage && (
                              <div className={`absolute top-0 ${isMe ? '-right-12' : '-left-12'} flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <button 
                                  onClick={() => {
                                    setEditingMessage(msg);
                                    setEditContent(msg.content);
                                  }}
                                  className="p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"
                                  title="تعديل"
                                >
                                  <Plus className="h-3 w-3 rotate-45" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteMessage([msg.id])}
                                  className="p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-red-600"
                                  title="حذف"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input 
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="اكتب رداً..."
                      className="flex-1 rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={isReplying}
                      className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-all"
                    >
                      {isReplying ? 'جاري الإرسال...' : 'إرسال'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessage && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={() => setShowNewMessage(false)}
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-white"
              >
                <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        {step === 1 ? <UserPlus className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                          {step === 1 ? 'اختر نوع المستلم' : 'إنشاء رسالة جديدة'}
                        </h3>
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">
                          الخطوة {step} من {recipientType === 'student' && currentUser?.role === 'teacher' ? '3' : '2'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => { setShowNewMessage(false); resetMessageForm(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-8">
                    {step === 1 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <button
                          onClick={() => {
                            setRecipientType('teacher');
                            setStep(2);
                          }}
                          className="flex flex-col items-center justify-center p-10 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all group"
                        >
                          <div className="h-20 w-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                            <User className="h-10 w-10" />
                          </div>
                          <span className="text-xl font-black text-slate-900">معلم / إدارة</span>
                          <p className="text-sm text-slate-500 font-medium mt-2">مراسلة المعلمين أو الإدارة</p>
                        </button>
                        {currentUser?.role !== 'student' && (
                          <button
                            onClick={() => {
                              setRecipientType('student');
                              setStep(2);
                            }}
                            className="flex flex-col items-center justify-center p-10 rounded-[2.5rem] border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/50 transition-all group"
                          >
                            <div className="h-20 w-20 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                              <Users className="h-10 w-10" />
                            </div>
                            <span className="text-xl font-black text-slate-900">طالب</span>
                            <p className="text-sm text-slate-500 font-medium mt-2">مراسلة الطلاب في صفوفك</p>
                          </button>
                        )}
                      </div>
                    )}

                    {step === 2 && recipientType === 'student' && currentUser?.role === 'teacher' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-4 mb-4">
                          <button onClick={() => setStep(1)} className="text-indigo-600 font-black text-sm flex items-center gap-1 hover:underline">
                            <ArrowRight className="h-4 w-4" /> العودة
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <button
                            onClick={() => {
                              setIsGroupMessage(true);
                              setStep(3);
                            }}
                            className="flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all group"
                          >
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                              <Users className="h-8 w-8" />
                            </div>
                            <span className="text-lg font-black text-slate-900">رسالة جماعية</span>
                            <p className="text-xs text-slate-500 font-medium mt-1">إرسال لجميع طلاب الصف</p>
                          </button>
                          <button
                            onClick={() => {
                              setIsGroupMessage(false);
                              setStep(3);
                            }}
                            className="flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/50 transition-all group"
                          >
                            <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                              <User className="h-8 w-8" />
                            </div>
                            <span className="text-lg font-black text-slate-900">رسالة فردية</span>
                            <p className="text-xs text-slate-500 font-medium mt-1">إرسال لطالب محدد</p>
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 3 && recipientType === 'student' && currentUser?.role === 'teacher' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                          <button onClick={() => setStep(2)} className="text-indigo-600 font-black text-sm flex items-center gap-1 hover:underline">
                            <ArrowRight className="h-4 w-4" /> العودة
                          </button>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            {isGroupMessage ? 'اختر الصف للمراسلة الجماعية' : 'اختر الصف للبحث عن الطالب'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {teacherSections.map((section: any) => (
                            <button
                              key={section.id}
                              onClick={() => {
                                setSelectedSectionId(section.id);
                                setStep(4);
                              }}
                              className="flex items-center gap-4 p-6 rounded-3xl border border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-right"
                            >
                              <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 shrink-0">
                                <Users className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900">{section.classes?.name}</p>
                                <p className="text-xs text-slate-500 font-bold">{section.name}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        {teacherSections.length === 0 && (
                          <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-500 font-bold">لا توجد صفوف مسندة إليك حالياً</p>
                          </div>
                        )}
                      </div>
                    )}

                    {((step === 2 && (recipientType === 'teacher' || (recipientType === 'student' && currentUser?.role !== 'teacher'))) || step === 4) && (
                      <form id="new-message-form" onSubmit={handleSendMessage} className="space-y-8">
                        <div className="flex items-center justify-between mb-4">
                          <button 
                            type="button"
                            onClick={() => setStep(recipientType === 'student' && currentUser?.role === 'teacher' ? 3 : 1)} 
                            className="text-indigo-600 font-black text-sm flex items-center gap-1 hover:underline"
                          >
                            <ArrowRight className="h-4 w-4" /> العودة
                          </button>
                          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {recipientType === 'teacher' ? 'مراسلة معلم' : isGroupMessage ? 'رسالة جماعية للصف' : 'مراسلة طالب'}
                          </div>
                        </div>

                        {!isGroupMessage && (
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">المستلم</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                <UserPlus className="h-4 w-4 text-slate-400" />
                              </div>
                              <select 
                                required
                                value={newMessage.receiver_id}
                                onChange={(e) => setNewMessage({...newMessage, receiver_id: e.target.value})}
                                className="block w-full rounded-2xl border-0 py-4 pr-11 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold appearance-none"
                              >
                                <option value="">اختر المستلم من القائمة...</option>
                                {getFilteredRecipients().map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.full_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">موضوع الرسالة</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                              <Filter className="h-4 w-4 text-slate-400" />
                            </div>
                            <input 
                              type="text" 
                              required
                              value={newMessage.subject}
                              onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                              className="block w-full rounded-2xl border-0 py-4 pr-11 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold" 
                              placeholder="أدخل عنواناً مختصراً للرسالة..."
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">محتوى الرسالة</label>
                          <textarea 
                            rows={6} 
                            required
                            value={newMessage.content}
                            onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                            className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold resize-none"
                            placeholder="اكتب رسالتك هنا بالتفصيل..."
                          ></textarea>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
                {((step === 2 && (recipientType === 'teacher' || (recipientType === 'student' && currentUser?.role !== 'teacher'))) || step === 4) && (
                  <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                    <button
                      type="submit"
                      form="new-message-form"
                      disabled={isSubmitting}
                      className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 sm:w-auto disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 ml-2" />
                      {isSubmitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                      onClick={() => { setShowNewMessage(false); resetMessageForm(); }}
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* New Announcement Modal */}
      <AnimatePresence>
        {showNewAnnouncement && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={() => setShowNewAnnouncement(false)}
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-white"
              >
                <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Megaphone className="h-6 w-6" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">نشر إعلان جديد</h3>
                    </div>
                    <button onClick={() => setShowNewAnnouncement(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <form id="new-announcement-form" onSubmit={handleSendAnnouncement} className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">عنوان الإعلان</label>
                      <input 
                        type="text" 
                        required
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm transition-all font-bold" 
                        placeholder="أدخل عنواناً جذاباً للإعلان..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الفئة المستهدفة</label>
                      <select 
                        required
                        value={newAnnouncement.target_role}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, target_role: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm transition-all font-bold appearance-none"
                      >
                        <option value="all">الجميع (طلاب، معلمين، أولياء أمور)</option>
                        <option value="student">الطلاب فقط</option>
                        <option value="teacher">المعلمين فقط</option>
                        <option value="parent">أولياء الأمور فقط</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">نص الإعلان</label>
                      <textarea 
                        rows={6} 
                        required
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm transition-all font-bold resize-none"
                        placeholder="اكتب تفاصيل الإعلان هنا..."
                      ></textarea>
                    </div>
                  </form>
                </div>
                <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                  <button
                    type="submit"
                    form="new-announcement-form"
                    disabled={isSubmitting}
                    className="inline-flex w-full justify-center rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 sm:w-auto disabled:opacity-50"
                  >
                    <Megaphone className="w-4 h-4 ml-2" />
                    {isSubmitting ? 'جاري النشر...' : 'نشر الإعلان الآن'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                    onClick={() => setShowNewAnnouncement(false)}
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
