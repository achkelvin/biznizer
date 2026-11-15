"use client";

import { useLocale } from "@/lib/locale";

export function LocaleControls() {
  const { language, currency, rate, rateStatus, setLanguage, setCurrency } = useLocale();

  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div aria-label={language === "id" ? "Bahasa" : "Language"} className="segmented grid grid-cols-2" role="group">
          {(["en", "id"] as const).map((option) => <button aria-pressed={language === option} className="px-2 py-1.5 font-semibold uppercase" key={option} onClick={() => setLanguage(option)} type="button">{option}</button>)}
        </div>
        <div aria-label={language === "id" ? "Mata uang" : "Currency"} className="segmented grid grid-cols-2" role="group">
          {(["USD", "IDR"] as const).map((option) => <button aria-pressed={currency === option} className="px-2 py-1.5 font-semibold" key={option} onClick={() => setCurrency(option)} type="button">{option === "USD" ? "$" : "Rp"}</button>)}
        </div>
      </div>
      <p className="px-1 text-[11px] text-[#8a7f74]">1 USD = {Math.round(rate).toLocaleString("id-ID")} IDR · {rateStatus === "live" ? "live" : "cached"}</p>
    </div>
  );
}
