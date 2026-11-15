"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  createCatalogProduct,
  getCatalogCategories,
  refreshCatalog,
  type CatalogCategory,
} from "@/lib/catalog/repository";
import type { CatalogProduct } from "@/lib/catalog/types";
import { getCurrentUserRole, type StoreRole } from "@/lib/supabase/auth";
import { AppNav } from "@/components/top-nav";
import { useLocale } from "@/lib/locale";

const emptyForm = { name: "", sku: "", price: "", stock: "", categoryId: "" };

export default function CatalogPage() {
  const { formatMoney } = useLocale();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("Loading catalog...");
  const [isSaving, setIsSaving] = useState(false);
  const [role, setRole] = useState<StoreRole | null>(null);

  async function loadCatalog() {
    try {
      const [catalog, categoryRows] = await Promise.all([refreshCatalog(), getCatalogCategories()]);
      setProducts(catalog);
      setCategories(categoryRows);
      const currentRole = await getCurrentUserRole();
      setRole(currentRole);
      setStatus(currentRole ? `${catalog.length} products in this store` : "Could not resolve your store role. Check your membership and store ID.");
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
    <main className="min-h-full min-w-0 flex-1 text-[#1e2a23]">
      <AppNav title="Catalog" subtitle="Products available in the POS" />

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="surface p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-[#5d665f]">Main store</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#1e2a23]">Products</h2>
            </div>
            <span className="rounded-full bg-[#f5e3d8] px-2.5 py-1 text-xs font-medium text-[#a14f35]">{status}</span>
          </div>

          <div className="overflow-hidden inset-panel">
            <div className="grid grid-cols-[1fr_110px_90px] border-b border-[#1e2a23]/10 bg-white/40 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5d665f]">
              <span>Product</span>
              <span>SKU</span>
              <span className="text-right">Stock</span>
            </div>
            {products.length === 0 ? (
              <p className="p-8 text-sm text-[#5d665f]">No products found for this store.</p>
            ) : (
              products.map((product) => (
                <div className="grid grid-cols-[1fr_110px_90px] items-center border-b border-[#1e2a23]/10 px-5 py-4 last:border-0" key={product.id}>
                  <div>
                    <p className="font-semibold text-[#1e2a23]">{product.name}</p>
                    <p className="mt-1 text-sm text-[#5d665f]">{product.category} · {formatMoney(product.price)}</p>
                  </div>
                  <span className="text-sm text-[#5d665f]">{product.sku}</span>
                  <span className={`text-right text-sm font-semibold ${product.stock === 0 ? "text-[#c75c3b]" : "text-[#1e2a23]"}`}>{product.stock}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {role === "owner" || role === "manager" ? (
          <form className="surface h-fit p-5 sm:p-6 xl:sticky xl:top-24" onSubmit={(event) => void handleSubmit(event)}>
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-[#1e2a23]">Add product</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d665f]">New products become available in the POS after saving.</p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[#2a352f]">
                Name
                <input required className="input-field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>

              <label className="block text-sm font-semibold text-[#2a352f]">
                SKU
                <input required className="input-field uppercase" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-[#2a352f]">
                  Price
                  <input required min="0" step="0.01" type="number" className="input-field" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
                </label>
                <label className="block text-sm font-semibold text-[#2a352f]">
                  Stock
                  <input required min="0" step="1" type="number" className="input-field" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
                </label>
              </div>

              <label className="block text-sm font-semibold text-[#2a352f]">
                Category
                <select className="input-field" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            </div>

            <button className="primary-btn mt-6 w-full py-4" disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Add to catalog"}</button>
          </form>
        ) : (
          <aside className="surface h-fit p-5 sm:p-6 xl:sticky xl:top-24">
            <h2 className="text-xl font-semibold text-[#1e2a23]">Read-only catalog</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d665f]">Your staff role can view products, but only managers and owners can change the catalog.</p>
          </aside>
        )}
      </div>
    </main>
  );
}