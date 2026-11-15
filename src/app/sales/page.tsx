"use client";

import { useEffect, useState } from "react";

import { AppNav } from "@/components/top-nav";
import { getRecentSales, type SaleRecord } from "@/lib/sales/history";
import { useLocale } from "@/lib/locale";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SalesPage() {
  const { formatMoney } = useLocale();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [status, setStatus] = useState("Loading sales...");
  const [range, setRange] = useState<"today" | "recent">("today");

  async function loadSales() {
    try {
      const records = await getRecentSales();
      setSales(records);
      setStatus(`${records.length} recent sales`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load sales.");
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => void loadSales(), 0);
    return () => window.clearTimeout(task);
  }, []);


  const visibleSales = range === "today" ? sales.filter((sale) => new Date(sale.createdAt).toDateString() === new Date().toDateString()) : sales;
  const total = visibleSales.reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = visibleSales.length > 0 ? total / visibleSales.length : 0;
  const paymentTotals = visibleSales.reduce<Record<string, number>>((totals, sale) => ({ ...totals, [sale.paymentMethod]: (totals[sale.paymentMethod] ?? 0) + sale.total }), {});

  return (
    <main className="min-h-full min-w-0 flex-1 text-[#1d2a23]">
      <AppNav title="Sales" subtitle="Completed orders and revenue" />
      <div className="mx-auto max-w-5xl p-6 sm:p-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-[#69736b]">Main store</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Sales report</h2></div><div className="segmented flex text-sm"><button aria-pressed={range === "today"} className="px-4 py-2" onClick={() => setRange("today")} type="button">Today</button><button aria-pressed={range === "recent"} className="px-4 py-2" onClick={() => setRange("recent")} type="button">Recent</button></div></div>
        <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="surface p-5"><p className="text-xs uppercase tracking-[0.14em] text-[#69736b]">Revenue</p><p className="mt-2 text-2xl font-semibold">{formatMoney(total)}</p></div><div className="surface p-5"><p className="text-xs uppercase tracking-[0.14em] text-[#69736b]">Transactions</p><p className="mt-2 text-2xl font-semibold">{visibleSales.length}</p></div><div className="surface p-5"><p className="text-xs uppercase tracking-[0.14em] text-[#69736b]">Average ticket</p><p className="mt-2 text-2xl font-semibold">{formatMoney(averageTicket)}</p></div></div>
        <div className="mb-4 flex items-center justify-between text-sm text-[#69736b]"><span>{status} · {range === "today" ? "today" : "last 50 sales"}</span><button className="text-[#c75c3b] hover:text-[#1d2a24]" onClick={() => void loadSales()} type="button">Refresh</button></div>
        <div className="mb-6 flex gap-5 text-sm text-[#69736b]">{Object.entries(paymentTotals).map(([method, amount]) => <span className="capitalize" key={method}>{method}: <strong className="text-[#1d2a24]">{formatMoney(amount)}</strong></span>)}</div>
        <div className="overflow-hidden surface"><div className="grid grid-cols-[1fr_150px_100px] border-b border-[#1e2a23]/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#69736b]"><span>Sale</span><span>Payment</span><span className="text-right">Total</span></div>{visibleSales.length === 0 ? <p className="p-8 text-sm text-[#69736b]">No completed sales for this period.</p> : visibleSales.map((sale) => <a className="grid grid-cols-[1fr_150px_100px] items-center border-b border-[#1e2a23]/10 px-5 py-4 transition last:border-0 hover:bg-white/60" href={`/sales/${sale.id}`} key={sale.id}><div><p className="font-mono text-xs text-[#69736b]">{sale.id}</p><p className="mt-1 text-sm">{formatDate(sale.createdAt)}</p></div><span className="text-sm capitalize">{sale.paymentMethod}</span><span className="text-right font-semibold">{formatMoney(sale.total)}</span></a>)}</div>
      </div>
    </main>
  );
}
