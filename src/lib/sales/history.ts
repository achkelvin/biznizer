import { getStoreId } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type SaleRecord = {
  id: string;
  total: number;
  paymentMethod: "cash" | "card" | "other";
  createdAt: string;
};

type SaleRow = {
  id: string;
  total: number | string;
  payment_method: "cash" | "card" | "other";
  created_at: string;
};

export async function getRecentSales(): Promise<SaleRecord[]> {
  const storeId = getStoreId();
  if (!storeId) return [];

  const { data, error } = await createClient()
    .from("sales")
    .select("id, total, payment_method, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data as SaleRow[]).map((sale) => ({
    id: sale.id,
    total: Number(sale.total),
    paymentMethod: sale.payment_method,
    createdAt: sale.created_at,
  }));
}
