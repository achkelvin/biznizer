import { demoProducts } from "@/lib/catalog/demo-products";
import type { CatalogProduct } from "@/lib/catalog/types";
import { getPublicEnv } from "@/lib/env";
import { offlineDatabase } from "@/lib/offline/database";
import { createClient } from "@/lib/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  price: number | string;
  sku: string;
  category_id: string | null;
};

type InventoryRow = {
  product_id: string;
  quantity: number;
};

type CategoryRow = {
  id: string;
  name: string;
};

export async function getCachedCatalog() {
  const cachedProducts = await offlineDatabase.catalogProducts.toArray();
  return cachedProducts.length > 0 ? cachedProducts : demoProducts;
}

export async function refreshCatalog(): Promise<CatalogProduct[]> {
  const { NEXT_PUBLIC_SUPABASE_STORE_ID: storeId } = getPublicEnv();
  if (!storeId) return getCachedCatalog();

  const supabase = createClient();
  const [{ data: productRows, error: productsError }, { data: inventoryRows, error: inventoryError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
    supabase.from("products").select("id, name, price, sku, category_id").eq("store_id", storeId).eq("active", true).order("name"),
    supabase.from("inventory").select("product_id, quantity").eq("store_id", storeId),
    supabase.from("categories").select("id, name").eq("store_id", storeId),
  ]);

  if (productsError) throw productsError;
  if (inventoryError) throw inventoryError;
  if (categoriesError) throw categoriesError;

  const inventoryByProduct = new Map((inventoryRows as InventoryRow[]).map((row) => [row.product_id, row.quantity]));
  const categoryNames = new Map((categoryRows as CategoryRow[]).map((row) => [row.id, row.name]));
  const catalog = (productRows as ProductRow[]).map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category_id ? categoryNames.get(product.category_id) ?? "Uncategorized" : "Uncategorized",
    price: Number(product.price),
    stock: inventoryByProduct.get(product.id) ?? 0,
    sku: product.sku,
  }));

  await offlineDatabase.catalogProducts.clear();
  await offlineDatabase.catalogProducts.bulkPut(catalog);
  return catalog;
}