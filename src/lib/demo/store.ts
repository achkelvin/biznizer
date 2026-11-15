// Demo store: a stand-in for Supabase that keeps everything in this browser (IndexedDB).
//
// It is used only when NEXT_PUBLIC_AUTH_DISABLED=true (see isAuthDisabled in src/lib/env.ts).
// Each repository checks that flag first and calls the matching function here instead of
// Supabase, so every feature can be tried with no login and no database. Nothing written
// here ever reaches Supabase, and clearing the browser's site data resets it.

import { demoProducts } from "@/lib/catalog/demo-products";
import type { CatalogCategory, CatalogProductChanges, NewCatalogProduct } from "@/lib/catalog/repository";
import type { CatalogProduct } from "@/lib/catalog/types";
import type { InventoryMovement } from "@/lib/inventory/repository";
import { offlineDatabase } from "@/lib/offline/database";
import type { ProductionInputs, ProductionResults } from "@/lib/production/calculator";
import type { ProductionBatch } from "@/lib/production/repository";
import type { SaleDetail, SaleRecord } from "@/lib/sales/history";
import type { SalePayload } from "@/lib/sales/repository";
import type { StoreRole, TeamMember } from "@/lib/supabase/auth";

export const DEMO_ROLE: StoreRole = "owner";
const DEMO_USER_ID = "demo-owner";
const DEMO_CATEGORIES = ["Signature", "Woody", "Fresh", "Everyday"];

const db = offlineDatabase;

/** First visit: copy the sample products in so there is something to sell. */
async function seedProducts() {
  if ((await db.demoProducts.count()) === 0) await db.demoProducts.bulkPut(demoProducts);
}

// ---------- Catalog ----------

/** First visit: create the sample categories. Their id is their name, which is what the sample products point at. */
async function seedCategories() {
  if ((await db.demoCategories.count()) === 0) await db.demoCategories.bulkPut(DEMO_CATEGORIES.map((name) => ({ id: name, name })));
}

export async function demoGetCategories(): Promise<CatalogCategory[]> {
  await seedCategories();
  const categories = await db.demoCategories.toArray();
  return categories.sort((left, right) => left.name.localeCompare(right.name));
}

