@echo off
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
  echo ยังไม่ได้ติดตั้ง Node.js - ดาวน์โหลดที่ https://nodejs.org แล้วกดเปิดไฟล์นี้ใหม่
  pause
  exit /b
)
echo เปิดเซิร์ฟเวอร์ที่ http://localhost:8080  (ปิดหน้าต่างนี้เพื่อหยุดเซิร์ฟเวอร์)
start "" http://localhost:8080
node server.js
pause
