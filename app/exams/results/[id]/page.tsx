'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart2, Users, Clock, CheckCircle,
  ArrowRight, Download,
  Search, Filter,
  TrendingUp, AlertCircle,
  FileSpreadsheet,
  FileText, XCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import * as XLSX from 'xlsx';

type Attempt = {
  id: string;
  student: { id: string; full_name: string; email?: string; section_name: string };
  started_at: string;
  completed_at: string;
  score: number;
  status: string;
};

type ExamStats = {
  avg_score: number;
  max_score: number;
  min_score: number;
  pass_rate: number;
  total_attempts: number;
};

export default function ExamResults() {
  const params = useParams();
  const router = useRouter();
  const { fetchExamResults, deleteAttempt } = useExamsSystem();

  const [exam, setExam] = useState<any>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<any[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [questionsData, setQuestionsData] = useState<any[]>([]);
  const [answersData, setAnswersData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        exam: examData,
        students: studentsData,
        attempts: attemptsData,
        questions: qData,
        answers: aData
      } = await fetchExamResults(params.id as string);

      setExam(examData);
      setQuestionsData(qData);
      setAnswersData(aData);

      const formattedAttempts = (attemptsData || []).map((a: any) => {
        const studentData = a.student;

        return {
          ...a,
          student: {
            id: studentData?.id,
            full_name: studentData?.full_name || 'طالب غير معروف',
            email: studentData?.email || '',
            section_name: studentData?.section_name || 'غير محدد'
          }
        };
      });

      const merged = [...formattedAttempts];
      const attemptedIds = new Set(formattedAttempts.map(a => a.student.id));

      (studentsData || []).forEach((s: any) => {
        if (!attemptedIds.has(s.id)) {
          merged.push({
            id: `missing-${s.id}`,
            student: {
              id: s.id,
              full_name: s.full_name,
              email: s.email,
              section_name: s.section_name
            },
            started_at: '',
            completed_at: '',
            score: 0,
            status: 'not_attempted'
          });
        }
      });

      setAttempts(merged);

      const sections = Array.from(new Set(merged.map(a => a.student.section_name)));
      setAvailableSections(sections);

    } finally {
      setLoading(false);
    }
  }, [params.id, fetchExamResults]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!exam) return;

    let filtered = attempts;

    if (selectedSection !== 'all') {
      filtered = filtered.filter(a => a.student.section_name === selectedSection);
    }

    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.student.full_name.includes(searchQuery)
      );
    }

    const scores = filtered.map(a => a.score);
    const max = exam?.max_score || 100;
    const percent = scores.map(s => (s / max) * 100);

    if (percent.length === 0) {
      setStats({
        avg_score: 0,
        max_score: 0,
        min_score: 0,
        pass_rate: 0,
        total_attempts: 0
      });
      return;
    }

    setStats({
      avg_score: Math.round(percent.reduce((a, b) => a + b, 0) / percent.length),
      max_score: Math.round(Math.max(...percent)),
      min_score: Math.round(Math.min(...percent)),
      pass_rate: Math.round((percent.filter(p => p >= 50).length / percent.length) * 100),
      total_attempts: percent.length
    });

    const validIds = new Set(filtered.map(a => a.id));
    const filteredAnswers = answersData.filter(a => validIds.has(a.attempt_id));

    const analytics = questionsData.map((q, i) => {
      const qa = filteredAnswers.filter(a => a.question_id === q.id);
      const correct = qa.filter(a => a.is_correct).length;
      const acc = qa.length ? Math.round((correct / qa.length) * 100) : 0;

      return { name: `سؤال ${i + 1}`, correct: acc };
    });

    setQuestionAnalytics(analytics);

    const dist = [
      { name: '90+', value: percent.filter(p => p >= 90).length },
      { name: '80-89', value: percent.filter(p => p >= 80 && p < 90).length },
      { name: '70-79', value: percent.filter(p => p >= 70 && p < 80).length },
      { name: '50-69', value: percent.filter(p => p >= 50 && p < 70).length },
      { name: '<50', value: percent.filter(p => p < 50).length }
    ].filter(d => d.value > 0);

    setScoreDistribution(dist);

  }, [attempts, selectedSection, searchQuery, exam, answersData, questionsData]);

  const exportToExcel = () => {
    const data = attempts.map(a => ({
      الطالب: a.student.full_name,
      الفصل: a.student.section_name,
      الدرجة: a.score,
      الحالة: a.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'results.xlsx');
  };

  const handleDeleteAttempt = async (id: string) => {
    await deleteAttempt(id);
    setAttempts(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="p-6 space-y-6">

      <div className="flex gap-3">
        <button onClick={exportToExcel}>Excel</button>
        <button onClick={() => window.print()}>PDF</button>
      </div>

      <div className="flex gap-3">
        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
          <option value="all">All</option>
          {availableSections.map(s => <option key={s}>{s}</option>)}
        </select>

        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search"
        />
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th>Student</th>
            <th>Section</th>
            <th>Score</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map(a => (
            <tr key={a.id}>
              <td>{a.student.full_name}</td>
              <td>{a.student.section_name}</td>
              <td>{a.score}</td>
              <td>
                <button onClick={() => handleDeleteAttempt(a.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}
