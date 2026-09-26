"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  ClipboardList,
  AlertTriangle,
  ArrowLeft,
  FolderOpen,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

function getCategoryIcon(name = "") {
  if (name.includes("โอเด้ง")) return "🍢";
  if (name.includes("ต็อก")) return "🌶️";
  if (name.includes("เนื้อ")) return "🥩";
  if (name.includes("เส้น") || name.includes("ซุป")) return "🍜";
  if (name.includes("ทอด")) return "🍤";
  if (name.includes("เครื่องดื่ม")) return "🥤";
  return "🍽️";
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);

  function showToast(message, isError = false) {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: cats }, { data: menuItems }] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase.from("menu_items").select("*").order("name", { ascending: true }),
      ]);
      setCategories(cats || []);
      setItems(menuItems || []);
      if (cats && cats.length) setNewCategoryId(String(cats[0].id));
      setLoading(false);
    }
    load();
  }, []);

  // ---- create ----
  async function handleAddItem(e) {
    e.preventDefault();
    if (!newName.trim() || !newCategoryId) {
      showToast("กรุณากรอกชื่อเมนูและเลือกหมวดหมู่", true);
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .insert({ name: newName.trim(), category_id: newCategoryId })
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => [...prev, data]);
      setNewName("");
      showToast("เพิ่มเมนูสำเร็จ ✅");
    } catch (err) {
      showToast(err.message || "เพิ่มเมนูไม่สำเร็จ", true);
    } finally {
      setAdding(false);
    }
  }

  // ---- update ----
  function openEdit(item) {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategoryId(String(item.category_id));
  }

  async function handleSaveEdit() {
    if (!editingItem || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .update({ name: editName.trim(), category_id: editCategoryId })
        .eq("id", editingItem.id)
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === data.id ? data : it)));
      setEditingItem(null);
      showToast("บันทึกการแก้ไขสำเร็จ ✅");
    } catch (err) {
      showToast(err.message || "แก้ไขไม่สำเร็จ", true);
    } finally {
      setSavingEdit(false);
    }
  }

  // ---- delete ----
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("ลบเมนูสำเร็จ 🗑️");
    } catch (err) {
      showToast(err.message || "ลบไม่สำเร็จ", true);
    } finally {
      setDeleting(false);
    }
  }

  // ---- search + grouping ----
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => it.name.toLowerCase().includes(term));
  }, [items, searchTerm]);

  const grouped = useMemo(() => {
    return categories
      .map((cat) => ({
        ...cat,
        items: filteredItems.filter(
          (it) => String(it.category_id) === String(cat.id)
        ),
      }))
      .filter((cat) => !searchTerm.trim() || cat.items.length > 0);
  }, [categories, filteredItems, searchTerm]);

  const uncategorized = useMemo(
    () =>
      filteredItems.filter(
        (it) => !categories.some((c) => String(c.id) === String(it.category_id))
      ),
    [filteredItems, categories]
  );

  const hasAnyResults =
    grouped.some((g) => g.items.length > 0) || uncategorized.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream via-cream to-[#F7EEE3]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-brick/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-charcoal/50 hover:text-brick transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-brick/10 flex items-center justify-center text-brick">
                <ClipboardList size={20} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-charcoal leading-tight">
                  จัดการเมนูอาหาร
                </h1>
                <p className="text-xs text-charcoal/40">Oden-Bokki Admin</p>
              </div>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/30"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full text-sm rounded-full border border-brick/15 bg-white pl-10 pr-4 py-2.5 focus:outline-none focus:border-brick focus:ring-2 focus:ring-brick/10 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Add new item */}
        <form
          onSubmit={handleAddItem}
          className="bg-white rounded-2xl shadow-soft border border-brick/10 p-5 sm:p-6"
        >
          <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <Plus size={18} className="text-brick" />
            เพิ่มเมนูใหม่
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ชื่อเมนู เช่น ลูกชิ้นปลานารูโตะ"
              className="flex-1 rounded-xl border border-brick/15 px-4 py-3 focus:outline-none focus:border-brick focus:ring-2 focus:ring-brick/10 transition-all"
            />
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="rounded-xl border border-brick/15 px-4 py-3 bg-white focus:outline-none focus:border-brick focus:ring-2 focus:ring-brick/10 transition-all sm:w-56"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryIcon(cat.name)} {cat.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brick hover:bg-brick-dark disabled:opacity-60 text-cream font-semibold px-6 py-3 shadow-warm transition-all active:scale-[0.98]"
            >
              {adding ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              เพิ่มเมนู
            </button>
          </div>
        </form>

        {/* Menu list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-brick" size={28} />
          </div>
        ) : !hasAnyResults ? (
          <div className="flex flex-col items-center justify-center py-20 text-charcoal/40">
            <FolderOpen size={40} className="mb-3" />
            <p>
              {searchTerm.trim()
                ? "ไม่พบเมนูที่ค้นหา"
                : "ยังไม่มีเมนูในระบบ"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl shadow-soft border border-brick/10 overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-brick/8 to-transparent border-b border-brick/10">
                  <span className="font-semibold text-charcoal flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(cat.name)}</span>
                    {cat.name}
                  </span>
                  <span className="text-xs font-semibold text-brick bg-brick/10 rounded-full px-2.5 py-1">
                    {cat.items.length} เมนู
                  </span>
                </div>

                {cat.items.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-charcoal/40">
                    ยังไม่มีเมนูในหมวดนี้
                  </p>
                ) : (
                  <ul className="divide-y divide-brick/8">
                    {cat.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-cream/60 transition-colors"
                      >
                        <span className="text-charcoal font-medium">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-charcoal/40 hover:text-brick hover:bg-brick/10 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-charcoal/40 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {uncategorized.length > 0 && (
              <div className="bg-white rounded-2xl shadow-soft border border-amber/20 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 bg-amber/10 border-b border-amber/20">
                  <span className="font-semibold text-charcoal flex items-center gap-2">
                    ⚠️ ไม่ทราบหมวดหมู่
                  </span>
                  <span className="text-xs font-semibold text-amber bg-amber/15 rounded-full px-2.5 py-1">
                    {uncategorized.length} เมนู
                  </span>
                </div>
                <ul className="divide-y divide-brick/8">
                  {uncategorized.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-cream/60 transition-colors"
                    >
                      <span className="text-charcoal font-medium">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-charcoal/40 hover:text-brick hover:bg-brick/10 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-charcoal/40 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-soft max-w-sm w-full p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
                <Pencil size={18} className="text-brick" />
                แก้ไขเมนู
              </h2>
              <button
                onClick={() => setEditingItem(null)}
                className="text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <label className="block text-sm font-semibold text-charcoal mb-1.5">
              ชื่อเมนู
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-brick/15 px-4 py-3 mb-4 focus:outline-none focus:border-brick focus:ring-2 focus:ring-brick/10 transition-all"
            />

            <label className="block text-sm font-semibold text-charcoal mb-1.5">
              หมวดหมู่
            </label>
            <select
              value={editCategoryId}
              onChange={(e) => setEditCategoryId(e.target.value)}
              className="w-full rounded-xl border border-brick/15 px-4 py-3 bg-white focus:outline-none focus:border-brick focus:ring-2 focus:ring-brick/10 transition-all"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryIcon(cat.name)} {cat.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="rounded-xl border-2 border-charcoal/15 text-charcoal font-semibold py-3 hover:bg-charcoal/5 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex items-center justify-center gap-2 rounded-xl bg-brick text-cream font-semibold py-3 hover:bg-brick-dark disabled:opacity-60 transition-colors"
              >
                {savingEdit ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Check size={17} />
                )}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-soft max-w-sm w-full p-6 sm:p-7 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={26} />
            </div>
            <h2 className="text-lg font-bold text-charcoal mb-1">
              ยืนยันการลบเมนู
            </h2>
            <p className="text-charcoal/60 mb-6">
              ต้องการลบ &quot;{deleteTarget.name}&quot; ใช่หรือไม่?
              การลบนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border-2 border-charcoal/15 text-charcoal font-semibold py-3 hover:bg-charcoal/5 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
              >
                {deleting ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Trash2 size={17} />
                )}
                ลบเมนู
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4">
          <div
            className={`rounded-full px-5 py-3 shadow-warm font-semibold text-sm ${
              toast.isError ? "bg-red-600 text-white" : "bg-charcoal text-cream"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </main>
  );
}
