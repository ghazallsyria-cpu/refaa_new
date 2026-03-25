import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Increase timeout to 60 seconds

export async function POST() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'إعدادات Supabase غير مكتملة على الخادم.' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const results: string[] = [];

  try {
    // 1. Fetch all students with their names from users table
    results.push('جاري جلب الطلاب من قاعدة البيانات...');
    const { count, error: countError } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      results.push(`خطأ في عد الطلاب: ${countError.message}`);
      throw countError;
    }
    results.push(`إجمالي عدد الطلاب الموجودين: ${count}`);

    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, national_id, users(full_name, email)');

    if (studentsError) {
      results.push(`خطأ في جلب الطلاب: ${studentsError.message}`);
      throw studentsError;
    }

    // 2. Filter unprocessed students
    const unprocessedStudents = (students || []).filter(student => {
      const nationalId = student.national_id?.toString().trim();
      if (!nationalId) return false;
      const email = `${nationalId}@alrefaa.edu`;
      
      // If the student's current user email is already correct, they are processed
      const usersData = student.users as any;
      const currentEmail = usersData?.email || (Array.isArray(usersData) ? usersData[0]?.email : null);
      if (currentEmail === email) return false;
      
      // Otherwise, they need an auth account
      return true;
    });

    const batchToProcess = unprocessedStudents.slice(0, 5);
    results.push(`يوجد ${unprocessedStudents.length} طالب غير مهيأ. سيتم معالجة ${batchToProcess.length} طالب في هذه الدفعة.`);

    // 3. Loop and create users
    for (const student of batchToProcess) {
      try {
        const nationalId = student.national_id?.toString().trim();
        const email = `${nationalId}@alrefaa.edu`;
        const usersData = student.users as any;
        const studentName = usersData?.full_name || (Array.isArray(usersData) ? usersData[0]?.full_name : null) || 'طالب غير معروف';
        const currentStudentId = student.id;
        
        results.push(`--- معالجة: ${studentName} (${nationalId}) ---`);

        // Check if user already exists in public.users by email
        const { data: existingPublicUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        let userId = existingPublicUser?.id;

        if (!userId) {
          // 1. Find existing public.users row (it might be the current student ID)
          const oldId = currentStudentId;

          // 2. Temporarily change its email to avoid unique constraint violation in trigger
          if (oldId) {
            await supabaseAdmin
              .from('users')
              .update({ email: `temp_${Date.now()}_${email}` })
              .eq('id', oldId);
          }

          // 3. Create auth user
          results.push(`جاري إنشاء حساب جديد...`);
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: '123456',
            email_confirm: true,
            user_metadata: { full_name: studentName }
          });

          if (authError) {
            results.push(`❌ فشل إنشاء الحساب: ${authError.message}`);
            // Revert the email change if creation failed
            if (oldId) {
              await supabaseAdmin.from('users').update({ email }).eq('id', oldId);
            }
            // If the error was that the user already exists, try to fetch it again
            if (authError.message.includes('already registered')) {
              const { data: retryUser } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
              if (retryUser) {
                userId = retryUser.id;
                results.push(`ℹ️ تم العثور على الحساب الموجود مسبقاً: ${userId}`);
              }
            } else {
              continue;
            }
          } else {
            userId = authUser.user.id;
            results.push(`✅ تم إنشاء الحساب: ${userId}`);
          }
          
          // 4. Update the students table to point to the new ID
          if (userId) {
            const { error: updateStudentError } = await supabaseAdmin
              .from('students')
              .update({ id: userId })
              .eq('national_id', nationalId);

            if (updateStudentError) {
              results.push(`⚠️ خطأ في تحديث معرف الطالب: ${updateStudentError.message}`);
            } else if (oldId && oldId !== userId) {
              // Now safe to delete the old user row
              await supabaseAdmin.from('users').delete().eq('id', oldId);
              results.push(`✨ تم تحديث المعرفات بنجاح.`);
            }
          }
          
          // Add a small delay to prevent hitting Auth rate limits/DB locks
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          results.push(`ℹ️ الحساب موجود مسبقاً: ${userId}`);
          
          // Update the students table to point to the existing auth user ID
          if (userId !== currentStudentId) {
            const { error: updateStudentError } = await supabaseAdmin
              .from('students')
              .update({ id: userId })
              .eq('national_id', nationalId);

            if (updateStudentError) {
              results.push(`⚠️ خطأ في تحديث معرف الطالب: ${updateStudentError.message}`);
            } else {
              // Delete the old dummy user row if it exists and is different
              if (currentStudentId && currentStudentId !== userId) {
                await supabaseAdmin.from('users').delete().eq('id', currentStudentId);
              }
              results.push(`✨ تم ربط الطالب بالحساب الموجود بنجاح.`);
            }
          } else {
            results.push(`✨ الطالب مربوط بالحساب بشكل صحيح.`);
          }
        }
      } catch (innerErr: any) {
        results.push(`💥 خطأ غير متوقع: ${innerErr.message || innerErr.toString()}`);
      }
    }

    return NextResponse.json({ message: 'اكتملت العملية.', logs: results });
  } catch (err: any) {
    console.error('Setup students error (full object):', err);
    
    // Attempt to extract a meaningful error message
    let errorMessage = 'حدث خطأ غير معروف أثناء التهيئة.';
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else if (err && typeof err === 'object') {
      errorMessage = err.message || err.error || JSON.stringify(err);
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: err?.toString() || JSON.stringify(err),
      logs: results // Include logs here
    }, { status: 500 });
  }
}
