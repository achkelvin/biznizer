create or replace function public.is_organization_owner(target_organization_id uuid)
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
      and role = 'owner'
  );
$$;

create policy "Owners can manage organization members"
  on public.organization_members for all
  using (public.is_organization_owner(organization_id))
  with check (public.is_organization_owner(organization_id));
