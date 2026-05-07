// ==========================================
// 🛡️ ملف إعدادات ESLint الحديث (Flat Config)
// يستخدم نظام ES Modules (ESM) بدلاً من CommonJS القديم
// ==========================================

import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ==========================================
// 🏗️ محاكاة متغيرات المسار (Path Variables Polyfill)
// في نظام الـ ES Modules الحديث، المتغيرات السحرية مثل __dirname و __filename
// غير متوفرة بشكل افتراضي (كما كانت في CommonJS).
// لذلك، نقوم ببنائها يدوياً باستخدام أدوات Node.js الأساسية لتجنب أخطاء مسارات الملفات.
// ==========================================

// 1. تحويل رابط الملف الحالي (URL) إلى مسار نظام تشغيل مقروء (File Path)
const __filename = fileURLToPath(import.meta.url);

// 2. استخراج مسار المجلد (Directory) الذي يحتوي على هذا الملف
const __dirname = path.dirname(__filename);

// ==========================================
// 🚀 تصدير الإعدادات (Export Configuration)
// ==========================================
// استخدام defineConfig يساعد الـ TypeScript أو الـ IDE (مثل VS Code)
// على توفير إكمال تلقائي (Autocomplete) ممتاز داخل ملف الجافاسكريبت.
export default defineConfig([
  {
    // نشر (Spread) جميع القواعد الصارمة والقياسية الخاصة بـ Next.js
    // لضمان خلو المشروع من أخطاء الـ React وتطبيق أفضل الممارسات لتحسين الأداء
    extends: [...next],
  }
]);
