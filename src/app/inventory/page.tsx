"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    return <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]"><header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p><h1 className="mt-1 text-xl font-semibold">Inventory</h1></div><div className="flex gap-5 text-sm"><Link className="text-[#69736b] hover:text-[#c75c3b]" href="/pos">Back to POS</Link><button className="text-[#69736b] hover:text-[#c75c3b]" onClick={() => void signOut()} type="button">Sign out</button></div></header><div className="mx-auto max-w-2xl p-6 sm:p-10"><p className="border border-[#e6c8b9] bg-[#fff4ef] px-4 py-3 text-sm text-[#a14f35]">This inventory workspace is restricted to managers and owners.</p></div></main>;
  }

  return (
    <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]">
      <header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10">
        <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p><h1 className="mt-1 text-xl font-semibold">Inventory management</h1></div>
        <div className="flex items-center gap-5 text-sm"><Link className="text-[#69736b] hover:text-[#c75c3b]" href="/pos">Back to POS</Link><button className="text-[#69736b] hover:text-[#c75c3b]" onClick={() => void signOut()} type="button">Sign out</button></div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-6 flex items-end justify-between"><div><p className="text-sm text-[#69736b]">Current stock</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Inventory overview</h2></div><span className="text-sm text-[#69736b]">{status}</span></div>
          <div className="mb-5 border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm text-[#69736b]">Low stock alert: {lowStock.length} product(s) at 5 or below.</div>
          <div className="overflow-hidden border border-[#d8d4ca] bg-[#fffdf8]">
            <div className="grid grid-cols-[1fr_100px_120px] border-b border-[#d8d4ca] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#69736b]"><span>Product</span><span>Stock</span><span className="text-right">Status</span></div>
            {products.length === 0 ? <p className="p-8 text-sm text-[#69736b]">No products in inventory yet.</p> : products.map((product) => <div className="grid grid-cols-[1fr_100px_120px] items-center border-b border-[#eee9df] px-5 py-4 last:border-0" key={product.id}><div><p className="font-semibold">{product.name}</p></div><span className="text-sm text-[#69736b]">{product.stock}</span><span className={`text-right text-sm font-semibold ${product.stock <= 5 ? "text-[#c75c3b]" : "text-[#3d7457]"}`}>{product.stock <= 5 ? "Low" : "Healthy"}</span></div>)}
          </div>
          <div className="mt-8 border border-[#d8d4ca] bg-[#fffdf8] p-6">
            <h3 className="text-xl font-semibold">Recent inventory movements</h3>
            <div className="mt-4 space-y-3">
              {movements.length === 0 ? <p className="text-sm text-[#69736b]">No adjustments recorded yet.</p> : movements.map((movement) => <div className="flex items-center justify-between gap-4 border-b border-[#eee9df] pb-3 last:border-0" key={movement.id}><div><p className="font-semibold">{movement.productName}</p><p className="text-xs text-[#69736b]">{movement.reason}{movement.reference ? ` · ${movement.reference}` : ""}</p></div><div className="text-right"><p className={`font-semibold ${movement.quantityDelta > 0 ? "text-[#3d7457]" : "text-[#c75c3b]"}`}>{movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}</p><p className="text-xs text-[#69736b]">{new Date(movement.createdAt).toLocaleString()}</p></div></div>)}
            </div>
          </div>
        </section>

        <aside className="h-fit border border-[#d8d4ca] bg-[#fffdf8] p-6 lg:sticky lg:top-6">
          <h2 className="text-xl font-semibold">Adjust stock</h2>
          <p className="mt-2 text-sm leading-6 text-[#69736b]">Use this for production receipts, returns, damage write-offs, and manual reconciliations.</p>
          <form className="mt-6 space-y-4" onSubmit={(event) => void handleAdjust(event)}>
            <label className="block text-sm font-semibold">Product<select className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 text-sm outline-none focus:border-[#c75c3b]" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <label className="block text-sm font-semibold">Quantity change<input className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 text-sm outline-none focus:border-[#c75c3b]" placeholder="e.g. 25 or -5" type="number" value={form.quantityDelta} onChange={(event) => setForm({ ...form, quantityDelta: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Reason<select className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 text-sm outline-none focus:border-[#c75c3b]" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}><option value="manual_adjustment">Manual adjustment</option><option value="production_receipt">Production receipt</option><option value="damaged_goods">Damaged goods</option><option value="return_to_stock">Return to stock</option><option value="stock_take">Stock take</option></select></label>
            <label className="block text-sm font-semibold">Reference<textarea className="mt-2 min-h-24 w-full resize-none border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 text-sm outline-none focus:border-[#c75c3b]" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label>
            <button className="w-full bg-[#1d2a24] px-5 py-4 text-sm font-bold text-[#fffdf8] transition hover:bg-[#c75c3b] disabled:cursor-not-allowed disabled:bg-[#b5b8b2]" type="submit">Apply adjustment</button>
          </form>
        </aside>
      </div>
    </main>
  );
}
