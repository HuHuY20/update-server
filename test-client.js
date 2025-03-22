/**
 * أداة اختبار للخادم - تقوم بإرسال طلب تحديث وعرض النتيجة
 */
const http = require('http');
const crypto = require('crypto');
const dotenv = require('dotenv');

// تحميل متغيرات البيئة
dotenv.config();

const API_SECRET = process.env.API_UPDATE_SECRET;
const SERVER_URL = 'http://localhost:3000/updates/check';

// دالة للتحقق من صحة التوقيع
function verifySignature(data, signature) {
  const hmac = crypto.createHmac('sha256', API_SECRET);
  hmac.update(JSON.stringify(data));
  const computedSignature = hmac.digest('hex');
  
  console.log('التوقيع المستلم:', signature);
  console.log('التوقيع المحسوب:', computedSignature);
  
  return signature === computedSignature;
}

// دالة لإرسال طلب اختبار للتحديث
async function testUpdateCheck(appVersion = '1.0.0') {
  console.log(`إرسال طلب تحقق من إصدار ${appVersion}...`);
  
  const requestData = {
    appId: 'com.syrdroid.islamicTik',
    currentVersion: appVersion,
    buildNumber: '1'
  };
  
  // تكوين طلب HTTP
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/updates/check',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    // إنشاء الطلب
    const req = http.request(options, (res) => {
      let data = '';
      
      // تجميع البيانات المستلمة
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // معالجة النتيجة عند انتهاء الاستجابة
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          console.log('\nالاستجابة:');
          console.log(JSON.stringify(response, null, 2));
          
          // استخراج التوقيع والبيانات للتحقق
          const { signature, ...responseData } = response;
          
          // التحقق من صحة التوقيع
          const isSignatureValid = verifySignature(responseData, signature);
          
          console.log('\nنتيجة التحقق من التوقيع:', isSignatureValid ? 'صالح ✅' : 'غير صالح ❌');
          
          resolve(response);
        } catch (error) {
          console.error('خطأ في معالجة الاستجابة:', error);
          reject(error);
        }
      });
    });
    
    // معالجة أخطاء الطلب
    req.on('error', (error) => {
      console.error('خطأ في الطلب:', error);
      reject(error);
    });
    
    // إرسال البيانات
    req.write(JSON.stringify(requestData));
    req.end();
  });
}

// اختبار مختلف الحالات
async function runTests() {
  console.log('🧪 بدء اختبار خادم التحديثات...\n');
  
  try {
    // اختبار 1: إصدار قديم (يحتاج إلى تحديث)
    console.log('\n📱 اختبار #1: إصدار قديم (1.0.0)');
    await testUpdateCheck('1.0.0');
    
    // اختبار 2: إصدار حالي (لا يحتاج إلى تحديث)
    console.log('\n📱 اختبار #2: الإصدار الحالي (1.0.1)');
    await testUpdateCheck('1.0.1');
    
    // اختبار 3: إصدار أحدث (لا يحتاج إلى تحديث)
    console.log('\n📱 اختبار #3: إصدار أحدث (1.1.0)');
    await testUpdateCheck('1.1.0');
    
    console.log('\n✅ تم إكمال جميع الاختبارات بنجاح');
  } catch (error) {
    console.error('\n❌ فشل الاختبار:', error);
  }
}

// تشغيل الاختبارات
runTests(); 