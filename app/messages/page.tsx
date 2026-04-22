/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Search, Send, User, X, Users, Trash2, ArrowRight, Check, CheckCheck, Loader2, ShieldAlert, Sparkles, Megaphone } from 'lucide-react';
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
  
  // 🛡️ [Anti-Freeze Patch]: قفل دوال الـ Fetch باستخدام useRef
  const { fetchMessages, sendMessage, sendGroupMessage, sendBroadcastMessage, markAsRead, deleteMessages, messages, users, chatRooms, loading } = useMessagesSystem();
  const systemRef = useRef({ fetchMessages, sendMessage, sendGroupMessage, sendBroadcastMessage, markAsRead, deleteMessages });
  
  const [privateConversations, setPrivateConversations] = useState<any[]>([]);
  const [groupUnreadCounts, setGroupUnreadCounts] = useState<Record<string, number>>({});
  
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState<'teacher' | 'student' | 'broadcast' | ''>('');
  const [newMessage, setNewMessage] = useState({ receiver_id: '', subject: '', content: '' });
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 🛡️ الأقفال لمنع التكرار اللانهائي
  const fetchedRef = useRef(false);
  const markingReadRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    systemRef.current = { fetchMessages, sendMessage, sendGroupMessage, sendBroadcastMessage, markAsRead, deleteMessages };
  }, [fetchMessages, sendMessage, sendGroupMessage, sendBroadcastMessage, markAsRead, deleteMessages]);

  useEffect(() => {
    if (!currentUser?.id || isChecking || fetchedRef.current) return;
    fetchedRef.current = true;

    const channel = supabase
      .channel('realtime_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { 
          systemRef.current.fetchMessages(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, isChecking]); // 🛡️ الاعتماد فقط على الـ ID

  useEffect(() => {
    if (!messages.length || !currentUser) { 
      setPrivateConversations([]); 
      setGroupUnreadCounts({});
      return; 
    }

    const gCounts: Record<string, number> = {};
    messages.filter(m => m.section_id).forEach(msg => {
      if (!msg.is_read && msg.sender_id !== currentUser?.id) {
        gCounts[msg.section_id] = (gCounts[msg.section_id] || 0) + 1;
      }
    });
    setGroupUnreadCounts(gCounts);

    const privateMsgs = messages.filter(m => !m.section_id);
    const convos = privateMsgs.reduce((acc: any, msg: any) => {
      const ids = [msg.sender_id, msg.receiver_id].sort();
      const convId = `private-${ids.join('-')}`;
      const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
      const receiver = Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver;
      const cleanMsg = { ...msg, sender, receiver };
      
      const isUnread = !msg.is_read && msg.sender_id !== currentUser?.id;

      if (!acc[convId]) {
        acc[convId] = { ...cleanMsg, allIds: [msg.id], convId, type: 'private', unreadCount: isUnread ? 1 : 0 };
      } else {
        if (isUnread) acc[convId].unreadCount += 1;
        
        if (new Date(msg.created_at) > new Date(acc[convId].created_at)) {
          acc[convId] = { ...cleanMsg, allIds: [...acc[convId].allIds, msg.id], convId, type: 'private', unreadCount: acc[convId].unreadCount };
        } else {
          acc[convId].allIds.push(msg.id);
        }
      }
      return acc;
    }, {});

    setPrivateConversations(Object.values(convos).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, [messages, currentUser]);

  useEffect(() => {
    if (activeThread && messages.length >= 0) {
      let thread = [];
      if (activeThread.type === 'group') {
        thread = messages.filter((m: any) => m.section_id === activeThread.id);
        const unique = []; const seen = new Set();
        for (const msg of thread) {
          if (!seen.has(msg.id)) { seen.add(msg.id); unique.push(msg); }
        }
        thread = unique;
      } else {
        thread = messages.filter((m: any) => {
          if (m.section_id) return false;
          const ids = [m.sender_id, m.receiver_id].sort();
          return `private-${ids.join('-')}` === activeThread.convId;
        });
      }

      thread.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const cleanThread = thread.map(m => ({
         ...m, sender: Array.isArray(m.sender) ? m.sender[0] : m.sender, receiver: Array.isArray(m.receiver) ? m.receiver[0] : m.receiver,
      }));
      setThreadMessages(cleanThread);

      // 🛡️ [Anti-Freeze Patch]: فلترة الرسائل وعدم تكرار طلب القراءة
      const unreadIds = cleanThread
        .filter(m => !m.is_read && m.sender_id !== currentUser?.id && !markingReadRef.current.has(m.id))
        .map(m => m.id);

      if (unreadIds.length > 0) {
        unreadIds.forEach(id => markingReadRef.current.add(id));
        systemRef.current.markAsRead(unreadIds);
      }
      
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
    }
  }, [activeThread, messages, currentUser?.id]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const strippedContent = replyContent.replace(/<[^>]*>?/gm, '').trim();
    if (!strippedContent || !activeThread || !currentUser) return;
    
    setIsReplying(true);
    try {
      if (activeThread.type === 'group') {
        await systemRef.current.sendGroupMessage(activeThread.id, activeThread.subject || 'رسالة نقاش', replyContent);
      } else {
        const receiverId = activeThread.sender_id === currentUser.id ? activeThread.receiver_id : activeThread.sender_id;
        await systemRef.current.sendMessage(receiverId, activeThread.subject || 'رد', replyContent);
      }
      setReplyContent('');
    } catch (error: any) { alert(error.message); } 
    finally { setIsReplying(false); }
  };

  const handleSendNewMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const strippedContent = newMessage.content.replace(/<[^>]*>?/gm, '').trim();
    if (!newMessage.subject || !strippedContent) return alert('الرجاء تعبئة جميع الحقول');

    setIsSubmitting(true);
    try {
      if (recipientType === 'broadcast') {
        await systemRef.current.sendBroadcastMessage(newMessage.subject, newMessage.content);
        alert('تم إرسال الإذاعة العامة بنجاح لجميع المجالس!');
      } else if (!isGroupMessage) {
        if (!newMessage.receiver_id) return alert('الرجاء اختيار المستلم');
        await systemRef.current.sendMessage(newMessage.receiver_id, newMessage.subject, newMessage.content);
      }
      
      setShowNewMessage(false);
      setNewMessage({ receiver_id: '', subject: '', content: '' });
      setStep(1); setRecipientType(''); setIsGroupMessage(false);
    } catch (error: any) { alert(error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteMessage = async (messageIds: string[]) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة بالكامل؟')) return;
    try {
      await systemRef.current.deleteMessages(messageIds);
      if (activeThread && messageIds.some((id: string) => activeThread.allIds?.includes(id))) setActiveThread(null);
    } catch (error: any) { alert('حدث خطأ أثناء الحذف'); }
  };

  const filteredChatRooms = chatRooms.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.className.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPrivate = privateConversations.filter(m => m.sender?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || m.receiver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || m.subject?.toLowerCase().includes(searchTerm.toLowerCase()));

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

  if (isChecking || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تأمين الغرف والرسائل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-6rem)] max-w-[1600px] mx-auto font-cairo text-slate-200 relative overflow-hidden" dir="rtl">
      
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 🚀 إخفاء هذا الجزء بالكامل في الجوال إذا كانت هناك محادثة مفتوحة */}
      <div className={cn("shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-8 relative z-10 pt-4", activeThread ? "hidden lg:flex mb-4" : "flex mb-4")}>
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">مركز التواصل الرقمي</h1>
          <p className="text-slate-400 mt-1 sm:mt-2 font-bold text-xs sm:text-sm">مجالس الفصول والمراسلات الخاصة ⚡</p>
        </div>
        {role !== 'parent' && (
          <button onClick={() => { setShowNewMessage(true); setStep(1); setRecipientType(''); setIsGroupMessage(false); }} className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-95 border border-indigo-400/50 shrink-0">
            <Plus className="ml-2 h-5 w-5" /> رسالة جديدة
          </button>
        )}
      </div>

      <div className={cn("glass-panel overflow-hidden flex flex-1 min-h-0 mx-0 lg:mx-8 relative z-10 bg-[#0f1423]/60", activeThread ? "rounded-none lg:rounded-[2.5rem] lg:border lg:border-white/10 lg:shadow-[0_20px_50px_rgba(0,0,0,0.5)]" : "rounded-t-[2.5rem] lg:rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]")}>
        
        {/* 🚀 القائمة الجانبية (تختفي في الجوال عند فتح محادثة) */}
        <div className={cn("w-full lg:w-[400px] flex-shrink-0 flex flex-col border-l border-white/5 bg-[#02040a]/40 transition-all duration-300", activeThread ? 'hidden lg:flex' : 'flex')}>
           <div className="p-4 lg:p-6 border-b border-white/5 bg-[#02040a]/40 backdrop-blur-xl z-10 shrink-0">
              <div className="relative group">
                <Search className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input type="text" className="w-full rounded-2xl border border-white/5 py-3.5 pr-12 pl-4 text-white bg-[#0f1423]/80 shadow-inner focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-sm font-bold outline-none placeholder:text-slate-500" placeholder="ابحث في المجالس والرسائل..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
              {chatRooms.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400"/> مجالس الفصول الثابتة</h3>
                  <div className="space-y-2">
                    {filteredChatRooms.map((room) => (
                      <button key={room.id} onClick={() => setActiveThread(room)} className={`relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-right group border outline-none ${activeThread?.id === room.id ? 'bg-indigo-600/20 text-white border-indigo-500/30 shadow-inner' : 'hover:bg-[#0f1423]/60 border-transparent hover:border-white/5'}`}>
                        <RenderAvatar isGroup={true} size="h-12 w-12" />
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-black truncate drop-shadow-sm ${activeThread?.id === room.id ? 'text-indigo-400' : 'text-white'}`}>مجلس: {room.className}</h4>
                          <p className="text-xs truncate text-slate-400 font-bold mt-1">شعبة {room.name}</p>
                        </div>
                        {groupUnreadCounts[room.id] > 0 && activeThread?.id !== room.id && (
                          <div className="shrink-0 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-[0_0_15px_rgba(225,29,72,0.5)] animate-pulse border border-rose-400/50">
                            {groupUnreadCounts[room.id] > 99 ? '+99' : groupUnreadCounts[room.id]} جديد
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2"><User className="w-4 h-4 text-emerald-400"/> المراسلات الخاصة</h3>
                <div className="space-y-2">
                  {filteredPrivate.length === 0 ? (
                    <p className="text-xs text-slate-500 font-bold text-center py-4 bg-white/5 rounded-xl border border-white/5 shadow-inner">لا توجد رسائل خاصة</p>
                  ) : (
                    filteredPrivate.map((msg) => {
                      const isSender = msg.sender_id === currentUser?.id;
                      const otherUser = isSender ? msg.receiver : msg.sender;
                      const isActive = activeThread?.convId === msg.convId;
                      return (
                        <button key={msg.convId} onClick={() => setActiveThread(msg)} className={`relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-right group border outline-none ${isActive ? 'bg-emerald-600/20 text-white border-emerald-500/30 shadow-inner' : msg.unreadCount > 0 ? 'bg-emerald-500/10 border-emerald-500/20 shadow-inner' : 'hover:bg-[#0f1423]/60 border-transparent hover:border-white/5'}`}>
                          <div className="relative shrink-0">
                            <RenderAvatar user={otherUser} size="h-12 w-12" />
                            {msg.unreadCount > 0 && !isActive && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f1423] rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`text-sm font-black truncate pr-2 ${isActive ? 'text-emerald-400' : 'text-white'}`}>{otherUser?.full_name}</h4>
                              {msg.unreadCount > 0 && !isActive && (
                                <div className="shrink-0 bg-emerald-500 text-[#02040a] text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse border border-emerald-400">
                                  {msg.unreadCount > 99 ? '+99' : msg.unreadCount}
                                </div>
                              )}
                            </div>
                            <p className={`text-xs truncate pr-2 ${isActive ? 'text-emerald-200' : msg.unreadCount > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}`}>{msg.subject || 'بدون عنوان'}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
           </div>
        </div>

        {/* 🚀 نافذة الدردشة (المجلس أو الخاص) - تظهر بكامل الشاشة في الجوال عند التفعيل */}
        <div className={cn("flex-col transition-all duration-300 z-50 lg:z-auto", !activeThread ? "hidden lg:flex lg:flex-1 items-center justify-center bg-[#090b14] lg:bg-transparent" : "flex absolute inset-0 bg-[#090b14] lg:static lg:flex-1 h-[100dvh] lg:h-auto overflow-hidden")}>
           {!activeThread ? (
             <div className="text-center flex flex-col items-center">
               <div className="h-32 w-32 bg-[#02040a]/60 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner border border-white/5">
                 <MessageSquare className="h-12 w-12 text-slate-600 drop-shadow-md" />
               </div>
               <h3 className="text-2xl font-black text-white drop-shadow-sm">مرحباً بك في مركز التواصل</h3>
               <p className="text-slate-400 font-bold mt-2 text-base">اختر مجلس الفصل أو محادثة خاصة للبدء.</p>
             </div>
           ) : (
             <>
               {/* Header للمحادثة */}
               <div className="h-[70px] lg:h-20 border-b border-white/5 bg-[#0f1423]/95 backdrop-blur-2xl px-3 lg:px-6 flex items-center justify-between z-20 shrink-0 pt-[env(safe-area-inset-top)]">
                 <div className="flex items-center gap-2 lg:gap-4 min-w-0 pr-1">
                   {/* 🚀 زر العودة للجوال */}
                   <button onClick={() => setActiveThread(null)} className="lg:hidden p-2.5 mr-[-5px] text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0 active:scale-95 flex items-center justify-center">
                     <ArrowRight className="h-6 w-6" />
                   </button>
                   
                   {activeThread.type === 'group' ? (
                     <><RenderAvatar isGroup={true} size="h-10 w-10 lg:h-12 lg:w-12" />
                     <div className="min-w-0">
                       <h3 className="text-sm lg:text-base font-black text-white truncate drop-shadow-sm">مجلس: {activeThread.className}</h3>
                       <p className="text-[10px] lg:text-xs text-indigo-400 font-bold mt-0.5 lg:mt-1 truncate">شعبة {activeThread.name}</p>
                     </div></>
                   ) : (
                     <><RenderAvatar user={activeThread.sender_id === currentUser?.id ? activeThread.receiver : activeThread.sender} size="h-10 w-10 lg:h-12 lg:w-12" />
                     <div className="min-w-0">
                       <h3 className="text-sm lg:text-base font-black text-white truncate drop-shadow-sm">{activeThread.sender_id === currentUser?.id ? activeThread.receiver?.full_name : activeThread.sender?.full_name}</h3>
                       <p className="text-[10px] lg:text-xs text-emerald-400 font-bold mt-0.5 lg:mt-1 truncate">{activeThread.subject}</p>
                     </div></>
                   )}
                 </div>
                 {activeThread.type !== 'group' && (
                   <button onClick={() => handleDeleteMessage(activeThread.allIds)} className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-inner shrink-0 active:scale-95">
                     <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                   </button>
                 )}
               </div>

               {/* Messages Area - Scrolling Container */}
               <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 space-y-4 lg:space-y-6 bg-transparent custom-scrollbar">
                  {threadMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 font-bold text-sm">
                       لا توجد رسائل سابقة في هذا {activeThread.type === 'group' ? 'المجلس' : 'النقاش'}.
                    </div>
                  ) : (
                    threadMessages.map((msg, idx) => {
                      const isMe = msg.sender_id === currentUser?.id;
                      const showAvatar = idx === 0 || threadMessages[idx - 1].sender_id !== msg.sender_id;
                      const themeColor = activeThread.type === 'group' ? 'indigo' : 'emerald';
                      
                      const currentLabel = formatDateLabel(msg.created_at);
                      const showDateDivider = currentLabel !== lastDateLabel;
                      if (showDateDivider) lastDateLabel = currentLabel;

                      return (
                        <div key={msg.id} className="flex flex-col">
                           {showDateDivider && (
                             <div className="flex justify-center my-4 lg:my-6">
                               <span className="bg-[#02040a]/80 border border-white/5 text-slate-400 text-[9px] lg:text-[10px] font-black px-3 py-1.5 rounded-full shadow-inner tracking-widest">
                                 {currentLabel}
                               </span>
                             </div>
                           )}

                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 lg:gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="shrink-0 w-8 lg:w-10 flex flex-col items-center hidden sm:flex">
                              {showAvatar && !isMe && <RenderAvatar user={msg.sender} size="h-8 w-8 lg:h-10 lg:w-10" />}
                            </div>
                            <div className={`flex flex-col max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                              {showAvatar && !isMe && <span className="text-[9px] lg:text-[10px] font-bold text-slate-500 mb-1 ml-2 drop-shadow-sm">{msg.sender?.full_name} ({msg.sender?.role === 'teacher' ? 'معلم' : msg.sender?.role === 'admin' ? 'إدارة' : 'طالب'})</span>}
                              
                              <div className={`p-3 lg:p-4 shadow-inner border relative text-sm lg:text-sm font-bold leading-relaxed lg:leading-loose
                                ${isMe 
                                  ? `bg-gradient-to-br from-${themeColor}-600 to-${themeColor === 'indigo' ? 'violet' : 'teal'}-600 text-white rounded-[1.25rem] lg:rounded-[1.5rem] rounded-tr-sm border-${themeColor}-400/30` 
                                  : 'bg-[#0f1423] text-slate-200 border-white/5 rounded-[1.25rem] lg:rounded-[1.5rem] rounded-tl-sm'}`}
                              >
                                <div className="prose prose-invert max-w-none text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: msg.content }} />
                                
                                <div className={`text-[9px] lg:text-[9px] mt-2 flex items-center gap-1 lg:gap-1.5 ${isMe ? `text-${themeColor}-200 justify-end` : 'text-slate-500 justify-start'}`}>
                                  <span>{new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                  {isMe && (msg.is_read ? <CheckCheck className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-sky-300" /> : <Check className={`w-3 h-3 lg:w-3.5 lg:h-3.5 text-${themeColor}-300/50`} />)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} className="h-2" />
               </div>

               {/* Input Form */}
               <div className="bg-[#0f1423]/95 backdrop-blur-2xl border-t border-white/5 shrink-0 pb-[env(safe-area-inset-bottom)]">
                 <form onSubmit={handleSendReply} className="flex items-end gap-2 lg:gap-3 p-3 lg:p-4">
                    <div className="flex-1 bg-[#02040a]/60 rounded-[1.5rem] lg:rounded-[2rem] border border-white/5 shadow-inner overflow-hidden p-1">
                       <ForumEditor content={replyContent} setContent={setReplyContent} canUploadImage={true} placeholder="اكتب رسالتك هنا..." minHeight="50px" />
                    </div>
                    <button type="submit" disabled={isReplying || !replyContent.replace(/<[^>]*>?/gm, '').trim()} className={`h-12 w-12 lg:h-14 lg:w-14 rounded-xl lg:rounded-[1.8rem] bg-gradient-to-br from-${activeThread.type === 'group' ? 'indigo' : 'emerald'}-600 to-${activeThread.type === 'group' ? 'blue' : 'teal'}-600 text-white flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_currentColor] border border-white/20 mb-1 lg:mb-1.5 active:scale-95`}>
                      {isReplying ? <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> : <Send className="w-4 h-4 lg:w-5 lg:h-5 -ml-1 rtl:ml-0 rtl:-mr-1 rtl:rotate-180" />}
                    </button>
                 </form>
               </div>
             </>
           )}
        </div>
      </div>

      {/* 🚀 Modal: إنشاء رسالة (مع إضافة نظام الإذاعة العامة) */}
      <AnimatePresence>
        {showNewMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#02040a]/90 backdrop-blur-md" onClick={() => { setShowNewMessage(false); setStep(1); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl bg-[#0f1423] rounded-[2rem] lg:rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden z-10 flex flex-col max-h-[90dvh] overflow-y-auto" dir="rtl">
              
              <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4 lg:pb-6 border-b border-white/5 bg-[#02040a]/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                    <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-2xl font-black text-white drop-shadow-sm">إنشاء رسالة جديدة</h3>
                    <p className="text-[10px] lg:text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">تواصل، توجيه، وإدارة</p>
                  </div>
                </div>
                <button onClick={() => { setShowNewMessage(false); setStep(1); }} className="p-2 text-slate-400 hover:text-rose-400 bg-[#0f1423] border border-white/5 rounded-xl shadow-inner active:scale-90"><X className="h-5 w-5 lg:h-6 lg:w-6" /></button>
              </div>

              <div className="p-6 lg:p-8">
                {step === 1 && (
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${['admin', 'management'].includes(role) ? 'lg:grid-cols-3' : ''} gap-4 lg:gap-6`}>
                    
                    <button onClick={() => { setRecipientType('teacher'); setIsGroupMessage(false); setStep(2); }} className="flex flex-col items-center justify-center p-6 lg:p-8 rounded-[1.5rem] border border-white/5 shadow-inner hover:border-indigo-500/50 hover:bg-[#02040a]/60 transition-all group bg-[#02040a]/40 active:scale-95">
                      <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-[1rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform"><User className="h-7 w-7 lg:h-8 lg:w-8" /></div>
                      <span className="text-base lg:text-lg font-black text-white drop-shadow-sm">رسالة لمعلم / إدارة</span>
                      <p className="text-[10px] lg:text-xs text-slate-400 font-bold mt-2">مراسلة مباشرة للفريق الإداري والتدريسي</p>
                    </button>
                    
                    {role !== 'parent' && (
                      <button onClick={() => { setRecipientType('student'); setIsGroupMessage(false); setStep(2); }} className="flex flex-col items-center justify-center p-6 lg:p-8 rounded-[1.5rem] border border-white/5 shadow-inner hover:border-emerald-500/50 hover:bg-[#02040a]/60 transition-all group bg-[#02040a]/40 active:scale-95">
                        <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-[1rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform"><Users className="h-7 w-7 lg:h-8 lg:w-8" /></div>
                        <span className="text-base lg:text-lg font-black text-white drop-shadow-sm">رسالة خاصة لطالب</span>
                        <p className="text-[10px] lg:text-xs text-slate-400 font-bold mt-2">توجيه رسالة سرية لطالب محدد</p>
                      </button>
                    )}

                    {['admin', 'management'].includes(role) && (
                      <button onClick={() => { setRecipientType('broadcast'); setIsGroupMessage(true); setStep(2); }} className="flex flex-col items-center justify-center p-6 lg:p-8 rounded-[1.5rem] border border-rose-500/20 shadow-inner hover:border-rose-500/50 hover:bg-rose-500/10 transition-all group bg-rose-500/5 active:scale-95">
                        <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-[1rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform"><Megaphone className="h-7 w-7 lg:h-8 lg:w-8 drop-shadow-md" /></div>
                        <span className="text-base lg:text-lg font-black text-rose-400 drop-shadow-sm">إذاعة عامة للجميع</span>
                        <p className="text-[10px] lg:text-xs text-slate-400 font-bold mt-2 text-center">نشر توجيه فوري في جميع مجالس الفصول</p>
                      </button>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <form onSubmit={handleSendNewMessage} className="space-y-4 lg:space-y-6">
                    <button type="button" onClick={() => setStep(1)} className="text-indigo-400 font-black text-xs lg:text-sm flex items-center gap-1.5 hover:text-indigo-300 transition-colors w-fit mb-2"><ArrowRight className="h-4 w-4" /> العودة للخيارات</button>

                    {recipientType !== 'broadcast' && (
                      <div className="space-y-2 lg:space-y-3 bg-[#02040a]/40 p-4 lg:p-5 rounded-[1.25rem] lg:rounded-[1.5rem] border border-white/5 shadow-inner">
                        <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">المستلم</label>
                        <select required value={newMessage.receiver_id} onChange={(e) => setNewMessage({...newMessage, receiver_id: e.target.value})} className="block w-full rounded-xl lg:rounded-2xl border border-white/5 py-3 lg:py-4 px-4 text-white bg-[#0f1423] focus:ring-1 focus:ring-indigo-500/50 text-xs lg:text-sm font-bold outline-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423]">
                          <option value="">اختر المستلم...</option>
                          {users
                            .filter(u => recipientType === 'teacher' ? ['teacher', 'admin', 'management'].includes(u.role) : u.role === 'student')
                            .map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)
                          }
                        </select>
                      </div>
                    )}
                    
                    <div className="space-y-2 lg:space-y-3 bg-[#02040a]/40 p-4 lg:p-5 rounded-[1.25rem] lg:rounded-[1.5rem] border border-white/5 shadow-inner">
                      <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">عنوان الرسالة</label>
                      <input type="text" required value={newMessage.subject} onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})} placeholder="أدخل عنواناً مختصراً..." className="block w-full rounded-xl lg:rounded-2xl border border-white/5 py-3 lg:py-4 px-4 text-white bg-[#0f1423] focus:ring-1 focus:ring-indigo-500/50 text-xs lg:text-sm font-bold outline-none shadow-inner placeholder:text-slate-600" />
                    </div>
                    
                    <div className="space-y-2 lg:space-y-3 bg-[#02040a]/40 p-4 lg:p-5 rounded-[1.25rem] lg:rounded-[1.5rem] border border-white/5 shadow-inner">
                      <label className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">المحتوى</label>
                      <div className="bg-[#0f1423] rounded-xl lg:rounded-2xl border border-white/5 overflow-hidden shadow-inner p-1">
                        <ForumEditor content={newMessage.content} setContent={(val) => setNewMessage({...newMessage, content: val})} canUploadImage={true} placeholder="اكتب رسالتك هنا..." minHeight="120px" />
                      </div>
                    </div>

                    <div className="pt-4 lg:pt-6 border-t border-white/5 flex justify-end gap-3">
                      <button type="submit" disabled={isSubmitting} className={`px-6 lg:px-8 py-3.5 lg:py-4 rounded-xl lg:rounded-2xl ${recipientType === 'broadcast' ? 'bg-gradient-to-r from-rose-600 to-red-600 shadow-[0_0_20px_rgba(225,29,72,0.4)]' : 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]'} text-white text-sm lg:text-base font-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95 w-full sm:w-auto justify-center`}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin"/> : <><Send className="w-4 h-4 lg:w-5 lg:h-5 -ml-1 rtl:ml-0 rtl:-mr-1 rtl:rotate-180" /> إرسال الرسالة</>}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
