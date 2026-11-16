"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  createCatalogCategory,
  createCatalogProduct,
  deleteCatalogCategory,
  deleteCatalogProduct,
  getCatalogCategories,
  refreshCatalog,
  renameCatalogCategory,
  updateCatalogProduct,
  type CatalogCategory,
} from "@/lib/catalog/repository";
import type { CatalogProduct } from "@/lib/catalog/types";
import { getCurrentUserRole, type StoreRole } from "@/lib/supabase/auth";
import { AppNav } from "@/components/top-nav";
import { useLocale } from "@/lib/locale";

const emptyForm = { name: "", sku: "", price: "", stock: "", categoryId: "" };

const rowActionClass = "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition";

export default function CatalogPage() {
  const { currency, formatMoney, convertInput, parseInput } = useLocale();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [form, setForm] = useState(emptyForm);
  // The product being edited, or null when the form adds a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Delete asks twice: the first click arms the row, the second deletes.
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading catalog...");
  const [isSaving, setIsSaving] = useState(false);
  const [role, setRole] = useState<StoreRole | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const canEdit = role === "owner" || role === "manager";
  const editingProduct = products.find((product) => product.id === editingId) ?? null;

  async function loadCatalog(message?: string) {
    try {
      const [catalog, categoryRows] = await Promise.all([refreshCatalog(), getCatalogCategories()]);
      setProducts(catalog);
      setCategories(categoryRows);
      const currentRole = await getCurrentUserRole();
      setRole(currentRole);
      setStatus(currentRole ? message ?? `${catalog.length} products in this store` : "Could not resolve your store role. Check your membership and store ID.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load the catalog.");
    }
  }

  useEffect(() => {
    const loadTask = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(loadTask);
  }, []);

  /** Runs a change, then reloads the lists. Errors land in the status pill. */
  async function run(working: string, done: string, action: () => Promise<void>) {
    setIsSaving(true);
    setStatus(working);
    try {
      await action();
      await loadCatalog(done);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(product: CatalogProduct) {
    setConfirmingDelete(null);
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      price: String(Number(convertInput(product.price).toFixed(currency === "IDR" ? 0 : 2))),
      stock: String(product.stock),
      categoryId: product.categoryId ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = { name: form.name.trim(), sku: form.sku.trim().toUpperCase(), price: parseInput(form.price), categoryId: form.categoryId || null };

    const saved = editingId
      ? await run("Saving changes...", `${details.name} updated`, () => updateCatalogProduct(editingId, details))
      : await run("Saving product...", `${details.name} added`, () => createCatalogProduct({ ...details, stock: Number(form.stock) }));
    if (saved) cancelEdit();
  }

  async function handleDelete(product: CatalogProduct) {
    setConfirmingDelete(null);
    const deleted = await run("Deleting product...", `${product.name} deleted`, () => deleteCatalogProduct(product.id));
    if (deleted && editingId === product.id) cancelEdit();
  }

  async function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (await run("Adding category...", `Category ${name} added`, () => createCatalogCategory(name))) setNewCategory("");
  }

  async function handleRenameCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renaming) return;
    const name = renaming.name.trim();
    if (!name) return;
    if (await run("Renaming category...", `Category renamed to ${name}`, () => renameCatalogCategory(renaming.id, name))) setRenaming(null);
  }

  async function handleDeleteCategory(category: CatalogCategory) {
    setConfirmingDelete(null);
    const deleted = await run("Deleting category...", `Category ${category.name} deleted`, () => deleteCatalogCategory(category.id));
    if (deleted && form.categoryId === category.id) setForm((current) => ({ ...current, categoryId: "" }));
  }

  const productColumns = canEdit ? "grid-cols-[minmax(0,1fr)_90px_60px_150px]" : "grid-cols-[minmax(0,1fr)_110px_90px]";

  return (
    <main className="min-h-full min-w-0 flex-1 text-ink">
      <AppNav title="Catalog" subtitle="Products available in the POS" />

      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-6 p-6 sm:p-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="surface p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Main store</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Products</h2>
            </div>
            <span aria-live="polite" className="pill bg-brand-soft text-brand-strong">{status}</span>
          </div>

          <div className="inset-panel overflow-x-auto">
            <div className={canEdit ? "min-w-[560px]" : undefined}>
              <div className={`grid ${productColumns} gap-3 border-b border-ink/10 bg-white/40 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted`}>
                <span>Product</span>
                <span>SKU</span>
                <span className="text-right">Stock</span>
                {canEdit ? <span className="text-right">Actions</span> : null}
              </div>
              {products.length === 0 ? (
                <p className="p-8 text-sm text-muted">No products found for this store.</p>
              ) : (
                products.map((product) => (
                  <div className={`grid ${productColumns} items-center gap-3 border-b border-ink/10 px-5 py-4 last:border-0 ${editingId === product.id ? "bg-white/70" : ""}`} key={product.id}>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{product.name}</p>
                      <p className="mt-1 truncate text-sm text-muted">{product.category} · {formatMoney(product.price)}</p>
                    </div>
                    <span className="truncate text-sm text-muted">{product.sku}</span>
                    <span className={`text-right text-sm font-semibold ${product.stock === 0 ? "text-brand-strong" : "text-ink"}`}>{product.stock}</span>
                    {canEdit ? (
                      <div className="flex justify-end gap-1">
                        {confirmingDelete === product.id ? (
                          <>
                            <button className={`${rowActionClass} bg-brand-strong text-white hover:bg-ink`} disabled={isSaving} onClick={() => void handleDelete(product)} type="button">Confirm</button>
                            <button className={`${rowActionClass} text-muted hover:bg-white/70`} onClick={() => setConfirmingDelete(null)} type="button">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button aria-label={`Edit ${product.name}`} className={`${rowActionClass} text-ink hover:bg-white/70`} onClick={() => startEdit(product)} type="button">Edit</button>
                            <button aria-label={`Delete ${product.name}`} className={`${rowActionClass} text-brand-strong hover:bg-danger-soft`} onClick={() => setConfirmingDelete(product.id)} type="button">Delete</button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {canEdit ? (
          <div className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
            <form className="surface p-5 sm:p-6" onSubmit={(event) => void handleSubmit(event)}>
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-ink">{editingProduct ? "Edit product" : "Add product"}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{editingProduct ? `Changing ${editingProduct.name}. Stock is changed on the Inventory page so each change is logged.` : "New products become available in the POS after saving."}</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-ink">
                  Name
                  <input required className="input-field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>

                <label className="block text-sm font-semibold text-ink">
                  SKU
                  <input required className="input-field uppercase" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-semibold text-ink">
                    Price ({currency})
                    <input required min="0" step={currency === "IDR" ? "1" : "0.01"} type="number" className="input-field" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
                  </label>
                  <label className="block text-sm font-semibold text-ink">
                    {editingProduct ? "Stock (read only)" : "Stock"}
                    <input required disabled={Boolean(editingProduct)} min="0" step="1" type="number" className="input-field disabled:opacity-60" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-ink">
                  Category
                  <select className="input-field" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                    <option value="">Uncategorized</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
              </div>

              <button className="primary-btn mt-6 w-full py-4" disabled={isSaving} type="submit">{isSaving ? "Saving..." : editingProduct ? "Save changes" : "Add to catalog"}</button>
              {editingProduct ? <button className="secondary-btn mt-2 w-full" onClick={cancelEdit} type="button">Cancel</button> : null}
            </form>

            <section className="surface p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-ink">Categories</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Deleting a category keeps its products; they become uncategorized.</p>

              <ul className="mt-4 space-y-2">
                {categories.length === 0 ? <li className="text-sm text-muted">No categories yet.</li> : null}
                {categories.map((category) => (
                  <li className="inset-panel px-3 py-2" key={category.id}>
                    {renaming?.id === category.id ? (
                      <form className="flex items-center gap-2" onSubmit={(event) => void handleRenameCategory(event)}>
                        <input aria-label={`New name for ${category.name}`} autoFocus required className="field min-w-0 flex-1 px-2 py-1.5 text-sm outline-none" value={renaming.name} onChange={(event) => setRenaming({ id: category.id, name: event.target.value })} />
                        <button className={`${rowActionClass} bg-ink text-white`} disabled={isSaving} type="submit">Save</button>
                        <button className={`${rowActionClass} text-muted hover:bg-white/70`} onClick={() => setRenaming(null)} type="button">Cancel</button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">{category.name}</span>
                        <div className="flex shrink-0 gap-1">
                          {confirmingDelete === category.id ? (
                            <>
                              <button className={`${rowActionClass} bg-brand-strong text-white hover:bg-ink`} disabled={isSaving} onClick={() => void handleDeleteCategory(category)} type="button">Confirm</button>
                              <button className={`${rowActionClass} text-muted hover:bg-white/70`} onClick={() => setConfirmingDelete(null)} type="button">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button aria-label={`Rename ${category.name}`} className={`${rowActionClass} text-ink hover:bg-white/70`} onClick={() => { setConfirmingDelete(null); setRenaming({ id: category.id, name: category.name }); }} type="button">Rename</button>
                              <button aria-label={`Delete category ${category.name}`} className={`${rowActionClass} text-brand-strong hover:bg-danger-soft`} onClick={() => setConfirmingDelete(category.id)} type="button">Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              <form className="mt-4 flex gap-2" onSubmit={(event) => void handleAddCategory(event)}>
                <input aria-label="New category name" className="field min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" placeholder="New category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
                <button className="secondary-btn px-4 py-2.5" disabled={isSaving || !newCategory.trim()} type="submit">Add</button>
              </form>
            </section>
          </div>
        ) : (
          <aside className="surface h-fit p-5 sm:p-6 xl:sticky xl:top-24">
            <h2 className="text-xl font-semibold text-ink">Read-only catalog</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Your staff role can view products, but only managers and owners can change the catalog.</p>
          </aside>
        )}
      </div>
    </main>
  );
}
