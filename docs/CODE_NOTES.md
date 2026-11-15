# Biznizer code notes

A guide to what each file in this project does and how the pieces fit together. Read sections 1 to 3 first; after that, section 5 is a file-by-file reference you can dip into.

## 1. What the app is

Biznizer is a small business tool for a perfume shop: a point of sale (POS), a product catalog, stock tracking, sales reports, a pricing calculator and a production planner.

It is built with:

| Piece | What it is | Why it is here |
| --- | --- | --- |
| **Next.js** (App Router) | The web framework | Turns each folder in `src/app` into a page |
| **React** | The UI library | Every page is a React component |
| **TypeScript** | JavaScript with types | Catches mistakes before the code runs |
| **Tailwind CSS** | Styling through class names | `className="p-5 text-sm"` instead of separate CSS files |
| **Supabase** | Hosted database and login | Stores products, sales, stock and users |
| **Dexie** | A wrapper around the browser's own database (IndexedDB) | Lets the POS work offline, and holds demo data |
| **Zod** | Checks that data has the right shape | Used to validate the settings in `.env.local` |

## 2. The three layers

Almost every feature follows the same path:

```
Page (src/app/.../page.tsx)        what you see and click
        |
        v
Repository (src/lib/.../repository.ts)   one function per action, e.g. recordSale()
        |
        v
Supabase (the real database)  OR  demo store (this browser only)
```

- **Pages** never talk to the database directly. They call a repository function.
- **Repositories** are the only place that knows how data is stored. Each function starts with one line that decides where to go:

  ```ts
  if (isAuthDisabled()) return demoRecordSale(payload);   // demo mode
  // ...otherwise the real Supabase code runs
  ```

This is why the app can run with or without a database: the pages do not change, only the bottom layer does.

## 3. Demo mode (login switched off)

Set in `.env.local`:

```
NEXT_PUBLIC_AUTH_DISABLED=true
```

When this is `true`:

- No login screen. `/login` sends you to the dashboard.
- You are treated as an **owner**, so every page and sidebar link is available.
- All data lives in **this browser only** (IndexedDB). Nothing is sent to Supabase.
- The first visit copies in four sample perfumes so there is something to sell.
- To wipe the demo data: browser DevTools, Application tab, IndexedDB, delete the `biznizer` database (or clear site data).

To go back to real login and real data, set it to `false` or delete the line, then restart `npm run dev`.

Do not turn this on in a deployed site: anyone who opened it would be an "owner" (of their own empty demo data, not your real data, but the real app would be unusable).

Note: at the time of writing, the Supabase address in `.env.local` does not resolve (the project may be paused, deleted or mistyped). Until that is fixed, demo mode is the only way the app has data.

## 4. Ideas that appear all over the code

**Money is stored in US dollars.** Every price and cost in the code and database is a USD number. `useLocale()` gives three helpers for showing and typing it in the chosen currency:

- `formatMoney(usd)` turns a stored number into text like `$68.00` or `IDR 984,386`.
- `convertInput(usd)` gives the number to put inside an input box.
- `parseInput(text)` turns what the user typed back into USD.

**Roles.** A user is `owner`, `manager` or `staff`.

| Area | staff | manager | owner |
| --- | --- | --- | --- |
| Dashboard, Analytics, POS, Sales | yes | yes | yes |
| Catalog, Inventory, Pricing, Production | no | yes | yes |
| Team | no | no | yes |

The rule is enforced in three places: the database (Supabase policies), the server (`src/lib/supabase/proxy.ts`), and the sidebar (which just hides links you cannot use).

**`"use client"`** at the top of a file means the component runs in the browser, so it can use state, clicks and browser storage. Every page here is a client component.

**`useState` / `useEffect` / `useMemo`.**

- `useState` holds a value that changes (the cart, a form field). Changing it redraws the page.
- `useEffect` runs code after the page appears, usually to load data.
- `useMemo` remembers the result of a calculation until its inputs change.

**The `setTimeout(..., 0)` pattern in `useEffect`.** Many pages load data like this:

```ts
useEffect(() => {
  const task = window.setTimeout(() => void loadSales(), 0);
  return () => window.clearTimeout(task);
}, []);
```

It means "load right after the page is drawn, and cancel if the page is closed first". The delay keeps the project's lint rules happy about changing state inside an effect.

**`@/`** in an import means the `src` folder, so `@/lib/env` is `src/lib/env.ts`.

## 5. File by file

### Project root

