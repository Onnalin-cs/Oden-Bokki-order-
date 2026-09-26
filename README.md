# Oden-Bokki (โอเด้งบ็อกกี)

บุฟเฟต์โอเด้งและต็อกบ็อกกีฟิวชัน 🇯🇵🇰🇷 — ระบบสั่งอาหารสร้างด้วย Next.js
(App Router, JavaScript) และ Tailwind CSS deploy บน Vercel เชื่อมต่อฐานข้อมูล
ผ่าน Supabase

> ⚠️ **สำคัญ:** โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ซึ่ง `params` ของ
> Dynamic Route เป็น **Promise** ต้อง unwrap ด้วย `use()` จาก React (Client
> Component) หรือ `await` (Server Component) เสมอ — ดูตัวอย่างและรายละเอียด
> เพิ่มเติม รวมถึงโครงสร้างตาราง Supabase และธีมสี ได้ใน
> [`CLAUDE.md`](./CLAUDE.md)

## 🎨 ธีม: Japandi Warm Amber

| สี | Hex |
|---|---|
| ส้มอิฐอมน้ำตาล | `#C85A32` |
| ครีมอุ่น | `#FDFBF7` |
| เทาเข้ม | `#2C2C2C` |
| ทองอมส้ม (accent) | `#E67E22` |

Config ไว้แล้วใน `tailwind.config.js` เป็น `brick`, `cream`, `charcoal`,
`amber` — ใช้ผ่าน Tailwind class ได้ทันที

## เริ่มต้นใช้งาน (Local Development)

```bash
npm install
cp .env.local.example .env.local
# ใส่ค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## หน้าเว็บที่มีในโครงนี้

- `/` — หน้าแรก (Landing Page) พร้อม Banner, badge ราคา, การ์ดเมนูแนะนำ และ
  ปุ่มทางเข้าระบบ 3 ปุ่ม
- `/generate-qr` — 📱 ระบบเปิดโต๊ะ & QR Code (สำหรับพนักงาน) — โครงเปล่า
- `/kitchen` — 👨‍🍳 หน้าจอห้องครัว (Kitchen Display) — โครงเปล่า
- `/admin/menu` — 📋 ระบบจัดการเมนูอาหาร (Admin Menu) — โครงเปล่า

## Deploy บน Vercel

1. Push โปรเจกต์นี้ขึ้น Git repository
2. Import repo เข้า Vercel
3. ตั้งค่า Environment Variables ใน Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — Vercel จะรัน `npm run build` และ `npm run start` ให้อัตโนมัติ
   (Tailwind CSS build ผ่าน `postcss.config.js` / `tailwind.config.js` ที่มีอยู่แล้ว)

## Supabase

Client อยู่ที่ `lib/supabaseClient.js` อ่านค่าจาก environment variables ข้างบน
โครงสร้างตารางที่มีอยู่แล้ว (sessions, menu_categories, menu_items, orders)
ดูรายละเอียดคอลัมน์ได้ใน [`CLAUDE.md`](./CLAUDE.md)
