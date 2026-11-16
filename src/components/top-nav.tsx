import type { ReactNode } from "react";

type AppNavProps = {
  title: string;
  subtitle?: string;
  /** Page-specific actions or status. Navigation and sign out live in the sidebar. */
  right?: ReactNode;
};

export function AppNav({ title, subtitle, right }: AppNavProps) {
  return (
    <header className="glass-bar sticky top-14 z-20 px-5 py-4 sm:px-8 lg:top-0 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p> : null}
        </div>
        {right ? <div className="flex flex-wrap items-center gap-2 text-sm">{right}</div> : null}
      </div>
    </header>
  );
}
