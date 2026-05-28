'use client';
// 1. أضفنا useCallback هنا في الاستيراد
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import ImageUpload from '@/components/ImageUpload'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminHonorsDashboard() {
  const [activeTab, setActiveTab] = useState('العاشر');
  const [studentName, setStudentName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [imageUrl, setImageUrl] = useState<string>(''); 
  const [resetKey, setResetKey] = useState(0); 
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const grades = ['العاشر', 'الحادي عشر علمي', 'الحادي عشر أدبي', 'الثاني عشر علمي', 'الثاني عشر أدبي'];

  const toArabicDigits = (num: any) => String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

  // 2. التعديل الجوهري هنا: تغليف الدالة بـ useCallback
  const fetchStudents = useCallback(async () => {
    const { data } = await supabase
      .from('top_students')
      .select('*')
      .eq('grade_level', activeTab)
      .order('percentage', { ascending: false });
    setStudents(data || []);
  }, [activeTab]);

  // 3. تحديث الـ useEffect ليراقب الدالة المغلفة
  useEffect(() => { 
    fetchStudents(); 
  }, [fetchStudents]);

  const handleAddStudent = async (e: React.FormEvent) => {
// ... (بقية الكود الخاص بالإضافة والحذف والواجهة يبقى كما هو تماماً دون تغيير)
