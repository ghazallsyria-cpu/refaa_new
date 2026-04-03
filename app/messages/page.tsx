/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Plus, Search, Send, User, Clock, X, UserPlus, Users, Trash2, ArrowRight, Mail, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { useMessagesSystem } from '@/hooks/useMessagesSystem';
import { supabase } from '@/lib/supabase'; // 🚀 نحتاجه لمحرك المزامنة اللحظية

// 🚀 دالة ذكية لعرض الصورة الشخصية أو الحرف الأول
const RenderAvatar = ({ user, size = 'h-12 w-12', isGroup = false }: { user?: any, size?: string, isGroup?: boolean }) => {
  if (isGroup) {
    return (
      <div className={`${size} rounded-[1.25rem] bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 shadow-sm border border-white shrink-0`}>
        <Users className="h-1/2 w-1/2" />
      </div>
    );
  }

  const url = user?.avatar_url;
  const name = user?.full_name || 'مستخدم';
  const initial = name.charAt(0);

  if (url) {
    return (
      <div className={`${size} rounded-[1.25rem] overflow-hidden shadow-sm border border-slate-100 shrink-0 relative bg-slate-50`}>
        <img src={url} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${size} rounded-[1.25rem] bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center text-indigo-600 font-black shadow-sm border border-slate-200 shrink-0`}>
      {initial}
    </div>
  );
};

export default function MessagesPage() {
  const { user: currentUser, authRole, userRole } = useAuth() as any;
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
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // مسار إنشاء رسالة جديدة
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState<'teacher' | 'student' | ''>('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newMessage, setNewMessage] = useState({ receiver_id: '', subject: '', content: '' });
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // 🚀 السحر الأول: محرك المزامنة اللحظية (Real-time Sync)
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;

    // فتح قناة استماع مباشرة مع قاعدة البيانات لجدول الرسائل
    const channel = supabase
      .channel('realtime_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' }, // استماع للإضافة والتحديث والحذف
        (payload) => {
          // جلب الرسائل من جديد بصمت في الخلفية لتحديث الواجهة فوراً
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]); // لا نضع fetchMessages لتجنب التحديث اللانهائي

  // ==========================================
  // 🚀 تحديث المحادثة المفتوحة تلقائياً عند وصول رسائل
  // ==========================================
  useEffect(() => {
    if (activeThread && messages.length > 0) {
      fetchThread(activeThread.convId);
    }
  }, [messages]); // كلما تغيرت الرسائل من المزامنة، يتم تحديث المحادثة المعروضة!

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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeThread || !currentUser) return;
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
      // المزامنة اللحظية ستتكفل بالباقي، لكن استدعاء الجلب هنا يسرّع العرض للمرسل
      fetchMessages(); 
    } catch (error: any) { alert(error.message); } 
    finally { setIsReplying(false); setTimeout(scrollToBottom, 100); }
  };

  const handleDeleteMessage = async (messageIds: string[]) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;
    try {
      await hookDeleteMessages(messageIds);
      if (activeThread && messageIds.some(id => activeThread.allIds.includes(id))) setActiveThread(null);
      fetchMessages();
    } catch (error: any) { alert('حدث خطأ أثناء حذف الرسالة'); }
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
    if (!newMessage.subject || !newMessage.content) return alert('الرجاء تعبئة جميع الحقول');

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

  // 📅 دالة لتنسيق التاريخ بشكل ذكي للفواصل الزمنية
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

  return (
    // 🚀 السحر الثاني: جعل التصميم المرن يعتمد على dvh ليمنع الفوتر من تغطية المحتوى
    <div className="flex flex-col h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)] max-w-[1600px] mx-auto pb-4" dir="rtl">
      
      {/* 🚀 Header: جعلناه Shrink-0 لكي لا ينضغط أبداً */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 lg:mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">صندوق الرسائل</h1>
          <p className="text-slate-500 mt-1 font-medium">التواصل السريع والمباشر (مزامنة فورية ⚡)</p>
        </div>
        <button 
          onClick={() => setShowNewMessage(true)}
          className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 shrink-0"
        >
          <Plus className="ml-2 h-5 w-5" />
          محادثة جديدة
        </button>
      </div>

      {/* 🚀 Masterpiece Dual-Pane Architecture (Fixed for Mobile) */}
      {/* flex-1 و min-h-0 تجبر الحاوية على احترام المساحة المتبقية فقط دون دفع الفوتر! */}
      <div className="glass-card rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 bg-white/80 overflow-hidden flex flex-1 min-h-0 relative">
        
        {/* Left Pane (Conversations List) */}
        <div className={`w-full lg:w-[400px] flex-shrink-0 flex flex-col border-l border-slate-100 bg-slate-50/50 transition-all duration-300 ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
           <div className="p-4 lg:p-6 border-b border-slate-100 bg-white/50 backdrop-blur-md z-10 shrink-0">
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input
                  type="text"
                  className="w-full rounded-[1.5rem] border-0 py-3.5 pr-11 pl-4 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-sm font-bold transition-all outline-none"
                  placeholder="ابحث في المحادثات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="text-xs font-black uppercase tracking-widest">جاري التحميل...</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <MessageSquare className="h-10 w-10 opacity-50" />
                  <span className="text-sm font-bold">لا توجد محادثات</span>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSender = msg.sender_id === currentUser?.id;
                  const otherUser = isSender ? msg.receiver : msg.sender;
                  const isGroup = !!msg.section_id;
                  
                  const classes = Array.isArray(msg.section?.classes) ? msg.section.classes[0] : msg.section?.classes;
                  const displayName = isGroup ? `رسالة لـ ${classes?.name || ''} - ${msg.section?.name || ''}` : (otherUser?.full_name || 'مستخدم');
                  const isActive = activeThread?.convId === msg.convId;

                  return (
                    <button
                      key={msg.convId}
                      onClick={() => { setActiveThread(msg); fetchThread(msg.convId); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-right group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50' : !msg.is_read && !isSender ? 'bg-white border border-indigo-100 shadow-sm' : 'hover:bg-white border border-transparent'}`}
                    >
                      <div className="relative shrink-0">
                        <RenderAvatar user={otherUser} isGroup={isGroup} size="h-14 w-14" />
                        {!msg.is_read && !isSender && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-black truncate pr-2 ${isActive ? 'text-white' : 'text-slate-900'}`}>{displayName}</h4>
                          <span className={`text-[10px] font-bold shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                             {new Date(msg.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${isActive ? 'text-indigo-100 font-medium' : !msg.is_read && !isSender ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'}`}>
                          {msg.subject || msg.content}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
           </div>
        </div>

        {/* Right Pane (Active Chat Thread) */}
        <div className={`flex-1 flex flex-col bg-white relative ${!activeThread ? 'hidden lg:flex items-center justify-center' : 'flex min-h-0'}`}>
           {!activeThread ? (
             <div className="text-center flex flex-col items-center">
               <div className="h-32 w-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                 <MessageSquare className="h-12 w-12 text-slate-300" />
               </div>
               <h3 className="text-2xl font-black text-slate-800">مرحباً بك في المحادثات</h3>
               <p className="text-slate-500 font-medium mt-2">اختر محادثة من القائمة أو ابدأ محادثة جديدة للتواصل.</p>
             </div>
           ) : (
             <>
               {/* Chat Header */}
               <div className="h-20 border-b border-slate-100 bg-white/80 backdrop-blur-xl px-4 lg:px-6 flex items-center justify-between z-10 shrink-0">
                 <div className="flex items-center gap-3 lg:gap-4">
                   <button onClick={() => setActiveThread(null)} className="lg:hidden p-2 bg-slate-50 rounded-xl text-slate-500 hover:text-indigo-600 active:scale-95 transition-all">
                     <ArrowRight className="h-5 w-5" />
                   </button>
                   
                   {(() => {
                     const isSender = activeThread.sender_id === currentUser?.id;
                     const otherUser = isSender ? activeThread.receiver : activeThread.sender;
                     const isGroup = !!activeThread.section_id;
                     const classes = Array.isArray(activeThread.section?.classes) ? activeThread.section.classes[0] : activeThread.section?.classes;
                     const displayName = isGroup ? `رسالة جماعية: ${classes?.name || ''} - ${activeThread.section?.name || ''}` : (otherUser?.full_name || 'مستخدم');
                     
                     return (
                       <>
                         <RenderAvatar user={otherUser} isGroup={isGroup} size="h-12 w-12" />
                         <div>
                           <h3 className="text-sm lg:text-base font-black text-slate-900 leading-tight truncate max-w-[200px] lg:max-w-[400px]">{displayName}</h3>
                           <p className="text-[10px] lg:text-xs text-indigo-600 font-bold mt-0.5 truncate max-w-[200px] lg:max-w-[400px]">{activeThread.subject}</p>
                         </div>
                       </>
                     );
                   })()}
                 </div>
                 <button onClick={() => handleDeleteMessage(activeThread.allIds)} className="p-2 lg:p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shadow-sm shrink-0">
                   <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                 </button>
               </div>

               {/* Chat Messages */}
               {/* min-h-0 ضرورية جداً للسماح لشريط التمرير بالعمل دون دفع الفوتر */}
               <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
                  {threadMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const showAvatar = idx === 0 || threadMessages[idx - 1].sender_id !== msg.sender_id;
                    
                    // حساب التاريخ للفواصل الزمنية
                    const currentLabel = formatDateLabel(msg.created_at);
                    const showDateDivider = currentLabel !== lastDateLabel;
                    if (showDateDivider) lastDateLabel = currentLabel;
                    
                    return (
                      <div key={msg.id} className="flex flex-col">
                        {/* 📅 الفاصل الزمني */}
                        {showDateDivider && (
                          <div className="flex justify-center my-6">
                            <span className="bg-white border border-slate-200 text-slate-400 text-[10px] font-black px-3 py-1 rounded-full shadow-sm tracking-widest">
                              {currentLabel}
                            </span>
                          </div>
                        )}

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 lg:gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          
                          {/* Avatar Column */}
                          <div className="shrink-0 w-8 lg:w-10 flex flex-col items-center">
                            {showAvatar && !isMe && <RenderAvatar user={msg.sender} size="h-8 w-8 lg:h-10 lg:w-10" />}
                          </div>

                          {/* Bubble Column */}
                          <div className={`flex flex-col max-w-[85%] lg:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                            {showAvatar && !isMe && <span className="text-[10px] font-bold text-slate-400 mb-1 ml-2">{msg.sender?.full_name}</span>}
                            
                            <div className={`p-3 lg:p-4 shadow-sm relative text-sm font-medium leading-relaxed
                              ${isMe 
                                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-sm' 
                                : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm'}`}
                            >
                              {msg.content}
                              
                              <div className={`text-[9px] mt-2 flex items-center gap-1.5 ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                                <span>{new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                {/* ✅ مؤشر القراءة الذكي */}
                                {isMe && (
                                  msg.is_read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-300 drop-shadow-sm" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-indigo-300/70" />
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

               {/* Chat Input */}
               {/* pb-safe-bottom يضمن أن المنطقة لا تغطى بشريط هواتف الآيفون */}
               <div className="p-3 lg:p-4 bg-white border-t border-slate-100 shrink-0 pb-safe-bottom">
                 <form onSubmit={handleSendReply} className="flex items-end gap-2 lg:gap-3 bg-slate-50 p-1.5 lg:p-2 rounded-[2rem] border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all shadow-inner">
                    <textarea 
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="اكتب رسالتك هنا..."
                      className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-24 min-h-[44px] py-3 px-3 lg:px-4 text-xs lg:text-sm font-bold text-slate-800 placeholder:text-slate-400"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                    />
                    <button 
                      type="submit" 
                      disabled={isReplying || !replyContent.trim()}
                      className="h-10 w-10 lg:h-12 lg:w-12 rounded-full lg:rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shrink-0 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md shadow-indigo-200 mb-0.5"
                    >
                      {isReplying ? <div className="h-4 w-4 lg:h-5 lg:w-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4 lg:h-5 lg:w-5 -ml-1 rtl:ml-0 rtl:-mr-1 rtl:rotate-180" />}
                    </button>
                 </form>
                 <p className="hidden lg:block text-center text-[10px] text-slate-400 font-bold mt-2">اضغط Enter للإرسال، و Shift+Enter لسطر جديد</p>
               </div>
             </>
           )}
        </div>
      </div>

      {/* 🚀 New Message Modal */}
      <AnimatePresence>
        {showNewMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => { setShowNewMessage(false); setStep(1); }} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[90dvh]">
              <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4 lg:pb-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-2xl font-black text-slate-900">إنشاء رسالة جديدة</h3>
                    <p className="text-[10px] lg:text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">الخطوة {step} من {recipientType === 'student' && role === 'teacher' ? '3' : '2'}</p>
                  </div>
                </div>
                <button onClick={() => { setShowNewMessage(false); setStep(1); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X className="h-5 w-5 lg:h-6 lg:w-6" /></button>
              </div>

              <div className="p-6 lg:p-8 overflow-y-auto flex-1 custom-scrollbar">
                {step === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <button onClick={() => { setRecipientType('teacher'); setStep(2); }} className="flex flex-col items-center justify-center p-8 lg:p-10 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all group bg-white">
                      <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-[1rem] lg:rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 lg:mb-6 group-hover:scale-110 transition-transform"><User className="h-8 w-8 lg:h-10 lg:w-10" /></div>
                      <span className="text-lg lg:text-xl font-black text-slate-900">معلم / إدارة</span>
                      <p className="text-xs lg:text-sm text-slate-500 font-medium mt-2">مراسلة المعلمين أو الإدارة</p>
                    </button>
                    {role !== 'student' && (
                      <button onClick={() => { setRecipientType('student'); setStep(2); }} className="flex flex-col items-center justify-center p-8 lg:p-10 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/50 transition-all group bg-white">
                        <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-[1rem] lg:rounded-[1.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 lg:mb-6 group-hover:scale-110 transition-transform"><Users className="h-8 w-8 lg:h-10 lg:w-10" /></div>
                        <span className="text-lg lg:text-xl font-black text-slate-900">طالب</span>
                        <p className="text-xs lg:text-sm text-slate-500 font-medium mt-2">مراسلة الطلاب في صفوفك</p>
                      </button>
                    )}
                  </div>
                )}

                {step === 2 && recipientType === 'student' && role === 'teacher' && (
                  <div className="space-y-6">
                    <button onClick={() => setStep(1)} className="text-indigo-600 font-black text-sm flex items-center gap-1 hover:underline"><ArrowRight className="h-4 w-4" /> العودة</button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                      <button onClick={() => { setIsGroupMessage(true); setStep(3); }} className="flex flex-col items-center justify-center p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all group bg-white">
                        <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-[1rem] lg:rounded-[1.25rem] bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform"><Users className="h-7 w-7 lg:h-8 lg:w-8" /></div>
                        <span className="text-base lg:text-lg font-black text-slate-900">رسالة جماعية</span>
                        <p className="text-[10px] lg:text-xs text-slate-500 font-medium mt-1">إرسال لجميع طلاب الصف</p>
                      </button>
                      <button onClick={() => { setIsGroupMessage(false); setStep(3); }} className="flex flex-col items-center justify-center p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50/50 transition-all group bg-white">
                        <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-[1rem] lg:rounded-[1.25rem] bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform"><User className="h-7 w-7 lg:h-8 lg:w-8" /></div>
                        <span className="text-base lg:text-lg font-black text-slate-900">رسالة فردية</span>
                        <p className="text-[10px] lg:text-xs text-slate-500 font-medium mt-1">إرسال لطالب محدد</p>
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && recipientType === 'student' && role === 'teacher' && (
                  <div className="space-y-6">
                    <button onClick={() => setStep(2)} className="text-indigo-600 font-black text-sm flex items-center gap-1 hover:underline"><ArrowRight className="h-4 w-4" /> العودة</button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {teacherSections.map((section: any) => (
                        <button key={section.id} onClick={() => { setSelectedSectionId(section.id); setStep(4); }} className="flex items-center gap-4 p-4 lg:p-5 rounded-[1.25rem] lg:rounded-[1.5rem] border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-right bg-white">
                          <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600 shrink-0"><Users className="h-5 w-5 lg:h-6 lg:w-6" /></div>
                          <div>
                            <p className="font-black text-sm lg:text-base text-slate-900">{section.classes?.name}</p>
                            <p className="text-[10px] lg:text-xs text-slate-500 font-bold mt-0.5">{section.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {((step === 2 && (recipientType === 'teacher' || (recipientType === 'student' && role !== 'teacher'))) || step === 4) && (
                  <form id="new-message-form" onSubmit={handleSendMessage} className="space-y-4 lg:space-y-6">
                    <button type="button" onClick={() => setStep(recipientType === 'student' && role === 'teacher' ? 3 : 1)} className="text-indigo-600 font-black text-sm flex items-center gap-1 hover:underline mb-2"><ArrowRight className="h-4 w-4" /> العودة</button>
                    
                    {!isGroupMessage && (
                      <div className="space-y-1.5 lg:space-y-2">
                        <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">المستلم</label>
                        <select required value={newMessage.receiver_id} onChange={(e) => setNewMessage({...newMessage, receiver_id: e.target.value})} className="block w-full rounded-xl lg:rounded-2xl border-0 py-3.5 lg:py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-xs lg:text-sm font-bold outline-none cursor-pointer">
                          <option value="">اختر المستلم...</option>
                          {getFilteredRecipients().map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                      </div>
                    )}
                    
                    <div className="space-y-1.5 lg:space-y-2">
                      <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">موضوع الرسالة</label>
                      <input type="text" required value={newMessage.subject} onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})} placeholder="أدخل عنواناً مختصراً..." className="block w-full rounded-xl lg:rounded-2xl border-0 py-3.5 lg:py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-xs lg:text-sm font-bold outline-none" />
                    </div>
                    
                    <div className="space-y-1.5 lg:space-y-2">
                      <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">محتوى الرسالة</label>
                      <textarea rows={5} required value={newMessage.content} onChange={(e) => setNewMessage({...newMessage, content: e.target.value})} placeholder="اكتب رسالتك هنا..." className="block w-full rounded-xl lg:rounded-2xl border-0 py-3.5 lg:py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-xs lg:text-sm font-bold resize-none outline-none leading-relaxed" />
                    </div>
                  </form>
                )}
              </div>

              {((step === 2 && (recipientType === 'teacher' || (recipientType === 'student' && role !== 'teacher'))) || step === 4) && (
                <div className="p-4 lg:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0 pb-safe-bottom">
                  <button type="button" onClick={() => { setShowNewMessage(false); setStep(1); }} className="w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl bg-white text-slate-700 font-black border border-slate-200 hover:bg-slate-100 transition-all text-sm lg:text-base">إلغاء</button>
                  <button type="submit" form="new-message-form" disabled={isSubmitting} className="w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm lg:text-base">
                    {isSubmitting ? 'جاري الإرسال...' : <><Send className="w-4 h-4 lg:w-5 lg:h-5" /> إرسال</>}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
