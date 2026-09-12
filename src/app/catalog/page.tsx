"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  createCatalogProduct,
  getCatalogCategories,
  refreshCatalog,
  type CatalogCategory,
} from "@/lib/catalog/repository";
import type { CatalogProduct } from "@/lib/catalog/types";

const emptyForm = { name: "", sku: "", price: "", stock: "", categoryId: "" };

export default function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("Loading catalog...");
  const [isSaving, setIsSaving] = useState(false);

  async function loadCatalog() {
    try {
      const [catalog, categoryRows] = await Promise.all([refreshCatalog(), getCatalogCategories()]);
      setProducts(catalog);
      setCategories(categoryRows);
      setStatus(`${catalog.length} products in this store`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load the catalog.");
    }
  }

  useEffect(() => {
    const loadTask = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(loadTask);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("Saving product...");

    try {
      await createCatalogProduct({
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: form.categoryId || null,
      });
      setForm(emptyForm);
      await loadCatalog();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the product.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]">
      <header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p>
          <h1 className="mt-1 text-xl font-semibold">Catalog management</h1>
        </div>
        <a className="text-sm text-[#69736b] transition hover:text-[#c75c3b]" href="/pos">Back to POS</a>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm text-[#69736b]">Main store</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight">Products</h2>
            </div>
            <span className="text-sm text-[#69736b]">{status}</span>
          </div>
          <div className="overflow-hidden border border-[#d8d4ca] bg-[#fffdf8]">
            <div className="grid grid-cols-[1fr_110px_100px] border-b border-[#d8d4ca] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#69736b]">
              <span>Product</span><span>SKU</span><span className="text-right">Stock</span>
            </div>
            {products.length === 0 ? <p className="p-8 text-sm text-[#69736b]">No products found for this store.</p> : products.map((product) => (
              <div className="grid grid-cols-[1fr_110px_100px] items-center border-b border-[#eee9df] px-5 py-4 last:border-0" key={product.id}>
                <div><p className="font-semibold">{product.name}</p><p className="text-sm text-[#69736b]">{product.category} · ${product.price.toFixed(2)}</p></div>
                <span className="text-sm text-[#69736b]">{product.sku}</span>
                <span className={`text-right text-sm font-semibold ${product.stock === 0 ? "text-[#c75c3b]" : ""}`}>{product.stock}</span>
              </div>
            ))}
          </div>
        </section>

        <form className="h-fit border border-[#d8d4ca] bg-[#fffdf8] p-6 lg:sticky lg:top-6" onSubmit={(event) => void handleSubmit(event)}>
          <h2 className="text-xl font-semibold">Add product</h2>
          <p className="mt-2 text-sm leading-6 text-[#69736b]">New products become available in the POS after saving.</p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">Name<input required className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 font-normal outline-none focus:border-[#c75c3b]" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="block text-sm font-semibold">SKU<input required className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 font-normal uppercase outline-none focus:border-[#c75c3b]" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">Price<input required min="0" step="0.01" type="number" className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 font-normal outline-none focus:border-[#c75c3b]" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
              <label className="block text-sm font-semibold">Stock<input required min="0" step="1" type="number" className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 font-normal outline-none focus:border-[#c75c3b]" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
            </div>
            <label className="block text-sm font-semibold">Category<select className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 font-normal outline-none focus:border-[#c75c3b]" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>
          <button className="mt-6 w-full bg-[#1d2a24] px-5 py-4 text-sm font-bold text-[#fffdf8] transition hover:bg-[#c75c3b] disabled:cursor-not-allowed disabled:bg-[#b5b8b2]" disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Add to catalog"}</button>
        </form>
      </div>
    </main>
  );
}