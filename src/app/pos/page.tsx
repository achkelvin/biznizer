"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getCachedCatalog, refreshCatalog } from "@/lib/catalog/repository";
import type { CatalogProduct } from "@/lib/catalog/types";
import { offlineDatabase } from "@/lib/offline/database";
import { recordSale, toSalePayload, type PaymentMethod } from "@/lib/sales/repository";
import { AppNav } from "@/components/top-nav";
import { useLocale } from "@/lib/locale";

export default function PointOfSale() {
  const router = useRouter();
  const { formatMoney } = useLocale();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [cart, setCart] = useState<CatalogProduct[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSales, setPendingSales] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "cached">("loading");
  const [saleStatus, setSaleStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [accessNotice, setAccessNotice] = useState("");
  const syncInProgress = useRef(false);

  const refreshQueuedCount = useCallback(async () => {
    const queued = await offlineDatabase.pendingSales.toArray();
    const count = queued.length;
    setPendingSales(count);
    return count;
  }, []);

  const syncPendingSales = useCallback(async () => {
    if (syncInProgress.current || !window.navigator.onLine) return;
    syncInProgress.current = true;

    try {
      await offlineDatabase.pendingSales.where("syncStatus").equals("syncing").modify({ syncStatus: "pending" });
      const queuedSales = await offlineDatabase.pendingSales.toArray();
      for (const queuedSale of queuedSales) {
        if (queuedSale.syncStatus !== "pending" && queuedSale.syncStatus !== "failed") continue;
        try {
          await offlineDatabase.pendingSales.update(queuedSale.id, { syncStatus: "syncing" });
          await recordSale(queuedSale.payload);
          await offlineDatabase.pendingSales.delete(queuedSale.id);
        } catch {
          await offlineDatabase.pendingSales.update(queuedSale.id, { syncStatus: "failed" });
        }
      }
    } finally {
      syncInProgress.current = false;
      await refreshQueuedCount();
    }
  }, [refreshQueuedCount]);

  useEffect(() => {
    const accessTask = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("access") === "restricted") {
        setAccessNotice("That workspace is restricted for your current role.");
        router.replace("/pos");
      }
    }, 0);
    return () => window.clearTimeout(accessTask);
  }, [router]);

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

    updateConnection();
    void loadCatalog();
    const countTask = window.setTimeout(() => void refreshQueuedCount(), 0);
    const syncTask = window.setTimeout(() => void syncPendingSales(), 0);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    const handleOnline = () => void syncPendingSales();
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("online", handleOnline);
      window.clearTimeout(countTask);
      window.clearTimeout(syncTask);
    };
  }, [refreshQueuedCount, syncPendingSales]);

  const total = cart.reduce((sum, product) => sum + product.price, 0);

  function addToCart(product: CatalogProduct) {
    if (product.stock === 0) return;
    setCart((currentCart) => [...currentCart, product]);
  }

  async function startSale() {
    if (cart.length === 0) return;

    const payload = toSalePayload(crypto.randomUUID(), cart, paymentMethod);
    setSaleStatus(isOnline ? "Recording sale..." : "Saving sale offline...");

    try {
      if (!isOnline) throw new Error("offline");
      await recordSale(payload);
      setSaleStatus("Sale recorded");
      // Show the new stock levels straight away; if this fails the sale is still recorded.
      void refreshCatalog().then(setProducts).catch(() => undefined);
    } catch {
      await offlineDatabase.pendingSales.put({
        id: payload.saleId,
        createdAt: new Date().toISOString(),
        payload,
        syncStatus: "pending",
      });
      await refreshQueuedCount();
      setSaleStatus("Sale queued for sync");
    }
    setCart([]);
  }

  async function retryPendingSales() {
    setSaleStatus("Syncing queued sales...");
    await syncPendingSales();
    const remaining = await refreshQueuedCount();
    setSaleStatus(remaining > 0 ? "Some sales still need attention" : "Sync complete");
  }


  return (
    <main className="min-h-full min-w-0 flex-1 text-[#1e2a23]">
      <AppNav
        title="Point of sale"
        subtitle="Main store"
        right={
          <>
            <span className={`pill ${isOnline ? "bg-[#eaf4ef] text-[#226d54]" : "bg-[#fbeae5] text-[#a14f35]"}`}>
              <span aria-hidden="true">●</span>
              {isOnline ? "Online" : "Offline"}
            </span>
            <span className="pill bg-[#f5e3d8] text-[#a14f35]">{pendingSales} queued</span>
            {pendingSales > 0 ? <button className="nav-link text-[#a14f35]" onClick={() => void retryPendingSales()} type="button">Sync now</button> : null}
          </>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        {accessNotice ? <p className="col-span-full rounded-2xl border border-[#f0d4ca] bg-[#fff3ee] px-4 py-3 text-sm text-[#a14f35]">{accessNotice}</p> : null}

        <section className="surface p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-[#5d665f]">Main store</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#1e2a23]">Choose a product</h2>
            </div>
            <span className="rounded-full bg-[#f5e3d8] px-2.5 py-1 text-xs font-medium text-[#a14f35]">{products.length} available</span>
          </div>

          <div className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[#69736b]">
            {catalogStatus === "loading" ? "Loading catalog..." : catalogStatus === "cached" ? "Using cached catalog" : "Catalog synced"}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <button className="group inset-panel p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#c75c3b] hover:shadow-[0_10px_24px_rgba(199,92,59,0.08)] disabled:cursor-not-allowed disabled:opacity-40" disabled={product.stock === 0} key={product.id} onClick={() => addToCart(product)}>
                <div className="flex aspect-[4/3] items-end rounded-xl bg-[#efe4d8] p-4 text-4xl font-semibold text-[#c75c3b] transition group-hover:bg-[#f3d7c8]">{product.name.slice(0, 1)}</div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b6b58]">{product.category}</p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span className="font-semibold text-[#1e2a23]">{product.name}</span>
                  <span className="text-sm font-medium text-[#1e2a23]">{formatMoney(product.price)}</span>
                </div>
                <p className="mt-2 text-xs text-[#5d665f]">{product.stock === 0 ? "Out of stock" : `${product.stock} in stock`} · {product.sku}</p>
              </button>
            ))}
          </div>
        </section>

        <aside className="surface flex h-fit flex-col p-5 sm:p-6 xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-[#1e2a23]/10 pb-4">
            <h2 className="text-xl font-semibold text-[#1e2a23]">Current sale</h2>
            <span className="rounded-full bg-[#f5e3d8] px-2.5 py-1 text-xs font-medium text-[#a14f35]">{cart.length} items</span>
          </div>

          <div className="min-h-48 flex-1 py-4">
            {cart.length === 0 ? (
              <p className="py-14 text-center text-sm text-[#5d665f]">Add a product to begin.</p>
            ) : (
              cart.map((product, index) => (
                <div className="flex items-center justify-between border-b border-[#1e2a23]/10 py-3 text-sm" key={`${product.id}-${index}`}>
                  <span className="text-[#1e2a23]">{product.name}</span>
                  <span className="font-medium text-[#1e2a23]">{formatMoney(product.price)}</span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#1e2a23]/10 pt-5">
            <div className="flex items-center justify-between text-lg font-semibold text-[#1e2a23]">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>

            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-[#1e2a23]/10 bg-white/40 text-sm" role="group" aria-label="Payment method">
              {(["cash", "card", "other"] as const).map((method) => (
                <button className={`px-2 py-3 capitalize transition ${paymentMethod === method ? "bg-[#1e2a23] text-[#fffdf9]" : "text-[#5d665f] hover:text-[#1e2a23]"}`} key={method} onClick={() => setPaymentMethod(method)} type="button">{method}</button>
              ))}
            </div>

            <button className="primary-btn mt-5 w-full py-4" disabled={cart.length === 0} onClick={() => void startSale()}>
              {isOnline ? "Record sale" : "Queue sale offline"}
            </button>

            {saleStatus ? <p className="mt-3 text-center text-xs text-[#5d665f]">{saleStatus}</p> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}