create or replace function public.store_member_role(target_store_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select om.role
  from public.organization_members om
  join public.stores s on s.organization_id = om.organization_id
  where s.id = target_store_id
    and om.user_id = auth.uid();
$$;

drop policy if exists "Members can manage store categories" on public.categories;
drop policy if exists "Members can manage store products" on public.products;
drop policy if exists "Members can manage store inventory" on public.inventory;

create policy "Members can view store categories"
  on public.categories for select
  using (public.store_belongs_to_member(store_id));

create policy "Managers can manage store categories"
  on public.categories for all
  using (public.store_member_role(store_id) in ('owner', 'manager'))
  with check (public.store_member_role(store_id) in ('owner', 'manager'));

create policy "Members can view store products"
  on public.products for select
  using (public.store_belongs_to_member(store_id));

create policy "Managers can manage store products"
  on public.products for all
  using (public.store_member_role(store_id) in ('owner', 'manager'))
  with check (public.store_member_role(store_id) in ('owner', 'manager'));

create policy "Members can view store inventory"
  on public.inventory for select
  using (public.store_belongs_to_member(store_id));

create policy "Managers can manage store inventory"
  on public.inventory for all
  using (public.store_member_role(store_id) in ('owner', 'manager'))
  with check (public.store_member_role(store_id) in ('owner', 'manager'));
