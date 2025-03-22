# دليل نشر خادم التحديثات

هذا الدليل يوضح كيفية نشر خادم التحديثات على بيئة إنتاجية.

## المتطلبات

- خادم Linux (Ubuntu مثلاً)
- Node.js >= 14.x
- PM2 (لإدارة العمليات)
- Nginx (كعكس بروكسي)
- شهادة SSL (Let's Encrypt)

## خطوات النشر

### 1. إعداد الخادم

```bash
# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت PM2
sudo npm install pm2 -g

# تثبيت Nginx
sudo apt-get install nginx

# تثبيت Certbot (للحصول على شهادة SSL)
sudo apt-get install certbot python3-certbot-nginx
```

### 2. نقل الملفات إلى الخادم

```bash
# إنشاء مجلد للتطبيق
mkdir -p /var/www/update-server

# نسخ الملفات (محلياً)
scp -r ./* user@your-server:/var/www/update-server/
```

### 3. إعداد البيئة

```bash
# الانتقال إلى المجلد
cd /var/www/update-server

# تثبيت الاعتماديات
npm install --production

# إنشاء ملف البيئة
cat > .env << EOF
PORT=3000
API_UPDATE_SECRET=مفتاح_سري_طويل_وعشوائي
MIN_VERSION_ANDROID=1.0.1
MIN_VERSION_IOS=1.0.1
EOF
```

### 4. تكوين PM2

```bash
# بدء تشغيل التطبيق مع PM2
pm2 start index.js --name "update-server"

# إعداد PM2 للتشغيل التلقائي عند إعادة التشغيل
pm2 startup
pm2 save
```

### 5. تكوين Nginx كعكس بروكسي

إنشاء ملف تكوين Nginx:

```
sudo nano /etc/nginx/sites-available/update-server
```

أضف المحتوى التالي:

```nginx
server {
    listen 80;
    server_name updates.yourdomain.com;  # استبدل بنطاقك الفعلي

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

تفعيل التكوين:

```bash
sudo ln -s /etc/nginx/sites-available/update-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. تثبيت شهادة SSL

```bash
sudo certbot --nginx -d updates.yourdomain.com
```

### 7. تحديث التطبيق لاستخدام الخادم الجديد

قم بتعديل الملف `lib/services/update_service.dart` في تطبيقك لاستخدام عنوان الخادم الجديد:

```dart
/// عنوان خادم التحديثات
static const String _updateServerUrl = 'https://updates.yourdomain.com/updates/check';
```

## المراقبة والصيانة

- مراقبة السجلات: `pm2 logs update-server`
- إعادة تشغيل الخادم: `pm2 restart update-server`
- تحديث التطبيق:
  ```bash
  cd /var/www/update-server
  git pull  # إذا كنت تستخدم Git
  npm install --production
  pm2 restart update-server
  ```

## نصائح الأمان

1. استخدم جدار حماية (firewall) مثل UFW
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

2. قم بدورياً بتحديث النظام
   ```bash
   sudo apt update && sudo apt upgrade
   ```

3. قم بتدوير السجلات بانتظام
   ```bash
   sudo apt install logrotate
   ```

4. استخدم مفاتيح طويلة وعشوائية للتشفير
   
5. غيّر مفاتيح API بشكل دوري 