export async function demoGetCatalog(): Promise<CatalogProduct[]> {
  await seedProducts();
  const [products, categories] = await Promise.all([db.demoProducts.toArray(), demoGetCategories()]);
  return products
    .map((product) => {
      // Sample products were stored with only a category name; newer ones carry categoryId.
      const category = categories.find((row) => row.id === (product.categoryId === undefined ? product.category : product.categoryId));
      return { ...product, categoryId: category?.id ?? null, category: category?.name ?? "Uncategorized" };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function assertSkuFree(sku: string, exceptProductId?: string) {
  const clash = await db.demoProducts.where("sku").equals(sku).first();
  if (clash && clash.id !== exceptProductId) throw new Error(`SKU ${sku} is already in use.`);
}

export async function demoCreateProduct(product: NewCatalogProduct) {
  await seedProducts();
  await assertSkuFree(product.sku);
  await db.demoProducts.put({ id: crypto.randomUUID(), name: product.name, sku: product.sku, price: product.price, stock: product.stock, categoryId: product.categoryId, category: "" });
}

export async function demoUpdateProduct(productId: string, changes: CatalogProductChanges) {
  await assertSkuFree(changes.sku, productId);
  const updated = await db.demoProducts.update(productId, { name: changes.name, sku: changes.sku, price: changes.price, categoryId: changes.categoryId });
  if (!updated) throw new Error("Product not found.");
}

/** Past sales keep their own copy of the product name, so receipts still read correctly. */
export async function demoDeleteProduct(productId: string) {
  await db.demoProducts.delete(productId);
}

async function assertCategoryNameFree(name: string, exceptCategoryId?: string) {
  const categories = await demoGetCategories();
  if (categories.some((row) => row.id !== exceptCategoryId && row.name.toLowerCase() === name.toLowerCase())) throw new Error(`A category named ${name} already exists.`);
}

export async function demoCreateCategory(name: string) {
  await assertCategoryNameFree(name);
  await db.demoCategories.put({ id: crypto.randomUUID(), name });
}

export async function demoRenameCategory(categoryId: string, name: string) {
  await assertCategoryNameFree(name, categoryId);
  const updated = await db.demoCategories.update(categoryId, { name });
  if (!updated) throw new Error("Category not found.");
}

/** Products in the deleted category are kept and show as Uncategorized. */
export async function demoDeleteCategory(categoryId: string) {
  await db.demoCategories.delete(categoryId);
}

// ---------- Sales ----------

export async function demoRecordSale(payload: SalePayload) {
  await db.transaction("rw", db.demoProducts, db.demoSales, async () => {
    if (await db.demoSales.get(payload.saleId)) return; // Already recorded, e.g. a retried sync.

    const items: SaleDetail["items"] = [];
    for (const line of payload.items) {
      const product = await db.demoProducts.get(line.productId);
      if (!product) throw new Error("A product in this sale no longer exists.");
      if (product.stock < line.quantity) throw new Error(`Not enough stock for ${product.name}.`);
      await db.demoProducts.update(product.id, { stock: product.stock - line.quantity });
      items.push({ productId: product.id, productName: product.name, quantity: line.quantity, unitPrice: line.unitPrice });
    }

    await db.demoSales.put({ id: payload.saleId, total: payload.total, paymentMethod: payload.paymentMethod, createdAt: new Date().toISOString(), items });
  });
}

export async function demoGetRecentSales(): Promise<SaleRecord[]> {
  const sales = await db.demoSales.orderBy("createdAt").reverse().limit(50).toArray();
  return sales.map(({ id, total, paymentMethod, createdAt }) => ({ id, total, paymentMethod, createdAt }));
}

export async function demoGetSaleDetail(saleId: string): Promise<SaleDetail | null> {
  return (await db.demoSales.get(saleId)) ?? null;
}

export async function demoGetSalesInRange(from: Date, to: Date): Promise<SaleDetail[]> {
  // ISO timestamps sort in time order, so a text range on createdAt is a date range.
  return db.demoSales.where("createdAt").between(from.toISOString(), to.toISOString(), true, false).reverse().toArray();
}

// ---------- Inventory ----------

export async function demoGetInventoryMovements(): Promise<InventoryMovement[]> {
  return db.demoMovements.orderBy("createdAt").reverse().limit(50).toArray();
}

export async function demoAdjustInventory(productId: string, quantityDelta: number, reason: string, reference?: string) {
  await db.transaction("rw", db.demoProducts, db.demoMovements, async () => {
    const product = await db.demoProducts.get(productId);
    if (!product) throw new Error("Product not found.");
    if (!Number.isInteger(quantityDelta) || quantityDelta === 0) throw new Error("Enter a whole number other than zero.");
    if (product.stock + quantityDelta < 0) throw new Error(`${product.name} only has ${product.stock} in stock.`);

    await db.demoProducts.update(productId, { stock: product.stock + quantityDelta });
    await db.demoMovements.put({ id: crypto.randomUUID(), productId, productName: product.name, quantityDelta, reason, reference: reference ?? null, createdAt: new Date().toISOString() });
  });
}

// ---------- Production ----------

export async function demoGetProductionBatches(): Promise<ProductionBatch[]> {
  return db.demoBatches.orderBy("createdAt").reverse().limit(50).toArray();
}

export async function demoCreateProductionBatch(inputs: ProductionInputs, results: ProductionResults) {
  await db.demoBatches.put({ id: crypto.randomUUID(), name: inputs.name, status: "planned", totalUnits: results.totalUnits, totalCost: results.grandTotal, createdAt: new Date().toISOString() });
}

export async function demoSetProductionBatchStatus(batchId: string, status: ProductionBatch["status"]) {
  const updated = await db.demoBatches.update(batchId, { status });
  if (!updated) throw new Error("Batch not found.");
}

export async function demoDeleteProductionBatch(batchId: string) {
  await db.demoBatches.delete(batchId);
}

// ---------- Team ----------

export async function demoGetTeamMembers(): Promise<TeamMember[]> {
  if ((await db.demoMembers.count()) === 0) await db.demoMembers.put({ userId: DEMO_USER_ID, role: DEMO_ROLE });
  return db.demoMembers.toArray();
}

export async function demoSetTeamMemberRole(userId: string, role: StoreRole) {
  if (userId === DEMO_USER_ID && role !== "owner") throw new Error("The demo owner must stay an owner.");
  await db.demoMembers.put({ userId, role });
}

export async function demoRemoveTeamMember(userId: string) {
  if (userId === DEMO_USER_ID) throw new Error("You cannot remove yourself from the team.");
  await db.demoMembers.delete(userId);
}
