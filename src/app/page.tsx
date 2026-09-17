"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { refreshCatalog } from "@/lib/catalog/repository";
import { getRecentSales, type SaleRecord } from "@/lib/sales/history";

const quickActions = [
  { title: "Point of sale", description: "Run the counter and process transactions.", href: "/pos", accent: "bg-[#1e2a23] text-[#fffdf9]" },
  { title: "Catalog", description: "Manage products and pricing visibility.", href: "/catalog", accent: "bg-[#f5e3d8] text-[#1e2a23]" },
  { title: "Inventory", description: "Review stock levels and adjustments.", href: "/inventory", accent: "bg-[#eaf4ef] text-[#1e2a23]" },
  { title: "Sales report", description: "Review completed orders and revenue trends.", href: "/sales", accent: "bg-[#f3e3d7] text-[#1e2a23]" },
  { title: "Production", description: "Plan batches and track production costs.", href: "/production", accent: "bg-[#f2ecdf] text-[#1e2a23]" },
  { title: "Team roles", description: "Assign manager and ownership access.", href: "/team", accent: "bg-[#efe6dc] text-[#1e2a23]" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function Home() {
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [status, setStatus] = useState("Loading store data...");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [sales, catalog] = await Promise.all([getRecentSales(), refreshCatalog()]);
        if (!active) return;

        const lowStock = catalog.filter((product) => product.stock <= 5).length;

        setRecentSales(sales.slice(0, 5));
        setProductCount(catalog.length);
        setLowStockCount(lowStock);
        setStatus("Store snapshot updated");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not load store data.");
      }
    }

    void loadDashboard();
    return () => { active = false; };
  }, []);

  const revenue = useMemo(() => recentSales.reduce((sum, sale) => sum + sale.total, 0), [recentSales]);
  const averageTicket = recentSales.length > 0 ? revenue / recentSales.length : 0;

  return (
    <main className="min-h-full flex-1 bg-[#f5f1ea] px-6 py-8 sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-7xl overflow-hidden rounded-[28px] border border-[#e6ddd0] bg-[#fffdf9] shadow-[0_24px_70px_rgba(30,42,35,0.08)]">
        <div className="border-b border-[#eadfd2] bg-[#f9f5f1] px-6 py-5 sm:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#c75c3b]">Biznizer</p>
              <h1 className="mt-2 text-2xl font-semibold text-[#1e2a23] sm:text-3xl">Operations workspace</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="primary-btn px-4 py-2.5" href="/pos">Open POS</Link>
              <Link className="secondary-btn px-4 py-2.5" href="/login">Sign in</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-10">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#8a8178]">Business overview</p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.05em] text-[#1e2a23] sm:text-5xl">
              Run sales, stock, and production from one place.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#5d665f] sm:text-lg">
              From the counter to the store floor, Biznizer keeps the workflow grounded in real stock levels, clear roles, and resilient operations.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#eadfd2] bg-[#f8f2eb] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8178]">Revenue</p>
                <p className="mt-3 text-2xl font-semibold text-[#1e2a23]">{formatMoney(revenue)}</p>
                <p className="mt-2 text-sm text-[#5d665f]">Recent sales total</p>
              </div>
              <div className="rounded-2xl border border-[#eadfd2] bg-[#f8f2eb] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8178]">Avg ticket</p>
                <p className="mt-3 text-2xl font-semibold text-[#1e2a23]">{formatMoney(averageTicket)}</p>
                <p className="mt-2 text-sm text-[#5d665f]">Across {recentSales.length} sales</p>
              </div>
              <div className="rounded-2xl border border-[#eadfd2] bg-[#f8f2eb] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8178]">Safety stock</p>
                <p className="mt-3 text-2xl font-semibold text-[#1e2a23]">{lowStockCount}</p>
                <p className="mt-2 text-sm text-[#5d665f]">Products at or below 5</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#eadfd2] bg-[#f8f2eb] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a8178]">Store pulse</p>
              <span className="rounded-full bg-[#eaf4ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#226d54]">{status}</span>
            </div>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#e7d7ca] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8178]">Products</p>
                <p className="mt-2 text-2xl font-semibold text-[#1e2a23]">{productCount}</p>
              </div>
              <div className="rounded-2xl border border-[#e7d7ca] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8178]">Inventory</p>
                <p className="mt-2 text-2xl font-semibold text-[#1e2a23]">{lowStockCount === 0 ? "Healthy" : `${lowStockCount} items need attention`}</p>
              </div>
              <div className="rounded-2xl border border-[#e7d7ca] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8178]">Roles</p>
                <p className="mt-2 text-2xl font-semibold text-[#1e2a23]">Protected access</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#eadfd2] bg-[#faf5f0] px-6 py-8 sm:px-10 lg:px-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-[#1e2a23]">Quick access</h3>
            <Link className="text-sm font-medium text-[#a14f35] hover:text-[#1e2a23]" href="/pos">Go to POS →</Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <Link className="block rounded-2xl border border-[#e6ddd0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#c75c3b]" href={action.href} key={action.title}>
                <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${action.accent}`}>
                  {action.title}
                </div>
                <p className="mt-4 text-sm leading-6 text-[#5d665f]">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eadfd2] bg-[#fffdf9] px-6 py-8 sm:px-10 lg:px-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-[#1e2a23]">Recent sales</h3>
            <Link className="text-sm font-medium text-[#a14f35] hover:text-[#1e2a23]" href="/sales">View all</Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e6ddd0] bg-[#fffdf9]">
            <div className="grid grid-cols-[1fr_120px_90px] border-b border-[#e6ddd0] bg-[#faf5f0] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5d665f]">
              <span>Receipt</span>
              <span>Method</span>
              <span className="text-right">Total</span>
            </div>

            {recentSales.length === 0 ? (
              <p className="p-6 text-sm text-[#5d665f]">No sales tied to this store yet.</p>
            ) : (
              recentSales.map((sale) => (
                <Link className="grid grid-cols-[1fr_120px_90px] items-center border-b border-[#efe8e1] px-5 py-4 last:border-0 hover:bg-[#f7f1ea]" href={`/sales/${sale.id}`} key={sale.id}>
                  <div>
                    <p className="font-mono text-xs text-[#5d665f]">{sale.id}</p>
                    <p className="mt-1 text-sm text-[#1e2a23]">{new Date(sale.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm capitalize text-[#5d665f]">{sale.paymentMethod}</span>
                  <span className="text-right font-semibold text-[#1e2a23]">{formatMoney(sale.total)}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
