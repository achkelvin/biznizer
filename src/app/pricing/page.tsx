"use client";

import { useMemo, useState } from "react";

import { AppNav } from "@/components/top-nav";
import { useLocale } from "@/lib/locale";

const SIZES = [5, 10, 15, 30, 50, 55, 100, 250, 500];
const REF_SIZE = 50;
const HEALTHY_MARGIN = 25;

// Starting costs are written in rupiah (the currency the business buys in). The
// app's money base is USD, so an untouched default is converted at the current
// rate on every render: it stays exactly this rupiah figure as the rate updates.
const MONEY_DEFAULTS_IDR = { oil: 250000, alcohol: 50000, bottle: 12000, cap: 5000, label: 1500, box: 5000, card: 800, seal: 500, twine: 300, monthly: 300000 };
const NUMBER_DEFAULTS = { buffer: 10, units: 60, margin: 50, curve: 0.65, giving: 2, discount: 15 };

type MoneyKey = keyof typeof MONEY_DEFAULTS_IDR;
type NumberKey = keyof typeof NUMBER_DEFAULTS;
type Inputs = Record<MoneyKey | NumberKey, number>;
type ExtraCost = { label: string; amount: number };
type BundleItem = { name: string; price: number; cost: number };

const cardClass = "surface p-5";
const headingClass = "mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#69736b]";
const rowInputClass = "min-w-0 field px-2 py-2 text-sm outline-none focus:bg-white";
const columnLabelClass = "text-[10px] font-semibold uppercase tracking-[0.1em] text-[#69736b]";

function PricingInput({ label, hint, value, suffix, step = "1", onChange }: { label: string; hint?: string; value: string | number; suffix: string; step?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {hint ? <span className="mt-1 block text-xs font-normal leading-5 text-[#69736b]">{hint}</span> : null}
      <div className="mt-2 flex items-center field">
        <input className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-normal outline-none focus:bg-white" min="0" step={step} type="number" value={value} onChange={(event) => onChange(event.target.value)} />
        {suffix ? <span className="px-3 text-xs text-[#69736b]">{suffix}</span> : null}
      </div>
    </label>
  );
}

