"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppNav } from "@/components/top-nav";
import { refreshCatalog } from "@/lib/catalog/repository";
import { useLocale } from "@/lib/locale";
import { getRecentSales, type SaleRecord } from "@/lib/sales/history";

const LOW_STOCK_AT = 5;

const quickActions = [
  { title: "Point of sale", description: "Run the counter and process transactions.", href: "/pos" },
  { title: "Sales", description: "Review completed orders and revenue.", href: "/sales" },
  { title: "Analytics", description: "Compare revenue, payment mix, and top receipts.", href: "/analytics" },
  { title: "Catalog", description: "Manage products and what the POS sells.", href: "/catalog" },
  { title: "Inventory", description: "Review stock levels and adjustments.", href: "/inventory" },
  { title: "Production", description: "Plan batches and track production costs.", href: "/production" },
];

type LoadState = "loading" | "ready" | "error";

export default function Home() {
  const { formatMoney } = useLocale();
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [sales, catalog] = await Promise.all([getRecentSales(), refreshCatalog()]);
        if (!active) return;

        setRecentSales(sales.slice(0, 5));
        setProductCount(catalog.length);
        setLowStockCount(catalog.filter((product) => product.stock <= LOW_STOCK_AT).length);
        setLoadState("ready");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Could not load store data.");
        setLoadState("error");
      }
    }

    void loadDashboard();
    return () => { active = false; };
  }, []);

  const revenue = useMemo(() => recentSales.reduce((sum, sale) => sum + sale.total, 0), [recentSales]);
  const averageTicket = recentSales.length > 0 ? revenue / recentSales.length : 0;

  const stats = [
    { label: "Revenue", value: formatMoney(revenue), note: `Last ${recentSales.length} sales` },
    { label: "Average ticket", value: formatMoney(averageTicket), note: "Per transaction" },
    { label: "Products", value: String(productCount), note: "In the catalog" },
    { label: "Low stock", value: String(lowStockCount), note: `At or below ${LOW_STOCK_AT} units`, alert: lowStockCount > 0 },
  ];

  return (
    <main className="min-h-full min-w-0 flex-1 text-ink">
      <AppNav
        title="Dashboard"
        subtitle="Sales, stock, and production in one place"
        right={
          <span className={`pill ${loadState === "error" ? "bg-danger-soft text-brand-strong" : "bg-success-soft text-success"}`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            {loadState === "loading" ? "Loading store data" : loadState === "ready" ? "Store snapshot updated" : "Store data unavailable"}
          </span>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8 lg:p-10">
        {loadState === "error" ? <p className="break-words rounded-2xl border border-danger-line bg-danger-soft/80 px-4 py-3 text-sm text-brand-strong" role="alert">{errorMessage}</p> : null}

        <section aria-label="Store snapshot" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div className="surface p-5" key={stat.label}>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">{stat.label}</p>
              <p className={`mt-3 truncate text-3xl font-semibold tracking-tight ${stat.alert ? "text-brand-strong" : ""}`}>{stat.value}</p>
              <p className="mt-1.5 text-sm text-muted">{stat.note}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <section className="surface p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Recent sales</h2>
              <Link className="text-sm font-medium text-brand-strong hover:text-ink" href="/sales">View all</Link>
            </div>

            <div className="inset-panel overflow-hidden">
              <div className="grid grid-cols-[1fr_90px_110px] border-b border-ink/10 bg-white/40 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                <span>Receipt</span>
                <span>Method</span>
                <span className="text-right">Total</span>
              </div>

              {recentSales.length === 0 ? (
                <p className="p-6 text-sm text-muted">{loadState === "loading" ? "Loading sales..." : "No sales tied to this store yet."}</p>
              ) : (
                recentSales.map((sale) => (
                  <Link className="grid grid-cols-[1fr_90px_110px] items-center border-b border-ink/10 px-4 py-3.5 transition last:border-0 hover:bg-white/70" href={`/sales/${sale.id}`} key={sale.id}>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-muted">{sale.id}</p>
                      <p className="mt-1 text-sm">{new Date(sale.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm capitalize text-muted">{sale.paymentMethod}</span>
                    <span className="text-right font-semibold">{formatMoney(sale.total)}</span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="surface p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Quick access</h2>
            <ul className="space-y-2">
              {quickActions.map((action) => (
                <li key={action.href}>
                  <Link className="inset-panel group flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/80" href={action.href}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{action.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{action.description}</span>
                    </span>
                    <span aria-hidden="true" className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-brand-strong">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
