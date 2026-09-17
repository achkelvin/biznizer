"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AppNav } from "@/components/top-nav";
import { useLocale } from "@/lib/locale";

const initialInputs = {
  batchVolume: 1000,
  bottleSize: 50,
  fragranceConcentration: 20,
  fragranceCostPerMl: 0.85,
  alcoholCostPerMl: 0.04,
  bottleCost: 2.4,
  packagingCost: 1.2,
  laborCost: 80,
  overheadCost: 45,
  miscCost: 20,
  retailMargin: 65,
  wholesaleMargin: 35,
  taxRate: 0,
};

type CalculatorInputs = typeof initialInputs;
type NumericField = keyof CalculatorInputs;

const fields: Array<{ key: NumericField; label: [string, string]; suffix: string; step?: string; money?: boolean }> = [
  { key: "batchVolume", label: ["Batch volume", "Volume batch"], suffix: "ml" },
  { key: "bottleSize", label: ["Bottle size", "Ukuran botol"], suffix: "ml" },
  { key: "fragranceConcentration", label: ["Fragrance concentration", "Konsentrasi fragrance"], suffix: "%", step: "1" },
  { key: "fragranceCostPerMl", label: ["Fragrance oil cost", "Biaya minyak fragrance"], suffix: "/ ml", step: "0.01", money: true },
  { key: "alcoholCostPerMl", label: ["Alcohol cost", "Biaya alkohol"], suffix: "/ ml", step: "0.01", money: true },
  { key: "bottleCost", label: ["Bottle cost", "Biaya botol"], suffix: "/ unit", step: "0.01", money: true },
  { key: "packagingCost", label: ["Label + box", "Label + box"], suffix: "/ unit", step: "0.01", money: true },
  { key: "laborCost", label: ["Labor per batch", "Tenaga kerja per batch"], suffix: "", step: "0.01", money: true },
  { key: "overheadCost", label: ["Overhead per batch", "Overhead per batch"], suffix: "", step: "0.01", money: true },
  { key: "miscCost", label: ["Miscellaneous per batch", "Lain-lain per batch"], suffix: "", step: "0.01", money: true },
];

