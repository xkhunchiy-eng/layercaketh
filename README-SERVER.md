# CakeParty — เซิร์ฟเวอร์เกม

เซิร์ฟเวอร์ตัวนี้ทำ 2 อย่าง: เสิร์ฟหน้าเกม และรันลอจิกเกมของทุกห้อง (ผู้เล่นทุกคนเชื่อมต่อผ่าน WebSocket ไม่ต้องเชื่อมตรงหากัน)
ไม่ต้อง `npm install` (ไม่มีแพ็กเกจเสริม) ต้องมี Node.js 18 ขึ้นไป

## รันในเครื่อง
    node server.js
แล้วเปิด http://localhost:8080  (เปลี่ยนพอร์ตด้วย PORT=3000 node server.js)
เพื่อนในวงเดียวกันเข้าได้ที่ http://IPเครื่องคุณ:8080

## ขึ้นออนไลน์ (ตัวอย่าง Render.com — ฟรี)
1. อัปโหลดโฟลเดอร์นี้ขึ้น GitHub (ต้องมี server.js, package.json, โฟลเดอร์ src และ dist/index.html)
2. Render → New → Web Service → เลือกรีโป
3. Runtime: Node · Build Command: เว้นว่าง · Start Command: `node server.js`
4. เสร็จแล้วจะได้ลิงก์ https://ชื่อ.onrender.com — เปิดลิงก์นี้เล่นได้เลย (หน้าเกมกับเซิร์ฟเวอร์อยู่ที่เดียวกัน)
   หมายเหตุ: แพ็กเกจฟรีของ Render จะหลับเมื่อไม่มีคนใช้ เปิดครั้งแรกอาจรอประมาณ 30–60 วินาที
ใช้ Railway / Fly.io / VPS ก็ได้เหมือนกัน แค่รัน `node server.js` และเปิดพอร์ตตาม PORT

## ถ้าจะให้หน้าเกมอยู่ที่ Netlify และเซิร์ฟเวอร์อยู่ที่อื่น
เปิดหน้า Netlify ครั้งแรกด้วย  https://ชื่อ.netlify.app/?server=wss://ชื่อ.onrender.com
(เบราว์เซอร์จะจำที่อยู่ไว้) หรือ build ใหม่:  CAKE_WS=wss://ชื่อ.onrender.com/ws python3 build.py

## ตรวจว่าเซิร์ฟเวอร์ทำงาน
เปิด /health จะเห็น `ok rooms=0`
