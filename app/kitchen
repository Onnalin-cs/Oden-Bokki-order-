"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Flame,
  CheckCircle2,
  Volume2,
  VolumeX,
  Clock,
  ChefHat,
  Soup,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const ACTIVE_STATUSES = ["received", "cooking"];
const FADE_DURATION = 600; // ms
const FLASH_DURATION = 4000; // ms

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [fadingIds, setFadingIds] = useState(new Set());
  const [flashIds, setFlashIds] = useState(new Set());
  const [now, setNow] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioCtxRef = useRef(null);

  // ---- clock tick for "X minutes ago" ----
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(tick);
  }, []);

  // ---- sound ----
  function enableSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      audioCtxRef.current.resume();
      setSoundEnabled(true);
      playBeep(); // confirm sound is on
    } catch {
      // audio unavailable, ignore silently
    }
  }

  const playBeep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const beep = (freq, startAt, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(
        0.35,
        ctx.currentTime + startAt + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + startAt + duration
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration);
    };
    beep(880, 0, 0.35);
    beep(1046, 0.22, 0.35);
  }, []);

  function flashOrder(id) {
    setFlashIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, FLASH_DURATION);
  }

  // ---- initial load ----
  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: true });
      setOrders(data || []);
      setLoading(false);
    }
    loadOrders();
  }, []);

  // ---- realtime subscription ----
  useEffect(() => {
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new;
          if (!ACTIVE_STATUSES.includes(newOrder.status)) return;
          setOrders((prev) =>
            prev.some((o) => o.id === newOrder.id)
              ? prev
              : [...prev, newOrder]
          );
          flashOrder(newOrder.id);
          if (soundEnabled) playBeep();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new;
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === updated.id);
            if (!exists) {
              if (ACTIVE_STATUSES.includes(updated.status)) {
                return [...prev, updated];
              }
              return prev;
            }
            return prev.map((o) => (o.id === updated.id ? updated : o));
          });

          if (!ACTIVE_STATUSES.includes(updated.status)) {
            setFadingIds((prev) => new Set(prev).add(updated.id));
            setTimeout(() => {
              setOrders((prev) => prev.filter((o) => o.id !== updated.id));
              setFadingIds((prev) => {
                const next = new Set(prev);
                next.delete(updated.id);
                return next;
              });
            }, FADE_DURATION);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled]);

  // ---- actions ----
  async function handleStartCooking(order) {
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: "cooking" } : o))
    );
    const { error } = await supabase
      .from("orders")
      .update({ status: "cooking" })
      .eq("id", order.id);
    if (error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: order.status } : o))
      );
    }
  }

  async function handleServed(order) {
    setFadingIds((prev) => new Set(prev).add(order.id));
    const { error } = await supabase
      .from("orders")
      .update({ status: "served" })
      .eq("id", order.id);

    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }, FADE_DURATION);

    if (error) {
      // revert on failure by re-adding after fade completes
      setTimeout(() => {
        setOrders((prev) =>
          prev.some((o) => o.id === order.id) ? prev : [...prev, order]
        );
      }, FADE_DURATION + 50);
    }
  }

  function minutesAgo(createdAt) {
    const diffMs = now - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }

  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  return (
    <main className="min-h-screen bg-[#1c1b1a] text-cream">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1c1b1a]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-brick/20 flex items-center justify-center">
            <ChefHat className="text-amber" size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">
              Oden-Bokki Kitchen
            </h1>
            <p className="text-cream/40 text-sm">หน้าจอควบคุมครัว</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold">
            <Soup size={16} className="text-amber" />
            {sorted.length} ออเดอร์รอดำเนินการ
          </span>
          <button
            onClick={enableSound}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
              soundEnabled
                ? "bg-amber/20 border-amber/40 text-amber"
                : "bg-white/5 border-white/10 text-cream/60 hover:text-cream"
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? "เปิดเสียงแจ้งเตือนแล้ว" : "เปิดเสียงแจ้งเตือน"}
          </button>
        </div>
      </header>

      {/* Orders grid */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <p className="text-center text-cream/40 py-20">กำลังโหลดออเดอร์...</p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-cream/30">
            <Soup size={48} className="mb-3" />
            <p className="text-lg">ยังไม่มีออเดอร์เข้ามา 🍳</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map((order) => {
              const elapsed = minutesAgo(order.created_at);
              const isCooking = order.status === "cooking";
              const isUrgent = elapsed >= 15;
              const isFading = fadingIds.has(order.id);
              const isFlashing = flashIds.has(order.id);

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 bg-[#2a2927] overflow-hidden transition-all duration-500 ${
                    isFading
                      ? "opacity-0 scale-95"
                      : "opacity-100 scale-100"
                  } ${
                    isFlashing
                      ? "ring-4 ring-amber animate-pulse border-amber"
                      : isCooking
                      ? "border-amber/60"
                      : "border-brick/60"
                  }`}
                >
                  {/* Card header */}
                  <div
                    className={`px-4 py-3 flex items-center justify-between ${
                      isCooking
                        ? "bg-gradient-to-r from-amber/25 to-amber/5"
                        : "bg-gradient-to-r from-brick/30 to-brick/5"
                    }`}
                  >
                    <span className="text-4xl sm:text-5xl font-black leading-none">
                      {order.table_number}
                    </span>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                          isCooking
                            ? "bg-amber text-charcoal"
                            : "bg-brick text-cream"
                        }`}
                      >
                        {isCooking ? "🔥 กำลังทำ" : "🆕 รอทำ"}
                      </span>
                      <p
                        className={`flex items-center justify-end gap-1 text-sm mt-1.5 ${
                          isUrgent
                            ? "text-red-400 font-bold animate-pulse"
                            : "text-cream/40"
                        }`}
                      >
                        <Clock size={13} />
                        {elapsed < 1 ? "เพิ่งสั่ง" : `${elapsed} นาทีที่แล้ว`}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-4 space-y-2.5 min-h-[80px]">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="leading-snug">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-lg">
                            {item.name}
                          </span>
                          <span className="font-bold text-amber text-lg whitespace-nowrap">
                            x{item.quantity}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-sm text-cream/50 italic">
                            โน้ต: {item.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    {!isCooking ? (
                      <button
                        onClick={() => handleStartCooking(order)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-amber hover:bg-amber-light text-charcoal font-bold py-3 transition-colors active:scale-[0.97]"
                      >
                        <Flame size={18} />
                        เริ่มทำ
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 text-cream/40 font-semibold py-3">
                        <Flame size={18} />
                        กำลังทำอยู่
                      </div>
                    )}
                    <button
                      onClick={() => handleServed(order)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold py-3 transition-colors active:scale-[0.97]"
                    >
                      <CheckCircle2 size={18} />
                      เสิร์ฟแล้ว
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
