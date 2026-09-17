create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null default 'manual_adjustment',
  reference text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index inventory_movements_store_created_idx
  on public.inventory_movements(store_id, created_at desc);

create index inventory_movements_product_idx
  on public.inventory_movements(product_id, created_at desc);

alter table public.inventory_movements enable row level security;

create policy "Members can view inventory movements"
  on public.inventory_movements for select
  using (public.store_belongs_to_member(store_id));

create policy "Managers can manage inventory movements"
  on public.inventory_movements for all
  using (public.store_member_role(store_id) in ('owner', 'manager'))
  with check (public.store_member_role(store_id) in ('owner', 'manager'));

create or replace function public.adjust_inventory(
  target_store_id uuid,
  target_product_id uuid,
  target_quantity_delta integer,
  target_reason text,
  target_reference text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_quantity integer;
begin
  if not public.store_belongs_to_member(target_store_id) then
    raise exception 'You are not a member of this store';
  end if;

  if target_quantity_delta = 0 then
    raise exception 'Adjustment quantity must not be zero';
  end if;

  select quantity
  into current_quantity
  from public.inventory
  where store_id = target_store_id
    and product_id = target_product_id;

  if current_quantity is null then
    raise exception 'Inventory row not found for this product';
  end if;

  if current_quantity + target_quantity_delta < 0 then
    raise exception 'Adjustment would result in negative stock';
  end if;

  update public.inventory
  set quantity = quantity + target_quantity_delta,
      updated_at = now()
  where store_id = target_store_id
    and product_id = target_product_id;

  insert into public.inventory_movements (
    store_id,
    product_id,
    quantity_delta,
    reason,
    reference,
    created_by
  )
  values (
    target_store_id,
    target_product_id,
    target_quantity_delta,
    target_reason,
    target_reference,
    auth.uid()
  );
end;
$$;
