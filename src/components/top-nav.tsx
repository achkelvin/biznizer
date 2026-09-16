import type { ReactNode } from "react";

import { LocaleControls } from "@/components/locale-controls";

type AppNavProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showLocale?: boolean;
};

export function AppNav({ title, subtitle, right, showLocale = true }: AppNavProps) {
  return (
    <header className="border-b border-[#e6ddd0] bg-[#fffdf9] px-6 py-5 shadow-[0_6px_18px_rgba(30,42,35,0.02)] sm:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#c75c3b]">Biznizer</p>
          <h1 className="mt-1 text-xl font-semibold text-[#1e2a23]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[#5d665f]">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-2 text-sm sm:gap-3">
          {showLocale ? <LocaleControls /> : null}
          {right}
        </div>
      </div>
    </header>
  );
}
