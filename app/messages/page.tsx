/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Search, Send, User, X, Users, Trash2, ArrowRight, Check, CheckCheck, Loader2, ShieldAlert, Sparkles, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { useMessagesSystem } from '@/hooks/useMessagesSystem';
import { supabase } from '@/lib/supabase'; 
import ForumEditor from '@/components/ForumEditor';
import { cn } from '@/lib/utils';

// واجهة الغرفة الثابتة (لضمان التوافق)
interface ChatRoom { id: string; name: string; className: string; type: 'group'; }

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
    <div className={`${size} rounded-[1.25rem] sm:rounded-2xl bg-[#02040a] flex items-center justify-center text-emerald-400 font-black shadow-inner border border-white/5 shrink-0`}>
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
    chatRooms, // 🚀 جلب الغرف الثابتة من الهوك
    loading,
    fetchMessages,
    sendMessage,
    sendGroupMessage,
    markAsRead,
    deleteMessages,
  } = useMessagesSystem();

  const [privateConversations, setPrivateConversations] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessage, setNewMessage] = useState({ receiver_id: '', subject: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // 🚀 التحديث المباشر
  useEffect(() => {
    if (!currentUser || isChecking || fetchedRef.current) return;
    fetchedRef.current = true;

    const channel = supabase
      .channel('realtime_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => { fetchMessages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, isChecking, fetchMessages]);

  // 🚀 فصل وتجميع الرسائل الخاصة
  useEffect(() => {
    if (!messages.length || !currentUser) { setPrivateConversations([]); return; }

    const privateMsgs = messages.filter(m => !m.section_id);
    const convos = privateMsgs.reduce((acc: any, msg: any) => {
      const ids = [msg.sender_id, msg.receiver_id].sort();
      const convId = `private-${ids.join('-')}`;
      const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
      const receiver = Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver;
      const cleanMsg = { ...msg, sender, receiver };

      if (!acc[convId]) {
        acc[convId] = { ...cleanMsg, allIds: [msg.id], convId, type: 'private' };
      } else {
        if (new Date(msg.created_at) > new Date(acc[convId].created_at)) {
          acc[convId] = { ...cleanMsg, allIds: [...acc[convId].allIds, msg.id], convId, type: 'private' };
        } else {
          acc[convId].allIds.push(msg.id);
        }
      }
      return acc;
    }, {});

    setPrivateConversations(Object.values(convos).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, [messages, currentUser]);

  // 🚀 معالجة المحادثة النشطة (المجلس أو الخاص)
  useEffect(() => {
    if (activeThread && messages.length >= 0) {
      let thread = [];
      if (activeThread.type === 'group') {
        thread = messages.filter((m: any) => m.section_id === activeThread.id);
        
        // إزالة التكرار من السيرفر القديم إن وجد
        const unique = []; const seen = new Set();
        for (const msg of thread) {
          const key = msg.sender_id === currentUser?.id ? `${msg.content}-${msg.subject}` : msg.id;
          if (!seen.has(key)) { seen.add(key); unique.push(msg); }
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

      const unreadIds = cleanThread.filter(m => !m.is_read && m.sender_id !== currentUser?.id).map(m => m.id);
      if (unreadIds.length > 0) markAsRead(unreadIds);
      
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [activeThread, messages]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const strippedContent = replyContent.replace(/<[^>]*>?/gm, '').trim();
    if (!strippedContent || !activeThread || !currentUser) return;
    
    setIsReplying(true);
    try {
      if (activeThread.type === 'group') {
        await sendGroupMessage(activeThread.id, 'رسالة نقاش', replyContent);
      } else {
        const receiverId = activeThread.sender_id === currentUser.id ? activeThread.receiver_id : activeThread.sender_id;
        await sendMessage(receiverId, activeThread.subject || 'رد', replyContent);
      }
      setReplyContent('');
    } catch (error: any) { alert(error.message); } 
    finally { setIsReplying(false); }
  };

  const handleSendNewPrivateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const strippedContent = newMessage.content.replace(/<[^>]*>?/gm, '').trim();
    if (!newMessage.receiver_id || !newMessage.subject || !strippedContent) return alert('الرجاء تعبئة جميع الحقول');

    setIsSubmitting(true);
    try {
      await sendMessage(newMessage.receiver_id, newMessage.subject, newMessage.content);
      setShowNewMessage(false);
      setNewMessage({ receiver_id: '', subject: '', content: '' });
    } catch (error: any) { alert(error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteMessage = async (messageIds: string[]) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة بالكامل؟')) return;
    try {
      await deleteMessages(messageIds);
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
    <div className="flex flex-col h-[calc(100dvh-6rem)] lg:h-[calc(100dvh-8rem)] max-w-[1600px] mx-auto pb-4 font-cairo text-slate-200 relative overflow-hidden" dir="rtl">
      
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 lg:mb-6 px-4 lg:px-8 relative z-10 pt-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">مركز التواصل الرقمي</h1>
          <p className="text-slate-400 mt-1 sm:mt-2 font-bold text-xs sm:text-sm">مجالس الفصول والمراسلات الخاصة ⚡</p>
        </div>
        {role !== 'parent' && (
          <button onClick={() => setShowNewMessage(true)} className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-95 border border-emerald-400/50 shrink-0">
            <Plus className="ml-2 h-5 w-5" /> رسالة خاصة جديدة
          </button>
        )}
      </div>

      <div className="glass-panel rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-1 min-h-0 mx-4 lg:mx-8 relative z-10 bg-[#0f1423]/60">
        
        {/* 🚀 القائمة الجانبية (الغرف الثابتة + الخاص) */}
        <div className={cn("w-full lg:w-[400px] flex-shrink-0 flex flex-col border-l border-white/5 bg-[#02040a]/40 transition-all duration-300", activeThread ? 'hidden lg:flex' : 'flex')}>
           <div className="p-6 border-b border-white/5 bg-[#02040a]/40 backdrop-blur-xl z-10 shrink-0">
              <div className="relative group">
                <Search className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input type="text" className="w-full rounded-2xl border border-white/5 py-3.5 pr-12 pl-4 text-white bg-[#0f1423]/80 shadow-inner focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-sm font-bold outline-none placeholder:text-slate-500" placeholder="ابحث في المجالس والرسائل..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
              
              {/* 🏫 قسم مجالس الفصول */}
              {chatRooms.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400"/> مجالس الفصول الثابتة</h3>
                  <div className="space-y-2">
                    {filteredChatRooms.map((room) => (
                      <button key={room.id} onClick={() => setActiveThread(room)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-right group border outline-none ${activeThread?.id === room.id ? 'bg-indigo-600/20 text-white border-indigo-500/30 shadow-inner' : 'hover:bg-[#0f1423]/60 border-transparent hover:border-white/5'}`}>
                        <RenderAvatar isGroup={true} size="h-12 w-12" />
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-black truncate drop-shadow-sm ${activeThread?.id === room.id ? 'text-indigo-400' : 'text-white'}`}>مجلس: {room.className}</h4>
                          <p className="text-xs truncate text-slate-400 font-bold mt-1">شعبة {room.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 👤 قسم المراسلات الخاصة */}
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
                        <button key={msg.convId} onClick={() => setActiveThread(msg)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-right group border outline-none ${isActive ? 'bg-emerald-600/20 text-white border-emerald-500/30 shadow-inner' : !msg.is_read && !isSender ? 'bg-[#0f1423] border-emerald-500/20 shadow-inner' : 'hover:bg-[#0f1423]/60 border-transparent hover:border-white/5'}`}>
                          <div className="relative shrink-0">
                            <RenderAvatar user={otherUser} size="h-12 w-12" />
                            {!msg.is_read && !isSender && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f1423] rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`text-sm font-black truncate pr-2 ${isActive ? 'text-emerald-400' : 'text-white'}`}>{otherUser?.full_name}</h4>
                            </div>
                            <p className={`text-xs truncate pr-2 ${isActive ? 'text-emerald-200' : !msg.is_read && !isSender ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}`}>{msg.subject || 'بدون عنوان'}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
           </div>
        </div>

        {/* 🚀 نافذة الدردشة (المجلس أو الخاص) */}
        <div className={`flex-1 flex flex-col bg-transparent relative ${!activeThread ? 'hidden lg:flex items-center justify-center' : 'flex min-h-0'}`}>
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
               <div className="h-20 border-b border-white/5 bg-[#0f1423]/90 backdrop-blur-2xl px-6 flex items-center justify-between z-20 shrink-0">
                 <div className="flex items-center gap-4 min-w-0 pr-1">
                   <button onClick={() => setActiveThread(null)} className="lg:hidden p-2 bg-[#02040a] border border-white/5 shadow-inner rounded-xl text-slate-400 hover:text-indigo-400 active:scale-95 transition-all shrink-0">
                     <ArrowRight className="h-5 w-5" />
                   </button>
                   
                   {activeThread.type === 'group' ? (
                     <><RenderAvatar isGroup={true} size="h-12 w-12" />
                     <div className="min-w-0">
                       <h3 className="text-base font-black text-white truncate drop-shadow-sm">مجلس: {activeThread.className}</h3>
                       <p className="text-xs text-indigo-400 font-bold mt-1 truncate">شعبة {activeThread.name}</p>
                     </div></>
                   ) : (
                     <><RenderAvatar user={activeThread.sender_id === currentUser?.id ? activeThread.receiver : activeThread.sender} size="h-12 w-12" />
                     <div className="min-w-0">
                       <h3 className="text-base font-black text-white truncate drop-shadow-sm">{activeThread.sender_id === currentUser?.id ? activeThread.receiver?.full_name : activeThread.sender?.full_name}</h3>
                       <p className="text-xs text-emerald-400 font-bold mt-1 truncate">{activeThread.subject}</p>
                     </div></>
                   )}
                 </div>
                 {activeThread.type !== 'group' && (
                   <button onClick={() => handleDeleteMessage(activeThread.allIds)} className="p-2 lg:p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-inner shrink-0 active:scale-95">
                     <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                   </button>
                 )}
               </div>

               <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-transparent custom-scrollbar">
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
                             <div className="flex justify-center my-4 sm:my-6">
                               <span className="bg-[#02040a]/80 border border-white/5 text-slate-400 text-[9px] sm:text-[10px] font-black px-3 py-1 sm:py-1.5 rounded-full shadow-inner tracking-widest">
                                 {currentLabel}
                               </span>
                             </div>
                           )}

                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="shrink-0 w-10 flex flex-col items-center">
                              {showAvatar && !isMe && <RenderAvatar user={msg.sender} size="h-10 w-10" />}
                            </div>
                            <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                              {showAvatar && !isMe && <span className="text-[10px] font-bold text-slate-500 mb-1 ml-2 drop-shadow-sm">{msg.sender?.full_name} ({msg.sender?.role === 'teacher' ? 'معلم' : msg.sender?.role === 'admin' ? 'إدارة' : 'طالب'})</span>}
                              
                              <div className={`p-4 shadow-inner border relative text-sm font-bold leading-loose
                                ${isMe 
                                  ? `bg-gradient-to-br from-${themeColor}-600 to-${themeColor === 'indigo' ? 'violet' : 'teal'}-600 text-white rounded-[1.5rem] rounded-tr-sm border-${themeColor}-400/30` 
                                  : 'bg-[#0f1423] text-slate-200 border-white/5 rounded-[1.5rem] rounded-tl-sm'}`}
                              >
                                <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: msg.content }} />
                                
                                <div className={`text-[9px] mt-2 flex items-center gap-1.5 ${isMe ? `text-${themeColor}-200 justify-end` : 'text-slate-500 justify-start'}`}>
                                  <span>{new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                  {isMe && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-sky-300" /> : <Check className={`w-3.5 h-3.5 text-${themeColor}-300/50`} />)}
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

               <div className="bg-[#0f1423]/90 backdrop-blur-2xl border-t border-white/5 shrink-0 pb-safe-bottom">
                 <form onSubmit={handleSendReply} className="flex items-end gap-3 p-4 transition-all">
                    <div className="flex-1 bg-[#02040a]/60 rounded-[2rem] border border-white/5 shadow-inner overflow-hidden p-1">
                       <ForumEditor content={replyContent} setContent={setReplyContent} canUploadImage={true} placeholder="اكتب رسالتك هنا..." minHeight="60px" />
                    </div>
                    <button type="submit" disabled={isReplying || !replyContent.replace(/<[^>]*>?/gm, '').trim()} className={`h-14 w-14 rounded-[1.8rem] bg-gradient-to-br from-${activeThread.type === 'group' ? 'indigo' : 'emerald'}-600 to-${activeThread.type === 'group' ? 'blue' : 'teal'}-600 text-white flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_currentColor] border border-white/20 mb-1.5 active:scale-95`}>
                      {isReplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-1 rtl:ml-0 rtl:-mr-1 rtl:rotate-180" />}
                    </button>
                 </form>
               </div>
             </>
           )}
        </div>
      </div>

      {/* 🚀 Modal: رسالة خاصة جديدة (تم التبسيط وإزالة المجالس منها) */}
      <AnimatePresence>
        {showNewMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#02040a]/90 backdrop-blur-md" onClick={() => setShowNewMessage(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-[#0f1423] rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden z-10 flex flex-col" dir="rtl">
              
              <div className="px-8 pt-8 pb-6 border-b border-white/5 bg-[#02040a]/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white drop-shadow-sm">رسالة خاصة جديدة</h3>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">تواصل مباشر وآمن</p>
                  </div>
                </div>
                <button onClick={() => setShowNewMessage(false)} className="p-2 text-slate-400 hover:text-rose-400 bg-[#0f1423] border border-white/5 rounded-xl shadow-inner active:scale-90"><X className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleSendNewPrivateMessage} className="p-8 space-y-6">
                <div className="space-y-3 bg-[#02040a]/40 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">المستلم</label>
                  <select required value={newMessage.receiver_id} onChange={(e) => setNewMessage({...newMessage, receiver_id: e.target.value})} className="block w-full rounded-2xl border border-white/5 py-4 px-4 text-white bg-[#0f1423] focus:ring-1 focus:ring-emerald-500/50 text-sm font-bold outline-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423]">
                    <option value="">اختر المستلم...</option>
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name} ({u.role === 'teacher' ? 'معلم' : u.role === 'admin' ? 'إدارة' : 'طالب'})</option>)}
                  </select>
                </div>
                
                <div className="space-y-3 bg-[#02040a]/40 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">عنوان الرسالة</label>
                  <input type="text" required value={newMessage.subject} onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})} placeholder="أدخل عنواناً مختصراً..." className="block w-full rounded-2xl border border-white/5 py-4 px-4 text-white bg-[#0f1423] focus:ring-1 focus:ring-emerald-500/50 text-sm font-bold outline-none shadow-inner placeholder:text-slate-600" />
                </div>
                
                <div className="space-y-3 bg-[#02040a]/40 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">المحتوى</label>
                  <div className="bg-[#0f1423] rounded-2xl border border-white/5 overflow-hidden shadow-inner p-1">
                    <ForumEditor content={newMessage.content} setContent={(val) => setNewMessage({...newMessage, content: val})} canUploadImage={true} placeholder="اكتب رسالتك هنا..." minHeight="150px" />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                  <button type="submit" disabled={isSubmitting} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black hover:opacity-90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center gap-2 active:scale-95">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Send className="w-5 h-5 -ml-1 rtl:ml-0 rtl:-mr-1 rtl:rotate-180" /> إرسال الرسالة</>}
                  </button>
                  <button type="button" onClick={() => setShowNewMessage(false)} className="px-8 py-4 rounded-2xl bg-[#0f1423] border border-white/5 text-slate-300 font-black hover:bg-white/5 transition-all active:scale-95 shadow-inner">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
