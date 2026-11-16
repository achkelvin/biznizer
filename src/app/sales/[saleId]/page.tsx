"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { getSaleDetail, type SaleDetail } from "@/lib/sales/history";
import { AppNav } from "@/components/top-nav";
import { useLocale } from "@/lib/locale";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = use(params);
  const { formatMoney } = useLocale();
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


  return <main className="min-h-full min-w-0 flex-1 text-ink"><AppNav title="Sale receipt" right={<Link className="nav-link" href="/sales">← Sales history</Link>} /><div className="mx-auto max-w-2xl p-6 sm:p-10">{sale ? <section className="surface p-6 sm:p-10"><div className="flex items-start justify-between border-b border-ink/10 pb-6"><div><p className="text-sm text-muted">Completed sale</p><p className="mt-2 font-mono text-xs text-muted">{sale.id}</p></div><p className="text-right text-sm text-muted">{formatDate(sale.createdAt)}<br /><span className="capitalize">Paid by {sale.paymentMethod}</span></p></div><div className="py-5">{sale.items.map((item) => <div className="flex justify-between border-b border-ink/10 py-3 text-sm" key={item.productId}><div><p className="font-semibold">{item.productName}</p><p className="text-muted">{item.quantity} x {formatMoney(item.unitPrice)}</p></div><span>{formatMoney(item.quantity * item.unitPrice)}</span></div>)}</div><div className="flex justify-between border-t border-ink/10 pt-5 text-xl font-semibold"><span>Total</span><span>{formatMoney(sale.total)}</span></div></section> : <p className="text-sm text-muted">{status}</p>}</div></main>;
}