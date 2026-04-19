/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Plus, Search, Send, User, Clock, X, UserPlus, Users, Trash2, ArrowRight, Mail, Check, CheckCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { useMessagesSystem } from '@/hooks/useMessagesSystem';
import { supabase } from '@/lib/supabase'; 
import ForumEditor from '@/components/ForumEditor';
import { cn } from '@/lib/utils';

const RenderAvatar = ({ user, size = 'h-12 w-12', isGroup = false }: { user?: any, size?: string, isGroup?: boolean }) => {
  if (isGroup) {
    return (
      <div className={`${size} rounded-[1.25rem] sm:rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner border border-indigo-500/30 shrink-0`}>
        <Users className="h-1/2 w-1/2 drop-shadow-md" />
      </div>
    );
  }

  const url = user?.avatar_url;
  const name = user?.full_name || 'مستخدم';
  const initial = name.charAt(0);

  if (url) {
    return (
      <div className={`${size} rounded-[1.25rem] sm:rounded-2xl overflow-hidden shadow-inner border border-white/10 shrink-0 relative bg-[#02040a]`}>
        <img src={url} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${size} rounded-[1.25rem] sm:rounded-2xl bg-[#02040a] flex items-center justify-center text-indigo-400 font-black shadow-inner border border-white/5 shrink-0`}>
      <span className="drop-shadow-md">{initial}</span>
    </div>
  );
};

export default function MessagesPage() {
  const { user: currentUser, authRole, userRole, isChecking } = useAuth() as any;
  const role = authRole || userRole;
  
  const {
    messages,
    users,
    teacherSections,
    loading,
    error,
    fetchMessages,
    fetchStudentsBySection,
    sendMessage: hookSendMessage,
    sendGroupMessage: hookSendGroupMessage,
    markAsRead: hookMarkAsRead,
    deleteMessages: hookDeleteMessages,
  } = useMessagesSystem();

  const [groupedMessages, setGroupedMessages] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  
  // 🚀 دمج المحرر الذكي هنا
  const [replyContent, setReplyContent] = useState('');
  
  const [isReplying, setIsReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState<'teacher' | 'student' | ''>('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newMessage, setNewMessage] = useState({ receiver_id: '', subject: '', content: '' });
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!currentUser || isChecking || fetchedRef.current) return;
    fetchedRef.current = true;

    const channel = supabase
      .channel('realtime_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, isChecking, fetchMessages]);

  useEffect(() => {
    if (activeThread && messages.length > 0) {
      fetchThread(activeThread.convId);
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  useEffect(() => {
    if (!messages.length || !currentUser) {
      setGroupedMessages([]);
      return;
    }

    const conversations = messages.reduce((acc: any, msg: any) => {
      let convId;
      if (msg.section_id) {
        convId = `group-${msg.section_id}`;
      } else {
        const ids = [msg.sender_id, msg.receiver_id].sort();
        convId = `private-${ids.join('-')}`;
      }

      const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
      const receiver = Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver;
      const section = Array.isArray(msg.section) ? msg.section[0] : msg.section;

      const cleanMsg = { ...msg, sender, receiver, section };

      if (!acc[convId]) {
        acc[convId] = { ...cleanMsg, allIds: [msg.id], msgCount: 1, convId };
      } else {
        if (new Date(msg.created_at || 0) > new Date(acc[convId].created_at || 0)) {
          const allIds = [...acc[convId].allIds, msg.id];
          const msgCount = acc[convId].msgCount + 1;
          acc[convId] = { ...cleanMsg, allIds, msgCount, convId };
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
    try { await hookMarkAsRead(messageIds); } catch (e) {}
  };

  const fetchThread = (convId: string) => {
    let thread = messages.filter((msg: any) => {
      if (msg.section_id) return `group-${msg.section_id}` === convId;
      const ids = [msg.sender_id, msg.receiver_id].sort();
      return `private-${ids.join('-')}` === convId;
    }).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    
    const cleanThread = thread.map((msg: any) => ({
       ...msg,
       sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
       receiver: Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver,
    }));

    if (convId.startsWith('group-')) {
      const uniqueMessages = [];
      const seenContents = new Set();
      for (const msg of cleanThread) {
        if (msg.sender_id === currentUser?.id) {
          const date = new Date(msg.created_at || 0);
          const timeKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
          const key = `${msg.content}-${msg.subject}-${timeKey}`;
          if (!seenContents.has(key)) { seenContents.add(key); uniqueMessages.push(msg); }
        } else {
          uniqueMessages.push(msg);
        }
      }
      setThreadMessages(uniqueMessages);
    } else {
      setThreadMessages(cleanThread);
    }

    const unreadIds = cleanThread.filter((msg: any) => !msg.is_read && msg.sender_id !== currentUser?.id).map((msg: any) => msg.id);
    if (unreadIds.length > 0) markAsRead(unreadIds);
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // التحقق من أن المحتوى ليس فارغاً (بما في ذلك التاجات الفارغة)
    const strippedContent = replyContent.replace(/<[^>]*>?/gm, '').trim();
    if (!strippedContent || !activeThread || !currentUser) return;
    
    setIsReplying(true);
    try {
      const isGroup = !!activeThread.section_id;
      if (isGroup && role === 'teacher') {
        await hookSendGroupMessage(activeThread.section_id, activeThread.subject, replyContent);
      } else {
        const receiverId = isGroup ? activeThread.sender_id : (activeThread.sender_id === currentUser.id ? activeThread.receiver_id : activeThread.sender_id);
        await hookSendMessage(receiverId, activeThread.subject, replyContent);
      }
      setReplyContent('');
      fetchMessages(); 
    } catch (error: any) { alert(error.message); } 
    finally { setIsReplying(false); setTimeout(scrollToBottom, 100); }
  };

  const handleDeleteMessage = async (messageIds: string[]) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة بالكامل؟')) return;
    try {
      await hookDeleteMessages(messageIds);
      if (activeThread && messageIds.some(id => activeThread.allIds.includes(id))) setActiveThread(null);
      fetchMessages();
    } catch (error: any) { alert('حدث خطأ أثناء الحذف'); }
  };

  const getFilteredRecipients = () => {
    if (!recipientType) return [];
    if (recipientType === 'teacher') return users.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'management');
    if (recipientType === 'student') return role === 'teacher' ? filteredStudents : users.filter(u => u.role === 'student');
    return [];
  };

  useEffect(() => {
    if (recipientType === 'student' && selectedSectionId) {
      fetchStudentsBySection(selectedSectionId).then(setFilteredStudents);
    } else {
      setFilteredStudents([]);
    }
  }, [recipientType, selectedSectionId, fetchStudentsBySection]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGroupMessage && !selectedSectionId) return alert('الرجاء اختيار الصف');
    if (!isGroupMessage && !newMessage.receiver_id) return alert('الرجاء اختيار المستلم');
    
    const strippedContent = newMessage.content.replace(/<[^>]*>?/gm, '').trim();
    if (!newMessage.subject || !strippedContent) return alert('الرجاء تعبئة جميع الحقول');

    setIsSubmitting(true);
    try {
      if (isGroupMessage) await hookSendGroupMessage(selectedSectionId, newMessage.subject, newMessage.content);
      else await hookSendMessage(newMessage.receiver_id, newMessage.subject, newMessage.content);
      setShowNewMessage(false);
      setNewMessage({ receiver_id: '', subject: '', content: '' }); setStep(1); setRecipientType(''); setIsGroupMessage(false);
      fetchMessages();
    } catch (error: any) { alert(error.message); } 
    finally { setIsSubmitting(false); }
  };

  const filteredMessages = groupedMessages.filter((m: any) => {
    const s = searchTerm.toLowerCase();
    return m.subject?.toLowerCase().includes(s) || m.sender?.full_name?.toLowerCase().includes(s) || m.receiver?.full_name?.toLowerCase().includes(s);
  });

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'اليوم';
    if (date.toDateString() === yesterday.toDateString()) return 'أمس';
    return date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  let lastDateLabel = '';

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تأمين الاتصال وصندوق الرسائل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)] max-w-[1600px] mx-auto pb-4 font-cairo text-slate-200 relative overflow-hidden" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية المضيئة المريحة للعين */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 🚀 Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 lg:mb-6 px-4 lg:px-8 relative z-10 pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">صندوق الرسائل</h1>
          <p className="text-slate-400 mt-1 sm:mt-2 font-bold text-xs sm:text-sm">التواصل السريع، الآمن، واللحظي ⚡</p>
        </div>
        <button 
          onClick={() => setShowNewMessage(true)}
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-95 border border-indigo-400/50 shrink-0"
        >
          <Plus className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          محادثة جديدة
        </button>
      </div>

      {/* 🚀 Dual-Pane Architecture (Royal Glass Theme) */}
      <div className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-1 min-h-0 mx-4 lg:mx-8 relative z-10 bg-[#0f1423]/60">
        
        {/* Left Pane (Conversations List) */}
        <div className={cn("w-full lg:w-[350px] xl:w-[400px] flex-shrink-0 flex flex-col border-l border-white/5 bg-[#02040a]/40 transition-all duration-300", activeThread ? 'hidden lg:flex' : 'flex')}>
           <div className="p-4 lg:p-6 border-b border-white/5 bg-[#02040a]/40 backdrop-blur-xl z-10 shrink-0">
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="text"
                  className="w-full rounded-xl sm:rounded-2xl border border-white/5 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-[#0f1423]/80 shadow-inner focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-xs sm:text-sm font-bold transition-all outline-none placeholder:text-slate-500"
                  placeholder="ابحث في المحادثات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 sm:gap-4 text-indigo-500">
                  <Loader2 className="animate-spin h-8 w-8 sm:h-10 sm:w-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">جاري التحميل...</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 sm:gap-3">
                  <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 opacity-50 drop-shadow-md" />
                  <span className="text-xs sm:text-sm font-bold">لا توجد محادثات</span>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSender = msg.sender_id === currentUser?.id;
                  const otherUser = isSender ? msg.receiver : msg.sender;
                  const isGroup = !!msg.section_id;
                  
                  const classes = Array.isArray(msg.section?.classes) ? msg.section.classes[0] : msg.section?.classes;
                  const displayName = isGroup ? `${classes?.name || ''} - ${msg.section?.name || ''}` : (otherUser?.full_name || 'مستخدم');
                  const isActive = activeThread?.convId === msg.convId;
                  
                  // Extract raw text from HTML content for the preview
                  const rawPreview = (msg.subject || msg.content || '').replace(/<[^>]*>?/gm, '').substring(0, 40) + '...';

                  return (
                    <button
                      key={msg.convId}
                      onClick={() => { setActiveThread(msg); fetchThread(msg.convId); }}
                      className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all text-right group border ${isActive ? 'bg-indigo-600/20 text-white border-indigo-500/30 shadow-inner' : !msg.is_read && !isSender ? 'bg-[#0f1423] border-indigo-500/20 shadow-inner' : 'hover:bg-[#0f1423]/60 border-transparent hover:border-white/5'}`}
                    >
                      <div className="relative shrink-0">
                        <RenderAvatar user={otherUser} isGroup={isGroup} size="h-10 w-10 sm:h-12 sm:w-12" />
                        {!msg.is_read && !isSender && <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 border-2 border-[#0f1423] rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <h4 className={`text-xs sm:text-sm font-black truncate pr-1 sm:pr-2 drop-shadow-sm ${isActive ? 'text-indigo-400' : 'text-white'}`}>{displayName}</h4>
                          <span className={`text-[9px] sm:text-[10px] font-bold shrink-0 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`}>
                             {new Date(msg.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className={`text-[10px] sm:text-xs truncate pr-1 sm:pr-2 ${isActive ? 'text-indigo-200' : !msg.is_read && !isSender ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}`}>
                          {rawPreview}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
           </div>
        </div>

        {/* Right Pane (Active Chat Thread) */}
        <div className={`flex-1 flex flex-col bg-transparent relative ${!activeThread ? 'hidden lg:flex items-center justify-center' : 'flex min-h-0'}`}>
           {!activeThread ? (
             <div className="text-center flex flex-col items-center">
               <div className="h-24 w-24 sm:h-32 sm:w-32 bg-[#02040a]/60 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mb-5 sm:mb-6 shadow-inner border border-white/5">
                 <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600 drop-shadow-md" />
               </div>
               <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-sm">مرحباً بك في المحادثات</h3>
               <p className="text-slate-400 font-bold mt-2 text-sm sm:text-base">اختر محادثة من القائمة أو ابدأ محادثة جديدة.</p>
             </div>
           ) : (
             <>
               {/* Chat Header */}
               <div className="h-16 sm:h-20 border-b border-white/5 bg-[#0f1423]/90 backdrop-blur-2xl px-4 lg:px-6 flex items-center justify-between z-20 shrink-0">
                 <div className="flex items-center gap-3 lg:gap-4 min-w-0 pr-1">
                   <button onClick={() => setActiveThread(null)} className="lg:hidden p-2 bg-[#02040a] border border-white/5 shadow-inner rounded-xl text-slate-400 hover:text-indigo-400 active:scale-95 transition-all shrink-0">
                     <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                   </button>
                   
                   {(() => {
                     const isSender = activeThread.sender_id === currentUser?.id;
                     const otherUser = isSender ? activeThread.receiver : activeThread.sender;
                     const isGroup = !!activeThread.section_id;
                     const classes = Array.isArray(activeThread.section?.classes) ? activeThread.section.classes[0] : activeThread.section?.classes;
                     const displayName = isGroup ? `رسالة جماعية: ${classes?.name || ''} - ${activeThread.section?.name || ''}` : (otherUser?.full_name || 'مستخدم');
                     
                     return (
                       <>
                         <RenderAvatar user={otherUser} isGroup={isGroup} size="h-10 w-10 sm:h-12 sm:w-12" />
                         <div className="min-w-0">
                           <h3 className="text-sm lg:text-base font-black text-white leading-tight truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[400px] drop-shadow-sm">{displayName}</h3>
                           <p className="text-[9px] sm:text-[10px] lg:text-xs text-indigo-400 font-bold mt-0.5 sm:mt-1 truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[400px]">{activeThread.subject}</p>
                         </div>
                       </>
                     );
                   })()}
                 </div>
                 <button onClick={() => handleDeleteMessage(activeThread.allIds)} className="p-2 lg:p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-inner shrink-0 active:scale-95">
                   <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                 </button>
               </div>

               {/* Chat Messages */}
               <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 space-y-4 sm:space-y-6 bg-transparent custom-scrollbar">
                  {threadMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const showAvatar = idx === 0 || threadMessages[idx - 1].sender_id !== msg.sender_id;
                    
                    const currentLabel = formatDateLabel(msg.created_at);
                    const showDateDivider = currentLabel !== lastDateLabel;
                    if (showDateDivider) lastDateLabel = currentLabel;
                    
                    return (
                      <div key={msg.id} className="flex flex-col">
                        {/* 📅 الفاصل الزمني */}
                        {showDateDivider && (
                          <div className="flex justify-center my-4 sm:my-6">
                            <span className="bg-[#02040a]/80 border border-white/5 text-slate-400 text-[9px] sm:text-[10px] font-black px-3 py-1 sm:py-1.5 rounded-full shadow-inner tracking-widest">
                              {currentLabel}
                            </span>
                          </div>
                        )}

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 sm:gap-3 lg:gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          
                          {/* Avatar Column */}
                          <div className="shrink-0 w-8 sm:w-10 flex flex-col items-center">
                            {showAvatar && !isMe && <RenderAvatar user={msg.sender} size="h-8 w-8 sm:h-10 sm:w-10" />}
                          </div>

                          {/* Bubble Column */}
                          <div className={`flex flex-col max-w-[85%] lg:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                            {showAvatar && !isMe && <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 mb-1 ml-2 drop-shadow-sm">{msg.sender?.full_name}</span>}
                            
                            <div className={`p-3 sm:p-4 shadow-inner border relative text-xs sm:text-sm font-bold leading-relaxed sm:leading-loose
                              ${isMe 
                                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-[1.5rem] rounded-tr-sm border-indigo-400/30' 
                                : 'bg-[#0f1423] text-slate-200 border-white/5 rounded-[1.5rem] rounded-tl-sm'}`}
                            >
                              {/* 🚀 Render HTML securely for rich text messages */}
                              <div className="prose prose-invert max-w-none text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: msg.content }} />
                              
                              <div className={`text-[8px] sm:text-[9px] mt-2 flex items-center gap-1.5 ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-500 justify-start'}`}>
                                <span>{new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && (
                                  msg.is_read ? (
                                    <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-300 drop-shadow-sm" />
                                  ) : (
                                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-300/50" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                          
                        </motion.div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} className="h-2" />
               </div>

               {/* Chat Input (Using ForumEditor Compactly) */}
               <div className="bg-[#0f1423]/90 backdrop-blur-2xl border-t border-white/5 shrink-0 pb-safe-bottom">
                 <form onSubmit={handleSendReply} className="flex items-end gap-2 lg:gap-3 p-2 sm:p-3 lg:p-4 transition-all">
                    <div className="flex-1 bg-[#02040a]/60 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-inner overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all p-1">
                       <ForumEditor 
                         content={replyContent} 
                         setContent={setReplyContent} 
                         canUploadImage={true} 
                         placeholder="اكتب ردك هنا (يدعم الصور والمعادلات)..." 
                         minHeight="60px"
                       />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isReplying || !replyContent.replace(/<[^>]*>?/gm, '').trim()}
                      className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-xl sm:rounded-[1.5rem] lg:rounded-[1.8rem] bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/50 mb-1 sm:mb-1.5 active:scale-95"
                    >
                      {isReplying ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5 -ml-1 rtl:ml-0 rtl:-mr-1 rtl:rotate-180" />}
                    </button>
                 </form>
               </div>
             </>
           )}
        </div>
      </div>

      {/* 🚀 New Message Modal (Royal Dark Theme) */}
      <AnimatePresence>
        {showNewMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#02040a]/90 backdrop-blur-md" onClick={() => { setShowNewMessage(false); setStep(1); }} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl bg-[#0f1423] rounded-[2rem] lg:rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden z-10 flex flex-col max-h-[90dvh]" dir="rtl">
              
              <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4 lg:pb-6 border-b border-white/5 bg-[#02040a]/40 flex items-center justify-between shrink-0 relative z-10">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                    <Plus className="h-5 w-5 lg:h-6 lg:w-6 drop-shadow-md" />
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-2xl font-black text-white drop-shadow-sm">إنشاء رسالة جديدة</h3>
                    <p className="text-[10px] lg:text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">الخطوة {step} من {recipientType === 'student' && role === 'teacher' ? '3' : '2'}</p>
                  </div>
                </div>
                <button onClick={() => { setShowNewMessage(false); setStep(1); }} className="p-2 text-slate-400 hover:text-rose-400 bg-[#0f1423] border border-white/5 rounded-xl transition-colors shadow-inner active:scale-90"><X className="h-5 w-5 lg:h-6 lg:w-6" /></button>
              </div>

              <div className="p-6 lg:p-8 overflow-y-auto flex-1 custom-scrollbar relative z-10">
                {step === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <button onClick={() => { setRecipientType('teacher'); setStep(2); }} className="flex flex-col items-center justify-center p-8 lg:p-10 rounded-[1.5rem] lg:rounded-[2rem] border border-white/5 shadow-inner hover:border-indigo-500/50 hover:bg-[#02040a]/60 transition-all group bg-[#02040a]/40 active:scale-95">
                      <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-[1rem] lg:rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 lg:mb-6 group-hover:scale-110 transition-transform shadow-inner"><User className="h-8 w-8 lg:h-10 lg:w-10 drop-shadow-md" /></div>
                      <span className="text-lg lg:text-xl font-black text-white drop-shadow-sm">معلم / إدارة</span>
                      <p className="text-xs lg:text-sm text-slate-400 font-bold mt-2">مراسلة زملاء العمل أو الإدارة</p>
                    </button>
                    {role !== 'student' && (
                      <button onClick={() => { setRecipientType('student'); setStep(2); }} className="flex flex-col items-center justify-center p-8 lg:p-10 rounded-[1.5rem] lg:rounded-[2rem] border border-white/5 shadow-inner hover:border-emerald-500/50 hover:bg-[#02040a]/60 transition-all group bg-[#02040a]/40 active:scale-95">
                        <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-[1rem] lg:rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 lg:mb-6 group-hover:scale-110 transition-transform shadow-inner"><Users className="h-8 w-8 lg:h-10 lg:w-10 drop-shadow-md" /></div>
                        <span className="text-lg lg:text-xl font-black text-white drop-shadow-sm">طالب / فصل</span>
                        <p className="text-xs lg:text-sm text-slate-400 font-bold mt-2">مراسلة الطلاب في صفوفك</p>
                      </button>
                    )}
                  </div>
                )}

                {step === 2 && recipientType === 'student' && role === 'teacher' && (
                  <div className="space-y-6">
                    <button onClick={() => setStep(1)} className="text-indigo-400 font-black text-sm flex items-center gap-1.5 hover:text-indigo-300 transition-colors w-fit"><ArrowRight className="h-4 w-4" /> العودة للتصنيف</button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                      <button onClick={() => { setIsGroupMessage(true); setStep(3); }} className="flex flex-col items-center justify-center p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] border border-white/5 shadow-inner hover:border-indigo-500/50 hover:bg-[#02040a]/60 transition-all group bg-[#02040a]/40 active:scale-95">
                        <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-[1rem] lg:rounded-[1.25rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform shadow-inner"><Users className="h-7 w-7 lg:h-8 lg:w-8 drop-shadow-md" /></div>
                        <span className="text-base lg:text-lg font-black text-white drop-shadow-sm">رسالة جماعية لفصل</span>
                        <p className="text-[10px] lg:text-xs text-slate-400 font-bold mt-1">إرسال لجميع طلاب الصف دفعة واحدة</p>
                      </button>
                      <button onClick={() => { setIsGroupMessage(false); setStep(3); }} className="flex flex-col items-center justify-center p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] border border-white/5 shadow-inner hover:border-emerald-500/50 hover:bg-[#02040a]/60 transition-all group bg-[#02040a]/40 active:scale-95">
                        <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-[1rem] lg:rounded-[1.25rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform shadow-inner"><User className="h-7 w-7 lg:h-8 lg:w-8 drop-shadow-md" /></div>
                        <span className="text-base lg:text-lg font-black text-white drop-shadow-sm">رسالة فردية لطالب</span>
                        <p className="text-[10px] lg:text-xs text-slate-400 font-bold mt-1">اختيار طالب محدد لمراسلته سرياً</p>
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && recipientType === 'student' && role === 'teacher' && (
                  <div className="space-y-6">
                    <button onClick={() => setStep(2)} className="text-indigo-400 font-black text-sm flex items-center gap-1.5 hover:text-indigo-300 transition-colors w-fit"><ArrowRight className="h-4 w-4" /> العودة لطريقة الإرسال</button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {teacherSections.map((section: any) => (
                        <button key={section.id} onClick={() => { setSelectedSectionId(section.id); setStep(4); }} className="flex items-center gap-4 p-4 lg:p-5 rounded-[1.25rem] lg:rounded-[1.5rem] border border-white/5 shadow-inner hover:border-indigo-500/50 hover:bg-[#02040a]/80 transition-all text-right bg-[#02040a]/40 active:scale-95 group">
                          <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform shadow-inner"><Users className="h-5 w-5 lg:h-6 lg:w-6" /></div>
                          <div>
                            <p className="font-black text-sm lg:text-base text-white drop-shadow-sm">{section.classes?.name}</p>
                            <p className="text-[10px] lg:text-xs text-slate-400 font-bold mt-0.5">{section.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {((step === 2 && (recipientType === 'teacher' || (recipientType === 'student' && role !== 'teacher'))) || step === 4) && (
                  <form id="new-message-form" onSubmit={handleSendMessage} className="space-y-5 lg:space-y-6">
                    <button type="button" onClick={() => setStep(recipientType === 'student' && role === 'teacher' ? 3 : 1)} className="text-indigo-400 font-black text-sm flex items-center gap-1.5 hover:text-indigo-300 transition-colors w-fit mb-2"><ArrowRight className="h-4 w-4" /> العودة للاختيار</button>
                    
                    {!isGroupMessage && (
                      <div className="space-y-2 lg:space-y-3 bg-[#02040a]/40 p-4 sm:p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                        <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">المستلم</label>
                        <select required value={newMessage.receiver_id} onChange={(e) => setNewMessage({...newMessage, receiver_id: e.target.value})} className="block w-full rounded-xl lg:rounded-2xl border border-white/5 py-3.5 lg:py-4 px-4 text-white bg-[#0f1423] focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-xs lg:text-sm font-bold outline-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423]">
                          <option value="">اختر المستلم...</option>
                          {getFilteredRecipients().map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                      </div>
                    )}
                    
                    <div className="space-y-2 lg:space-y-3 bg-[#02040a]/40 p-4 sm:p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                      <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">موضوع الرسالة</label>
                      <input type="text" required value={newMessage.subject} onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})} placeholder="أدخل عنواناً مختصراً..." className="block w-full rounded-xl lg:rounded-2xl border border-white/5 py-3.5 lg:py-4 px-4 text-white bg-[#0f1423] focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-xs lg:text-sm font-bold outline-none shadow-inner placeholder:text-slate-600" />
                    </div>
                    
                    <div className="space-y-2 lg:space-y-3 bg-[#02040a]/40 p-4 sm:p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                      <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">محتوى الرسالة (محرر متقدم)</label>
                      <div className="bg-[#0f1423] rounded-2xl border border-white/5 overflow-hidden shadow-inner p-1">
                        <ForumEditor 
                           content={newMessage.content} 
                           setContent={(val) => setNewMessage({...newMessage, content: val})} 
                           canUploadImage={true} 
                           placeholder="اكتب رسالتك وتفاصيلها هنا..." 
                           minHeight="150px"
                        />
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {((step === 2 && (recipientType === 'teacher' || (recipientType === 'student' && role !== 'teacher'))) || step === 4) && (
                <div className="p-4 lg:p-6 bg-[#02040a]/60 border-t border-white/5 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0 pb-safe-bottom relative z-10">
                  <button type="submit" form="new-message-form" disabled={isSubmitting} className="w-full sm:w-auto px-6 lg:px-8 py-3.5 lg:py-4 rounded-xl lg:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 border border-indigo-400/50 text-white font-black hover:opacity-90 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm lg:text-base active:scale-95">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Send className="w-4 h-4 lg:w-5 lg:h-5 -ml-1 rtl:ml-0 rtl:-mr-1 rtl:rotate-180" /> إرسال الرسالة</>}
                  </button>
                  <button type="button" onClick={() => { setShowNewMessage(false); setStep(1); }} className="w-full sm:w-auto px-6 lg:px-8 py-3.5 lg:py-4 rounded-xl lg:rounded-2xl bg-[#0f1423] border border-white/5 text-slate-300 font-black hover:bg-white/5 transition-all text-xs sm:text-sm lg:text-base active:scale-95 shadow-inner">إلغاء الأمر</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
