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
