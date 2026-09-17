"use client";

import { useLocale } from "@/lib/locale";

export function LocaleControls() {
  const { language, currency, rate, rateStatus, setLanguage, setCurrency } = useLocale();

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex border border-[#d8d4ca] bg-[#fffdf8] p-1">
        {(["en", "id"] as const).map((option) => <button className={`px-2 py-1 font-semibold uppercase ${language === option ? "bg-[#1d2a24] text-[#fffdf8]" : "text-[#69736b]"}`} key={option} onClick={() => setLanguage(option)} type="button">{option}</button>)}
      </div>
      <div className="flex border border-[#d8d4ca] bg-[#fffdf8] p-1">
        {(["USD", "IDR"] as const).map((option) => <button className={`px-2 py-1 font-semibold ${currency === option ? "bg-[#a8763e] text-[#fffdf8]" : "text-[#69736b]"}`} key={option} onClick={() => setCurrency(option)} type="button">{option === "USD" ? "$" : "Rp"}</button>)}
      </div>
      <span className="hidden text-[#8a7f74] sm:inline">1 USD = {rate.toLocaleString("id-ID")} IDR {rateStatus === "live" ? "· live" : "· cached"}</span>
    </div>
  );
}
