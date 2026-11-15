import { demoProducts } from "@/lib/catalog/demo-products";
import type { CatalogProduct } from "@/lib/catalog/types";
import { demoCreateCategory, demoCreateProduct, demoDeleteCategory, demoDeleteProduct, demoGetCatalog, demoGetCategories, demoRenameCategory, demoUpdateProduct } from "@/lib/demo/store";
import { getStoreId, isAuthDisabled } from "@/lib/env";
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

export type CatalogCategory = CategoryRow;

/** The fields the edit form can change. Stock is changed on the Inventory page so every change is logged. */
export type CatalogProductChanges = {
  name: string;
  sku: string;
  price: number;
  categoryId: string | null;
};

export type NewCatalogProduct = {
  name: string;
  sku: string;
  price: number;
  categoryId: string | null;
  stock: number;
};

export async function getCachedCatalog() {
  if (isAuthDisabled()) return demoGetCatalog();
  const cachedProducts = await offlineDatabase.catalogProducts.toArray();
  return cachedProducts.length > 0 ? cachedProducts : demoProducts;
}

export async function refreshCatalog(): Promise<CatalogProduct[]> {
  if (isAuthDisabled()) return demoGetCatalog();
  const storeId = getStoreId();
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
    categoryId: product.category_id,
    category: product.category_id ? categoryNames.get(product.category_id) ?? "Uncategorized" : "Uncategorized",
    price: Number(product.price),
    stock: inventoryByProduct.get(product.id) ?? 0,
    sku: product.sku,
  }));

  await offlineDatabase.catalogProducts.clear();
  await offlineDatabase.catalogProducts.bulkPut(catalog);
  return catalog;
}

export async function getCatalogCategories() {
  if (isAuthDisabled()) return demoGetCategories();
  const storeId = getStoreId();
  if (!storeId) return [];

  const supabase = createClient();
  const { data, error } = await supabase.from("categories").select("id, name").eq("store_id", storeId).order("name");
  if (error) throw error;
  return data as CatalogCategory[];
}

export async function createCatalogProduct(product: NewCatalogProduct) {
  if (isAuthDisabled()) return demoCreateProduct(product);
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a Supabase store before adding products.");

  const supabase = createClient();
  const { data: productRow, error: productError } = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      category_id: product.categoryId,
      name: product.name,
      sku: product.sku,
      price: product.price,
    })
    .select("id")
    .single();

  if (productError) throw productError;

  const { error: inventoryError } = await supabase.from("inventory").insert({
    store_id: storeId,
    product_id: productRow.id,
    quantity: product.stock,
  });

  if (inventoryError) throw inventoryError;
}

export async function updateCatalogProduct(productId: string, changes: CatalogProductChanges) {
  if (isAuthDisabled()) return demoUpdateProduct(productId, changes);
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a Supabase store before editing products.");

  const { error } = await createClient()
    .from("products")
    .update({ name: changes.name, sku: changes.sku, price: changes.price, category_id: changes.categoryId, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("id", productId);
  if (error) throw error;
}

/**
 * Removes a product from the catalog and the POS. In Supabase the row is archived
 * (active = false) rather than deleted, because past sales still point at it.
 */
export async function deleteCatalogProduct(productId: string) {
  if (isAuthDisabled()) return demoDeleteProduct(productId);
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a Supabase store before deleting products.");

  const { error } = await createClient().from("products").update({ active: false, updated_at: new Date().toISOString() }).eq("store_id", storeId).eq("id", productId);
  if (error) throw error;
}

export async function createCatalogCategory(name: string) {
  if (isAuthDisabled()) return demoCreateCategory(name);
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a Supabase store before adding categories.");

  const { error } = await createClient().from("categories").insert({ store_id: storeId, name });
  if (error) throw error;
}

export async function renameCatalogCategory(categoryId: string, name: string) {
  if (isAuthDisabled()) return demoRenameCategory(categoryId, name);
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a Supabase store before editing categories.");

  const { error } = await createClient().from("categories").update({ name }).eq("store_id", storeId).eq("id", categoryId);
  if (error) throw error;
}

/** Deletes a category. Its products are kept and become uncategorized. */
export async function deleteCatalogCategory(categoryId: string) {
  if (isAuthDisabled()) return demoDeleteCategory(categoryId);
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a Supabase store before deleting categories.");

  const { error } = await createClient().from("categories").delete().eq("store_id", storeId).eq("id", categoryId);
  if (error) throw error;
}
