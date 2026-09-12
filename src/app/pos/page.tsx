"use client";

import { useEffect, useState } from "react";

import { getCachedCatalog, refreshCatalog } from "@/lib/catalog/repository";
import type { CatalogProduct } from "@/lib/catalog/types";
import { offlineDatabase } from "@/lib/offline/database";

export default function PointOfSale() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [cart, setCart] = useState<CatalogProduct[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSales, setPendingSales] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "cached">("loading");

  useEffect(() => {
    const updateConnection = () => setIsOnline(window.navigator.onLine);
    const loadCatalog = async () => {
      const cachedCatalog = await getCachedCatalog();
      setProducts(cachedCatalog);
      setCatalogStatus("cached");

      if (window.navigator.onLine) {
        try {
          const liveCatalog = await refreshCatalog();
          setProducts(liveCatalog);
          setCatalogStatus("ready");
        } catch {
          // Cached catalog remains available when the network or Supabase is unavailable.
        }
      }
    };
    const updatePendingSales = async () => setPendingSales(await offlineDatabase.pendingSales.count());

    updateConnection();
    void loadCatalog();
    void updatePendingSales();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const total = cart.reduce((sum, product) => sum + product.price, 0);

  function addToCart(product: CatalogProduct) {
    if (product.stock === 0) return;
    setCart((currentCart) => [...currentCart, product]);
  }

  async function startSale() {
    if (cart.length === 0) return;

    await offlineDatabase.pendingSales.add({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      payload: { items: cart, total },
      syncStatus: isOnline ? "syncing" : "pending",
    });
    setPendingSales((count) => count + 1);
    setCart([]);
  }

  return (
    <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]">
      <header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p>
          <h1 className="mt-1 text-xl font-semibold">Point of sale</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a className="hidden text-[#69736b] transition hover:text-[#c75c3b] sm:inline" href="/catalog">Catalog</a>
          <span className={isOnline ? "text-[#3d7457]" : "text-[#c75c3b]"}>
            <span aria-hidden="true">&#9679;</span> {isOnline ? "Online" : "Offline"}
          </span>
          <span className="hidden text-[#69736b] sm:inline">{pendingSales} queued</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm text-[#69736b]">Main store</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight">Choose a product</h2>
            </div>
            <span className="text-sm text-[#69736b]">{products.length} available</span>
          </div>
          <div className="mb-4 text-xs text-[#69736b]">{catalogStatus === "loading" ? "Loading catalog..." : catalogStatus === "cached" ? "Using cached catalog" : "Catalog synced"}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <button className="group border border-[#d8d4ca] bg-[#fffdf8] p-5 text-left transition hover:-translate-y-1 hover:border-[#c75c3b] disabled:cursor-not-allowed disabled:opacity-55" disabled={product.stock === 0} key={product.id} onClick={() => addToCart(product)}>
                <div className="flex aspect-[4/3] items-end bg-[#e8dfd2] p-4 text-4xl font-semibold text-[#c75c3b] transition group-hover:bg-[#ead4c6]">{product.name.slice(0, 1)}</div>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6b58]">{product.category}</p>
                <div className="mt-1 flex items-center justify-between gap-4">
                  <span className="font-semibold">{product.name}</span>
                  <span>${product.price}</span>
                </div>
                <p className="mt-2 text-xs text-[#69736b]">{product.stock === 0 ? "Out of stock" : `${product.stock} in stock`} · {product.sku}</p>
              </button>
            ))}
          </div>
        </section>

        <aside className="flex h-fit flex-col border border-[#d8d4ca] bg-[#fffdf8] p-6 lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b border-[#d8d4ca] pb-5">
            <h2 className="text-xl font-semibold">Current sale</h2>
            <span className="text-sm text-[#69736b]">{cart.length} items</span>
          </div>
          <div className="min-h-48 flex-1 py-4">
            {cart.length === 0 ? (
              <p className="py-14 text-center text-sm text-[#69736b]">Add a product to begin.</p>
            ) : (
              cart.map((product, index) => (
                <div className="flex justify-between border-b border-[#eee9df] py-3 text-sm" key={`${product.id}-${index}`}>
                  <span>{product.name}</span><span>${product.price}</span>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[#d8d4ca] pt-5">
            <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>${total}</span></div>
            <button className="mt-5 w-full bg-[#1d2a24] px-5 py-4 text-sm font-bold text-[#fffdf8] transition hover:bg-[#c75c3b] disabled:cursor-not-allowed disabled:bg-[#b5b8b2]" disabled={cart.length === 0} onClick={() => void startSale()}>
              {isOnline ? "Record sale" : "Queue sale offline"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}