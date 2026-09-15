create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  inputs jsonb not null,
  materials jsonb not null,
  costs jsonb not null,
  total_units integer not null check (total_units >= 0),
  total_cost numeric(12, 2) not null check (total_cost >= 0),
  created_at timestamptz not null default now()
);

create index production_batches_store_created_idx on public.production_batches(store_id, created_at desc);

alter table public.production_batches enable row level security;

create policy "Members can view production batches"
  on public.production_batches for select
  using (public.store_belongs_to_member(store_id));

create policy "Managers can manage production batches"
  on public.production_batches for all
  using (public.store_member_role(store_id) in ('owner', 'manager'))
  with check (public.store_member_role(store_id) in ('owner', 'manager'));