export default function PricingPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);
  const { language, currency, formatMoney, convertInput, parseInput } = useLocale();

  const results = useMemo(() => {
    const units = Math.floor(inputs.batchVolume / inputs.bottleSize);
    const fragranceVolume = inputs.batchVolume * (inputs.fragranceConcentration / 100);
    const alcoholVolume = Math.max(inputs.batchVolume - fragranceVolume, 0);
    const ingredientCost = fragranceVolume * inputs.fragranceCostPerMl + alcoholVolume * inputs.alcoholCostPerMl;
    const batchCost = ingredientCost + inputs.laborCost + inputs.overheadCost + inputs.miscCost;
    const packagingCost = units * (inputs.bottleCost + inputs.packagingCost);
    const totalCost = batchCost + packagingCost;
    const costPerUnit = units > 0 ? totalCost / units : 0;
    const wholesalePrice = inputs.wholesaleMargin < 100 ? costPerUnit / (1 - inputs.wholesaleMargin / 100) : 0;
    const retailPrice = inputs.retailMargin < 100 ? costPerUnit / (1 - inputs.retailMargin / 100) : 0;

    return {
      units,
      fragranceVolume,
      alcoholVolume,
      ingredientCost,
      batchCost,
      packagingCost,
      totalCost,
      costPerUnit,
      wholesalePrice,
      retailPrice,
      retailWithTax: retailPrice * (1 + inputs.taxRate / 100),
    };
  }, [inputs]);

  function updateField(key: NumericField, value: string, moneyField = false) {
    setInputs((current) => ({ ...current, [key]: moneyField ? parseInput(value) : Number(value) || 0 }));
  }

  return (
    <main className="min-h-full flex-1 bg-[#f5f1ea] text-[#1e2a23]">
      <AppNav
        title={language === "id" ? "Kalkulator harga parfum" : "Perfume pricing"}
        right={
          <>
            <Link className="nav-link" href="/pos">Back to POS</Link>
            <Link className="nav-link hidden sm:inline-flex" href="/sales">Sales</Link>
          </>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-6"><p className="text-sm text-[#69736b]">{language === "id" ? "Ekonomi produk" : "Product economics"}</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">{language === "id" ? "Tentukan harga Anda" : "Build your price"}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#69736b]">{language === "id" ? "Masukkan biaya nyata satu batch. Biaya bahan, kemasan, dan operasional dipisahkan agar margin terlihat jelas." : "Enter the real cost of a batch. The calculator separates materials, packaging, and operating costs so your margin is visible."}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => <label className="border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm font-semibold" key={field.key}>{field.label[language === "id" ? 1 : 0]}<div className="mt-2 flex items-center border border-[#d8d4ca] bg-[#f4f1ea]"><input className="min-w-0 flex-1 bg-transparent px-3 py-3 font-normal outline-none" min="0" step={field.step ?? "1"} type="number" value={field.money ? convertInput(inputs[field.key]).toFixed(currency === "IDR" ? 0 : 2) : inputs[field.key]} onChange={(event) => updateField(field.key, event.target.value, field.money)} /><span className="px-3 text-xs text-[#69736b]">{field.money ? currency : field.suffix}</span></div></label>)}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm font-semibold">{language === "id" ? "Margin retail" : "Retail margin"}<div className="mt-2 flex items-center border border-[#d8d4ca] bg-[#f4f1ea]"><input className="min-w-0 flex-1 bg-transparent px-3 py-3 font-normal outline-none" min="0" max="99" step="1" type="number" value={inputs.retailMargin} onChange={(event) => updateField("retailMargin", event.target.value)} /><span className="px-3 text-xs text-[#69736b]">%</span></div></label>
            <label className="border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm font-semibold">{language === "id" ? "Margin grosir" : "Wholesale margin"}<div className="mt-2 flex items-center border border-[#d8d4ca] bg-[#f4f1ea]"><input className="min-w-0 flex-1 bg-transparent px-3 py-3 font-normal outline-none" min="0" max="99" step="1" type="number" value={inputs.wholesaleMargin} onChange={(event) => updateField("wholesaleMargin", event.target.value)} /><span className="px-3 text-xs text-[#69736b]">%</span></div></label>
            <label className="border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm font-semibold">{language === "id" ? "Pajak penjualan" : "Sales tax"}<div className="mt-2 flex items-center border border-[#d8d4ca] bg-[#f4f1ea]"><input className="min-w-0 flex-1 bg-transparent px-3 py-3 font-normal outline-none" min="0" max="100" step="0.1" type="number" value={inputs.taxRate} onChange={(event) => updateField("taxRate", event.target.value)} /><span className="px-3 text-xs text-[#69736b]">%</span></div></label>
          </div>
        </section>

        <aside className="h-fit border border-[#1d2a24] bg-[#1d2a24] p-6 text-[#fffdf8] lg:sticky lg:top-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e6a083]">{language === "id" ? "Hasil harga" : "Pricing output"}</p>
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="border border-[#536259] p-4"><p className="text-xs text-[#b7c1ba]">{language === "id" ? "Unit siap jual" : "Sellable units"}</p><p className="mt-2 text-2xl font-semibold">{results.units}</p></div><div className="border border-[#536259] p-4"><p className="text-xs text-[#b7c1ba]">{language === "id" ? "Biaya / unit" : "Cost / unit"}</p><p className="mt-2 text-2xl font-semibold">{formatMoney(results.costPerUnit)}</p></div></div>
          <div className="mt-6 border-t border-[#536259] pt-5"><div className="flex justify-between py-2 text-sm text-[#b7c1ba]"><span>{language === "id" ? "Harga grosir" : "Wholesale price"}</span><strong className="text-[#fffdf8]">{formatMoney(results.wholesalePrice)}</strong></div><div className="flex justify-between py-2 text-sm text-[#b7c1ba]"><span>{language === "id" ? "Harga retail" : "Retail price"}</span><strong className="text-[#e6a083]">{formatMoney(results.retailPrice)}</strong></div><div className="flex justify-between py-2 text-sm text-[#b7c1ba]"><span>{language === "id" ? "Retail termasuk pajak" : "Retail incl. tax"}</span><strong className="text-[#fffdf8]">{formatMoney(results.retailWithTax)}</strong></div></div>
          <div className="mt-6 border-t border-[#536259] pt-5 text-sm"><p className="text-xs uppercase tracking-[0.14em] text-[#b7c1ba]">{language === "id" ? "Rincian batch" : "Batch breakdown"}</p><div className="mt-3 space-y-2 text-[#b7c1ba]"><div className="flex justify-between"><span>{language === "id" ? "Bahan" : "Ingredients"}</span><span>{formatMoney(results.ingredientCost)}</span></div><div className="flex justify-between"><span>{language === "id" ? "Tenaga kerja + overhead" : "Labor + overhead"}</span><span>{formatMoney(inputs.laborCost + inputs.overheadCost + inputs.miscCost)}</span></div><div className="flex justify-between"><span>{language === "id" ? "Kemasan" : "Packaging"}</span><span>{formatMoney(results.packagingCost)}</span></div><div className="flex justify-between border-t border-[#536259] pt-3 font-semibold text-[#fffdf8]"><span>{language === "id" ? "Total biaya batch" : "Total batch cost"}</span><span>{formatMoney(results.totalCost)}</span></div></div></div>
          <p className="mt-6 text-xs leading-5 text-[#b7c1ba]">{language === "id" ? "Rumus: harga = biaya unit / (1 - target margin). Ini adalah margin, bukan markup." : "Formula: price = unit cost / (1 - target margin). This is margin, not markup."}</p>
        </aside>
      </div>
    </main>
  );
}
