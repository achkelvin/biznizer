"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppNav } from "@/components/top-nav";
import { refreshCatalog } from "@/lib/catalog/repository";
import { adjustInventory, getInventoryMovements, type InventoryMovement } from "@/lib/inventory/repository";
import { getCurrentUserRole, type StoreRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";

const emptyForm = { productId: "", quantityDelta: "", reason: "manual_adjustment", reference: "" };

export default function InventoryPage() {
  const router = useRouter();
  const [role, setRole] = useState<StoreRole | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string; stock: number }>>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("Loading inventory...");

  const lowStock = useMemo(() => products.filter((product) => product.stock <= 5), [products]);

  async function loadInventory() {
    try {
      const [catalog, currentRole, movementRows] = await Promise.all([
        refreshCatalog(),
        getCurrentUserRole(),
        getInventoryMovements(),
      ]);
      setRole(currentRole);
      setProducts(catalog.map((product) => ({ id: product.id, name: product.name, stock: product.stock })));
      setMovements(movementRows);
      setStatus(currentRole ? `Inventory synced for ${catalog.length} products` : "Could not resolve your role.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load inventory.");
    }
  }

  useEffect(() => { const task = window.setTimeout(() => void loadInventory(), 0); return () => window.clearTimeout(task); }, []);

  async function handleAdjust(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.productId || !form.quantityDelta) return;
    try {
      setStatus("Updating inventory...");
      await adjustInventory(form.productId, Number(form.quantityDelta), form.reason, form.reference.trim() || undefined);
      setForm(emptyForm);
      await loadInventory();
      setStatus("Inventory updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update inventory.");
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  if (role !== "owner" && role !== "manager") {
    return <main className="min-h-full flex-1 bg-[#f5f1ea] text-[#1e2a23]"><AppNav title="Inventory" right={<><Link className="nav-link" href="/pos">Back to POS</Link><button className="nav-link" onClick={() => void signOut()} type="button">Sign out</button></>} /><div className="mx-auto max-w-2xl p-6 sm:p-10"><p className="rounded-2xl border border-[#f0d4ca] bg-[#fff3ee] px-4 py-3 text-sm text-[#a14f35]">This inventory workspace is restricted to managers and owners.</p></div></main>;
  }

  return (
    <main className="min-h-full flex-1 bg-[#f5f1ea] text-[#1e2a23]">
      <AppNav
        title="Inventory management"
        right={
          <>
            <Link className="nav-link" href="/pos">Back to POS</Link>
            <button className="nav-link" onClick={() => void signOut()} type="button">Sign out</button>
          </>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_360px]">
        <section className="surface p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-[#5d665f]">Current stock</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#1e2a23]">Inventory overview</h2>
            </div>
            <span className="rounded-full bg-[#f5e3d8] px-2.5 py-1 text-xs font-medium text-[#a14f35]">{status}</span>
          </div>

          <div className="mb-5 rounded-2xl border border-[#eadfd2] bg-[#f8f2eb] p-4 text-sm text-[#5d665f]">
            Low stock alert: <span className="font-semibold text-[#a14f35]">{lowStock.length} product(s)</span> at 5 or below.
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e6ddd0] bg-[#fffdf9]">
            <div className="grid grid-cols-[1fr_100px_120px] border-b border-[#e6ddd0] bg-[#faf5f0] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5d665f]">
              <span>Product</span>
              <span>Stock</span>
              <span className="text-right">Status</span>
            </div>

            {products.length === 0 ? (
              <p className="p-8 text-sm text-[#5d665f]">No products in inventory yet.</p>
            ) : (
              products.map((product) => (
                <div className="grid grid-cols-[1fr_100px_120px] items-center border-b border-[#efe8e1] px-5 py-4 last:border-0" key={product.id}>
                  <div>
                    <p className="font-semibold text-[#1e2a23]">{product.name}</p>
                  </div>
                  <span className="text-sm text-[#5d665f]">{product.stock}</span>
                  <span className={`text-right text-sm font-semibold ${product.stock <= 5 ? "text-[#c75c3b]" : "text-[#226d54]"}`}>
                    {product.stock <= 5 ? "Low" : "Healthy"}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-[#e6ddd0] bg-[#fffdf9] p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-[#1e2a23]">Recent inventory movements</h3>
            <div className="mt-4 space-y-3">
              {movements.length === 0 ? (
                <p className="text-sm text-[#5d665f]">No adjustments recorded yet.</p>
              ) : (
                movements.map((movement) => (
                  <div className="flex items-center justify-between gap-4 border-b border-[#efe8e1] pb-3 last:border-0" key={movement.id}>
                    <div>
                      <p className="font-semibold text-[#1e2a23]">{movement.productName}</p>
                      <p className="text-xs text-[#5d665f]">{movement.reason}{movement.reference ? ` · ${movement.reference}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${movement.quantityDelta > 0 ? "text-[#226d54]" : "text-[#c75c3b]"}`}>
                        {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}
                      </p>
                      <p className="text-xs text-[#5d665f]">{new Date(movement.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="surface h-fit p-5 sm:p-6 lg:sticky lg:top-6">
          <h2 className="text-xl font-semibold text-[#1e2a23]">Adjust stock</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d665f]">Use this for production receipts, returns, damage write-offs, and manual reconciliations.</p>

          <form className="mt-6 space-y-4" onSubmit={(event) => void handleAdjust(event)}>
            <label className="block text-sm font-semibold text-[#2a352f]">
              Product
              <select className="input-field" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>
                <option value="">Select product</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>

            <label className="block text-sm font-semibold text-[#2a352f]">
              Quantity change
              <input className="input-field" placeholder="e.g. 25 or -5" type="number" value={form.quantityDelta} onChange={(event) => setForm({ ...form, quantityDelta: event.target.value })} />
            </label>

            <label className="block text-sm font-semibold text-[#2a352f]">
              Reason
              <select className="input-field" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}>
                <option value="manual_adjustment">Manual adjustment</option>
                <option value="production_receipt">Production receipt</option>
                <option value="damaged_goods">Damaged goods</option>
                <option value="return_to_stock">Return to stock</option>
                <option value="stock_take">Stock take</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-[#2a352f]">
              Reference
              <textarea className="input-field min-h-24 resize-none" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
            </label>

            <button className="primary-btn mt-2 w-full py-4" type="submit">Apply adjustment</button>
          </form>
        </aside>
      </div>
    </main>
  );
}
