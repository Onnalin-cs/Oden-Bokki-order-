# Oden-Bokki — บันทึกอ้างอิงสำหรับ Claude / ผู้พัฒนา

โปรเจกต์นี้คือระบบสั่งอาหารร้านบุฟเฟต์ "Oden-Bokki" (โอเด้งบ็อกกี —
บุฟเฟต์โอเด้งและต็อกบ็อกกีฟิวชัน 🇯🇵🇰🇷) สร้างด้วย Next.js (App Router,
JavaScript) และ deploy บน Vercel โดยเชื่อมต่อฐานข้อมูล Supabase

## ⚠️ ข้อควรระวังสำคัญ: Next.js เวอร์ชันล่าสุด — Dynamic Route params เป็น Promise

โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด (App Router) ซึ่ง **`params` (และ
`searchParams`) ใน Dynamic Route ถูกเปลี่ยนเป็น Promise แล้ว** ไม่ใช่ object
ธรรมดาเหมือน Next.js เวอร์ชันเก่า

**ต้อง unwrap ด้วย `use()` จาก React เสมอ** เมื่อเขียน Client Component หรือ
`await` เมื่อเขียน Server Component (async function) ตัวอย่างเช่น:

```jsx
// app/order/[tableId]/page.js — Client Component
"use client";
import { use } from "react";

export default function TablePage({ params }) {
  const { tableId } = use(params); // ✅ ต้อง unwrap ด้วย use()
  // ห้ามเขียน const { tableId } = params; ตรงๆ อีกต่อไป
  return <div>Table: {tableId}</div>;
}
```

```jsx
// app/order/[tableId]/page.js — Server Component
export default async function TablePage({ params }) {
  const { tableId } = await params; // ✅ ใช้ await แทน
  return <div>Table: {tableId}</div>;
}
```

กฎนี้ใช้กับทุกหน้าที่มี Dynamic Segment (เช่น `/order/[tableId]`,
`/kitchen/[sessionId]` ฯลฯ) ที่จะเพิ่มเข้ามาในโปรเจกต์นี้ต่อไป

## 🎨 ธีมการออกแบบ (Design Theme) — Japandi Warm Amber

ทุกหน้าที่สร้างเพิ่มในโปรเจกต์นี้ควรใช้โทนสีและสไตล์เดียวกัน เพื่อความ
สม่ำเสมอแบบร้านอาหารพรีเมียม:

| สี | Hex | ใช้ Tailwind class ว่า |
|---|---|---|
| ส้มอิฐอมน้ำตาล (สีหลัก) | `#C85A32` | `brick` (มี `brick-dark` = `#A8481F`) |
| ครีมอุ่น (พื้นหลัง) | `#FDFBF7` | `cream` |
| เทาเข้ม (ตัวอักษร) | `#2C2C2C` | `charcoal` |
| ทองอมส้ม (accent) | `#E67E22` | `amber` (มี `amber-light` = `#F3A65C`) |

Class เหล่านี้ถูก config ไว้แล้วใน `tailwind.config.js` — ใช้ได้เลย เช่น
`bg-brick`, `text-charcoal`, `border-amber/40`, `shadow-warm`, `shadow-soft`

แนวทางดีไซน์:
- ใช้ CSS gradient นุ่มๆ (`bg-gradient-to-br from-brick ...`) แทนสีพื้นเรียบ
- ใช้ shadow ที่มีมิติ ไม่แข็งกระด้าง (`shadow-soft`, `shadow-warm` ที่ config
  ไว้ให้แล้ว)
- ใช้ rounded corner ใหญ่ (`rounded-2xl`) และ spacing ที่หายใจได้
- ไอคอนใช้ `lucide-react` เป็นหลัก (ติดตั้งไว้แล้วใน dependencies) แทน emoji
  ล้วนๆ ในส่วน UI ที่เป็นปุ่ม/การ์ด — ใช้ emoji เสริมในข้อความ/หัวข้อได้ตาม
  สไตล์ร้าน (🍢🔥) เพื่อความน่ารักเป็นกันเอง

## โครงสร้างฐานข้อมูล Supabase (มีอยู่แล้ว — ห้ามสร้างซ้ำ)

ฐานข้อมูลถูกสร้างไว้แล้วบน Supabase ให้ใช้ตารางต่อไปนี้อ้างอิงเวลาต่อยอดโค้ด
ทั้งหมดในโปรเจกต์นี้ (ไม่ต้องรัน migration สร้างตารางใหม่):

### `sessions`
| column       | type      | note                          |
|--------------|-----------|--------------------------------|
| id           | uuid/int  | primary key                    |
| table_number | text/int  | หมายเลขโต๊ะ                    |
| adult_count  | int       | จำนวนผู้ใหญ่                   |
| child_count  | int       | จำนวนเด็ก                      |
| status       | text      | สถานะ session                  |
| created_at   | timestamp | เวลาสร้าง session               |

### `menu_categories`
| column     | type     | note              |
|------------|----------|-------------------|
| id         | uuid/int | primary key       |
| name       | text     | ชื่อหมวดหมู่เมนู   |
| sort_order | int      | ลำดับการแสดงผล     |

### `menu_items`
| column      | type     | note                          |
|-------------|----------|--------------------------------|
| id          | uuid/int | primary key                    |
| category_id | uuid/int | FK -> menu_categories.id       |
| name        | text     | ชื่อเมนู                       |

### `orders`
| column       | type      | note                                  |
|--------------|-----------|-----------------------------------------|
| id           | uuid/int  | primary key                              |
| session_id   | uuid/int  | FK -> sessions.id                        |
| table_number | text/int  | หมายเลขโต๊ะ (denormalized)               |
| items        | jsonb     | รายการอาหารที่สั่ง (array ของ item)       |
| status       | text      | สถานะออเดอร์ (เช่น pending/cooking/served) |
| created_at   | timestamp | เวลาสั่ง                                  |

## ราคาบุฟเฟต์ (สำหรับอ้างอิงใน UI)

- ผู้ใหญ่: 219 บาท
- เด็ก: 109 บาท

## Environment Variables

ตั้งค่าใน Vercel Project Settings > Environment Variables (และใน
`.env.local` ตอน dev):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Supabase client อยู่ที่ `lib/supabaseClient.js` — import `supabase` จากไฟล์นี้
ทุกครั้งที่ต้อง query ฐานข้อมูล อย่าสร้าง client ซ้ำที่อื่น
