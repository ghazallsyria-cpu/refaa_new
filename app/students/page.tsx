// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Key, Download, 
  UserPlus, Users, AlertCircle, FileSpreadsheet, 
  GraduationCap, ChevronRight, ChevronLeft, BookOpen,
  UploadCloud, CheckCircle2, Loader2, AlertTriangle, FileText, ClipboardPaste, Award, Target, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import * as Dialog from '@radix-ui/react-dialog';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import GrantBadgeModal from '@/components/GrantBadgeModal';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

export default function StudentsPage() {
  const { user } = useAuth();
  const {
    students, sections, parents, loading,
    fetchStudents, fetchSections, fetchParents,
    addStudent, updateStudent, deleteUser, resetPassword
  } = useUsersSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedTrack, setSelectedTrack] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  
  // 🚀 حالات نظام الاستيراد الجماعي الذكي
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSectionId, setImportSectionId] = useState('');
  const [importMethod, setImportMethod] = useState<'excel' | 'pdf'>('pdf');
  const [rawPdfText, setRawPdfText] = useState('');
  const [importData, setImportData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, successful: 0, failed: 0, errors: [] as string[] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });
  
  // 🚀 حالات نافذة الأوسمة
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [studentForBadge, setStudentForBadge] = useState<{id: string, name: string} | null>(null);

  const [addForm, setAddForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', section_id: '', parent_id: ''
  });
  const [editForm, setEditForm] = useState<{
    full_name: string; national_id: string; email: string; phone: string; parent_id: string; next_year_track: 'scientific' | 'literary' | '' | null;
  }>({ full_name: '', national_id: '', email: '', phone: '', parent_id: '', next_year_track: '' });

  useEffect(() => {
    fetchStudents();
    fetchSections();
    fetchParents();
  }, [fetchStudents, fetchSections, fetchParents]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const userData = Array.isArray(s.users) ? s.users[0] : s.users;
      const fullName = userData?.full_name || '';
      const email = userData?.email || '';

      const matchesSection = selectedSection === 'all' || String(s.section_id) === String(selectedSection);
      const matchesTrack = selectedTrack === 'all' || 
        (selectedTrack === 'none' ? !s.next_year_track : s.next_year_track === selectedTrack);
      const matchesSearch = 
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.national_id || '').includes(searchTerm);
      
      return matchesSection && matchesTrack && matchesSearch;
    });
  }, [students, searchTerm, selectedSection, selectedTrack]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const currentStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = useMemo(() => {
    const tenthGradeStudents = students.filter(s => {
      const secData = Array.isArray(s.sections) ? s.sections[0] : s.sections;
      const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
      return classData?.name?.includes('العاشر') || classData?.level === 10;
    });

    return {
      total: students.length,
      scientific: tenthGradeStudents.filter(s => s.next_year_track === 'scientific').length,
      literary: tenthGradeStudents.filter(s => s.next_year_track === 'literary').length,
      unassigned: students.filter(s => !s.section_id).length,
    };
  }, [students]);

  // ================= دوال الاستيراد الجماعي والمحلل الذكي =================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      let processed: any[] = [];
      data.forEach((row: any) => {
        const nameKey = Object.keys(row).find(k => k.includes('اسم') || k.includes('سم') || k.includes('Name'));
        const idKey = Object.keys(row).find(k => k.includes('مدني') || k.includes('رقم') || k.includes('ID'));
        const phoneKey = Object.keys(row).find(k => k.includes('هاتف') || k.includes('ولي') || k.includes('Phone'));

        if (nameKey && idKey) {
          const names = String(row[nameKey]).split('\n').map(s => s.trim()).filter(Boolean);
          const ids = String(row[idKey]).split('\n').map(s => s.trim().replace(/\D/g, '')).filter(Boolean);
          const phones = phoneKey ? String(row[phoneKey]).split('\n').map(s => s.trim()).filter(Boolean) : [];

          const maxLen = Math.max(names.length, ids.length);
          for (let i = 0; i < maxLen; i++) {
            if (names[i] && ids[i] && ids[i].length >= 10) {
               processed.push({ full_name: names[i], national_id: ids[i], phone: phones[i] || '' });
            }
          }
        }
      });
      setImportData(processed);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfTextParse = () => {
    if (!rawPdfText.trim()) return alert('يرجى لصق النص المنسوخ أولاً');

    const lines = rawPdfText.split('\n').map(l => l.trim()).filter(Boolean);
    let processed: any[] = [];
    const existingIdsInBatch = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const civilIdMatch = line.match(/\b[23]\d{11}\b/);

      if (civilIdMatch) {
        const national_id = civilIdMatch[0];
        let full_name = "";
        let phone = "";

        const phoneMatch = line.match(/\b[569]\d{7}\b/);
        if (phoneMatch) phone = phoneMatch[0];

        let cleanedLine = line
          .replace(national_id, '')
          .replace(phone, '')
          .replace(/ذكر|انثى|أنثى|ملاحظات/g, '')
          .replace(/[0-9]/g, '')
          .replace(/["',-]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanedLine.length > 8 && /[\u0600-\u06FF]/.test(cleanedLine)) {
          full_name = cleanedLine;
        } else {
          for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
             let prevLine = lines[j]
               .replace(/ذكر|انثى|أنثى|ملاحظات/g, '')
               .replace(/[0-9]/g, '')
               .replace(/["',-]/g, '')
               .replace(/\s+/g, ' ')
               .trim();
             if (prevLine.length > 8 && /[\u0600-\u06FF]/.test(prevLine)) {
                full_name = prevLine;
                break;
             }
          }
        }

        if (!phone) {
           for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
               const pMatch = lines[j].match(/\b[569]\d{7}\b/);
               if (pMatch) {
                   phone = pMatch[0];
                   break;
               }
           }
        }

        if (full_name && national_id && !existingIdsInBatch.has(national_id)) {
           full_name = full_name.replace(/\s+/g, ' ').trim();
           processed.push({ full_name, national_id, phone });
           existingIdsInBatch.add(national_id);
        }
      }
    }

    if (processed.length === 0) {
      alert('لم يتم العثور على أرقام مدنية صحيحة في النص.');
    } else {
      setImportData(processed);
    }
  };

  const startBulkImport = async () => {
    if (!importSectionId) return alert('الرجاء اختيار الفصل والشعبة أولاً لربط الطلاب بهم.');
    if (importData.length === 0) return alert('لا يوجد بيانات للاستيراد.');

    setIsImporting(true);
    setImportProgress({ current: 0, total: importData.length, successful: 0, failed: 0, errors: [] });

    let successCount = 0;
    let failCount = 0;
    let currentErrors: string[] = [];
    const existingIds = new Set(students.map(s => s.national_id));

    for (let i = 0; i < importData.length; i++) {
      const student = importData[i];
      setImportProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        if (existingIds.has(student.national_id)) {
          throw new Error('الرقم المدني مسجل مسبقاً في النظام');
        }

        await addStudent({
          full_name: student.full_name,
          national_id: student.national_id,
          phone: student.phone,
          section_id: importSectionId,
        });
        
        successCount++;
        existingIds.add(student.national_id);
      } catch (err: any) {
        failCount++;
        currentErrors.push(`الطالب (${student.full_name}): ${err.message}`);
      }
    }

    setImportProgress(prev => ({ ...prev, successful: successCount, failed: failCount, errors: currentErrors }));
    setIsImporting(false);
    fetchStudents();
  };

  const handleGrantBadgeClick = (student: any) => {
    const userData = Array.isArray(student.users) ? student.users[0] : student.users;
    setStudentForBadge({
      id: student.id,
      name: userData?.full_name || 'غير معروف'
    });
    setIsBadgeModalOpen(true);
  };

  // ================= باقي الدوال التنفيذية =================
  const handleAddSubmit = async () => {
    try {
      if (!addForm.full_name || !addForm.national_id) return alert('يرجى تعبئة الحقول الإلزامية');
      await addStudent(addForm);
      alert('تمت الإضافة بنجاح');
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', section_id: '', parent_id: '' });
    } catch (error: any) { alert(error.message || 'حدث خطأ أثناء الإضافة'); }
  };

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    const userData = Array.isArray(student.users) ? student.users[0] : student.users;
    setEditForm({
      full_name: userData?.full_name || '',
      national_id: student.national_id || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      parent_id: student.parent_id || '',
      next_year_track: student.next_year_track || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      if (!editingStudent) return;
      const updateData = {
        full_name: editForm.full_name,
        national_id: editForm.national_id,
        email: editForm.email,
        phone: editForm.phone,
        parent_id: editForm.parent_id || null,
        next_year_track: editForm.next_year_track === '' ? null : (editForm.next_year_track as 'scientific' | 'literary')
      };
      await updateStudent(editingStudent.id, editingStudent.national_id, updateData);
      alert('تم التحديث بنجاح');
      setShowEditModal(false);
    } catch (error: any) { alert(error.message); }
  };

  const handleResetPasswordClick = (student: any) => {
    setResetPasswordForm({ userId: student.id, newPassword: '' });
    setShowPasswordResetModal(true);
  };

  const handleResetPasswordSubmit = async () => {
    try {
      const result = await resetPassword(resetPasswordForm.userId, resetPasswordForm.newPassword);
      alert(`تم تغيير كلمة المرور بنجاح.\nكلمة المرور الجديدة: ${result.newPassword}`);
      setShowPasswordResetModal(false);
    } catch (error: any) { alert(error.message); }
  };

  const handleDeleteClick = (id: string) => {
    setStudentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      await deleteUser(studentToDelete);
      alert('تم الحذف بنجاح');
      setShowDeleteModal(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (error: any) { alert(error.message); }
  };

  const exportToExcel = () => {
    const data = filteredStudents.map(student => {
      const userData = Array.isArray(student.users) ? student.users[0] : student.users;
      const secData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
      const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
      const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents;
      const parentUserData = Array.isArray(parentData?.users) ? parentData?.users[0] : parentData?.users;

      return {
        'الاسم الرباعي': userData?.full_name || 'غير معروف',
        'الرقم المدني': student.national_id,
        'البريد الإلكتروني': userData?.email,
        'رقم الهاتف': userData?.phone,
        'الصف': classData?.name || 'غير محدد',
        'الشعبة': secData?.name || 'غير محدد',
        'المسار': student.next_year_track === 'scientific' ? 'علمي' : student.next_year_track === 'literary' ? 'أدبي' : 'غير محدد',
        'ولي الأمر': parentUserData?.full_name || 'غير مسجل'
      };
    });
    
    if (data.length === 0) return alert('لا يوجد بيانات للتصدير');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب");
    XLSX.writeFile(workbook, "قائمة_الطلاب.xlsx");
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="relative min-h-[100dvh] bg-transparent font-sans text-slate-100 selection:bg-indigo-500/30 pb-20 pt-6" dir="rtl">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] opacity-70" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px] opacity-70" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8 pt-8">
        
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen transition-transform duration-1000 group-hover:scale-110"></div>
          
          <div className="relative z-10 text-center lg:text-right w-full lg:w-auto">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest mx-auto md:mx-0 shadow-inner backdrop-blur-md mb-3">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm" /> سجل القيود الطلابية
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2">إدارة الطلاب</h1>
            <p className="text-sm sm:text-base text-slate-300 font-bold max-w-md mx-auto lg:mx-0 opacity-90 drop-shadow-sm">قاعدة بيانات شاملة لجميع الطلاب المسجلين في المنظومة.</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 relative z-10 w-full lg:w-auto mt-2 lg:mt-0">
            <button onClick={exportToExcel} className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-slate-300 shadow-inner border border-white/10 hover:bg-white/10 hover:text-white transition-all active:scale-95 backdrop-blur-sm">
              <Download className="h-4 w-4 sm:h-5 sm:w-5" /> تصدير Excel
            </button>
            
            <button onClick={() => { setShowImportModal(true); setImportData([]); setImportProgress({ current: 0, total: 0, successful: 0, failed: 0, errors: [] }); setRawPdfText(''); }} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500/10 px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-indigo-300 shadow-inner border border-indigo-500/30 hover:bg-indigo-500/20 transition-all active:scale-95 backdrop-blur-sm">
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" /> استيراد جماعي
            </button>

            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600/90 px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all active:scale-95 border border-indigo-400/50 backdrop-blur-md">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" /> إضافة طالب
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-2 group relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-500/20 blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen"></div>
             <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-500/20 flex items-center justify-center text-blue-400 relative z-10 group-hover:scale-110 transition-transform shadow-inner"><Users className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md"/></div>
             <div className="relative z-10"><p className="text-2xl sm:text-3xl font-black text-white leading-none drop-shadow-lg">{stats.total}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest opacity-80">إجمالي الطلاب</p></div>
          </div>
          <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-2 group relative overflow-hidden border-emerald-500/20">
             <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-500/20 blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen"></div>
             <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 flex items-center justify-center text-emerald-400 relative z-10 group-hover:scale-110 transition-transform shadow-inner"><BookOpen className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md"/></div>
             <div className="relative z-10"><p className="text-2xl sm:text-3xl font-black text-white leading-none drop-shadow-lg">{stats.scientific}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest opacity-80">علمي (العاشر)</p></div>
          </div>
          <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-2 group relative overflow-hidden border-purple-500/20">
             <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-purple-500/20 blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen"></div>
             <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-purple-500/10 backdrop-blur-md border border-purple-500/20 flex items-center justify-center text-purple-400 relative z-10 group-hover:scale-110 transition-transform shadow-inner"><BookOpen className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md"/></div>
             <div className="relative z-10"><p className="text-2xl sm:text-3xl font-black text-white leading-none drop-shadow-lg">{stats.literary}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest opacity-80">أدبي (العاشر)</p></div>
          </div>
          <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-2 group relative overflow-hidden border-rose-500/20">
             <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-rose-500/20 blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen"></div>
             <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-rose-500/10 backdrop-blur-md border border-rose-500/20 flex items-center justify-center text-rose-400 relative z-10 group-hover:scale-110 transition-transform shadow-inner"><AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md"/></div>
             <div className="relative z-10"><p className="text-2xl sm:text-3xl font-black text-white leading-none drop-shadow-lg">{stats.unassigned}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest opacity-80">بدون فصل</p></div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border-white/10 shadow-inner flex flex-col md:flex-row items-center gap-4 relative z-20">
          <div className="relative flex-1 w-full group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors drop-shadow-sm" />
            <input 
              type="text" 
              className="w-full rounded-xl sm:rounded-2xl border border-white/10 py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/40 backdrop-blur-md focus:bg-white/5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-xs sm:text-sm font-bold transition-all shadow-inner outline-none placeholder:text-slate-500" 
              placeholder="البحث بالاسم، الرقم المدني..." 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <select value={selectedSection} onChange={(e) => { setSelectedSection(e.target.value); setCurrentPage(1); }} className="flex-1 md:w-48 rounded-xl sm:rounded-2xl border border-white/10 py-3.5 px-4 text-white bg-[#02040a]/40 backdrop-blur-md focus:bg-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm font-bold appearance-none cursor-pointer transition-all shadow-inner outline-none [&>option]:bg-[#0f1423]">
              <option value="all">جميع الفصول والشعب</option>
              {sections.map(s => {
                const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>;
              })}
            </select>
            <select value={selectedTrack} onChange={(e) => { setSelectedTrack(e.target.value); setCurrentPage(1); }} className="flex-1 md:w-40 rounded-xl sm:rounded-2xl border border-white/10 py-3.5 px-4 text-white bg-[#02040a]/40 backdrop-blur-md focus:bg-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm font-bold appearance-none cursor-pointer transition-all shadow-inner outline-none [&>option]:bg-[#0f1423]">
              <option value="all">جميع المسارات</option><option value="scientific">علمي</option><option value="literary">أدبي</option><option value="none">لم يحدد</option>
            </select>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border-white/10 overflow-hidden hidden lg:block">
          <div className="overflow-x-auto custom-scrollbar p-1">
            <table className="min-w-full divide-y divide-white/5 border-collapse">
              <thead className="bg-white/5 backdrop-blur-md border-b border-white/10">
                <tr>
                  <th className="py-5 pr-8 pl-4 text-right text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">الطالب</th>
                  <th className="px-4 py-5 text-right text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">الرقم المدني</th>
                  <th className="px-4 py-5 text-right text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">الصف والشعبة</th>
                  <th className="px-4 py-5 text-right text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">المسار</th>
                  <th className="px-4 py-5 text-right text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">ولي الأمر</th>
                  <th className="py-5 pl-8 pr-4 text-left text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest w-48">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-transparent">
                {loading ? (
                  <tr><td colSpan={6} className="py-32 text-center"><div className="h-12 w-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /><p className="font-bold text-indigo-300 tracking-widest animate-pulse">جاري التحميل...</p></td></tr>
                ) : currentStudents.length === 0 ? (
                  <tr><td colSpan={6} className="py-32 text-center">
                    <div className="bg-white/5 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/10"><Search className="h-10 w-10 text-slate-500 drop-shadow-sm"/></div>
                    <p className="font-black text-lg text-white drop-shadow-md">لا يوجد نتائج تطابق الفلاتر</p>
                  </td></tr>
                ) : (
                  currentStudents.map((student) => {
                    const userData = Array.isArray(student.users) ? student.users[0] : student.users;
                    const secData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
                    const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
                    const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents;
                    const parentUserData = Array.isArray(parentData?.users) ? parentData?.users[0] : parentData?.users;

                    return (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="whitespace-nowrap py-4 pr-8 pl-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[#0f1423] text-slate-400 flex items-center justify-center font-black text-sm border border-white/10 group-hover:border-indigo-500/30 group-hover:text-indigo-400 shadow-inner group-hover:scale-110 transition-all duration-300 shrink-0">
                            {userData?.full_name?.charAt(0) || 'ط'}
                          </div>
                          <div>
                            <p className="font-black text-white text-sm drop-shadow-sm transition-colors group-hover:text-indigo-100">{userData?.full_name || 'غير معروف'}</p>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-0.5">{userData?.email || 'لا يوجد بريد'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs sm:text-sm font-bold text-slate-300 font-mono tracking-wider">{student.national_id}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs sm:text-sm font-black text-white drop-shadow-sm">{classData?.name || 'بدون صف'}</span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 shadow-inner w-fit">{secData?.name || 'بدون شعبة'}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {classData?.level === 10 || classData?.name?.includes('العاشر') ? (
                          student.next_year_track ? (
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black border shadow-inner ${student.next_year_track === 'scientific' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-purple-500/10 text-purple-300 border-purple-500/30'}`}>
                              {student.next_year_track === 'scientific' ? 'علمي' : 'أدبي'}
                            </span>
                          ) : <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/10 shadow-inner">لم يحدد</span>
                        ) : <span className="text-slate-500 font-black">-</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs sm:text-sm font-bold text-slate-300 truncate max-w-[150px]">
                        {parentUserData?.full_name || 'غير مسجل'}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-8 pr-4 text-left">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button onClick={() => handleGrantBadgeClick(student)} className="p-2 sm:p-2.5 text-slate-400 hover:text-amber-400 bg-white/5 hover:bg-amber-500/10 rounded-xl shadow-inner border border-white/10 hover:border-amber-500/30 transition-all active:scale-95" title="منح وسام تقديري"><Award className="w-4 h-4" /></button>
                          <button onClick={() => handleResetPasswordClick(student)} className="p-2 sm:p-2.5 text-slate-400 hover:text-indigo-400 bg-white/5 hover:bg-indigo-500/10 rounded-xl shadow-inner border border-white/10 hover:border-indigo-500/30 transition-all active:scale-95" title="تغيير كلمة المرور"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleEditClick(student)} className="p-2 sm:p-2.5 text-slate-400 hover:text-emerald-400 bg-white/5 hover:bg-emerald-500/10 rounded-xl shadow-inner border border-white/10 hover:border-emerald-500/30 transition-all active:scale-95" title="تعديل البيانات"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteClick(student.id)} className="p-2 sm:p-2.5 text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-xl shadow-inner border border-white/10 hover:border-rose-500/30 transition-all active:scale-95" title="حذف نهائي"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:hidden grid gap-4">
           {loading ? (
             <div className="py-20 text-center"><Loader2 className="w-10 h-10 border-indigo-500/30 animate-spin mx-auto text-indigo-500 drop-shadow-md" /></div>
           ) : currentStudents.length === 0 ? (
             <div className="py-16 text-center bg-[#02040a]/40 rounded-[2rem] border border-dashed border-white/10 shadow-inner">
                <Search className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
                <p className="font-bold text-slate-400 text-sm">لا يوجد نتائج</p>
             </div>
           ) : (
             currentStudents.map((student) => {
               const userData = Array.isArray(student.users) ? student.users[0] : student.users;
               const secData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
               const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
               const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents;
               const parentUserData = Array.isArray(parentData?.users) ? parentData?.users[0] : parentData?.users;

               return (
               <div key={student.id} className="bg-[#02040a]/40 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 shadow-inner hover:bg-white/5 transition-colors space-y-4 group">
                  <div className="flex items-start justify-between">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[#0f1423] text-slate-400 font-black rounded-xl border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors">{userData?.full_name?.charAt(0) || 'ط'}</div>
                        <div>
                          <p className="font-black text-white text-sm drop-shadow-sm">{userData?.full_name || 'غير معروف'}</p>
                          <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{student.national_id}</p>
                        </div>
                     </div>
                     <div className="flex gap-1.5 flex-wrap justify-end max-w-[120px]">
                        <button onClick={() => handleGrantBadgeClick(student)} className="p-2 text-slate-400 hover:text-amber-400 bg-white/5 border border-white/10 shadow-inner rounded-lg transition-all active:scale-90"><Award className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleResetPasswordClick(student)} className="p-2 text-slate-400 hover:text-indigo-400 bg-white/5 border border-white/10 shadow-inner rounded-lg transition-all active:scale-90"><Key className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleEditClick(student)} className="p-2 text-slate-400 hover:text-emerald-400 bg-white/5 border border-white/10 shadow-inner rounded-lg transition-all active:scale-90"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteClick(student.id)} className="p-2 text-slate-400 hover:text-rose-400 bg-white/5 border border-white/10 shadow-inner rounded-lg transition-all active:scale-90"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold bg-[#0f1423]/60 p-3 rounded-xl border border-white/5 shadow-inner">
                     <span className="text-indigo-300">{classData?.name || ''} - {secData?.name || ''}</span>
                     <span className="text-slate-500 max-w-[120px] truncate">{parentUserData?.full_name || 'بدون ولي أمر'}</span>
                  </div>
               </div>
               );
             })
           )}
        </motion.div>

        <AnimatePresence>
          {totalPages > 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between border-t border-white/10 bg-transparent px-4 py-4 sm:px-6 relative z-10">
              <p className="text-[10px] sm:text-xs font-bold text-slate-400">
                إظهار <span className="font-black text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> إلى <span className="font-black text-white">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> من أصل <span className="font-black text-white">{filteredStudents.length}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-all shadow-inner active:scale-95"><ChevronRight className="w-4 h-4 sm:w-5 sm:h-5"/></button>
                <div className="flex items-center gap-1 px-2 font-black text-xs sm:text-sm text-white drop-shadow-md">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-all shadow-inner active:scale-95"><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5"/></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ==========================================
          🚀 النوافذ المنبثقة (Glass Modals)
          ========================================== */}

      {/* نافذة الاستيراد الجماعي */}
      <AnimatePresence>
        {showImportModal && (
          <Dialog.Root open={showImportModal} onOpenChange={setShowImportModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-indigo-500/30 p-0 shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300" dir="rtl">
                
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen"></div>

                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#02040a]/40 relative z-10">
                  <div>
                     <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 drop-shadow-md">
                       <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 drop-shadow-sm"/></div>
                       الاستيراد الجماعي للطلاب
                     </h3>
                     <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 ml-14">قم بلصق النص من كشوفات الـ PDF أو رفع ملف Excel ليقوم النظام بقراءتها تلقائياً.</p>
                  </div>
                  <Dialog.Close className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-90"><X className="w-5 h-5"/></Dialog.Close>
                </div>
                
                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar relative z-10 flex-1">
                  {!isImporting && importProgress.total === 0 && (
                    <div className="space-y-6">
                      <div className="bg-amber-500/10 border border-amber-500/20 p-4 sm:p-5 rounded-2xl flex gap-3 text-amber-300 text-xs sm:text-sm font-black shadow-inner backdrop-blur-sm">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-md" />
                        <p className="leading-relaxed drop-shadow-sm">أولاً، اختر الصف والشعبة التي تريد استيراد الطلاب إليها. ثم اختر طريقة الإدخال (PDF أو Excel).</p>
                      </div>
                      
                      <div className="bg-[#02040a]/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">الفصل المستهدف <span className="text-rose-500">*</span></label>
                        <select value={importSectionId} onChange={e => setImportSectionId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 sm:py-4 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm shadow-inner transition-colors [&>option]:bg-[#0f1423] cursor-pointer">
                          <option value="">-- يرجى اختيار الفصل والشعبة --</option>
                          {sections.map(s => {
                            const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                            return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>;
                          })}
                        </select>
                      </div>

                      {importSectionId && (
                        <div className="border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-inner bg-[#02040a]/40 backdrop-blur-md">
                          <div className="flex border-b border-white/5 bg-[#0f1423]/60">
                            <button onClick={() => setImportMethod('pdf')} className={`flex-1 py-3.5 sm:py-4 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all ${importMethod === 'pdf' ? 'bg-indigo-500/10 text-indigo-300 border-b-2 border-indigo-500 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                              <ClipboardPaste className="w-4 h-4 sm:w-5 sm:h-5" /> لصق ذكي (من PDF)
                            </button>
                            <button onClick={() => setImportMethod('excel')} className={`flex-1 py-3.5 sm:py-4 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all ${importMethod === 'excel' ? 'bg-indigo-500/10 text-indigo-300 border-b-2 border-indigo-500 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                              <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" /> رفع ملف (Excel / CSV)
                            </button>
                          </div>

                          <div className="p-5 sm:p-6 bg-transparent">
                            {importMethod === 'pdf' ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400">قم بفتح كشف الـ PDF، حدد الجدول الخاص بالشعبة بالكامل (Ctrl+A أو تظليل)، ثم انسخه والصقه في المربع أدناه.</p>
                                <textarea 
                                  value={rawPdfText}
                                  onChange={(e) => setRawPdfText(e.target.value)}
                                  placeholder="ألصق النص هنا..."
                                  className="w-full h-40 sm:h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs sm:text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none shadow-inner placeholder:text-slate-600 transition-colors"
                                />
                                <button onClick={handlePdfTextParse} className="w-full bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-95 text-xs sm:text-sm">
                                  <FileText className="w-4 h-4 sm:w-5 sm:h-5"/> استخراج البيانات ومعالجتها
                                </button>
                              </motion.div>
                            ) : (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 rounded-[1.5rem] sm:rounded-[2rem] p-8 sm:p-10 text-center hover:bg-indigo-500/10 transition-colors relative cursor-pointer group shadow-inner backdrop-blur-sm">
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} ref={fileInputRef} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <div className="flex flex-col items-center gap-4 relative z-0">
                                  <div className="h-14 w-14 sm:h-16 sm:w-16 bg-[#02040a] border border-indigo-500/30 rounded-2xl shadow-inner flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-all duration-300">
                                    <UploadCloud className="h-6 w-6 sm:h-8 sm:w-8 drop-shadow-md" />
                                  </div>
                                  <div>
                                    <p className="text-base sm:text-lg font-black text-white drop-shadow-md">اضغط أو اسحب ملف Excel هنا</p>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">يتم دعم صيغ xlsx و csv (تأكد من وجود عامود للاسم وعامود للرقم المدني)</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data Preview */}
                  {!isImporting && importData.length > 0 && importProgress.total === 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-6 border-t border-white/5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl shadow-inner backdrop-blur-sm">
                        <h4 className="font-black text-emerald-300 flex items-center gap-2 text-xs sm:text-sm drop-shadow-sm"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5"/> تم قراءة واستخراج {importData.length} طالب بنجاح</h4>
                        <button onClick={() => setImportData([])} className="text-[10px] sm:text-xs font-black text-rose-400 hover:text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 active:scale-95 transition-all">إلغاء وإعادة المحاولة</button>
                      </div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar border border-white/10 rounded-[1.5rem] bg-[#02040a]/40 shadow-inner">
                        <table className="w-full text-right text-xs sm:text-sm whitespace-nowrap">
                          <thead className="bg-white/5 sticky top-0 backdrop-blur-md">
                            <tr>
                              <th className="p-3 sm:p-4 font-black text-slate-300 border-b border-white/5 uppercase tracking-widest text-[10px] sm:text-xs">الاسم الرباعي</th>
                              <th className="p-3 sm:p-4 font-black text-slate-300 border-b border-white/5 uppercase tracking-widest text-[10px] sm:text-xs text-center">الرقم المدني</th>
                              <th className="p-3 sm:p-4 font-black text-slate-300 border-b border-white/5 uppercase tracking-widest text-[10px] sm:text-xs text-center">رقم الهاتف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {importData.map((d, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 sm:p-4 font-bold text-white drop-shadow-sm">{d.full_name}</td>
                                <td className="p-3 sm:p-4 font-mono font-bold text-slate-400 text-center">{d.national_id}</td>
                                <td className="p-3 sm:p-4 font-mono font-bold text-slate-400 text-center">{d.phone || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button onClick={startBulkImport} className="w-full bg-indigo-600/90 backdrop-blur-md text-white font-black py-4 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] flex justify-center items-center gap-2 text-sm sm:text-base border border-indigo-400/50 active:scale-95 mt-4">
                        <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md"/> اعتماد وحفظ {importData.length} طالب في قاعدة البيانات
                      </button>
                    </motion.div>
                  )}

                  {/* Progress UI */}
                  {(isImporting || importProgress.total > 0) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-8 py-4 sm:py-6 relative z-10">
                      <div className="text-center space-y-3 sm:space-y-4">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 bg-[#0f1423] border border-white/10 rounded-full flex items-center justify-center mx-auto shadow-inner relative">
                          {isImporting ? <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400 animate-spin drop-shadow-md"/> : <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 drop-shadow-md"/>}
                          {isImporting && <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-[spin_2s_linear_infinite]" />}
                        </div>
                        <h3 className="text-lg sm:text-2xl font-black text-white drop-shadow-md">{isImporting ? 'جاري تسجيل الطلاب وإنشاء الحسابات...' : 'اكتملت عملية التسجيل!'}</h3>
                        <p className="text-xs sm:text-sm font-bold text-slate-400">{isImporting ? 'يرجى عدم إغلاق هذه النافذة.' : ''} تم معالجة <span className="text-white font-black">{importProgress.current}</span> من أصل <span className="text-white font-black">{importProgress.total}</span></p>
                      </div>
                      
                      <div className="h-3 sm:h-4 bg-[#02040a]/60 rounded-full overflow-hidden shadow-inner border border-white/5 relative">
                        <motion.div 
                          className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] relative"
                          initial={{ width: 0 }}
                          animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                        </motion.div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="flex-1 bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 text-center shadow-inner backdrop-blur-md">
                          <p className="text-3xl sm:text-4xl font-black text-emerald-400 drop-shadow-lg">{importProgress.successful}</p>
                          <p className="text-[10px] sm:text-xs font-black text-emerald-300 mt-1 uppercase tracking-widest">طالب مسجل بنجاح</p>
                        </div>
                        <div className="flex-1 bg-rose-500/10 p-5 rounded-2xl border border-rose-500/20 text-center shadow-inner backdrop-blur-md">
                          <p className="text-3xl sm:text-4xl font-black text-rose-400 drop-shadow-lg">{importProgress.failed}</p>
                          <p className="text-[10px] sm:text-xs font-black text-rose-300 mt-1 uppercase tracking-widest">تخطي (مكرر / خطأ)</p>
                        </div>
                      </div>

                      {importProgress.errors.length > 0 && (
                        <div className="bg-[#02040a]/60 border border-rose-500/30 rounded-[1.5rem] p-5 max-h-48 overflow-y-auto custom-scrollbar shadow-inner backdrop-blur-md">
                          <p className="text-[10px] sm:text-xs font-black text-rose-400 mb-3 flex items-center gap-2 drop-shadow-sm"><AlertTriangle className="w-4 h-4"/> سجل التخطي (تم تجاهلهم لمنع التكرار):</p>
                          <ul className="space-y-1.5 text-[10px] sm:text-xs font-bold text-slate-400 list-disc list-inside px-2">
                            {importProgress.errors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </div>
                      )}

                      {!isImporting && (
                        <button onClick={() => { setShowImportModal(false); setImportData([]); setImportProgress({ current: 0, total: 0, successful: 0, failed: 0, errors: [] }); setRawPdfText(''); }} className="w-full bg-white/10 text-white border border-white/20 font-black py-4 rounded-xl hover:bg-white/20 transition-all text-sm sm:text-base shadow-inner active:scale-95">
                          إغلاق ومتابعة العمل
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة الإضافة الفردية */}
      <AnimatePresence>
        {showAddModal && !showImportModal && (
          <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-indigo-500/30 p-0 shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300" dir="rtl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
                
                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#02040a]/40 relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 drop-shadow-sm"/></div>
                    <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">إضافة طالب جديد</h3>
                  </div>
                  <Dialog.Close className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-90"><X className="w-5 h-5"/></Dialog.Close>
                </div>

                <div className="p-6 sm:p-8 space-y-5 sm:space-y-6 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الاسم الرباعي <span className="text-rose-500">*</span></label>
                        <input type="text" value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner placeholder:text-slate-600" placeholder="أدخل الاسم..." />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الرقم المدني <span className="text-rose-500">*</span></label>
                        <input type="text" value={addForm.national_id} onChange={e => setAddForm({...addForm, national_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner placeholder:text-slate-600" placeholder="أدخل الرقم..." />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">البريد الإلكتروني</label>
                        <input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-left transition-all shadow-inner placeholder:text-slate-600" dir="ltr" placeholder="example@email.com" />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">رقم الهاتف</label>
                        <input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner placeholder:text-slate-600" placeholder="أدخل الهاتف..." />
                     </div>
                     <div className="sm:col-span-2 bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الشعبة والفصل</label>
                        <select value={addForm.section_id} onChange={e => setAddForm({...addForm, section_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm appearance-none cursor-pointer transition-all shadow-inner [&>option]:bg-[#0f1423]">
                           <option value="">بدون شعبة</option>
                           {sections.map(s => {
                             const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                             return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>;
                           })}
                        </select>
                     </div>
                     <div className="sm:col-span-2 bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">حساب ولي الأمر (اختياري)</label>
                        <select value={addForm.parent_id} onChange={e => setAddForm({...addForm, parent_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm appearance-none cursor-pointer transition-all shadow-inner [&>option]:bg-[#0f1423]">
                           <option value="">بدون ولي أمر</option>
                           {parents.map(p => {
                              const pUserData = Array.isArray(p.users) ? p.users[0] : p.users;
                              return <option key={p.id} value={p.id}>{pUserData?.full_name}</option>;
                           })}
                        </select>
                     </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-white/5">
                    <Dialog.Close asChild>
                      <button className="flex-1 bg-white/5 text-slate-300 font-black py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm active:scale-95 shadow-inner">إلغاء</button>
                    </Dialog.Close>
                    <button onClick={handleAddSubmit} className="flex-1 bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] text-xs sm:text-sm active:scale-95 flex items-center justify-center gap-2">
                       <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> إضافة الطالب
                    </button>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة التعديل */}
      <AnimatePresence>
        {showEditModal && (
          <Dialog.Root open={showEditModal} onOpenChange={setShowEditModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-indigo-500/30 p-0 shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300" dir="rtl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
                
                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#02040a]/40 relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><Edit className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 drop-shadow-sm"/></div>
                    <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">تعديل بيانات الطالب</h3>
                  </div>
                  <Dialog.Close className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-90"><X className="w-5 h-5"/></Dialog.Close>
                </div>

                <div className="p-6 sm:p-8 space-y-5 sm:space-y-6 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الاسم الرباعي</label>
                        <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner" />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الرقم المدني</label>
                        <input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner" />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">البريد الإلكتروني</label>
                        <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-left transition-all shadow-inner" dir="ltr" />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">رقم الهاتف</label>
                        <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner" />
                     </div>
                     <div className="sm:col-span-2 bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">ولي الأمر</label>
                        <select value={editForm.parent_id} onChange={e => setEditForm({...editForm, parent_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm appearance-none cursor-pointer transition-all shadow-inner [&>option]:bg-[#0f1423]">
                           <option value="">بدون ولي أمر</option>
                           {parents.map(p => {
                              const pUserData = Array.isArray(p.users) ? p.users[0] : p.users;
                              return <option key={p.id} value={p.id}>{pUserData?.full_name}</option>;
                           })}
                        </select>
                     </div>
                     
                     {(() => {
                       const secData = Array.isArray(editingStudent?.sections) ? editingStudent?.sections[0] : editingStudent?.sections;
                       const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
                       if (classData?.level === 10 || classData?.name?.includes('العاشر')) {
                         return (
                           <div className="sm:col-span-2 bg-indigo-500/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-indigo-500/20 shadow-inner">
                              <label className="text-[10px] sm:text-xs font-black text-indigo-300 block mb-2 uppercase tracking-widest ml-1 drop-shadow-sm"><Target className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />المسار الأكاديمي (للعاشر)</label>
                              <select value={editForm.next_year_track || ''} onChange={e => setEditForm({...editForm, next_year_track: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm appearance-none cursor-pointer transition-all shadow-inner [&>option]:bg-[#0f1423]">
                                 <option value="">لم يحدد</option>
                                 <option value="scientific">علمي 🔬</option>
                                 <option value="literary">أدبي 📚</option>
                              </select>
                           </div>
                         );
                       }
                       return null;
                     })()}
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-white/5">
                    <Dialog.Close asChild>
                      <button className="flex-1 bg-white/5 text-slate-300 font-black py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm active:scale-95 shadow-inner">إلغاء</button>
                    </Dialog.Close>
                    <button onClick={handleEditSubmit} className="flex-1 bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] text-xs sm:text-sm active:scale-95 flex items-center justify-center gap-2">
                       <Save className="w-4 h-4 sm:w-5 sm:h-5" /> حفظ التعديلات
                    </button>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة تغيير كلمة المرور */}
      <AnimatePresence>
        {showPasswordResetModal && (
          <Dialog.Root open={showPasswordResetModal} onOpenChange={setShowPasswordResetModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-indigo-500/30 p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
                <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner relative z-10"><Key className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md"/></div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight relative z-10 drop-shadow-md">تغيير كلمة المرور</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-400 mb-6 sm:mb-8 relative z-10">أدخل كلمة المرور الجديدة للطالب في المربع أدناه.</p>
                
                <div className="bg-[#02040a]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner relative z-10 mb-6 sm:mb-8">
                   <input type="text" placeholder="كلمة المرور الجديدة..." value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="w-full bg-transparent border-none text-white font-black focus:ring-0 outline-none text-center tracking-widest text-lg sm:text-xl placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal placeholder:font-bold" />
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row gap-3 relative z-10">
                  <Dialog.Close asChild>
                    <button className="flex-1 bg-white/5 text-slate-300 font-black py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm active:scale-95 shadow-inner">إلغاء</button>
                  </Dialog.Close>
                  <button onClick={handleResetPasswordSubmit} className="flex-1 bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] text-xs sm:text-sm active:scale-95">حفظ وتغيير</button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة الحذف النهائي */}
      <AnimatePresence>
        {showDeleteModal && (
          <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-rose-500/30 p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner relative z-10"><Trash2 className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md"/></div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight relative z-10 drop-shadow-md">حذف الطالب النهائي</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-400 mb-6 sm:mb-8 leading-relaxed relative z-10">هل أنت متأكد من حذف هذا الطالب؟ هذا الإجراء سيقوم بحذف جميع درجاته وغياباته ولا يمكن التراجع عنه.</p>
                
                <div className="flex flex-col-reverse sm:flex-row gap-3 relative z-10">
                  <Dialog.Close asChild>
                    <button className="flex-1 bg-white/5 text-slate-300 font-black py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm active:scale-95 shadow-inner">تراجع وإلغاء</button>
                  </Dialog.Close>
                  <button onClick={confirmDelete} className="flex-1 bg-rose-600/90 backdrop-blur-md text-white border border-rose-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-rose-500 transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] text-xs sm:text-sm active:scale-95">نعم، احذف الطالب</button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* 🚀 استدعاء مكون نافذة منح الأوسمة الجديد أسفل الصفحة */}
      {studentForBadge && (
        <GrantBadgeModal
          isOpen={isBadgeModalOpen}
          onClose={() => {
            setIsBadgeModalOpen(false);
            setStudentForBadge(null);
          }}
          recipientId={studentForBadge.id}
          recipientName={studentForBadge.name}
          granterId={user?.id || 'admin'} 
        />
      )}
      
    </motion.div>
  );
}
