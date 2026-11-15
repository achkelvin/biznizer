"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "id";
export type Currency = "USD" | "IDR";

type LocaleContextValue = {
  language: Language;
  currency: Currency;
  rate: number;
  rateStatus: "loading" | "live" | "cached";
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  formatMoney: (usdValue: number) => string;
  convertInput: (value: number) => number;
  parseInput: (value: string) => number;
};

const fallbackRate = 16500;
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Start from fixed defaults so the server HTML and the first browser render match, then
  // load this browser's saved choices right after mount. Reading localStorage during the
  // first render instead makes React report a hydration mismatch on every page.
  const [language, setLanguage] = useState<Language>("en");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [rate, setRate] = useState(fallbackRate);
  const [rateStatus, setRateStatus] = useState<LocaleContextValue["rateStatus"]>("loading");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const task = window.setTimeout(() => {
      if (window.localStorage.getItem("biznizer-language") === "id") setLanguage("id");
      if (window.localStorage.getItem("biznizer-currency") === "IDR") setCurrency("IDR");
      const savedRate = Number(window.localStorage.getItem("biznizer-usd-idr-rate"));
      if (savedRate > 0) {
        // Keep a live rate if the request below already answered.
        setRate((current) => (current === fallbackRate ? savedRate : current));
        setRateStatus((current) => (current === "loading" ? "cached" : current));
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    const loadRate = async () => {
      try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        if (!response.ok) throw new Error("Exchange rate request failed");
        const data = await response.json() as { rates?: { IDR?: number } };
        if (!data.rates?.IDR) throw new Error("IDR rate unavailable");
        setRate(data.rates.IDR);
        setRateStatus("live");
        window.localStorage.setItem("biznizer-usd-idr-rate", String(data.rates.IDR));
      } catch {
        setRateStatus((current) => current === "cached" ? current : "cached");
      }
    };

    void loadRate();
  }, []);

  // Save choices only after the saved ones are loaded, or the defaults would overwrite them.
  useEffect(() => {
    if (!restored) return;
    window.localStorage.setItem("biznizer-language", language);
    document.documentElement.lang = language === "id" ? "id" : "en";
  }, [language, restored]);

  useEffect(() => {
    if (!restored) return;
    window.localStorage.setItem("biznizer-currency", currency);
  }, [currency, restored]);

  const value = useMemo<LocaleContextValue>(() => ({
    language,
    currency,
    rate,
    rateStatus,
    setLanguage,
    setCurrency,
    formatMoney: (usdValue) => new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "IDR" ? 0 : 2,
    }).format(currency === "IDR" ? usdValue * rate : usdValue),
    convertInput: (usdValue) => currency === "IDR" ? usdValue * rate : usdValue,
    parseInput: (value) => {
      const parsed = Number(value) || 0;
      return currency === "IDR" ? parsed / rate : parsed;
    },
  }), [currency, language, rate, rateStatus]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
