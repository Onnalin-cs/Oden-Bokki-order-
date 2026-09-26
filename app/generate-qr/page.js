"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Users,
  Baby,
  Copy,
  Check,
  Printer,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  X,
  Loader2,
  Receipt,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const ADULT_PRICE = 219;
const CHILD_PRICE = 109;

export default function GenerateQrPage() {
  const [tableNumber, setTableNumber] = useState("");
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [conflictSession, setConflictSession] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [closing, setClosing] = useState(false);

  const [qrSession, setQrSession] = useState(null);
  const [copied, setCopied] = useState(false);

  const estimatedTotal = useMemo(() => {
    const a = Number(adults) || 0;
    const c = Number(children) || 0;
    return a * ADULT_PRICE + c * CHILD_PRICE;
  }, [adults, children]);

  const minutesAgo = (createdAt) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  function resetForm() {
    setTableNumber("");
    setAdults("");
    setChildren("");
    setQrSession(null);
    setConflictSession(null);
    setShowConfirmModal(false);
    setError(null);
    setCopied(false);
  }

  async function createSession() {
    const { data, error: insertErr } = await supabase
      .from("sessions")
      .insert({
        table_number: Number(tableNumber),
        adult_count: Number(adults) || 0,
        child_count: Number(children) || 0,
        status: "open",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    setQrSession(data);
    setConflictSession(null);
  }

  async function handleOpenTable() {
    setError(null);

    if (!tableNumber) {
      setError("กรุณากรอกเลขโต๊ะ");
      return;
    }
    if (!Number(adults) && !Number(children)) {
      setError("กรุณากรอกจำนวนลูกค้าอย่างน้อย 1 คน");
      return;
    }

    setLoading(true);
    try {
      const { data: existing, error: checkErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("table_number", Number(tableNumber))
        .eq("status", "open")
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existing) {
        setConflictSession(existing);
      } else {
        await createSession();
      }
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseOldSession() {
    if (!conflictSession) return;
    setClosing(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from("sessions")
        .update({ status: "closed" })
        .eq("id", conflictSession.id);

      if (updateErr) throw updateErr;

      setShowConfirmModal(false);
      await createSession();
    } catch (err) {
      setError(err.message || "ไม่สามารถปิดออเดอร์เดิมได้ กรุณาลองใหม่");
    } finally {
      setClosing(false);
    }
  }

  async function handleCopyLink() {
    if (!qrSession) return;
    const orderUrl = `${window.location.origin}/order/${qrSession.table_number}`;
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("คัดลอกลิงก์ไม่สำเร็จ");
    }
  }

  const orderUrl =
    qrSession && typeof window !== "undefined"
      ? `${window.location.origin}/order/${qrSession.table_number}`
      : "";
  const qrImageUrl = orderUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        orderUrl
      )}`
    : "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream via-cream to-[#F7EEE3] px-4 py-8 sm:py-12">
      <div className="max-w-md mx-auto print:max-w-none">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-charcoal/60 hover:text-brick transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} />
            หน้าแรก
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-brick/10 text-brick px-4 py-1.5 text-sm font-semibold">
            <QrCode size={16} />
            เปิดโต๊ะ & QR Code
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal mb-1 print:hidden">
          📱 เปิดโต๊ะลูกค้า
        </h1>
        <p className="text-charcoal/50 mb-6 print:hidden">
          Oden-Bokki — โอเด้งบ็อกกี
        </p>

        {/* ---------------- FORM VIEW ---------------- */}
        {!qrSession && (
          <div className="bg-white rounded-3xl shadow-soft border border-brick/10 p-6 sm:p-7">
            <div className="space-y-5">
              <div>
                <label className="block text-lg font-semibold text-charcoal mb-2">
                  เลขโต๊ะ
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="เช่น 12"
                  className="w-full text-2xl font-bold text-center rounded-2xl border-2 border-brick/20 focus:border-brick focus:outline-none focus:ring-4 focus:ring-brick/10 py-4 px-4 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-base font-semibold text-charcoal mb-2">
                    <Users size={18} className="text-brick" />
                    ผู้ใหญ่
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={adults}
                    onChange={(e) => setAdults(e.target.value)}
                    placeholder="0"
                    className="w-full text-xl font-bold text-center rounded-2xl border-2 border-brick/20 focus:border-brick focus:outline-none focus:ring-4 focus:ring-brick/10 py-3.5 px-3 transition-all"
                  />
                  <p className="text-center text-sm text-charcoal/50 mt-1">
                    คนละ {ADULT_PRICE} บาท
                  </p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-base font-semibold text-charcoal mb-2">
                    <Baby size={18} className="text-amber" />
                    เด็ก
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={children}
                    onChange={(e) => setChildren(e.target.value)}
                    placeholder="0"
                    className="w-full text-xl font-bold text-center rounded-2xl border-2 border-amber/25 focus:border-amber focus:outline-none focus:ring-4 focus:ring-amber/10 py-3.5 px-3 transition-all"
                  />
                  <p className="text-center text-sm text-charcoal/50 mt-1">
                    คนละ {CHILD_PRICE} บาท
                  </p>
                </div>
              </div>

              {/* Estimated total */}
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-brick to-brick-dark text-cream px-5 py-4 shadow-warm">
                <div className="flex items-center gap-2">
                  <Receipt size={22} />
                  <span className="font-medium">ยอดประเมิน</span>
                </div>
                <span className="text-2xl font-bold">
                  {estimatedTotal.toLocaleString()} บาท
                </span>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleOpenTable}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brick hover:bg-brick-dark disabled:opacity-60 text-cream text-lg font-bold py-4 shadow-warm transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <QrCode size={22} />
                )}
                {loading ? "กำลังตรวจสอบ..." : "เปิดโต๊ะ"}
              </button>
            </div>

            {/* Conflict alert */}
            {conflictSession && (
              <div className="mt-5 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border-2 border-brick/30 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-brick text-cream">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-brick text-lg leading-snug">
                      โต๊ะนี้มีลูกค้าใช้อยู่
                    </p>
                    <p className="text-charcoal/70 text-sm mt-1">
                      (เปิดมาแล้ว {minutesAgo(conflictSession.created_at)}{" "}
                      นาที)
                    </p>
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="mt-3 w-full rounded-xl bg-brick text-cream font-semibold py-3 hover:bg-brick-dark transition-colors"
                    >
                      ปิดออเดอร์เดิม
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- QR RESULT VIEW ---------------- */}
        {qrSession && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl shadow-soft border border-brick/10 p-6 sm:p-7 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-4 py-1.5 text-sm font-semibold mb-5">
                <Check size={16} />
                เปิดโต๊ะสำเร็จ
              </div>

              <div className="bg-white rounded-2xl p-4 inline-block shadow-soft border border-charcoal/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt={`QR Code สั่งอาหารโต๊ะ ${qrSession.table_number}`}
                  width={300}
                  height={300}
                  className="w-full max-w-[260px] sm:max-w-[300px] h-auto mx-auto"
                />
              </div>

              {/* Summary card */}
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-cream to-[#F7EEE3] border border-brick/15 px-5 py-4">
                <p className="text-xl font-bold text-charcoal mb-2">
                  โต๊ะ {qrSession.table_number}
                </p>
                <div className="flex items-center justify-center gap-4 text-charcoal/70 text-sm sm:text-base flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Users size={16} className="text-brick" />
                    ผู้ใหญ่ {qrSession.adult_count} คน
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Baby size={16} className="text-amber" />
                    เด็ก {qrSession.child_count} คน
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-brick/10">
                  <span className="text-charcoal/60">ยอดรวม </span>
                  <span className="text-xl font-bold text-brick">
                    {(
                      qrSession.adult_count * ADULT_PRICE +
                      qrSession.child_count * CHILD_PRICE
                    ).toLocaleString()}{" "}
                    บาท
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs text-charcoal/40 break-all print:text-sm">
                {orderUrl}
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 print:hidden">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-brick/20 text-charcoal font-semibold py-3.5 hover:border-brick/50 transition-all active:scale-[0.98]"
              >
                {copied ? (
                  <Check size={19} className="text-green-600" />
                ) : (
                  <Copy size={19} className="text-brick" />
                )}
                {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-brick/20 text-charcoal font-semibold py-3.5 hover:border-brick/50 transition-all active:scale-[0.98]"
              >
                <Printer size={19} className="text-brick" />
                พิมพ์ QR Code
              </button>
            </div>

            <button
              onClick={resetForm}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber hover:bg-amber-light text-cream text-lg font-bold py-4 shadow-warm transition-all active:scale-[0.98] print:hidden"
            >
              เปิดโต๊ะถัดไป
              <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirmModal && conflictSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm px-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-soft max-w-sm w-full p-6 sm:p-7">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-brick font-bold text-lg">
                <AlertTriangle size={22} />
                ยืนยันปิดออเดอร์เดิม
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="rounded-2xl bg-cream border border-brick/10 px-4 py-4 space-y-2 text-charcoal">
              <div className="flex justify-between">
                <span className="text-charcoal/60">โต๊ะ</span>
                <span className="font-semibold">
                  {conflictSession.table_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal/60">ผู้ใหญ่</span>
                <span className="font-semibold">
                  {conflictSession.adult_count} คน
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal/60">เด็ก</span>
                <span className="font-semibold">
                  {conflictSession.child_count} คน
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal/60">เปิดโต๊ะมาแล้ว</span>
                <span className="font-semibold">
                  {minutesAgo(conflictSession.created_at)} นาที
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-brick/10">
                <span className="text-charcoal/60">ยอดประเมินรอบเก่า</span>
                <span className="font-bold text-brick">
                  {(
                    conflictSession.adult_count * ADULT_PRICE +
                    conflictSession.child_count * CHILD_PRICE
                  ).toLocaleString()}{" "}
                  บาท
                </span>
              </div>
            </div>

            <p className="text-sm text-charcoal/50 mt-4">
              การปิดออเดอร์นี้จะเปลี่ยนสถานะเป็น "closed" และเปิดโต๊ะใหม่ให้
              ทันที ยืนยันหรือไม่?
            </p>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mt-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-2xl border-2 border-charcoal/15 text-charcoal font-semibold py-3.5 hover:bg-charcoal/5 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCloseOldSession}
                disabled={closing}
                className="flex items-center justify-center gap-2 rounded-2xl bg-brick text-cream font-semibold py-3.5 hover:bg-brick-dark disabled:opacity-60 transition-colors"
              >
                {closing && <Loader2 size={18} className="animate-spin" />}
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
