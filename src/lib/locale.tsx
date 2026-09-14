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
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("biznizer-language");
    return saved === "id" ? "id" : "en";
  });
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window === "undefined") return "USD";
    return window.localStorage.getItem("biznizer-currency") === "IDR" ? "IDR" : "USD";
  });
  const [rate, setRate] = useState(() => {
    if (typeof window === "undefined") return fallbackRate;
    const saved = Number(window.localStorage.getItem("biznizer-usd-idr-rate"));
    return saved > 0 ? saved : fallbackRate;
  });
  const [rateStatus, setRateStatus] = useState<LocaleContextValue["rateStatus"]>(() => {
    if (typeof window === "undefined") return "loading";
    return Number(window.localStorage.getItem("biznizer-usd-idr-rate")) > 0 ? "cached" : "loading";
  });

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

  useEffect(() => {
    window.localStorage.setItem("biznizer-language", language);
    document.documentElement.lang = language === "id" ? "id" : "en";
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem("biznizer-currency", currency);
  }, [currency]);

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
