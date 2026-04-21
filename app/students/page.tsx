'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Key, Download, 
  UserPlus, Users, AlertCircle, FileSpreadsheet, 
  GraduationCap, ChevronRight, ChevronLeft, BookOpen,
  UploadCloud, CheckCircle2, Loader2, AlertTriangle, FileText, ClipboardPaste, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import GrantBadgeModal from '@/components/GrantBadgeModal';

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
  const [importMethod, setImportMethod] = useState<'excel' | 'pdf'>('pdf'); // PDF هو الافتراضي
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

  // 🚀 تم إصلاح المحلل الذكي لمنع حذف حرف الميم!
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

        // 🚀 تم إزالة |م من الفلترة لكي لا نأكل حرف الميم من الأسماء
        let cleanedLine = line
          .replace(national_id, '')
          .replace(phone, '')
          .replace(/ذكر|انثى|أنثى|ملاحظات/g, '')
          .replace(/[0-9]/g, '')
          .replace(/["',-]/g, '')
          .replace(/\s+/g, ' ') // إزالة المسافات الزائدة
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

  // 🚀 دالة فتح مودال الأوسمة
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
    <div className="relative min-h-screen bg-slate-50 font-cairo selection:bg-indigo-200" dir="rtl">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] opacity-70" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px] opacity-70" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8 pt-8">
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة الطلاب</h1>
            <p className="text-slate-500 mt-2 font-bold">قاعدة بيانات شاملة لجميع الطلاب المسجلين في النظام.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={exportToExcel} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 hover:shadow-md">
              <Download className="h-5 w-5 text-slate-400" /> تصدير Excel
            </button>
            
            <button onClick={() => { setShowImportModal(true); setImportData([]); setImportProgress({ current: 0, total: 0, successful: 0, failed: 0, errors: [] }); setRawPdfText(''); }} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700 shadow-sm border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95">
              <FileSpreadsheet className="h-5 w-5 text-indigo-500" /> استيراد دفعة واحدة
            </button>

            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 hover:shadow-indigo-300">
              <UserPlus className="h-5 w-5" /> إضافة طالب
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Users className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.total}</p><p className="text-[10px] font-bold text-slate-400 uppercase">إجمالي الطلاب</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-2 h-full bg-emerald-500"></div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><BookOpen className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.scientific}</p><p className="text-[10px] font-bold text-slate-400 uppercase">علمي (العاشر)</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-purple-50 shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-2 h-full bg-purple-500"></div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600"><BookOpen className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.literary}</p><p className="text-[10px] font-bold text-slate-400 uppercase">أدبي (العاشر)</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertCircle className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.unassigned}</p><p className="text-[10px] font-bold text-slate-400 uppercase">بدون فصل</p></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input type="text" className="w-full rounded-xl border-0 py-3.5 pr-12 pl-5 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" placeholder="البحث بالاسم، الرقم المدني..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select value={selectedSection} onChange={(e) => { setSelectedSection(e.target.value); setCurrentPage(1); }} className="flex-1 md:w-48 bg-slate-50 border-0 rounded-xl py-3.5 px-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              <option value="all">جميع الفصول</option>
              {sections.map(s => {
                const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>;
              })}
            </select>
            <select value={selectedTrack} onChange={(e) => { setSelectedTrack(e.target.value); setCurrentPage(1); }} className="flex-1 md:w-40 bg-slate-50 border-0 rounded-xl py-3.5 px-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              <option value="all">جميع المسارات</option><option value="scientific">علمي</option><option value="literary">أدبي</option><option value="none">لم يحدد</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="py-5 pr-8 pl-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">الطالب</th>
                  <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">الرقم المدني</th>
                  <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">الصف والشعبة</th>
                  <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">المسار</th>
                  <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">ولي الأمر</th>
                  <th className="py-5 pl-8 pr-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-32 text-center"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="font-bold text-slate-400">جاري التحميل...</p></td></tr>
                ) : currentStudents.length === 0 ? (
                  <tr><td colSpan={6} className="py-32 text-center"><div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="h-8 w-8 text-slate-300"/></div><p className="font-bold text-slate-500">لا يوجد نتائج تطابق الفلاتر</p></td></tr>
                ) : (
                  currentStudents.map((student) => {
                    const userData = Array.isArray(student.users) ? student.users[0] : student.users;
                    const secData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
                    const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
                    const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents;
                    const parentUserData = Array.isArray(parentData?.users) ? parentData?.users[0] : parentData?.users;

                    return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="whitespace-nowrap py-4 pr-8 pl-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                            {userData?.full_name?.charAt(0) || 'ط'}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{userData?.full_name || 'غير معروف'}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{userData?.email || 'لا يوجد بريد'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600 font-mono">{student.national_id}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{classData?.name || 'بدون صف'}</span>
                          <span className="text-[10px] font-bold text-indigo-500">{secData?.name || 'بدون شعبة'}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {classData?.level === 10 || classData?.name?.includes('العاشر') ? (
                          student.next_year_track ? (
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${student.next_year_track === 'scientific' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                              {student.next_year_track === 'scientific' ? 'علمي' : 'أدبي'}
                            </span>
                          ) : <span className="text-[10px] font-bold text-slate-400">لم يحدد</span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600">
                        {parentUserData?.full_name || 'غير مسجل'}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-8 pr-4 text-left">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* 🚀 زر منح الوسام مضاف هنا */}
                          <button onClick={() => handleGrantBadgeClick(student)} className="p-2 text-slate-400 hover:text-amber-600 bg-white hover:bg-amber-50 rounded-lg shadow-sm border border-slate-200 transition-all" title="منح وسام تقديري"><Award className="w-4 h-4" /></button>
                          <button onClick={() => handleResetPasswordClick(student)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleEditClick(student)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteClick(student.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden p-4 grid gap-4 bg-slate-50/50">
             {loading ? (
               <div className="py-10 text-center text-slate-400 font-bold">جاري التحميل...</div>
             ) : currentStudents.length === 0 ? (
               <div className="py-10 text-center text-slate-400 font-bold">لا يوجد نتائج</div>
             ) : (
               currentStudents.map((student) => {
                 const userData = Array.isArray(student.users) ? student.users[0] : student.users;
                 const secData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
                 const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
                 const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents;
                 const parentUserData = Array.isArray(parentData?.users) ? parentData?.users[0] : parentData?.users;

                 return (
                 <div key={student.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 font-black rounded-xl flex items-center justify-center">{userData?.full_name?.charAt(0) || 'ط'}</div>
                          <div><p className="font-black text-slate-900">{userData?.full_name || 'غير معروف'}</p><p className="text-xs font-bold text-slate-500 font-mono">{student.national_id}</p></div>
                       </div>
                       <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
                          {/* 🚀 زر منح الوسام مضاف هنا */}
                          <button onClick={() => handleGrantBadgeClick(student)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-50 rounded-lg"><Award className="w-4 h-4" /></button>
                          <button onClick={() => handleResetPasswordClick(student)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleEditClick(student)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteClick(student.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                    <div className="flex justify-between text-xs font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <span className="text-slate-600">{classData?.name || ''} - {secData?.name || ''}</span>
                       <span className="text-slate-500 max-w-[120px] truncate">{parentUserData?.full_name || 'بدون ولي أمر'}</span>
                    </div>
                 </div>
                 );
               })
             )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
              <p className="text-sm font-bold text-slate-500">
                إظهار <span className="font-black text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> إلى <span className="font-black text-slate-900">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> من أصل <span className="font-black text-slate-900">{filteredStudents.length}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                <div className="flex items-center gap-1 px-2 font-black text-sm text-slate-700">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🚀 نافذة الاستيراد الجماعي (Bulk Import Modal with PDF/Excel Smart Options) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
              <div>
                 <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-2"><FileSpreadsheet className="w-6 h-6 text-indigo-600"/> الاستيراد الجماعي للطلاب</h3>
                 <p className="text-xs font-bold text-slate-500 mt-1">قم بلصق النص من كشوفات الـ PDF أو رفع ملف Excel ليقوم النظام بقراءتها تلقائياً.</p>
              </div>
              <button onClick={() => !isImporting && setShowImportModal(false)} disabled={isImporting} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-8 space-y-6">
              {!isImporting && importProgress.total === 0 && (
                <>
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-800 text-sm font-bold">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>أولاً، اختر الصف والشعبة التي تريد استيراد الطلاب إليها. ثم اختر طريقة الإدخال (PDF أو Excel).</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-black text-slate-700 block mb-2">الفصل المستهدف <span className="text-rose-500">*</span></label>
                    <select value={importSectionId} onChange={e => setImportSectionId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-lg">
                      <option value="">-- يرجى اختيار الفصل والشعبة --</option>
                      {sections.map(s => {
                        const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                        return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>;
                      })}
                    </select>
                  </div>

                  {importSectionId && (
                    <div className="border border-slate-200 rounded-[2rem] overflow-hidden">
                      <div className="flex border-b border-slate-200 bg-slate-50">
                        <button onClick={() => setImportMethod('pdf')} className={`flex-1 py-4 text-sm font-black flex items-center justify-center gap-2 transition-colors ${importMethod === 'pdf' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                          <ClipboardPaste className="w-5 h-5" /> لصق ذكي (من PDF)
                        </button>
                        <button onClick={() => setImportMethod('excel')} className={`flex-1 py-4 text-sm font-black flex items-center justify-center gap-2 transition-colors ${importMethod === 'excel' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                          <UploadCloud className="w-5 h-5" /> رفع ملف (Excel / CSV)
                        </button>
                      </div>

                      <div className="p-6">
                        {importMethod === 'pdf' ? (
                          <div className="space-y-4 animate-in fade-in">
                            <p className="text-xs font-bold text-slate-500">قم بفتح كشف الـ PDF، حدد الجدول الخاص بالشعبة بالكامل (Ctrl+A أو تظليل)، ثم انسخه والصقه في المربع أدناه.</p>
                            <textarea 
                              value={rawPdfText}
                              onChange={(e) => setRawPdfText(e.target.value)}
                              placeholder="ألصق النص هنا..."
                              className="w-full h-48 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                            <button onClick={handlePdfTextParse} className="w-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-black py-3 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                              <FileText className="w-5 h-5"/> استخراج البيانات ومعالجتها
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-[2rem] p-10 text-center hover:bg-indigo-50 transition-colors relative cursor-pointer group animate-in fade-in">
                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} ref={fileInputRef} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className="flex flex-col items-center gap-4">
                              <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                <UploadCloud className="h-8 w-8" />
                              </div>
                              <div>
                                <p className="text-lg font-black text-indigo-900">اضغط أو اسحب ملف Excel هنا</p>
                                <p className="text-sm font-bold text-indigo-400 mt-1">يتم دعم صيغ xlsx و csv (تأكد من وجود عامود للاسم وعامود للرقم المدني)</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Data Preview */}
              {!isImporting && importData.length > 0 && importProgress.total === 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500"/> تم قراءة واستخراج {importData.length} طالب بنجاح</h4>
                    <button onClick={() => setImportData([])} className="text-xs font-bold text-rose-500 hover:underline">إلغاء وإعادة المحاولة</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50 p-2">
                    <table className="w-full text-right text-sm">
                      <thead><tr><th className="p-2 font-black text-slate-500 border-b">الاسم الرباعي</th><th className="p-2 font-black text-slate-500 border-b">الرقم المدني</th><th className="p-2 font-black text-slate-500 border-b">رقم الهاتف</th></tr></thead>
                      <tbody>{importData.map((d, i) => (<tr key={i} className="border-b border-slate-100 last:border-0"><td className="p-2 font-bold text-slate-800">{d.full_name}</td><td className="p-2 font-mono text-slate-600">{d.national_id}</td><td className="p-2 font-mono text-slate-600">{d.phone || '-'}</td></tr>))}</tbody>
                    </table>
                  </div>
                  <button onClick={startBulkImport} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-xl shadow-indigo-200 flex justify-center gap-2 text-lg">
                    <UploadCloud className="w-6 h-6"/> اعتماد وحفظ {importData.length} طالب في قاعدة البيانات
                  </button>
                </div>
              )}

              {/* Progress UI */}
              {(isImporting || importProgress.total > 0) && (
                <div className="space-y-6 py-4">
                  <div className="text-center space-y-2">
                    {isImporting ? <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto"/> : <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto"/>}
                    <h3 className="text-xl font-black text-slate-900">{isImporting ? 'جاري تسجيل الطلاب وإنشاء الحسابات، يرجى عدم إغلاق النافذة...' : 'اكتملت عملية التسجيل!'}</h3>
                    <p className="text-sm font-bold text-slate-500">تم معالجة {importProgress.current} من أصل {importProgress.total}</p>
                  </div>
                  
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center"><p className="text-2xl font-black text-emerald-600">{importProgress.successful}</p><p className="text-xs font-bold text-emerald-800 mt-1">طالب مسجل بنجاح</p></div>
                    <div className="flex-1 bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center"><p className="text-2xl font-black text-rose-600">{importProgress.failed}</p><p className="text-xs font-bold text-rose-800 mt-1">تخطي (مسجل مسبقاً / خطأ)</p></div>
                  </div>

                  {importProgress.errors.length > 0 && (
                    <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 max-h-48 overflow-y-auto">
                      <p className="text-xs font-black text-rose-800 mb-2">سجل التخطي (تم تجاهلهم لمنع التكرار):</p>
                      <ul className="space-y-1 text-[10px] font-bold text-rose-600 list-disc list-inside px-2">
                        {importProgress.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}

                  {!isImporting && (
                    <button onClick={() => { setShowImportModal(false); setImportData([]); setImportProgress({ current: 0, total: 0, successful: 0, failed: 0, errors: [] }); setRawPdfText(''); }} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-colors text-lg">
                      إغلاق ومتابعة العمل
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && !showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900">إضافة طالب جديد (فردي)</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div><label className="text-xs font-black text-slate-700 block mb-2">الاسم الرباعي <span className="text-rose-500">*</span></label><input type="text" value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">الرقم المدني <span className="text-rose-500">*</span></label><input type="text" value={addForm.national_id} onChange={e => setAddForm({...addForm, national_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">البريد الإلكتروني</label><input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">رقم الهاتف</label><input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div className="sm:col-span-2"><label className="text-xs font-black text-slate-700 block mb-2">الشعبة والفصل</label><select value={addForm.section_id} onChange={e => setAddForm({...addForm, section_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">بدون شعبة</option>
                 {sections.map(s => {
                   const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                   return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>;
                 })}
                 </select></div>
                 <div className="sm:col-span-2"><label className="text-xs font-black text-slate-700 block mb-2">حساب ولي الأمر (اختياري)</label><select value={addForm.parent_id} onChange={e => setAddForm({...addForm, parent_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">بدون ولي أمر</option>
                 {parents.map(p => {
                    const pUserData = Array.isArray(p.users) ? p.users[0] : p.users;
                    return <option key={p.id} value={p.id}>{pUserData?.full_name}</option>;
                 })}
                 </select></div>
              </div>
              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button onClick={handleAddSubmit} className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">إضافة الطالب</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900">تعديل بيانات الطالب</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div><label className="text-xs font-black text-slate-700 block mb-2">الاسم الرباعي</label><input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">البريد الإلكتروني</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">رقم الهاتف</label><input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div className="sm:col-span-2"><label className="text-xs font-black text-slate-700 block mb-2">ولي الأمر</label><select value={editForm.parent_id} onChange={e => setEditForm({...editForm, parent_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">بدون ولي أمر</option>
                 {parents.map(p => {
                    const pUserData = Array.isArray(p.users) ? p.users[0] : p.users;
                    return <option key={p.id} value={p.id}>{pUserData?.full_name}</option>;
                 })}
                 </select></div>
                 
                 {(() => {
                   const secData = Array.isArray(editingStudent?.sections) ? editingStudent?.sections[0] : editingStudent?.sections;
                   const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
                   if (classData?.level === 10 || classData?.name?.includes('العاشر')) {
                     return (
                       <div className="sm:col-span-2"><label className="text-xs font-black text-slate-700 block mb-2">المسار الأكاديمي (للعاشر)</label><select value={editForm.next_year_track || ''} onChange={e => setEditForm({...editForm, next_year_track: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">لم يحدد</option><option value="scientific">علمي</option><option value="literary">أدبي</option></select></div>
                     );
                   }
                   return null;
                 })()}
              </div>
              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button onClick={handleEditSubmit} className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">حفظ التعديلات</button>
                <button onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-8 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4"><Key className="w-8 h-8"/></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">تغيير كلمة المرور</h3>
            <p className="text-sm font-bold text-slate-500 mb-6">أدخل كلمة المرور الجديدة للطالب في المربع أدناه.</p>
            <input type="text" placeholder="كلمة المرور الجديدة..." value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none mb-6 text-center tracking-widest" />
            <div className="flex gap-3">
              <button onClick={handleResetPasswordSubmit} className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-colors">حفظ</button>
              <button onClick={() => setShowPasswordResetModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-8 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4"><Trash2 className="w-8 h-8"/></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">حذف الطالب النهائي</h3>
            <p className="text-sm font-bold text-slate-500 mb-6 leading-relaxed">هل أنت متأكد من حذف هذا الطالب؟ هذا الإجراء سيقوم بحذف جميع درجاته وغياباته ولا يمكن التراجع عنه.</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 bg-rose-600 text-white font-black py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">نعم، احذف الطالب</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors">تراجع</button>
            </div>
          </div>
        </div>
      )}

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
      
    </div>
  );
}
