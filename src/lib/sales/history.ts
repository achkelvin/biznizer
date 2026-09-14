import { getStoreId } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type SaleRecord = {
  id: string;
  total: number;
  paymentMethod: "cash" | "card" | "other";
  createdAt: string;
};

export type SaleDetail = SaleRecord & {
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
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

export async function getSaleDetail(saleId: string): Promise<SaleDetail | null> {
  const storeId = getStoreId();
  if (!storeId) return null;

  const supabase = createClient();
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id, total, payment_method, created_at")
    .eq("store_id", storeId)
    .eq("id", saleId)
    .maybeSingle();

  if (saleError) throw saleError;
  if (!sale) return null;

  const { data: itemRows, error: itemsError } = await supabase
    .from("sale_items")
    .select("product_id, quantity, unit_price")
    .eq("sale_id", saleId);

  if (itemsError) throw itemsError;

  const productIds = (itemRows ?? []).map((item) => item.product_id);
  const { data: products, error: productsError } = productIds.length
    ? await supabase.from("products").select("id, name").in("id", productIds)
    : { data: [], error: null };

  if (productsError) throw productsError;

  const productNames = new Map((products ?? []).map((product) => [product.id, product.name]));
  const typedSale = sale as SaleRow;

  return {
    id: typedSale.id,
    total: Number(typedSale.total),
    paymentMethod: typedSale.payment_method,
    createdAt: typedSale.created_at,
    items: (itemRows ?? []).map((item) => ({
      productId: item.product_id,
      productName: productNames.get(item.product_id) ?? "Deleted product",
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
    })),
  };
}