| File | Use |
| --- | --- |
| `package.json` | Lists the libraries and the commands: `npm run dev` (start), `npm run build` (production build), `npm run lint` (check code style) |
| `.env.local` | Your private settings: Supabase address, key, store ID and the demo-mode switch. Not committed to git |
| `.env.example` | A template showing which settings exist, with no real values |
| `next.config.ts` | Next.js settings. Empty for now |
| `tsconfig.json` | TypeScript settings, including the `@/` shortcut |
| `eslint.config.mjs` | Lint rules |
| `postcss.config.mjs` | Lets Tailwind process the CSS |
| `AGENTS.md`, `CLAUDE.md` | Instructions for AI coding tools, not used by the app |
| `*.html` at the root | Standalone tools that open directly in a browser and are separate from the app: `vinoux_pricing_calculator_v2.html` (the original pricing calculator that `/pricing` was ported from), `perfume_production_planner.html`, `vinoux_style_sheet.html`, `variant_label_design_briefs.html` |
| `supabase/migrations/` | The SQL that builds the database. See section 6 |

### `src/app` — the pages

Each folder is a URL. `src/app/pos/page.tsx` is the page at `/pos`.

| File | URL | Use |
| --- | --- | --- |
| `layout.tsx` | every page | The outer shell. Loads fonts and global styles, and wraps every page in `LocaleProvider` (language and currency) and `AppShell` (the sidebar) |
| `globals.css` | every page | Colours, the page background, and the reusable "glass" classes (see below) |
| `page.tsx` | `/` | Dashboard: four stat cards, recent sales, quick links |
| `login/page.tsx` | `/login` | Sign in or create an account with Supabase |
| `pos/page.tsx` | `/pos` | The till. Pick products, choose a payment method, record the sale. If offline, the sale is queued and sent later |
| `catalog/page.tsx` | `/catalog` | Product list and the "add product" form |
| `inventory/page.tsx` | `/inventory` | Stock levels, low-stock warning, stock adjustments and their history |
| `sales/page.tsx` | `/sales` | Sales list with totals for today or the last 50 |
| `sales/[saleId]/page.tsx` | `/sales/<id>` | One receipt. `[saleId]` in the folder name means "any value here", read with `use(params)` |
| `analytics/page.tsx` | `/analytics` | Revenue for a chosen period, a seven-day bar chart, payment mix, top receipts |
| `pricing/page.tsx` | `/pricing` | Pricing calculator: cost per size, new-bottle and refill prices, bundles. Pure calculation, saves nothing |
| `production/page.tsx` | `/production` | Batch planner: how much oil, alcohol and packaging a batch needs and what it costs. Can save the batch |
| `team/page.tsx` | `/team` | Owners assign roles to users |

**Glass classes in `globals.css`** (use these instead of repeating styles):

| Class | Use |
| --- | --- |
| `surface` | The standard frosted card |
| `surface-dark` | The dark green summary card |
| `inset-panel` | A lighter box inside a card (tables, list rows) |
| `glass-bar`, `glass-sidebar` | The sticky page header and the sidebar |
| `segmented` | A group of toggle buttons; the pressed one has `aria-pressed="true"` |
| `field`, `input-field` | Input boxes |
| `pill` | Small status label |
| `primary-btn`, `secondary-btn`, `nav-link`, `sidebar-link` | Buttons and links |

### `src/components` — shared UI

| File | Use |
| --- | --- |
| `app-sidebar.tsx` | The sidebar and the phone menu. Exports `AppShell`. **To add a page to the menu, add one entry to the `navGroups` list.** Each entry can have `roles` to limit who sees it. Hidden on `/login` |
| `top-nav.tsx` | `AppNav`: the sticky header at the top of each page (title, subtitle, optional status on the right) |
| `locale-controls.tsx` | The EN/ID and $/Rp switches shown in the sidebar |

### `src/lib` — logic and data

**Settings and shared state**

| File | Use |
| --- | --- |
| `env.ts` | Reads `.env.local` and checks it. `getPublicEnv()` returns the Supabase settings, `getStoreId()` returns the store ID if it is a valid UUID, `isAuthDisabled()` says whether demo mode is on |
| `locale.tsx` | `LocaleProvider` and `useLocale()`. Holds the language and currency, fetches the live USD to IDR rate, remembers your choices in the browser, and provides `formatMoney`, `convertInput`, `parseInput` |

**Supabase connection**

| File | Use |
| --- | --- |
| `supabase/client.ts` | `createClient()` for code running in the browser |
| `supabase/server.ts` | `createClient()` for code running on the server (reads login cookies). Not used by any page yet |
| `supabase/auth.ts` | `getCurrentUserRole()`, `getTeamMembers()`, `setTeamMemberRole()` |
| `supabase/proxy.ts` | `updateSession()`: runs on the server before a page loads. Sends signed-out visitors to `/login` and blocks pages your role cannot use |
| `src/proxy.ts` | Tells Next.js to run `updateSession` and for which URLs (`matcher`). Today the list is only `/pos`, `/catalog` and `/login`, so the other pages are protected by the database rules and the page's own role check, not by this file. In this Next.js version the file is called `proxy`; older versions called it `middleware` |

