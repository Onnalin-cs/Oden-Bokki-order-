"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  CreditCard,
  Plus,
  Minus,
  X,
  Check,
  Loader2,
  AlertCircle,
  PartyPopper,
  QrCode,
  Banknote,
  Trash2,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

const ADULT_PRICE = 219;
const CHILD_PRICE = 109;

function getCategoryIcon(name = "") {
  if (name.includes("โอเด้ง")) return "🍢";
  if (name.includes("ต็อก")) return "🌶️";
  if (name.includes("เนื้อ")) return "🥩";
  if (name.includes("เส้น") || name.includes("ซุป")) return "🍜";
  if (name.includes("ทอด")) return "🍤";
  if (name.includes("เครื่องดื่ม")) return "🥤";
  return "🍽️";
}

export default function OrderPage({ params }) {
  const { tableNumber } = use(params);

  // session state
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [closed, setClosed] = useState(false);

  // menu state
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);

  // cart state
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // billing state
  const [showBillModal, setShowBillModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qr");
  const [closingTable, setClosingTable] = useState(false);

  // toast
  const [toast, setToast] = useState(null);

  function showToast(message, isError = false) {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 2500);
  }

  // ---- load session ----
  useEffect(() => {
    let ignore = false;
    async function loadSession() {
      setChecking(true);
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("table_number", Number(tableNumber))
        .eq("status", "open")
        .maybeSingle();
      if (ignore) return;
      if (error || !data) {
        setSession(null);
        setNotFound(true);
      } else {
        setSession(data);
        setNotFound(false);
      }
      setChecking(false);
    }
    if (tableNumber) loadSession();
    return () => {
      ignore = true;
    };
  }, [tableNumber]);

  // ---- load menu once session confirmed ----
  useEffect(() => {
    if (!session) return;
    let ignore = false;
    async function loadMenu() {
      setMenuLoading(true);
      const [{ data: cats }, { data: menuItems }] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase.from("menu_items").select("*"),
      ]);
      if (ignore) return;
      setCategories(cats || []);
      setItems(menuItems || []);
      if (cats && cats.length) setActiveCategory(cats[0].id);
      setMenuLoading(false);
    }
    loadMenu();
    return () => {
      ignore = true;
    };
  }, [session]);

  const itemsByCategory = useMemo(() => {
    if (!activeCategory) return [];
    return items.filter((item) => item.category_id === activeCategory);
  }, [items, activeCategory]);

  const cartQtyFor = (itemId) =>
    cart.find((c) => c.item_id === itemId)?.quantity || 0;

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          category_id: item.category_id,
          quantity: 1,
          note: "",
        },
      ];
    });
  }

  function updateQty(itemId, delta) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item_id === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function updateNote(itemId, note) {
    setCart((prev) =>
      prev.map((c) => (c.item_id === itemId ? { ...c, note } : c))
    );
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((c) => c.item_id !== itemId));
  }

  async function handleSubmitOrder() {
    if (!session || cart.length === 0) return;
    setSubmittingOrder(true);
    try {
      const { error } = await supabase.from("orders").insert({
        session_id: session.id,
        table_number: Number(tableNumber),
        items: cart.map(({ item_id, name, quantity, note }) => ({
          item_id,
          name,
          quantity,
          note,
        })),
        status: "received",
      });
      if (error) throw error;
      setCart([]);
      setShowCartModal(false);
      showToast("ส่งออเดอร์เข้าครัวแล้ว ♨️");
    } catch (err) {
      showToast(err.message || "ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่", true);
    } finally {
      setSubmittingOrder(false);
    }
  }

  const billTotal = session
    ? session.adult_count * ADULT_PRICE + session.child_count * CHILD_PRICE
    : 0;

  async function handleConfirmPayment() {
    if (!session) return;
    setClosingTable(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ status: "closed" })
        .eq("id", session.id);
      if (error) throw error;
      setShowBillModal(false);
      setClosed(true);
    } catch (err) {
      showToast(err.message || "ปิดโต๊ะไม่สำเร็จ กรุณาลองใหม่", true);
    } finally {
      setClosingTable(false);
    }
  }

  // ---------------- LOADING ----------------
  if (checking) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-brick" size={36} />
      </main>
    );
  }

  // ---------------- NOT FOUND ----------------
  if (notFound) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center bg-white rounded-3xl shadow-soft border border-brick/10 p-8">
          <div className="mx-auto mb-5 flex items-center justify-center w-16 h-16 rounded-full bg-brick/10 text-brick">
            <AlertCircle size={30} />
          </div>
          <p className="text-lg font-semibold text-charcoal leading-relaxed">
            โต๊ะนี้ยังไม่เปิดบริการ หรือปิดออเดอร์ไปแล้ว
            กรุณาติดต่อพนักงาน 🍢
          </p>
        </div>
      </main>
    );
  }

  // ---------------- THANK YOU ----------------
  if (closed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-brick to-brick-dark flex items-center justify-center px-6 text-cream">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-5 flex items-center justify-center w-20 h-20 rounded-full bg-cream/15">
            <PartyPopper size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            ขอบคุณที่มาอุดหนุน Oden-Bokki
          </h1>
          <p className="text-cream/80">
            แล้วพบกันใหม่นะคะ 🍢🔥 หวังว่าจะอิ่มอร่อยกันทุกคน
          </p>
        </div>
      </main>
    );
  }

  // ---------------- MAIN ORDER UI ----------------
  return (
    <main className="min-h-screen bg-gradient-to-b from-cream via-cream to-[#F7EEE3]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur border-b border-brick/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-lg font-bold text-charcoal leading-tight">
                Oden-Bokki
              </p>
              <p className="text-xs text-charcoal/50">โอเด้งบ็อกกี</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-brick text-cream text-sm font-bold px-3 py-1">
              โต๊ะ {tableNumber}
            </span>
          </div>
          <button
            onClick={() => setShowBillModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-charcoal text-cream text-sm font-semibold px-4 py-2 hover:bg-charcoal/85 transition-colors"
          >
            <CreditCard size={16} />
            เรียกเก็บเงิน
          </button>
        </div>

        {/* Category tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-brick text-cream shadow-warm"
                  : "bg-white text-charcoal/70 border border-brick/15"
              }`}
            >
              <span>{getCategoryIcon(cat.name)}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Menu grid */}
      <div
        className={`max-w-2xl mx-auto px-4 py-5 ${
          cartCount > 0 ? "pb-28" : "pb-8"
        }`}
      >
        {menuLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-brick" size={28} />
          </div>
        ) : itemsByCategory.length === 0 ? (
          <p className="text-center text-charcoal/50 py-16">
            ยังไม่มีเมนูในหมวดนี้
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {itemsByCategory.map((item) => {
              const qty = cartQtyFor(item.id);
              const cat = categories.find((c) => c.id === item.category_id);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-brick/10 shadow-soft p-4 flex flex-col items-center text-center gap-2"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-cream text-2xl">
                    {getCategoryIcon(cat?.name)}
                  </div>
                  <p className="font-semibold text-charcoal text-sm leading-snug">
                    {item.name}
                  </p>

                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="mt-1 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-brick/10 text-brick font-semibold text-sm py-2 hover:bg-brick hover:text-cream transition-colors"
                    >
                      <Plus size={15} />
                      เพิ่ม
                    </button>
                  ) : (
                    <div className="mt-1 w-full flex items-center justify-between rounded-xl bg-brick text-cream px-1 py-1">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cream/20 transition-colors"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="font-bold text-sm">{qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cream/20 transition-colors"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 px-4 pb-4">
          <button
            onClick={() => setShowCartModal(true)}
            className="max-w-2xl mx-auto w-full flex items-center justify-between rounded-2xl bg-brick text-cream shadow-warm px-5 py-4 hover:bg-brick-dark transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingCart size={20} />
              {cartCount} รายการ
            </span>
            <span className="font-bold">ดูตะกร้า / ส่งออเดอร์</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCartModal && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-charcoal/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft w-full sm:max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-brick/10">
              <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
                <ShoppingCart size={20} className="text-brick" />
                ตะกร้าของคุณ
              </h2>
              <button
                onClick={() => setShowCartModal(false)}
                className="text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-charcoal/50 py-10">
                  ยังไม่มีรายการในตะกร้า
                </p>
              ) : (
                cart.map((c) => (
                  <div
                    key={c.item_id}
                    className="rounded-2xl border border-brick/10 bg-cream/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-charcoal">{c.name}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(c.item_id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-brick/10 text-brick hover:bg-brick hover:text-cream transition-colors"
                        >
                          <Minus size={15} />
                        </button>
                        <span className="font-bold text-charcoal w-5 text-center">
                          {c.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(c.item_id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-brick/10 text-brick hover:bg-brick hover:text-cream transition-colors"
                        >
                          <Plus size={15} />
                        </button>
                        <button
                          onClick={() => removeFromCart(c.item_id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-charcoal/30 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={c.note}
                      onChange={(e) => updateNote(c.item_id, e.target.value)}
                      placeholder="โน้ตพิเศษ เช่น ไม่เผ็ด / แยกซุป"
                      className="mt-3 w-full text-sm rounded-xl border border-brick/15 focus:border-brick focus:outline-none focus:ring-2 focus:ring-brick/10 px-3 py-2"
                    />
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-5 border-t border-brick/10">
              <button
                onClick={handleSubmitOrder}
                disabled={cart.length === 0 || submittingOrder}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brick hover:bg-brick-dark disabled:opacity-50 text-cream text-lg font-bold py-4 shadow-warm transition-all active:scale-[0.98]"
              >
                {submittingOrder ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Check size={20} />
                )}
                ยืนยันส่งเข้าครัว
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill modal */}
      {showBillModal && session && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-soft max-w-sm w-full p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
                <CreditCard size={20} className="text-brick" />
                สรุปยอด & เรียกเก็บเงิน
              </h2>
              <button
                onClick={() => setShowBillModal(false)}
                className="text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="rounded-2xl bg-cream border border-brick/10 px-4 py-4 space-y-2">
              <div className="flex justify-between text-charcoal">
                <span className="text-charcoal/60">โต๊ะ</span>
                <span className="font-semibold">{tableNumber}</span>
              </div>
              <div className="flex justify-between text-charcoal">
                <span className="text-charcoal/60">
                  ผู้ใหญ่ ({session.adult_count} × {ADULT_PRICE})
                </span>
                <span className="font-semibold">
                  {(session.adult_count * ADULT_PRICE).toLocaleString()} บาท
                </span>
              </div>
              <div className="flex justify-between text-charcoal">
                <span className="text-charcoal/60">
                  เด็ก ({session.child_count} × {CHILD_PRICE})
                </span>
                <span className="font-semibold">
                  {(session.child_count * CHILD_PRICE).toLocaleString()} บาท
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-brick/10">
                <span className="font-bold text-charcoal">ยอดรวมทั้งหมด</span>
                <span className="text-xl font-bold text-brick">
                  {billTotal.toLocaleString()} บาท
                </span>
              </div>
            </div>

            <p className="text-sm font-semibold text-charcoal mt-5 mb-2">
              วิธีชำระเงิน
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("qr")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 transition-all ${
                  paymentMethod === "qr"
                    ? "border-brick bg-brick/5 text-brick"
                    : "border-charcoal/10 text-charcoal/60"
                }`}
              >
                <QrCode size={22} />
                <span className="text-sm font-semibold">สแกน QR</span>
              </button>
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 transition-all ${
                  paymentMethod === "cash"
                    ? "border-brick bg-brick/5 text-brick"
                    : "border-charcoal/10 text-charcoal/60"
                }`}
              >
                <Banknote size={22} />
                <span className="text-sm font-semibold">เงินสด</span>
              </button>
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={closingTable}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-brick hover:bg-brick-dark disabled:opacity-60 text-cream text-lg font-bold py-4 shadow-warm transition-all active:scale-[0.98]"
            >
              {closingTable && (
                <Loader2 size={20} className="animate-spin" />
              )}
              ยืนยันปิดโต๊ะ
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4">
          <div
            className={`rounded-full px-5 py-3 shadow-warm font-semibold text-sm ${
              toast.isError
                ? "bg-red-600 text-white"
                : "bg-charcoal text-cream"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </main>
  );
}
