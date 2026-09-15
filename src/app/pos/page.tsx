"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getCachedCatalog, refreshCatalog } from "@/lib/catalog/repository";
import type { CatalogProduct } from "@/lib/catalog/types";
import { offlineDatabase } from "@/lib/offline/database";
import { recordSale, toSalePayload, type PaymentMethod } from "@/lib/sales/repository";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserRole, type StoreRole } from "@/lib/supabase/auth";
import { LocaleControls } from "@/components/locale-controls";
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
  const [role, setRole] = useState<StoreRole | null>(null);
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
    const roleTask = window.setTimeout(() => void getCurrentUserRole().then(setRole), 0);
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
      window.clearTimeout(roleTask);
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

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]">
      <header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p>
          <h1 className="mt-1 text-xl font-semibold">Point of sale</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <LocaleControls />
          {role === "owner" || role === "manager" ? <a className="hidden text-[#69736b] transition hover:text-[#c75c3b] sm:inline" href="/catalog">Catalog</a> : null}
          <Link className="hidden text-[#69736b] transition hover:text-[#c75c3b] sm:inline" href="/sales">Sales</Link>
          {role === "owner" || role === "manager" ? <Link className="hidden text-[#69736b] transition hover:text-[#c75c3b] sm:inline" href="/pricing">Pricing</Link> : null}
          {role === "owner" || role === "manager" ? <Link className="hidden text-[#69736b] transition hover:text-[#c75c3b] sm:inline" href="/production">Production</Link> : null}
          {role === "owner" ? <a className="hidden text-[#69736b] transition hover:text-[#c75c3b] sm:inline" href="/team">Team</a> : null}
          <span className={isOnline ? "text-[#3d7457]" : "text-[#c75c3b]"}>
            <span aria-hidden="true">&#9679;</span> {isOnline ? "Online" : "Offline"}
          </span>
          <span className="hidden text-[#69736b] sm:inline">{pendingSales} queued</span>
          {pendingSales > 0 ? <button className="hidden text-[#c75c3b] sm:inline" onClick={() => void retryPendingSales()} type="button">Sync now</button> : null}
          <button aria-label="Sign out" className="text-[#69736b] transition hover:text-[#c75c3b]" onClick={() => void signOut()} type="button">Sign out</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_360px]">
        {accessNotice ? <p className="col-span-full border border-[#e6c8b9] bg-[#fff4ef] px-4 py-3 text-sm text-[#a14f35]">{accessNotice}</p> : null}
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
                  <span>{formatMoney(product.price)}</span>
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
                  <span>{product.name}</span><span>{formatMoney(product.price)}</span>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[#d8d4ca] pt-5">
            <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatMoney(total)}</span></div>
            <div className="mt-5 grid grid-cols-3 border border-[#d8d4ca] bg-[#f4f1ea] p-1 text-sm" role="group" aria-label="Payment method">
              {(["cash", "card", "other"] as const).map((method) => (
                <button className={`px-2 py-3 capitalize transition ${paymentMethod === method ? "bg-[#1d2a24] text-[#fffdf8]" : "text-[#69736b] hover:text-[#1d2a24]"}`} key={method} onClick={() => setPaymentMethod(method)} type="button">{method}</button>
              ))}
            </div>
            <button className="mt-5 w-full bg-[#1d2a24] px-5 py-4 text-sm font-bold text-[#fffdf8] transition hover:bg-[#c75c3b] disabled:cursor-not-allowed disabled:bg-[#b5b8b2]" disabled={cart.length === 0} onClick={() => void startSale()}>
              {isOnline ? "Record sale" : "Queue sale offline"}
            </button>
            {saleStatus ? <p className="mt-3 text-center text-xs text-[#69736b]">{saleStatus}</p> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}