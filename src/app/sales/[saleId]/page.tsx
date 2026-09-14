"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getSaleDetail, type SaleDetail } from "@/lib/sales/history";
import { createClient } from "@/lib/supabase/client";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = use(params);
  const router = useRouter();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [status, setStatus] = useState("Loading receipt...");

  useEffect(() => {
    const task = window.setTimeout(() => {
      void getSaleDetail(saleId).then((record) => {
        setSale(record);
        setStatus(record ? "Completed sale" : "Sale not found");
      }).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Could not load sale."));
    }, 0);
    return () => window.clearTimeout(task);
  }, [saleId]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]"><header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p><h1 className="mt-1 text-xl font-semibold">Sale receipt</h1></div><div className="flex items-center gap-5 text-sm"><Link className="text-[#69736b] hover:text-[#c75c3b]" href="/sales">Sales history</Link><button className="text-[#69736b] hover:text-[#c75c3b]" onClick={() => void signOut()} type="button">Sign out</button></div></header><div className="mx-auto max-w-2xl p-6 sm:p-10">{sale ? <section className="border border-[#d8d4ca] bg-[#fffdf8] p-6 sm:p-10"><div className="flex items-start justify-between border-b border-[#d8d4ca] pb-6"><div><p className="text-sm text-[#69736b]">Completed sale</p><p className="mt-2 font-mono text-xs text-[#69736b]">{sale.id}</p></div><p className="text-right text-sm text-[#69736b]">{formatDate(sale.createdAt)}<br /><span className="capitalize">Paid by {sale.paymentMethod}</span></p></div><div className="py-5">{sale.items.map((item) => <div className="flex justify-between border-b border-[#eee9df] py-3 text-sm" key={item.productId}><div><p className="font-semibold">{item.productName}</p><p className="text-[#69736b]">{item.quantity} x ${item.unitPrice.toFixed(2)}</p></div><span>${(item.quantity * item.unitPrice).toFixed(2)}</span></div>)}</div><div className="flex justify-between border-t border-[#d8d4ca] pt-5 text-xl font-semibold"><span>Total</span><span>${sale.total.toFixed(2)}</span></div></section> : <p className="text-sm text-[#69736b]">{status}</p>}</div></main>;
}