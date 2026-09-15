## Biznizer

Biznizer is a multi-store business platform, starting with a point-of-sale workflow that works online and offline.

### Current stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Dexie for the browser offline catalog and pending-sale queue

### Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings -> API**, copy the project URL and publishable key into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SUPABASE_STORE_ID=
```

3. Open the Supabase **SQL Editor** and run [the catalog migration](supabase/migrations/20260911000100_initial_catalog.sql).
4. Create your first user in **Authentication -> Users** and copy that user's UUID.
5. Run this setup SQL in the SQL Editor, replacing `YOUR_AUTH_USER_UUID` first:

```sql
insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'My Business');

insert into public.organization_members (organization_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', 'YOUR_AUTH_USER_UUID', 'owner');

insert into public.stores (id, organization_id, name)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Main Store');

insert into public.categories (store_id, name)
values
  ('00000000-0000-0000-0000-000000000002', 'Signature'),
  ('00000000-0000-0000-0000-000000000002', 'Woody'),
  ('00000000-0000-0000-0000-000000000002', 'Fresh');
```

6. Set the store ID in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_STORE_ID=00000000-0000-0000-0000-000000000002
```

7. Restart the development server with `npm run dev` and open `/pos`.

Until a store ID and catalog rows exist, the POS intentionally uses its local demo catalog. This keeps the interface usable while Supabase is being configured.

### Authentication

The `/pos` and `/catalog` routes require a Supabase session. Visit `/login` and sign in with the user created in **Authentication -> Users**. Unauthenticated visitors are redirected to `/login` and returned to their original route after signing in.

### Test roles

1. Run [the team permissions migration](supabase/migrations/20260912000200_team_permissions.sql) in Supabase SQL Editor.
2. Open `/login` and choose **Create a new account** for a test user.
3. Confirm the email if Supabase email confirmation is enabled.
4. Copy the new user's UUID from **Authentication -> Users**.
5. Sign in as the owner and open `/team`.
6. Assign the test user `staff` or `manager`.
7. Sign out and sign in as the test user.
8. Open `/catalog`: staff see a read-only catalog; managers can add products.

### Sales and offline sync

Run [the sales migration](supabase/migrations/20260913000100_sales.sql) after the catalog, role, and team migrations. It creates sales, sale items, atomic inventory deduction, and the `record_sale` function.

The POS records sales directly when online. When offline, or when Supabase is temporarily unavailable, it stores the sale in IndexedDB and retries automatically when connectivity returns. You can also use **Sync now** beside the queued-sale count.

### Perfume pricing calculator

Open `/pricing` from the POS to calculate perfume pricing from batch volume, bottle size, fragrance concentration, material costs, packaging, labor, overhead, and target margins. It produces cost per unit, wholesale price, retail price, tax-inclusive price, and a batch cost breakdown. The calculator is currently a local planning tool; saved pricing formulas can be persisted to Supabase in the next pricing milestone.

### Production batches

Run [the production migration](supabase/migrations/20260915000100_production_batches.sql) after the existing migrations. Managers and owners can open `/production` to plan scent quantities, note-pyramid percentages, concentration, buffers, packaging, tools, materials, and costs, then save a production batch log.

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the workspace or [http://localhost:3000/pos](http://localhost:3000/pos) for the POS.

Before submitting changes, run:

```bash
npm run lint
npm run build
```
