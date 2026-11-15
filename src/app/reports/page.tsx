"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AppNav } from "@/components/top-nav";
import { refreshCatalog } from "@/lib/catalog/repository";
import type { CatalogProduct } from "@/lib/catalog/types";
import { useLocale } from "@/lib/locale";
import { getProductionBatches, type ProductionBatch } from "@/lib/production/repository";
import { downloadCsv } from "@/lib/reports/csv";
import { addDays, buildSalesReport, localDateKey, startOfLocalDay } from "@/lib/reports/summary";
import { getSalesInRange, type SaleDetail } from "@/lib/sales/history";
import { getCurrentUserRole, type StoreRole } from "@/lib/supabase/auth";

const LOW_STOCK_AT = 5;

type Preset = "today" | "7d" | "30d" | "month" | "custom";
const presets: Array<{ id: Preset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

/** The first and last day (YYYY-MM-DD) a preset covers, counted back from today. */
function presetRange(preset: Exclude<Preset, "custom">, today: string) {
  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") return { from: addDays(today, -6), to: today };
  if (preset === "30d") return { from: addDays(today, -29), to: today };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

function formatDay(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(startOfLocalDay(dateKey));
}

function ReportSection({ title, note, onExport, children }: { title: string; note?: string; onExport?: () => void; children: ReactNode }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {note ? <p className="mt-1 text-sm text-[#5d665f]">{note}</p> : null}
        </div>
        {onExport ? <button className="secondary-btn no-print px-3 py-2 text-xs" onClick={onExport} type="button">Export CSV</button> : null}
      </div>
      {children}
    </section>
  );
}

const headClass = "border-b border-[#1e2a23]/10 bg-white/40 text-[11px] font-bold uppercase tracking-[0.14em] text-[#5d665f]";
const cellClass = "px-4 py-3";

export default function ReportsPage() {
  const { currency, formatMoney, convertInput } = useLocale();
  const [role, setRole] = useState<StoreRole | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  // Today's date is read after the page appears, so the server and browser never disagree about it.
  const [today, setToday] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("7d");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [status, setStatus] = useState("Loading report...");

  const canView = role === "owner" || role === "manager";

  const range = useMemo(() => {
    if (!today) return null;
    if (preset !== "custom") return presetRange(preset, today);
    if (!custom.from || !custom.to || custom.from > custom.to) return null;
    return custom;
  }, [custom, preset, today]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      const now = localDateKey(new Date());
      setToday(now);
      setCustom({ from: addDays(now, -6), to: now });
      void getCurrentUserRole().then(setRole).catch(() => setRole(null)).finally(() => setRoleLoaded(true));
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    if (!range || !canView) return;
    let active = true;
    const task = window.setTimeout(() => {
      setStatus("Loading report...");
      // The range ends at midnight after the last day, so that whole day is included.
      Promise.all([getSalesInRange(startOfLocalDay(range.from), startOfLocalDay(addDays(range.to, 1))), refreshCatalog(), getProductionBatches()])
        .then(([saleRows, catalog, batchRows]) => {
          if (!active) return;
          setSales(saleRows);
          setProducts(catalog);
          setBatches(batchRows);
          setStatus(`${saleRows.length} sales in this period`);
        })
        .catch((error: unknown) => { if (active) setStatus(error instanceof Error ? error.message : "Could not load the report."); });
    }, 0);
    return () => { active = false; window.clearTimeout(task); };
  }, [canView, range]);

  const report = useMemo(() => (range ? buildSalesReport(sales, range.from, range.to) : null), [range, sales]);

  const stock = useMemo(() => {
    const rows = products.map((product) => ({ ...product, value: product.stock * product.price, state: product.stock === 0 ? "Out of stock" : product.stock <= LOW_STOCK_AT ? "Low" : "Healthy" }));
    return { rows, units: rows.reduce((sum, row) => sum + row.stock, 0), value: rows.reduce((sum, row) => sum + row.value, 0), low: rows.filter((row) => row.state !== "Healthy").length };
  }, [products]);

  const production = useMemo(() => {
    if (!range) return { rows: [] as ProductionBatch[], cost: 0, units: 0 };
    const rows = batches.filter((batch) => batch.status !== "cancelled" && localDateKey(batch.createdAt) >= range.from && localDateKey(batch.createdAt) <= range.to);
    return { rows, cost: rows.reduce((sum, batch) => sum + batch.totalCost, 0), units: rows.reduce((sum, batch) => sum + batch.totalUnits, 0) };
  }, [batches, range]);

  // Money in exports is a plain number in the selected currency, so a spreadsheet can add it up.
  const money = (usdValue: number) => Number(convertInput(usdValue).toFixed(currency === "IDR" ? 0 : 2));
  const fileName = (name: string) => `biznizer-${name}-${range?.from}_to_${range?.to}.csv`;

  if (!canView) {
    return (
      <main className="min-h-full min-w-0 flex-1 text-[#1e2a23]">
        <AppNav title="Reports" />
        <div className="mx-auto max-w-2xl p-6 sm:p-10">
          {roleLoaded ? <p className="rounded-2xl border border-[#f0d4ca] bg-[#fff3ee] px-4 py-3 text-sm text-[#a14f35]">Reports are restricted to managers and owners.</p> : <p className="text-sm text-[#5d665f]">Loading...</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full min-w-0 flex-1 text-[#1e2a23]">
      <AppNav title="Reports" subtitle="Sales, products, stock and production for a period" right={<button className="secondary-btn px-3 py-2 text-xs" onClick={() => window.print()} type="button">Print</button>} />

      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8 lg:p-10">
        <div className="print-only">
          <h1 className="text-2xl font-semibold">Biznizer report</h1>
          <p className="mt-1 text-sm">{range ? `${formatDay(range.from)} to ${formatDay(range.to)}` : ""} · amounts in {currency}</p>
        </div>

        <div className="no-print flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#5d665f]">Main store</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">{range ? (range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} to ${formatDay(range.to)}`) : "Choose a period"}</h2>
            <p aria-live="polite" className="mt-2 text-sm text-[#5d665f]">{range ? status : "Pick a start date that is on or before the end date."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div aria-label="Report period" className="segmented flex flex-wrap text-sm" role="group">
              {presets.map((option) => <button aria-pressed={preset === option.id} className="px-3 py-2" key={option.id} onClick={() => setPreset(option.id)} type="button">{option.label}</button>)}
            </div>
            {preset === "custom" ? (
              <div className="flex items-center gap-2 text-sm">
                <input aria-label="From date" className="field px-2 py-2 outline-none" max={custom.to || undefined} type="date" value={custom.from} onChange={(event) => setCustom({ ...custom, from: event.target.value })} />
                <span className="text-[#5d665f]">to</span>
                <input aria-label="To date" className="field px-2 py-2 outline-none" max={today ?? undefined} min={custom.from || undefined} type="date" value={custom.to} onChange={(event) => setCustom({ ...custom, to: event.target.value })} />
              </div>
            ) : null}
          </div>
        </div>

        {report && range ? (
          <>
            <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Revenue", value: formatMoney(report.revenue), note: `${report.transactions} transactions` },
                { label: "Units sold", value: String(report.units), note: `${report.byProduct.length} different products` },
                { label: "Average ticket", value: formatMoney(report.averageTicket), note: "Per transaction" },
                { label: "Production spend", value: formatMoney(production.cost), note: `${production.rows.length} batches, ${production.units} units` },
              ].map((card) => (
                <div className="surface p-5" key={card.label}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8178]">{card.label}</p>
                  <p className="mt-3 truncate text-3xl font-semibold tracking-tight">{card.value}</p>
                  <p className="mt-1.5 text-sm text-[#5d665f]">{card.note}</p>
                </div>
              ))}
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
              <ReportSection
                note="Ranked by revenue. Share is each product's part of total revenue."
                title="Sales by product"
                onExport={() => downloadCsv(fileName("sales-by-product"), ["Product", "Units sold", `Revenue (${currency})`, "Share of revenue (%)"], report.byProduct.map((row) => [row.productName, row.units, money(row.revenue), Number(row.share.toFixed(1))]))}
              >
                <div className="inset-panel overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-sm">
                    <thead><tr className={headClass}><th className={`${cellClass} text-left`}>Product</th><th className={`${cellClass} text-right`}>Units</th><th className={`${cellClass} text-right`}>Revenue</th><th className={`${cellClass} text-right`}>Share</th></tr></thead>
                    <tbody>
                      {report.byProduct.length === 0 ? <tr><td className="p-6 text-[#5d665f]" colSpan={4}>No products sold in this period.</td></tr> : report.byProduct.map((row) => (
                        <tr className="border-b border-[#1e2a23]/10 last:border-0" key={row.productId}>
                          <td className={`${cellClass} font-medium`}>{row.productName}</td>
                          <td className={`${cellClass} text-right`}>{row.units}</td>
                          <td className={`${cellClass} text-right font-semibold`}>{formatMoney(row.revenue)}</td>
                          <td className={`${cellClass} text-right text-[#5d665f]`}>{row.share.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportSection>

              <ReportSection
                note="How customers paid."
                title="Payment methods"
                onExport={() => downloadCsv(fileName("payment-methods"), ["Method", "Transactions", `Revenue (${currency})`, "Share of revenue (%)"], report.byPayment.map((row) => [row.method, row.transactions, money(row.revenue), Number(row.share.toFixed(1))]))}
              >
                {report.byPayment.length === 0 ? <p className="text-sm text-[#5d665f]">No payments in this period.</p> : (
                  <div className="space-y-4">
                    {report.byPayment.map((row) => (
                      <div key={row.method}>
                        <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="capitalize">{row.method} <span className="text-[#5d665f]">· {row.transactions}</span></span><strong>{formatMoney(row.revenue)}</strong></div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#1e2a23]/10"><div className="h-2 rounded-full bg-[#1d2a24]" style={{ width: `${row.share}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </ReportSection>
            </div>

            <ReportSection
              note="One row per day, including days with no sales."
              title="Sales by day"
              onExport={() => downloadCsv(fileName("sales-by-day"), ["Date", "Transactions", "Units sold", `Revenue (${currency})`], report.byDay.map((row) => [row.date, row.transactions, row.units, money(row.revenue)]))}
            >
              <div className="inset-panel overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead><tr className={headClass}><th className={`${cellClass} text-left`}>Date</th><th className={`${cellClass} text-right`}>Transactions</th><th className={`${cellClass} text-right`}>Units</th><th className={`${cellClass} text-right`}>Revenue</th></tr></thead>
                  <tbody>
                    {report.byDay.map((row) => (
                      <tr className={`border-b border-[#1e2a23]/10 ${row.transactions === 0 ? "text-[#8a8178]" : ""}`} key={row.date}>
                        <td className={cellClass}>{formatDay(row.date)}</td>
                        <td className={`${cellClass} text-right`}>{row.transactions}</td>
                        <td className={`${cellClass} text-right`}>{row.units}</td>
                        <td className={`${cellClass} text-right font-semibold`}>{formatMoney(row.revenue)}</td>
                      </tr>
                    ))}
                    <tr className="bg-white/50 font-semibold"><td className={cellClass}>Total</td><td className={`${cellClass} text-right`}>{report.transactions}</td><td className={`${cellClass} text-right`}>{report.units}</td><td className={`${cellClass} text-right`}>{formatMoney(report.revenue)}</td></tr>
                  </tbody>
                </table>
              </div>
            </ReportSection>

            <ReportSection
              note={`Stock as it is right now, not for the period. Value is stock x selling price. ${stock.low} product(s) low or out of stock.`}
              title="Stock on hand"
              onExport={() => downloadCsv(`biznizer-stock-${today}.csv`, ["Product", "SKU", "Category", "Stock", `Price (${currency})`, `Retail value (${currency})`, "Status"], stock.rows.map((row) => [row.name, row.sku, row.category, row.stock, money(row.price), money(row.value), row.state]))}
            >
              <div className="inset-panel overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead><tr className={headClass}><th className={`${cellClass} text-left`}>Product</th><th className={`${cellClass} text-left`}>SKU</th><th className={`${cellClass} text-right`}>Stock</th><th className={`${cellClass} text-right`}>Price</th><th className={`${cellClass} text-right`}>Retail value</th><th className={`${cellClass} text-right`}>Status</th></tr></thead>
                  <tbody>
                    {stock.rows.length === 0 ? <tr><td className="p-6 text-[#5d665f]" colSpan={6}>No products in the catalog.</td></tr> : stock.rows.map((row) => (
                      <tr className="border-b border-[#1e2a23]/10" key={row.id}>
                        <td className={`${cellClass} font-medium`}>{row.name}<span className="block text-xs font-normal text-[#5d665f]">{row.category}</span></td>
                        <td className={`${cellClass} text-[#5d665f]`}>{row.sku}</td>
                        <td className={`${cellClass} text-right`}>{row.stock}</td>
                        <td className={`${cellClass} text-right`}>{formatMoney(row.price)}</td>
                        <td className={`${cellClass} text-right font-semibold`}>{formatMoney(row.value)}</td>
                        <td className={`${cellClass} text-right font-semibold ${row.state === "Healthy" ? "text-[#226d54]" : "text-[#c75c3b]"}`}>{row.state}</td>
                      </tr>
                    ))}
                    <tr className="bg-white/50 font-semibold"><td className={cellClass} colSpan={2}>Total</td><td className={`${cellClass} text-right`}>{stock.units}</td><td className={cellClass} /><td className={`${cellClass} text-right`}>{formatMoney(stock.value)}</td><td className={cellClass} /></tr>
                  </tbody>
                </table>
              </div>
            </ReportSection>

            <ReportSection
              note="Batches saved in this period, leaving out cancelled ones."
              title="Production"
              onExport={() => downloadCsv(fileName("production"), ["Batch", "Date", "Status", "Units", `Cost (${currency})`], production.rows.map((batch) => [batch.name, localDateKey(batch.createdAt), batch.status, batch.totalUnits, money(batch.totalCost)]))}
            >
              <div className="inset-panel overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead><tr className={headClass}><th className={`${cellClass} text-left`}>Batch</th><th className={`${cellClass} text-left`}>Date</th><th className={`${cellClass} text-left`}>Status</th><th className={`${cellClass} text-right`}>Units</th><th className={`${cellClass} text-right`}>Cost</th></tr></thead>
                  <tbody>
                    {production.rows.length === 0 ? <tr><td className="p-6 text-[#5d665f]" colSpan={5}>No production batches in this period.</td></tr> : production.rows.map((batch) => (
                      <tr className="border-b border-[#1e2a23]/10 last:border-0" key={batch.id}>
                        <td className={`${cellClass} font-medium`}>{batch.name}</td>
                        <td className={cellClass}>{formatDay(localDateKey(batch.createdAt))}</td>
                        <td className={`${cellClass} capitalize`}>{batch.status}</td>
                        <td className={`${cellClass} text-right`}>{batch.totalUnits}</td>
                        <td className={`${cellClass} text-right font-semibold`}>{formatMoney(batch.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportSection>
          </>
        ) : null}
      </div>
    </main>
  );
}
