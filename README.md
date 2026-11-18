# Ciudad o Pueblo – Leitner (Expo)

## ساخت فایل APK برای اندروید

روی کامپیوتر (ویندوز، مک یا لینوکس) که Node.js نسخه ۲۰ یا بالاتر دارد:

```bash
cd leitner-app
npm install
npx eas-cli@latest login          # با حساب Expo خودتان وارد شوید
npx eas-cli@latest init           # یک بار؛ پروژه را در حساب Expo می‌سازد
npx eas-cli@latest build -p android --profile preview
```

بعد از حدود ۱۰ تا ۱۵ دقیقه، یک لینک و QR کد نشان داده می‌شود.
آن را با گوشی اندروید باز کنید، فایل APK را دانلود و نصب کنید
(اگر پرسید، اجازهٔ «نصب از منابع ناشناس» را بدهید).

## اجرای سریع بدون ساخت

```bash
npx expo start
```

و QR کد را با برنامهٔ Expo Go روی گوشی اسکن کنید.