**Features** — each has a repository (the functions pages call):

| File | Functions | Use |
| --- | --- | --- |
| `catalog/types.ts` | `CatalogProduct` | The shape of a product: id, name, category, price, stock, sku |
| `catalog/repository.ts` | `refreshCatalog`, `getCachedCatalog`, `getCatalogCategories`, `createCatalogProduct` | Load and add products. `refreshCatalog` also saves a copy in the browser so the POS works offline |
| `catalog/demo-products.ts` | `demoProducts` | Four sample perfumes |
| `sales/repository.ts` | `toSalePayload`, `recordSale` | Turn a cart into a sale (grouping repeated products into quantities) and save it |
| `sales/history.ts` | `getRecentSales`, `getSaleDetail` | Read past sales and one receipt |
| `inventory/repository.ts` | `getInventoryMovements`, `adjustInventory` | Stock history and manual stock changes |
| `production/calculator.ts` | `calculateProduction` | Pure maths: from bottle counts and costs to litres of liquid, packaging needed and total cost. No database |
| `production/repository.ts` | `getProductionBatches`, `createProductionBatch` | Load and save planned batches |
| `offline/database.ts` | `offlineDatabase` | The browser database (Dexie). Tables: `pendingSales` (sales waiting to sync), `catalogProducts` (offline copy of the catalog), and the `demo*` tables used by demo mode |
| `demo/store.ts` | `demoGetCatalog`, `demoRecordSale`, ... | The demo-mode version of every repository function. Mirrors what Supabase does: a sale lowers stock, an adjustment writes a movement, and so on |

## 6. The database (`supabase/migrations`)

Migrations are SQL files that run in date order to build the database.

| File | Adds |
| --- | --- |
| `20260911000100_initial_catalog.sql` | Tables: `organizations`, `stores`, `organization_members`, `categories`, `products`, `inventory`. Turns on row level security so users only see their own organization's data |
| `20260912000100_role_permissions.sql` | `store_member_role()` (returns your role) and policies: everyone in the store can read, only managers and owners can change products, categories and stock |
| `20260912000200_team_permissions.sql` | Only owners can change who is a member |
| `20260913000100_sales.sql` | Tables `sales` and `sale_items`, and `record_sale()`, which saves a sale and its items in one step |
| `20260915000100_production_batches.sql` | Table `production_batches` |
| `20260916000100_inventory_adjustments.sql` | Table `inventory_movements` and `adjust_inventory()`, which changes stock and logs why |

**Row level security (RLS)** means the database itself checks who is asking. Even if someone bypassed the app, they could not read another shop's data. It is also why the real database returns nothing unless you are signed in.

## 7. Following one action end to end: recording a sale

1. You click a product on `/pos`. `addToCart` adds it to the `cart` state.
2. You click **Record sale**. `startSale` in `src/app/pos/page.tsx` calls `toSalePayload` to build the sale, with a new random ID.
3. It calls `recordSale(payload)` in `src/lib/sales/repository.ts`.
4. `recordSale` checks `isAuthDisabled()`:
   - **Demo mode:** `demoRecordSale` lowers stock and saves the sale in the browser.
   - **Real mode:** it calls the database function `record_sale`.
5. If that fails or you are offline, the sale is stored in `pendingSales` and shows as "queued". When the connection returns, `syncPendingSales` sends it. Because the sale ID was created in step 2, sending it twice cannot create two sales.
6. The POS reloads the catalog so the stock numbers update.
7. `/sales` and `/analytics` read it back through `getRecentSales`.

## 8. How to do common things

- **Add a page:** create `src/app/<name>/page.tsx`, start it with `<AppNav title="..." />`, then add it to `navGroups` in `src/components/app-sidebar.tsx`. If it should be restricted, also add its path to `roleCanAccess` in `src/lib/supabase/proxy.ts`.
- **Add a new kind of data:** write a migration for the table, add a repository function in `src/lib`, add the matching function in `src/lib/demo/store.ts` (and a table in `src/lib/offline/database.ts`), then call the repository function from the page.
- **Show a price:** `const { formatMoney } = useLocale();` then `{formatMoney(product.price)}`.
- **Change a colour or the glass look:** edit `src/app/globals.css`.
- **Before committing:** run `npm run lint` and `npm run build`.
