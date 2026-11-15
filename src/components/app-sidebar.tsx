"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { LocaleControls } from "@/components/locale-controls";
import { useLocale } from "@/lib/locale";
import { getCurrentUserRole, type StoreRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: [en: string, id: string];
  icon: ReactNode;
  /** Roles that can see the link. Omit for everyone, including signed-out visitors. */
  roles?: StoreRole[];
};

type NavGroup = { label: [en: string, id: string]; items: NavItem[] };

const MANAGERS: StoreRole[] = ["owner", "manager"];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

// To add a feature, add one entry here. `roles` mirrors the access rules in src/lib/supabase/proxy.ts.
const navGroups: NavGroup[] = [
  {
    label: ["Overview", "Ringkasan"],
    items: [
      { href: "/", label: ["Dashboard", "Dasbor"], icon: <Icon><rect height="7" rx="1.5" width="7" x="3" y="3" /><rect height="7" rx="1.5" width="7" x="14" y="3" /><rect height="7" rx="1.5" width="7" x="3" y="14" /><rect height="7" rx="1.5" width="7" x="14" y="14" /></Icon> },
      { href: "/analytics", label: ["Analytics", "Analitik"], icon: <Icon><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></Icon> },
    ],
  },
  {
    label: ["Sell", "Jual"],
    items: [
      { href: "/pos", label: ["Point of sale", "Kasir"], icon: <Icon><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" /><circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" /></Icon> },
      { href: "/sales", label: ["Sales", "Penjualan"], icon: <Icon><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></Icon> },
    ],
  },
  {
    label: ["Operate", "Operasional"],
    items: [
      { href: "/catalog", label: ["Catalog", "Katalog"], roles: MANAGERS, icon: <Icon><path d="M20.6 13.4 13.4 20.6a1.4 1.4 0 0 1-2 0L3 12.2V3h9.2l8.4 8.4a1.4 1.4 0 0 1 0 2z" /><circle cx="7.5" cy="7.5" r="1.2" /></Icon> },
      { href: "/inventory", label: ["Inventory", "Stok"], roles: MANAGERS, icon: <Icon><path d="m3 8 9-5 9 5v8l-9 5-9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></Icon> },
      { href: "/pricing", label: ["Pricing", "Harga"], roles: MANAGERS, icon: <Icon><rect height="18" rx="2.5" width="14" x="5" y="3" /><path d="M9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" /></Icon> },
      { href: "/production", label: ["Production", "Produksi"], roles: MANAGERS, icon: <Icon><path d="M10 3h4M11 3v5.5L5.6 18a2 2 0 0 0 1.8 3h9.2a2 2 0 0 0 1.8-3L13 8.500V3" /><path d="M8 15h8" /></Icon> },
    ],
  },
  {
    label: ["Admin", "Admin"],
    items: [
      { href: "/team", label: ["Team", "Tim"], roles: ["owner"], icon: <Icon><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.500a6 6 0 0 1 3 5.500" /></Icon> },
    ],
  },
];

const HIDDEN_ON = ["/login"];

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLocale();
  const [role, setRole] = useState<StoreRole | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  // The drawer remembers which page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const isOpen = openOn === pathname;
  const t = (label: [string, string]) => (language === "id" ? label[1] : label[0]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await createClient().auth.getUser();
        const currentRole = data.user ? await getCurrentUserRole() : null;
        if (!active) return;
        setSignedIn(Boolean(data.user));
        setRole(currentRole);
      } catch {
        // Missing Supabase config or no network: keep the signed-out menu.
      }
    };

    void load();
    let unsubscribe = () => {};
    try {
      const { data } = createClient().auth.onAuthStateChange(() => void load());
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // Same as above.
    }
    return () => { active = false; unsubscribe(); };
  }, []);

  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return <>{children}</>;

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const groups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || (role !== null && item.roles.includes(role))) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:pl-[17rem]">
      <div className="glass-bar sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:hidden">
        <Link className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#c75c3b]" href="/">Biznizer</Link>
        <button aria-controls="app-sidebar" aria-expanded={isOpen} aria-label={language === "id" ? "Buka menu" : "Open menu"} className="rounded-xl p-2 text-[#1e2a23] hover:bg-white/60" onClick={() => setOpenOn(isOpen ? null : pathname)} type="button">
          <Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
        </button>
      </div>

      {isOpen ? <button aria-label={language === "id" ? "Tutup menu" : "Close menu"} className="fixed inset-0 z-40 bg-[#1e2a23]/25 backdrop-blur-[2px] lg:hidden" onClick={() => setOpenOn(null)} type="button" /> : null}

      <aside className={`glass-sidebar fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[85vw] flex-col p-4 transition-[translate,visibility] duration-300 lg:visible lg:m-3 lg:translate-x-0 lg:rounded-[28px] ${isOpen ? "translate-x-0" : "invisible -translate-x-full"}`} id="app-sidebar">
        <div className="flex items-center gap-3 px-2 pb-5 pt-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e2a23] text-sm font-bold text-[#fffdf9] shadow-[0_6px_14px_rgba(30,42,35,0.25)]">B</span>
          <div>
            <p className="text-[15px] font-semibold leading-tight text-[#1e2a23]">Biznizer</p>
            <p className="text-xs text-[#5d665f]">{role ? <span className="capitalize">{role}</span> : language === "id" ? "Ruang kerja toko" : "Store workspace"}</p>
          </div>
        </div>

        <nav aria-label={language === "id" ? "Navigasi utama" : "Main navigation"} className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1">
          {groups.map((group) => (
            <div key={group.label[0]}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8178]">{t(group.label)}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const current = isCurrent(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link aria-current={current ? "page" : undefined} className={`sidebar-link ${current ? "sidebar-link-active" : ""}`} href={item.href}>
                        {item.icon}
                        {t(item.label)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-4 space-y-3 border-t border-[#1e2a23]/10 pt-4">
          <LocaleControls />
          {signedIn ? (
            <button className="sidebar-link w-full" onClick={() => void signOut()} type="button">
              <Icon><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></Icon>
              {language === "id" ? "Keluar" : "Sign out"}
            </button>
          ) : (
            <Link className="sidebar-link" href="/login">
              <Icon><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M14 16l4-4-4-4M18 12H8" /></Icon>
              {language === "id" ? "Masuk" : "Sign in"}
            </Link>
          )}
        </div>
      </aside>

      {children}
    </div>
  );
}
