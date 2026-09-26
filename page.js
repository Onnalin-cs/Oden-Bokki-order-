import Link from "next/link";
import { ChefHat, ArrowLeft } from "lucide-react";

export default function KitchenPage() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-soft border border-brick/10 p-10">
        <div className="mx-auto mb-5 flex items-center justify-center w-16 h-16 rounded-full bg-amber/10 text-amber">
          <ChefHat size={30} />
        </div>
        <h1 className="text-2xl font-bold text-charcoal mb-2">
          หน้าจอห้องครัว (Kitchen Display)
        </h1>
        <p className="text-charcoal/60 mb-6">
          หน้านี้เป็นโครงเปล่าไว้ทดสอบว่า deploy สำเร็จ — ต่อยอดฟีเจอร์แสดง
          ออเดอร์แบบเรียลไทม์จากตาราง <code>orders</code> ที่นี่
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-brick font-medium hover:text-brick-dark transition-colors"
        >
          <ArrowLeft size={16} />
          กลับหน้าแรก
        </Link>
      </div>
    </main>
  );
}
