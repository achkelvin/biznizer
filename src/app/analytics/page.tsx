"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppNav } from "@/components/top-nav";
import { getRecentSales, type SaleRecord } from "@/lib/sales/history";
import { useLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/client";

type Period = "today" | "sevenDays" | "recent";

function formatDay(value: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(value);
}

function startOfDay(value: Date) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { formatMoney } = useLocale();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [period, setPeriod] = useState<Period>("sevenDays");
  const [status, setStatus] = useState("Loading analytics...");

  async function loadSales() {
    try {
      setSales(await getRecentSales());
      setStatus("Updated just now");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load analytics.");
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => void loadSales(), 0);
    return () => window.clearTimeout(task);
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const visibleSales = useMemo(() => {
    const now = new Date();
    if (period === "today") {
      return sales.filter((sale) => startOfDay(new Date(sale.createdAt)).getTime() === startOfDay(now).getTime());
    }
    if (period === "sevenDays") {
      const cutoff = startOfDay(now);
      cutoff.setDate(cutoff.getDate() - 6);
      return sales.filter((sale) => new Date(sale.createdAt) >= cutoff);
    }
    return sales;
  }, [period, sales]);

  const revenue = visibleSales.reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = visibleSales.length > 0 ? revenue / visibleSales.length : 0;
  const paymentTotals = visibleSales.reduce<Record<string, number>>((totals, sale) => {
    totals[sale.paymentMethod] = (totals[sale.paymentMethod] ?? 0) + sale.total;
    return totals;
  }, {});
  const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
    const day = startOfDay(new Date());
    day.setDate(day.getDate() - (6 - index));
    const total = sales
      .filter((sale) => startOfDay(new Date(sale.createdAt)).getTime() === day.getTime())
      .reduce((sum, sale) => sum + sale.total, 0);
    return { label: formatDay(day), total };
  });
  const maxDailyRevenue = Math.max(...dailyRevenue.map((day) => day.total), 1);

  return (
    <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a23]">
      <AppNav
        title="Analytics"
        subtitle="A quick read on store performance"
        right={
          <>
            <Link className="nav-link" href="/sales">Sales history</Link>
            <button className="nav-link" onClick={() => void signOut()} type="button">Sign out</button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl p-6 sm:p-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#69736b]">Main store</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">Performance overview</h2>
          </div>
          <div className="flex border border-[#d8d4ca] bg-[#fffdf8] p-1 text-sm">
            {(["today", "sevenDays", "recent"] as Period[]).map((option) => (
              <button
                className={`px-4 py-2 ${period === option ? "bg-[#1d2a24] text-[#fffdf8]" : "text-[#69736b]"}`}
                key={option}
                onClick={() => setPeriod(option)}
                type="button"
              >
                {option === "today" ? "Today" : option === "sevenDays" ? "7 days" : "Recent"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="border border-[#d8d4ca] bg-[#fffdf8] p-5"><p className="text-xs uppercase tracking-[0.14em] text-[#69736b]">Revenue</p><p className="mt-2 text-2xl font-semibold">{formatMoney(revenue)}</p><p className="mt-1 text-sm text-[#69736b]">Selected period</p></div>
          <div className="border border-[#d8d4ca] bg-[#fffdf8] p-5"><p className="text-xs uppercase tracking-[0.14em] text-[#69736b]">Transactions</p><p className="mt-2 text-2xl font-semibold">{visibleSales.length}</p><p className="mt-1 text-sm text-[#69736b]">Completed sales</p></div>
          <div className="border border-[#d8d4ca] bg-[#fffdf8] p-5"><p className="text-xs uppercase tracking-[0.14em] text-[#69736b]">Average ticket</p><p className="mt-2 text-2xl font-semibold">{formatMoney(averageTicket)}</p><p className="mt-1 text-sm text-[#69736b]">Per transaction</p></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="border border-[#d8d4ca] bg-[#fffdf8] p-6">
            <div className="flex items-center justify-between gap-4"><div><h3 className="text-lg font-semibold">Revenue rhythm</h3><p className="mt-1 text-sm text-[#69736b]">Last seven calendar days</p></div><span className="text-xs text-[#69736b]">{status}</span></div>
            <div className="mt-8 flex h-56 items-end gap-2 sm:gap-4">
              {dailyRevenue.map((day) => (
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={day.label}>
                  <span className="text-[10px] text-[#69736b]">{day.total > 0 ? formatMoney(day.total) : "-"}</span>
                  <div className="flex h-40 w-full items-end"><div className="w-full bg-[#c75c3b] transition-all" style={{ height: `${Math.max((day.total / maxDailyRevenue) * 100, day.total > 0 ? 8 : 2)}%` }} /></div>
                  <span className="text-xs text-[#69736b]">{day.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-[#d8d4ca] bg-[#fffdf8] p-6">
            <h3 className="text-lg font-semibold">Payment mix</h3>
            <p className="mt-1 text-sm text-[#69736b]">Revenue by payment method</p>
            <div className="mt-7 space-y-5">
              {Object.entries(paymentTotals).length === 0 ? <p className="text-sm text-[#69736b]">No payment data for this period.</p> : Object.entries(paymentTotals).map(([method, amount]) => (
                <div key={method}><div className="mb-2 flex justify-between text-sm"><span className="capitalize">{method}</span><strong>{formatMoney(amount)}</strong></div><div className="h-2 bg-[#eee9df]"><div className="h-2 bg-[#1d2a24]" style={{ width: `${revenue > 0 ? (amount / revenue) * 100 : 0}%` }} /></div></div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 border border-[#d8d4ca] bg-[#fffdf8] p-6">
          <div className="mb-4 flex items-center justify-between gap-4"><div><h3 className="text-lg font-semibold">Top receipts</h3><p className="mt-1 text-sm text-[#69736b]">Highest-value transactions in the selected period</p></div><button className="text-sm text-[#c75c3b] hover:text-[#1d2a24]" onClick={() => void loadSales()} type="button">Refresh</button></div>
          <div className="grid gap-3 md:grid-cols-3">{[...visibleSales].sort((left, right) => right.total - left.total).slice(0, 3).map((sale) => <a className="border border-[#eee9df] p-4 transition hover:bg-[#f4f1ea]" href={`/sales/${sale.id}`} key={sale.id}><p className="font-mono text-xs text-[#69736b]">{sale.id}</p><p className="mt-3 text-xl font-semibold">{formatMoney(sale.total)}</p><p className="mt-1 text-sm capitalize text-[#69736b]">{sale.paymentMethod}</p></a>)}</div>
          {visibleSales.length === 0 ? <p className="text-sm text-[#69736b]">No completed sales for this period.</p> : null}
        </section>
      </div>
    </main>
  );
}