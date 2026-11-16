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
    <main className="min-h-full min-w-0 flex-1 text-ink">
      <AppNav
        title="Point of sale"
        subtitle="Main store"
        right={
          <>
            <span className={`pill ${isOnline ? "bg-success-soft text-success" : "bg-danger-soft text-brand-strong"}`}>
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {isOnline ? "Online" : "Offline"}
            </span>
            <span className="pill bg-brand-soft text-brand-strong">{pendingSales} queued</span>
            {pendingSales > 0 ? <button className="nav-link text-brand-strong" onClick={() => void retryPendingSales()} type="button">Sync now</button> : null}
          </>
        }
      />

      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-6 p-6 sm:p-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        {accessNotice ? <p className="col-span-full rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-sm text-brand-strong">{accessNotice}</p> : null}

        <section className="surface p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Main store</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Choose a product</h2>
            </div>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-strong">{products.length} available</span>
          </div>

          <div className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            {catalogStatus === "loading" ? "Loading catalog..." : catalogStatus === "cached" ? "Using cached catalog" : "Catalog synced"}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <button className="group inset-panel p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_10px_24px_rgba(199,92,59,0.08)] disabled:cursor-not-allowed disabled:opacity-40" disabled={product.stock === 0} key={product.id} onClick={() => addToCart(product)}>
                <div className="flex aspect-[4/3] items-end rounded-xl bg-[#efe4d8] p-4 text-4xl font-semibold text-brand transition group-hover:bg-[#f3d7c8]">{product.name.slice(0, 1)}</div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-subtle">{product.category}</p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span className="font-semibold text-ink">{product.name}</span>
                  <span className="text-sm font-medium text-ink">{formatMoney(product.price)}</span>
                </div>
                <p className="mt-2 text-xs text-muted">{product.stock === 0 ? "Out of stock" : `${product.stock} in stock`} · {product.sku}</p>
              </button>
            ))}
          </div>
        </section>

        <aside className="surface flex h-fit flex-col p-5 sm:p-6 xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-ink/10 pb-4">
            <h2 className="text-xl font-semibold text-ink">Current sale</h2>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-strong">{cart.length} items</span>
          </div>

          <div className="min-h-48 flex-1 py-4">
            {cart.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted">Add a product to begin.</p>
            ) : (
              cart.map((product, index) => (
                <div className="flex items-center justify-between border-b border-ink/10 py-3 text-sm" key={`${product.id}-${index}`}>
                  <span className="text-ink">{product.name}</span>
                  <span className="font-medium text-ink">{formatMoney(product.price)}</span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-ink/10 pt-5">
            <div className="flex items-center justify-between text-lg font-semibold text-ink">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>

            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-ink/10 bg-white/40 text-sm" role="group" aria-label="Payment method">
              {(["cash", "card", "other"] as const).map((method) => (
                <button className={`px-2 py-3 capitalize transition ${paymentMethod === method ? "bg-ink text-on-dark" : "text-muted hover:text-ink"}`} key={method} onClick={() => setPaymentMethod(method)} type="button">{method}</button>
              ))}
            </div>

            <button className="primary-btn mt-5 w-full py-4" disabled={cart.length === 0} onClick={() => void startSale()}>
              {isOnline ? "Record sale" : "Queue sale offline"}
            </button>

            {saleStatus ? <p className="mt-3 text-center text-xs text-muted">{saleStatus}</p> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}