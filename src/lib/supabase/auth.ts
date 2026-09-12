import { createClient } from "@/lib/supabase/client";
import { getStoreId } from "@/lib/env";

export type StoreRole = "owner" | "manager" | "staff";

export type TeamMember = {
  userId: string;
  role: StoreRole;
};

export async function getCurrentUserRole(): Promise<StoreRole | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const storeId = getStoreId();
  if (!storeId) return null;

  const { data: roleFromDatabase, error: roleError } = await supabase.rpc("store_member_role", {
    target_store_id: storeId,
  });
  if (!roleError && isStoreRole(roleFromDatabase)) return roleFromDatabase;

  const { data: store, error: storeError } = await supabase.from("stores").select("organization_id").eq("id", storeId).maybeSingle();
  if (storeError || !store) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", store.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) return null;
  return isStoreRole(membership.role) ? membership.role : null;
}

function isStoreRole(value: unknown): value is StoreRole {
  return value === "owner" || value === "manager" || value === "staff";
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const storeId = getStoreId();
  if (!user || !storeId) return [];

  const { data: store } = await supabase.from("stores").select("organization_id").eq("id", storeId).maybeSingle();
  if (!store) return [];

  const { data: members, error } = await supabase.from("organization_members").select("user_id, role").eq("organization_id", store.organization_id).order("created_at");
  if (error) throw error;
  return (members ?? []).filter((member) => isStoreRole(member.role)).map((member) => ({ userId: member.user_id, role: member.role }));
}

export async function setTeamMemberRole(userId: string, role: StoreRole) {
  const supabase = createClient();
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a store before managing team roles.");

  const { data: store, error: storeError } = await supabase.from("stores").select("organization_id").eq("id", storeId).single();
  if (storeError) throw storeError;

  const { error } = await supabase.from("organization_members").upsert({ organization_id: store.organization_id, user_id: userId, role }, { onConflict: "organization_id,user_id" });
  if (error) throw error;
}
