// ... existing code ...
import { supabase } from '@/lib/supabase'; // تأكد من أن مسار الاستيراد صحيح لديك

// ... existing code ...

  useEffect(() => {
    // ... existing code ... (أكواد جلب الجلسة الحالية)
    
    // 🔴 1. ابحث عن أي سطر يقوم بتخزين الدور في sessionStorage وقم بحذفه تماماً
    // sessionStorage.setItem('authRole', role); // ❌ يجب حذفه
    // sessionStorage.getItem('authRole');       // ❌ يجب حذفه والاعتماد فقط على React State (setAuthRole)

    // 🟢 2. استبدال setInterval بـ Supabase Realtime Subscription
    
    // ❌ الكود القديم الذي يجب حذفه:
    // const interval = setInterval(evaluatePlatformStatus, 5000);
    
    // 🟢 الكود الجديد للترقب اللحظي (Realtime) دون إرهاق الخادم:
    const statusSubscription = supabase
      .channel('public:platform_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_settings' },
        (payload) => {
          // استدعاء دالة التقييم فقط عندما يحدث تغيير فعلي في قاعدة البيانات
          evaluatePlatformStatus(payload.new); 
        }
      )
      .subscribe();

    return () => {
      // ... existing code ... (أكواد تنظيف onAuthStateChange)
      
      // ❌ احذف السطر القديم:
      // clearInterval(interval);
      
      // 🟢 أضف تنظيف الاشتراك الجديد:
      supabase.removeChannel(statusSubscription);
    };
  }, []); // تأكد من مصفوفة الاعتماديات لديك

  // ... existing code ...

  const value = {
    user,
    authRole,
    // 🔴 3. احذف هذا السطر لمنع تكرار الأسماء (كما طلب التقرير):
    // userRole: authRole, 
    
    // ملاحظة من التقرير: isAdminByEmail دائماً false. 
    // إذا كنت لا تستخدمها في باقي المشروع، يمكنك حذفها من هنا لتنظيف الكود.
    isAdminByEmail, 
    // ... existing code ...
  };

// ... existing code ...
