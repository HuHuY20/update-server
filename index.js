const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const dotenv = require('dotenv');

// تحميل متغيرات البيئة
dotenv.config();

// الإعدادات
const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || 'f8HwTq2Fs9Kz7XpE3bVm5yJuR4NcD6aG1LgQZY0iWxP';
const MIN_VERSION_ANDROID = process.env.MIN_VERSION_ANDROID || '1.0.1';
const MIN_VERSION_IOS = process.env.MIN_VERSION_IOS || '1.0.1';

// إنشاء تطبيق Express
const app = express();

// ميدلوير
app.use(cors({ origin: true }));
app.use(express.json());

// التحقق من صحة طلب التحديث
function validateUpdateRequest(req, res, next) {
  const { appId, currentVersion } = req.body;
  
  if (!appId || !currentVersion) {
    return res.status(400).json({ 
      error: 'بيانات غير مكتملة، يرجى توفير معرف التطبيق والإصدار الحالي' 
    });
  }
  
  next();
}

// توليد توقيع باستخدام HMAC-SHA256
function generateSignature(data) {
  const hmac = crypto.createHmac('sha256', API_SECRET);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
}

// نقطة نهاية لفحص التحديثات
app.post('/check', validateUpdateRequest, (req, res) => {
  const { appId, currentVersion, buildNumber } = req.body;
  
  // تحديد الإصدار الأدنى المطلوب حسب النظام
  const isAndroid = /android/i.test(appId);
  const minVersion = isAndroid ? MIN_VERSION_ANDROID : MIN_VERSION_IOS;
  
  // تكوين اسم الحزمة بناءً على منصة التشغيل
  const packageName = appId || (isAndroid ? 'com.syrdroid.islamicTik' : 'com.syrdroid.islamicTik');
  
  // إنشاء بيانات للرد
  const responseData = {
    version: minVersion,
    updateRequired: compareVersions(currentVersion, minVersion) < 0,
    updateUrl: isAndroid 
      ? `https://play.google.com/store/apps/details?id=${packageName}` 
      : `https://apps.apple.com/app/id${packageName}`,
    releaseNotes: 'تحديث جديد متاح يتضمن تحسينات في الأداء وميزات جديدة. يرجى التحديث للاستمرار في استخدام التطبيق.'
  };
  
  // إضافة التوقيع للاستجابة
  const signature = generateSignature(responseData);
  
  // إرسال الرد مع التوقيع
  res.json({
    ...responseData,
    signature
  });
});

// مسار اختبار للتحقق من حالة الخادم
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'خادم التحديثات يعمل بشكل طبيعي' });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send('مرحبًا بك في خادم التحديثات! استخدم /check للتحقق من التحديثات و /health للتحقق من حالة الخادم.');
});

// تنفيذ منطق مقارنة الإصدارات
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(num => parseInt(num, 10));
  const v2Parts = version2.split('.').map(num => parseInt(num, 10));
  
  // التأكد من أن لدينا 3 أجزاء على الأقل
  while (v1Parts.length < 3) v1Parts.push(0);
  while (v2Parts.length < 3) v2Parts.push(0);
  
  // المقارنة
  for (let i = 0; i < 3; i++) {
    if (v1Parts[i] < v2Parts[i]) return -1; // الإصدار الأول أقدم
    if (v1Parts[i] > v2Parts[i]) return 1; // الإصدار الأول أحدث
  }
  
  return 0; // الإصدارات متساوية
}

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`خادم التحديثات يعمل على المنفذ ${PORT}`);
}); 