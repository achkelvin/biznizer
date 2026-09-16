import { getStoreId } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type InventoryMovement = {
  id: string;
  productId: string;
  productName: string;
  quantityDelta: number;
  reason: string;
  reference: string | null;
  createdAt: string;
};

export async function getInventoryMovements(): Promise<InventoryMovement[]> {
  const storeId = getStoreId();
  if (!storeId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("id, product_id, quantity_delta, reason, reference, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const productIds = Array.from(new Set((data ?? []).map((row) => row.product_id)));
  const { data: productRows, error: productError } = productIds.length > 0
    ? await supabase.from("products").select("id, name").in("id", productIds)
    : { data: [], error: null };

  if (productError) throw productError;

  const productNames = new Map((productRows ?? []).map((product) => [product.id, product.name]));

  return (data ?? []).map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: productNames.get(row.product_id) ?? "Product",
    quantityDelta: row.quantity_delta,
    reason: row.reason,
    reference: row.reference,
    createdAt: row.created_at,
  }));
}

export async function adjustInventory(productId: string, quantityDelta: number, reason: string, reference?: string) {
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a valid store before adjusting inventory.");

  const { error } = await createClient().rpc("adjust_inventory", {
    target_store_id: storeId,
    target_product_id: productId,
    target_quantity_delta: quantityDelta,
    target_reason: reason,
    target_reference: reference ?? null,
  });

  if (error) throw error;
}