export default function PricingPage() {
  const { language, currency, rate, formatMoney, convertInput, parseInput } = useLocale();
  const [moneyEdits, setMoneyEdits] = useState<Partial<Record<MoneyKey, number>>>({});
  const [numbers, setNumbers] = useState(NUMBER_DEFAULTS);
  const inputs = useMemo<Inputs>(() => {
    const money = Object.fromEntries(Object.entries(MONEY_DEFAULTS_IDR).map(([key, idr]) => [key, idr / rate])) as Record<MoneyKey, number>;
    return { ...money, ...moneyEdits, ...numbers };
  }, [moneyEdits, numbers, rate]);
  const [extras, setExtras] = useState<ExtraCost[]>([{ label: "", amount: 0 }]);
  const [items, setItems] = useState<BundleItem[]>([{ name: "Dawn 10ml", price: 0, cost: 0 }, { name: "Reverie 10ml", price: 0, cost: 0 }, { name: "Hearth 10ml", price: 0, cost: 0 }]);

  const t = (en: string, id: string) => (language === "id" ? id : en);
  // Stored values are USD; inputs show and accept the selected currency.
  const shown = (usdValue: number) => Number(convertInput(usdValue).toFixed(currency === "IDR" ? 0 : 2));
  const moneyStep = currency === "IDR" ? "100" : "0.01";

  const moneyField = (key: MoneyKey, label: string, hint?: string) => (
    <PricingInput hint={hint} label={label} step={moneyStep} suffix={currency} value={shown(inputs[key])} onChange={(value) => setMoneyEdits((current) => ({ ...current, [key]: parseInput(value) }))} />
  );
  const numberField = (key: NumberKey, label: string, suffix: string, hint?: string, step = "1") => (
    <PricingInput hint={hint} label={label} step={step} suffix={suffix} value={inputs[key]} onChange={(value) => setNumbers((current) => ({ ...current, [key]: Number(value) || 0 }))} />
  );

  const updateExtra = (index: number, patch: Partial<ExtraCost>) => setExtras((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  const updateItem = (index: number, patch: Partial<BundleItem>) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));

  const pricing = useMemo(() => {
    const packaging = inputs.bottle + inputs.cap + inputs.label + inputs.box + inputs.card + inputs.seal + inputs.twine + extras.reduce((sum, item) => sum + item.amount, 0);
    const overhead = inputs.monthly / Math.max(1, inputs.units);
    const liquid = inputs.oil + inputs.alcohol;
    const buffer = 1 + inputs.buffer / 100;
    const referenceCost = (liquid + packaging) * buffer + overhead;
    const referencePrice = referenceCost / Math.max(0.01, 1 - inputs.margin / 100);
    const referenceProfit = referencePrice - referenceCost;
    const rows = SIZES.map((size) => {
      const sizeLiquid = (liquid * size) / REF_SIZE;
      const newCost = (sizeLiquid + packaging) * buffer + overhead;
      const refillCost = sizeLiquid * buffer + overhead;
      const profit = referenceProfit * Math.pow(size / REF_SIZE, inputs.curve);
      const newPrice = newCost + profit;
      const giving = (newPrice * inputs.giving) / 100;
      const netProfit = newPrice - newCost - giving;
      return { size, newCost, newPrice, refillPrice: refillCost + profit, giving, netProfit, margin: newPrice ? (netProfit / newPrice) * 100 : 0 };
    });
    return { rows, referenceCost, referencePrice, overhead, packaging, reference: rows.find((row) => row.size === REF_SIZE) };
  }, [extras, inputs]);

  const bundle = useMemo(() => {
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
    const price = totalPrice * (1 - inputs.discount / 100);
    const profit = price - totalCost;
    return { totalPrice, totalCost, price, savings: totalPrice - price, profit, margin: price ? (profit / price) * 100 : 0 };
  }, [inputs.discount, items]);

  const marginColor = (margin: number) => (margin >= HEALTHY_MARGIN ? "text-[#4a7c59]" : "text-[#b5541f]");

  return (
    <main className="min-h-full min-w-0 flex-1 text-[#1e2a23]">
      <AppNav
        title={t("Perfume pricing", "Kalkulator harga parfum")}
        subtitle={t("New bottles, refills, and bundles", "Harga baru, isi ulang, dan bundel")}
      />

      <div className="mx-auto max-w-7xl p-6 sm:p-10">
        <header className="mb-7">
          <p className="text-sm text-[#69736b]">{t("Product economics", "Ekonomi produk")}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{t("Build your price", "Bangun harga Anda")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#69736b]">{t("Use 50ml as the reference size. The volume curve creates natural bulk pricing, while refills remove packaging costs.", "Gunakan ukuran 50ml sebagai referensi. Kurva volume memberi diskon alami, sementara isi ulang menghapus biaya kemasan.")}</p>
        </header>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className={cardClass}>
            <h3 className={headingClass}>{t("Liquid formula / 50ml", "Formula cairan / 50ml")}</h3>
            <div className="space-y-4">
              {moneyField("oil", t("Fragrance oil cost", "Biaya minyak fragrance"))}
              {moneyField("alcohol", t("Perfumer's alcohol cost", "Biaya alkohol parfum"))}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#69736b]">{t("Liquid cost scales linearly with bottle size.", "Biaya cairan naik sebanding dengan ukuran botol.")}</p>
          </section>

          <section className={cardClass}>
            <h3 className={headingClass}>{t("Packaging / unit", "Kemasan / unit")}</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {moneyField("bottle", t("Glass bottle", "Botol kaca"))}
              {moneyField("cap", t("Cap / spray pump", "Tutup / pompa semprot"))}
              {moneyField("label", t("Label", "Label"))}
              {moneyField("box", t("Box", "Kotak"))}
              {moneyField("card", t("Insert card", "Kartu sisipan"))}
              {moneyField("seal", t("Seal sticker", "Stiker segel"))}
              {moneyField("twine", t("Twine / string", "Tali"))}
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#69736b]">{t("Extra costs", "Biaya tambahan")}</h3>
            <p className="mb-4 text-xs leading-5 text-[#69736b]">{t("QC, ribbon, printing, or any other per-unit cost. Counted like packaging, so refills skip it.", "QC, pita, cetak, atau biaya per unit lainnya. Dihitung seperti kemasan, jadi tidak masuk harga isi ulang.")}</p>
            <div className="mb-1 grid grid-cols-[1fr_110px_32px] gap-2">
              <span className={columnLabelClass}>{t("Label", "Nama")}</span>
              <span className={columnLabelClass}>{t("Amount", "Jumlah")} ({currency})</span>
            </div>
            {extras.map((item, index) => (
              <div className="mb-2 grid grid-cols-[1fr_110px_32px] gap-2" key={index}>
                <input aria-label={t("Cost label", "Nama biaya")} className={rowInputClass} placeholder={t("Ribbon, QC", "Pita, QC")} value={item.label} onChange={(event) => updateExtra(index, { label: event.target.value })} />
                <input aria-label={t("Cost amount", "Jumlah biaya")} className={rowInputClass} min="0" step={moneyStep} type="number" value={shown(item.amount) || ""} onChange={(event) => updateExtra(index, { amount: parseInput(event.target.value) })} />
                <button aria-label={t("Remove cost", "Hapus biaya")} className="field text-[#b5541f]" onClick={() => setExtras((current) => (current.length === 1 ? [{ label: "", amount: 0 }] : current.filter((_, rowIndex) => rowIndex !== index)))} type="button">×</button>
              </div>
            ))}
            <button className="mt-2 rounded-lg bg-white/60 px-3 py-2 text-xs font-semibold text-[#8f6432]" onClick={() => setExtras((current) => [...current, { label: "", amount: 0 }])} type="button">+ {t("Add cost", "Tambah biaya")}</button>
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <section className={cardClass}>
            <h3 className={headingClass}>{t("Unpredictable costs", "Biaya tak terduga")}</h3>
            <div className="space-y-4">
              {numberField("buffer", t("Contingency buffer", "Cadangan tak terduga"), "%", t("Covers spillage, failed batches, and price swings.", "Menutup tumpahan, batch gagal, dan fluktuasi harga."))}
              {moneyField("monthly", t("Fixed monthly costs", "Biaya tetap bulanan"))}
              {numberField("units", t("Estimated monthly units", "Perkiraan unit per bulan"), "unit", t("Fixed costs are spread across these units.", "Biaya tetap dibagi ke jumlah unit ini."))}
            </div>
          </section>

          <section className={cardClass}>
            <h3 className={headingClass}>{t("Margin & curve", "Margin & kurva")}</h3>
            <div className="space-y-4">
              {numberField("margin", t("Target margin at 50ml", "Target margin di 50ml"), "%")}
              {numberField("curve", t("Volume discount exponent", "Eksponen diskon volume"), "", t("1.0 = flat linear pricing. Lower = steeper bulk discount. About 0.65 matches niche fragrance market pricing.", "1.0 = harga linear. Lebih rendah = diskon volume lebih besar. Sekitar 0.65 sesuai pola harga pasar parfum niche."), "0.01")}
              {numberField("giving", t("Giving allocation", "Alokasi donasi"), "%", t("Share of each sale set aside to give back.", "Bagian dari tiap penjualan yang disisihkan untuk donasi."), "0.5")}
            </div>
          </section>

          <aside className="surface-dark p-5 text-[#fffdf8]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e6a083]">{t("Reference summary", "Ringkasan referensi")}</p>
            <p className="mt-5 text-3xl font-semibold">{formatMoney(pricing.referencePrice)}</p>
            <p className="mt-1 text-sm text-[#b7c1ba]">{t("50ml new bottle price", "Harga botol baru 50ml")}</p>
            <div className="mt-5 space-y-2 border-t border-white/15 pt-4 text-sm text-[#b7c1ba]">
              <div className="flex justify-between"><span>{t("Refill price", "Harga isi ulang")}</span><span className="text-[#e6a083]">{formatMoney(pricing.reference?.refillPrice ?? 0)}</span></div>
              <div className="flex justify-between"><span>{t("Cost / unit", "Biaya / unit")}</span><span>{formatMoney(pricing.referenceCost)}</span></div>
              <div className="flex justify-between"><span>{t("Packaging / unit", "Kemasan / unit")}</span><span>{formatMoney(pricing.packaging)}</span></div>
              <div className="flex justify-between"><span>{t("Overhead / unit", "Overhead / unit")}</span><span>{formatMoney(pricing.overhead)}</span></div>
              <div className="flex justify-between border-t border-white/15 pt-3 font-semibold text-[#fffdf8]"><span>{t("Net profit / unit", "Laba bersih / unit")}</span><span>{formatMoney(pricing.reference?.netProfit ?? 0)}</span></div>
            </div>
          </aside>
        </div>

        <section className={`mt-6 ${cardClass}`}>
          <h3 className="text-lg font-semibold">{t("Pricing by size", "Harga per ukuran")}</h3>
          <p className="mt-1 text-sm text-[#69736b]">{t("The 50ml row is the reference. Refill pricing removes all packaging costs, including your extra costs.", "Baris 50ml adalah referensi. Harga isi ulang menghapus semua biaya kemasan, termasuk biaya tambahan.")}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#1e2a23]/10 text-xs uppercase tracking-[0.1em] text-[#69736b]">
                  <th className="px-3 py-3 text-left">{t("Size", "Ukuran")}</th>
                  <th className="px-3 py-3 text-right">{t("Total cost", "Total biaya")}</th>
                  <th className="px-3 py-3 text-right">{t("New price", "Harga baru")}</th>
                  <th className="px-3 py-3 text-right">{t("Refill price", "Harga isi ulang")}</th>
                  <th className="px-3 py-3 text-right">{t("Giving", "Donasi")}</th>
                  <th className="px-3 py-3 text-right">{t("Net profit", "Laba bersih")}</th>
                  <th className="px-3 py-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {pricing.rows.map((row) => (
                  <tr className={row.size === REF_SIZE ? "border-b border-[#1e2a23]/10 bg-[#f2ebe0] font-semibold" : "border-b border-[#1e2a23]/10"} key={row.size}>
                    <td className="px-3 py-3">{row.size}ml</td>
                    <td className="px-3 py-3 text-right">{formatMoney(row.newCost)}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(row.newPrice)}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(row.refillPrice)}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(row.giving)}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(row.netProfit)}</td>
                    <td className={`px-3 py-3 text-right ${marginColor(row.margin)}`}>{row.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#69736b]">{t(`Profit grows by size^${inputs.curve} instead of linearly, so bigger bottles earn more total profit at a smaller margin percentage.`, `Laba tumbuh mengikuti ukuran^${inputs.curve}, bukan linear, sehingga botol besar menghasilkan laba total lebih besar dengan persentase margin lebih kecil.`)}</p>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className={cardClass}>
            <h3 className="text-lg font-semibold">{t("Bundle items", "Isi bundel")}</h3>
            <p className="mt-1 text-sm text-[#69736b]">{t("Enter each item's price and cost from the table above, then set the bundle discount.", "Masukkan harga dan biaya tiap item dari tabel di atas, lalu atur diskon bundel.")}</p>
            <div className="mb-1 mt-4 grid grid-cols-[1fr_105px_105px_32px] gap-2">
              <span className={columnLabelClass}>Item</span>
              <span className={columnLabelClass}>{t("Price", "Harga")} ({currency})</span>
              <span className={columnLabelClass}>{t("Cost", "Biaya")} ({currency})</span>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div className="grid grid-cols-[1fr_105px_105px_32px] gap-2" key={index}>
                  <input aria-label={t("Item name", "Nama item")} className={rowInputClass} placeholder={t("Item name", "Nama item")} value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} />
                  <input aria-label={t("Item price", "Harga item")} className={rowInputClass} min="0" step={moneyStep} type="number" value={shown(item.price) || ""} onChange={(event) => updateItem(index, { price: parseInput(event.target.value) })} />
                  <input aria-label={t("Item cost", "Biaya item")} className={rowInputClass} min="0" step={moneyStep} type="number" value={shown(item.cost) || ""} onChange={(event) => updateItem(index, { cost: parseInput(event.target.value) })} />
                  <button aria-label={t("Remove bundle item", "Hapus item bundel")} className="field text-[#b5541f]" onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))} type="button">×</button>
                </div>
              ))}
            </div>
            <button className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs font-semibold text-[#8f6432]" onClick={() => setItems((current) => [...current, { name: "", price: 0, cost: 0 }])} type="button">+ {t("Add item", "Tambah item")}</button>
            <div className="mt-5">{numberField("discount", t("Bundle discount", "Diskon bundel"), "%", t("How much cheaper the bundle is than buying the items separately.", "Seberapa lebih murah bundel dibanding membeli satuan."))}</div>
          </div>

          <div className={cardClass}>
            <h3 className="text-lg font-semibold">{t("Bundle summary", "Ringkasan bundel")}</h3>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span>{t("Individual prices", "Harga satuan")}</span><span>{formatMoney(bundle.totalPrice)}</span></div>
              <div className="flex justify-between text-[#4a7c59]"><span>{t("Customer saves", "Pelanggan hemat")} ({inputs.discount}%)</span><span>-{formatMoney(bundle.savings)}</span></div>
              <div className="flex justify-between"><span>{t("Total cost", "Total biaya")}</span><span>{formatMoney(bundle.totalCost)}</span></div>
              <div className="flex justify-between"><span>{t("Bundle profit", "Laba bundel")}</span><span className={marginColor(bundle.margin)}>{formatMoney(bundle.profit)} ({bundle.margin.toFixed(1)}%)</span></div>
              <div className="flex justify-between border-t border-[#1e2a23]/10 pt-3 text-lg font-semibold"><span>{t("Bundle price", "Harga bundel")}</span><span>{formatMoney(bundle.price)}</span></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
