"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getRecentSales, type SaleRecord } from "@/lib/sales/history";
import { createClient } from "@/lib/supabase/client";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [status, setStatus] = useState("Loading sales...");

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

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const total = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]">
      <header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10">
        <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p><h1 className="mt-1 text-xl font-semibold">Sales history</h1></div>
        <div className="flex items-center gap-5 text-sm"><a className="text-[#69736b] hover:text-[#c75c3b]" href="/pos">Back to POS</a><button className="text-[#69736b] hover:text-[#c75c3b]" onClick={() => void signOut()} type="button">Sign out</button></div>
      </header>
      <div className="mx-auto max-w-5xl p-6 sm:p-10">
        <div className="mb-6 flex items-end justify-between"><div><p className="text-sm text-[#69736b]">Main store</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Recent sales</h2></div><div className="text-right"><p className="text-xs uppercase tracking-[0.14em] text-[#69736b]">Displayed total</p><p className="mt-1 text-2xl font-semibold">${total.toFixed(2)}</p></div></div>
        <div className="mb-4 flex items-center justify-between text-sm text-[#69736b]"><span>{status}</span><button className="text-[#c75c3b] hover:text-[#1d2a24]" onClick={() => void loadSales()} type="button">Refresh</button></div>
        <div className="overflow-hidden border border-[#d8d4ca] bg-[#fffdf8]"><div className="grid grid-cols-[1fr_150px_100px] border-b border-[#d8d4ca] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#69736b]"><span>Sale</span><span>Payment</span><span className="text-right">Total</span></div>{sales.length === 0 ? <p className="p-8 text-sm text-[#69736b]">No completed sales yet.</p> : sales.map((sale) => <div className="grid grid-cols-[1fr_150px_100px] items-center border-b border-[#eee9df] px-5 py-4 last:border-0" key={sale.id}><div><p className="font-mono text-xs text-[#69736b]">{sale.id}</p><p className="mt-1 text-sm">{formatDate(sale.createdAt)}</p></div><span className="text-sm capitalize">{sale.paymentMethod}</span><span className="text-right font-semibold">${sale.total.toFixed(2)}</span></div>)}</div>
      </div>
    </main>
  );
}
