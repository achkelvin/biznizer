create extension if not exists "pgcrypto";

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (store_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  sku text not null,
  barcode text,
  price numeric(12, 2) not null check (price >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, sku),
  unique (store_id, barcode)
);

create table public.inventory (
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (store_id, product_id)
);

create index products_store_active_idx on public.products(store_id, active);
create index inventory_product_idx on public.inventory(product_id);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.store_belongs_to_member(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store_id
      and public.is_organization_member(s.organization_id)
  );
$$;

alter table public.organizations enable row level security;
alter table public.stores enable row level security;
alter table public.organization_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;

create policy "Members can view their organizations"
  on public.organizations for select
  using (public.is_organization_member(id));

create policy "Members can view their stores"
  on public.stores for select
  using (public.is_organization_member(organization_id));

create policy "Members can view organization memberships"
  on public.organization_members for select
  using (public.is_organization_member(organization_id));

create policy "Members can manage store categories"
  on public.categories for all
  using (public.store_belongs_to_member(store_id))
  with check (public.store_belongs_to_member(store_id));

create policy "Members can manage store products"
  on public.products for all
  using (public.store_belongs_to_member(store_id))
  with check (public.store_belongs_to_member(store_id));

create policy "Members can manage store inventory"
  on public.inventory for all
  using (public.store_belongs_to_member(store_id))
  with check (public.store_belongs_to_member(store_id));
