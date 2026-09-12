create table public.sales (
  id uuid primary key,
  store_id uuid not null references public.stores(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  total numeric(12, 2) not null check (total >= 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'other')),
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0)
);

create index sales_store_created_idx on public.sales(store_id, created_at desc);
create index sale_items_sale_idx on public.sale_items(sale_id);

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

create policy "Members can view store sales"
  on public.sales for select
  using (public.store_belongs_to_member(store_id));

create policy "Members can view sale items"
  on public.sale_items for select
  using (exists (
    select 1 from public.sales
    where sales.id = sale_items.sale_id
      and public.store_belongs_to_member(sales.store_id)
  ));

create or replace function public.record_sale(
  target_sale_id uuid,
  target_store_id uuid,
  target_total numeric,
  target_payment_method text,
  target_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_item jsonb;
  requested_quantity integer;
  updated_rows integer;
begin
  if not public.store_belongs_to_member(target_store_id) then
    raise exception 'You are not a member of this store';
  end if;

  if exists (select 1 from public.sales where id = target_sale_id) then
    return;
  end if;

  insert into public.sales (id, store_id, user_id, total, payment_method)
  values (target_sale_id, target_store_id, auth.uid(), target_total, target_payment_method);

  for sale_item in select * from jsonb_array_elements(target_items)
  loop
    requested_quantity := (sale_item->>'quantity')::integer;

    update public.inventory
    set quantity = quantity - requested_quantity,
        updated_at = now()
    where store_id = target_store_id
      and product_id = (sale_item->>'product_id')::uuid
      and quantity >= requested_quantity;

    get diagnostics updated_rows = row_count;
    if updated_rows = 0 then
      raise exception 'Insufficient inventory for product %', sale_item->>'product_id';
    end if;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price)
    values (
      target_sale_id,
      (sale_item->>'product_id')::uuid,
      requested_quantity,
      (sale_item->>'unit_price')::numeric
    );
  end loop;
end;
$$;
