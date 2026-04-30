// ... existing code ...
      if (sectionIds.length === 0 && assignment.teacher_id) {
         const { data: tSecs } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', assignment.teacher_id);
         if (tSecs) sectionIds = tSecs.map(ts => ts.section_id);
      }

      let targetStudents: any[] = [];
      if (sectionIds.length > 0) {
        // 🚀 تعديل: جلب بيانات الفصل والصف مع الطالب
        const { data: stData } = await supabase.from('students').select('id, user_id, section_id, sections(name, classes(name))').in('section_id', sectionIds);
        targetStudents = stData || [];
      }

      const { data: progData } = await supabase.from('student_progress_v2').select('*').eq('assignment_id', assignment.id);
      const progressRecords = progData || [];

      if (targetStudents.length === 0 && progressRecords.length > 0) {
         const pStuIds = progressRecords.map(p => p.student_id);
         // 🚀 تعديل: جلب بيانات الفصل والصف أيضاً للطلاب المفقودين
         const { data: missingSt } = await supabase.from('students').select('id, user_id, section_id, sections(name, classes(name))').in('id', pStuIds);
         targetStudents = missingSt || progressRecords.map(p => ({ id: p.student_id, user_id: p.student_id, sections: null }));
      }

      let usersData: any[] = [];
      const userIdsToFetch = [...new Set(targetStudents.map(s => s.user_id || s.id))].filter(Boolean);
// ... existing code ...
      if (userIdsToFetch.length > 0) {
         const { data: uData } = await supabase.from('users').select('id, full_name').in('id', userIdsToFetch);
         usersData = uData || [];
      }

      const studentsToDisplay = targetStudents.map(student => {
        const progress = progressRecords.find(p => p.student_id === student.id);
        const userInfo = usersData.find(u => u.id === (student.user_id || student.id));
        
        let percentage = progress ? (progress.is_completed ? 100 : Math.round((progress.current_index / assignment.total_questions) * 100)) : 0;
        if (isNaN(percentage)) percentage = 0;

        // 🚀 تحديد اسم الفصل لربطه بالطالب
        let secName = 'فصل غير محدد';
        if (student.sections) {
          const className = Array.isArray(student.sections.classes) ? student.sections.classes[0]?.name : student.sections.classes?.name;
          secName = className ? `${className} - ${student.sections.name}` : student.sections.name;
        }

        return {
          id: student.id,
          student_id: student.id,
          student_name: userInfo?.full_name || 'طالب غير معروف',
          section_name: secName, // 🚀 إضافة اسم الفصل للكائن
          percentage: Math.min(percentage, 100),
          correct_score: progress?.correct_score || 0,
          wrong_score: progress?.wrong_score || 0,
          teacher_feedback: progress?.teacher_feedback || null,
          has_started: !!progress
        };
      });

      const uniqueStudents = Array.from(new Map(studentsToDisplay.map(item => [item.student_id, item])).values());
      
      // 🚀 الفرز الذكي الجديد (حسب الفصل أولاً ثم حسب الاسم الأبجدي)
      uniqueStudents.sort((a, b) => {
        const secCompare = a.section_name.localeCompare(b.section_name, 'ar');
        if (secCompare !== 0) return secCompare; // إذا اختلفت الفصول، رتب بالفصل
        return a.student_name.localeCompare(b.student_name, 'ar'); // إذا تشابهت الفصول، رتب بالاسم
      });

      setStudentsProgress(uniqueStudents);

    } catch (err) { 
// ... existing code ...
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-black uppercase">
                      <th className="p-4 rounded-tr-3xl">اسم الطالب / الفصل</th>
                      <th className="p-4">نسبة الإنجاز</th>
                      <th className="p-4 text-center">النقاط (صح / خطأ)</th>
// ... existing code ...
                    {studentsProgress.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold bg-slate-50/50">لا يوجد طلاب مسجلين في الفصول المخصصة لهذا التحدي، ولم يقم أحد بحله بعد.</td></tr>
                    ) : (
                      studentsProgress.map((student) => (
                        <tr key={student.student_id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${!student.has_started ? 'opacity-60' : ''}`}>
                          <td className="p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 shadow-inner ${student.percentage === 100 ? 'bg-emerald-100 text-emerald-700' : student.has_started ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                              {student.student_name.charAt(0)}
                            </div>
                            <div>
                              <span className="truncate max-w-[150px] font-black block">{student.student_name}</span>
                              <span className="text-[10px] text-indigo-600 font-black block bg-indigo-50 px-2 py-0.5 rounded-md mt-1 w-fit border border-indigo-100 shadow-sm">{student.section_name}</span>
                              {!student.has_started && <span className="text-[10px] text-slate-400 block mt-0.5">لم يبدأ بعد</span>}
                            </div>
                          </td>
                          <td className="p-4 w-48">
// ... existing code ...
