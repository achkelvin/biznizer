import { demoGetRecentSales, demoGetSaleDetail, demoGetSalesInRange } from "@/lib/demo/store";
import { getStoreId, isAuthDisabled } from "@/lib/env";
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
  if (isAuthDisabled()) return demoGetRecentSales();
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
  if (isAuthDisabled()) return demoGetSaleDetail(saleId);
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

const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request.
const ID_CHUNK = 200; // Keeps the "these sale ids" filter short enough for a URL.

/**
 * Every sale from `from` up to (not including) `to`, each with its items. Used by reports,
 * which need the whole period rather than the latest 50 that getRecentSales returns.
 */
export async function getSalesInRange(from: Date, to: Date): Promise<SaleDetail[]> {
  if (isAuthDisabled()) return demoGetSalesInRange(from, to);
  const storeId = getStoreId();
  if (!storeId) return [];

  const supabase = createClient();
  const sales: SaleRow[] = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from("sales")
      .select("id, total, payment_method, created_at")
      .eq("store_id", storeId)
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    sales.push(...(data as SaleRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  const items: Array<{ sale_id: string; product_id: string; quantity: number; unit_price: number | string }> = [];
  for (let start = 0; start < sales.length; start += ID_CHUNK) {
    const saleIds = sales.slice(start, start + ID_CHUNK).map((sale) => sale.id);
    for (let page = 0; ; page += 1) {
      const { data, error } = await supabase
        .from("sale_items")
        .select("sale_id, product_id, quantity, unit_price")
        .in("sale_id", saleIds)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      items.push(...data);
      if (data.length < PAGE_SIZE) break;
    }
  }

  const productIds = Array.from(new Set(items.map((item) => item.product_id)));
  const productNames = new Map<string, string>();
  for (let start = 0; start < productIds.length; start += ID_CHUNK) {
    const { data, error } = await supabase.from("products").select("id, name").in("id", productIds.slice(start, start + ID_CHUNK));
    if (error) throw error;
    data.forEach((product) => productNames.set(product.id, product.name));
  }

  const itemsBySale = new Map<string, SaleDetail["items"]>();
  for (const item of items) {
    const list = itemsBySale.get(item.sale_id) ?? [];
    list.push({ productId: item.product_id, productName: productNames.get(item.product_id) ?? "Deleted product", quantity: item.quantity, unitPrice: Number(item.unit_price) });
    itemsBySale.set(item.sale_id, list);
  }

  return sales.map((sale) => ({ id: sale.id, total: Number(sale.total), paymentMethod: sale.payment_method, createdAt: sale.created_at, items: itemsBySale.get(sale.id) ?? [] }));
}
