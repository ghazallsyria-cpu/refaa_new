import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveAttendanceRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SaveAttendanceRequestSchema);
    
    const { 
      selectedSection, 
      selectedSubject, 
      date, 
      period, 
      attendance, 
      students, 
      userId 
    } = validatedData;

    let sessionId: string;
    const { data: existingSession, error: sessionFetchError } = await adminSupabase
      .from('attendance_sessions')
      .select('id')
      .eq('teacher_id', userId)
      .eq('section_id', selectedSection)
      .eq('subject_id', selectedSubject)
      .eq('date', date)
      .eq('period_number', period)
      .maybeSingle();

    if (sessionFetchError) throw sessionFetchError;

    if (existingSession) {
      sessionId = existingSession.id;
      await adminSupabase
        .from('attendance_sessions')
        .update({ status: 'submitted', updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } else {
      const { data: newSession, error: sessionCreateError } = await adminSupabase
        .from('attendance_sessions')
        .insert({
          teacher_id: userId,
          section_id: selectedSection,
          subject_id: selectedSubject,
          date: date,
          period_number: period,
          status: 'submitted'
        })
        .select()
        .single();

      if (sessionCreateError) throw sessionCreateError;
      sessionId = newSession.id;
    }

    const records = Object.entries(attendance).map(([studentId, status]) => ({
      session_id: sessionId,
      student_id: studentId,
      status: status,
      updated_at: new Date().toISOString()
    }));

    const { error: recordsError } = await adminSupabase
      .from('attendance_records')
      .upsert(records, { onConflict: 'session_id,student_id' });

    if (recordsError) throw recordsError;
    
    // Notifications
    try {
      const absentLateRecords = records.filter(r => r.status === 'absent' || r.status === 'late');
      if (absentLateRecords.length > 0) {
        const notificationPayloads: { user_id: string, title: string, content: string, type: string, link: string }[] = [];
        for (const record of absentLateRecords) {
          const student = students.find((s) => s.id === record.student_id);
          if (student) {
            const statusText = record.status === 'absent' ? 'غائب' : 'متأخر';
            notificationPayloads.push({
              user_id: student.id,
              title: 'تنبيه حضور',
              content: `تم تسجيلك كـ ${statusText} بتاريخ ${date} - الحصة ${period}`,
              type: 'attendance',
              link: '/attendance'
            });
          }
        }
        if (notificationPayloads.length > 0) {
          await adminSupabase.from('notifications').insert(notificationPayloads);
        }
      }
    } catch (notifErr) {
      console.error('Error sending attendance notifications:', notifErr);
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    return handleApiError(error, 'Save Attendance');
  }
}
