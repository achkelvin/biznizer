"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

const fields: Array<{ key: NumericField; label: string; suffix: string; step?: string }> = [
  { key: "batchVolume", label: "Batch volume", suffix: "ml" },
  { key: "bottleSize", label: "Bottle size", suffix: "ml" },
  { key: "fragranceConcentration", label: "Fragrance concentration", suffix: "%", step: "1" },
  { key: "fragranceCostPerMl", label: "Fragrance oil cost", suffix: "/ ml", step: "0.01" },
  { key: "alcoholCostPerMl", label: "Alcohol cost", suffix: "/ ml", step: "0.01" },
  { key: "bottleCost", label: "Bottle cost", suffix: "/ unit", step: "0.01" },
  { key: "packagingCost", label: "Label + box", suffix: "/ unit", step: "0.01" },
  { key: "laborCost", label: "Labor per batch", suffix: "", step: "0.01" },
  { key: "overheadCost", label: "Overhead per batch", suffix: "", step: "0.01" },
  { key: "miscCost", label: "Miscellaneous per batch", suffix: "", step: "0.01" },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function PricingPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);

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

  function updateField(key: NumericField, value: string) {
    setInputs((current) => ({ ...current, [key]: Number(value) || 0 }));
  }

  return (
    <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]">
      <header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10">
        <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p><h1 className="mt-1 text-xl font-semibold">Perfume pricing</h1></div>
        <div className="flex items-center gap-5 text-sm"><Link className="text-[#69736b] hover:text-[#c75c3b]" href="/pos">Back to POS</Link><Link className="hidden text-[#69736b] hover:text-[#c75c3b] sm:inline" href="/sales">Sales</Link></div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-6"><p className="text-sm text-[#69736b]">Product economics</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Build your price</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#69736b]">Enter the real cost of a batch. The calculator separates materials, packaging, and operating costs so your margin is visible.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => <label className="border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm font-semibold" key={field.key}>{field.label}<div className="mt-2 flex items-center border border-[#d8d4ca] bg-[#f4f1ea]"><input className="min-w-0 flex-1 bg-transparent px-3 py-3 font-normal outline-none" min="0" step={field.step ?? "1"} type="number" value={inputs[field.key]} onChange={(event) => updateField(field.key, event.target.value)} /><span className="px-3 text-xs text-[#69736b]">{field.suffix}</span></div></label>)}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm font-semibold">Retail margin<div className="mt-2 flex items-center border border-[#d8d4ca] bg-[#f4f1ea]"><input className="min-w-0 flex-1 bg-transparent px-3 py-3 font-normal outline-none" min="0" max="99" step="1" type="number" value={inputs.retailMargin} onChange={(event) => updateField("retailMargin", event.target.value)} /><span className="px-3 text-xs text-[#69736b]">%</span></div></label>
            <label className="border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm font-semibold">Wholesale margin<div className="mt-2 flex items-center border border-[#d8d4ca] bg-[#f4f1ea]"><input className="min-w-0 flex-1 bg-transparent px-3 py-3 font-normal outline-none" min="0" max="99" step="1" type="number" value={inputs.wholesaleMargin} onChange={(event) => updateField("wholesaleMargin", event.target.value)} /><span className="px-3 text-xs text-[#69736b]">%</span></div></label>
            <label className="border border-[#d8d4ca] bg-[#fffdf8] p-4 text-sm font-semibold">Sales tax<div className="mt-2 flex items-center border border-[#d8d4ca] bg-[#f4f1ea]"><input className="min-w-0 flex-1 bg-transparent px-3 py-3 font-normal outline-none" min="0" max="100" step="0.1" type="number" value={inputs.taxRate} onChange={(event) => updateField("taxRate", event.target.value)} /><span className="px-3 text-xs text-[#69736b]">%</span></div></label>
          </div>
        </section>

        <aside className="h-fit border border-[#1d2a24] bg-[#1d2a24] p-6 text-[#fffdf8] lg:sticky lg:top-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e6a083]">Pricing output</p>
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="border border-[#536259] p-4"><p className="text-xs text-[#b7c1ba]">Sellable units</p><p className="mt-2 text-2xl font-semibold">{results.units}</p></div><div className="border border-[#536259] p-4"><p className="text-xs text-[#b7c1ba]">Cost / unit</p><p className="mt-2 text-2xl font-semibold">{money(results.costPerUnit)}</p></div></div>
          <div className="mt-6 border-t border-[#536259] pt-5"><div className="flex justify-between py-2 text-sm text-[#b7c1ba]"><span>Wholesale price</span><strong className="text-[#fffdf8]">{money(results.wholesalePrice)}</strong></div><div className="flex justify-between py-2 text-sm text-[#b7c1ba]"><span>Retail price</span><strong className="text-[#e6a083]">{money(results.retailPrice)}</strong></div><div className="flex justify-between py-2 text-sm text-[#b7c1ba]"><span>Retail incl. tax</span><strong className="text-[#fffdf8]">{money(results.retailWithTax)}</strong></div></div>
          <div className="mt-6 border-t border-[#536259] pt-5 text-sm"><p className="text-xs uppercase tracking-[0.14em] text-[#b7c1ba]">Batch breakdown</p><div className="mt-3 space-y-2 text-[#b7c1ba]"><div className="flex justify-between"><span>Ingredients</span><span>{money(results.ingredientCost)}</span></div><div className="flex justify-between"><span>Labor + overhead</span><span>{money(inputs.laborCost + inputs.overheadCost + inputs.miscCost)}</span></div><div className="flex justify-between"><span>Packaging</span><span>{money(results.packagingCost)}</span></div><div className="flex justify-between border-t border-[#536259] pt-3 font-semibold text-[#fffdf8]"><span>Total batch cost</span><span>{money(results.totalCost)}</span></div></div></div>
          <p className="mt-6 text-xs leading-5 text-[#b7c1ba]">Formula: price = unit cost / (1 - target margin). This is margin, not markup.</p>
        </aside>
      </div>
    </main>
  );
}
