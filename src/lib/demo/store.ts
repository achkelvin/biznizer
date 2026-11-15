// Demo store: a stand-in for Supabase that keeps everything in this browser (IndexedDB).
//
// It is used only when NEXT_PUBLIC_AUTH_DISABLED=true (see isAuthDisabled in src/lib/env.ts).
// Each repository checks that flag first and calls the matching function here instead of
// Supabase, so every feature can be tried with no login and no database. Nothing written
// here ever reaches Supabase, and clearing the browser's site data resets it.

import { demoProducts } from "@/lib/catalog/demo-products";
import type { CatalogCategory, NewCatalogProduct } from "@/lib/catalog/repository";
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

export async function demoGetCatalog(): Promise<CatalogProduct[]> {
  await seedProducts();
  const products = await db.demoProducts.toArray();
  return products.sort((left, right) => left.name.localeCompare(right.name));
}

export function demoGetCategories(): CatalogCategory[] {
  return DEMO_CATEGORIES.map((name) => ({ id: name, name }));
}

export async function demoCreateProduct(product: NewCatalogProduct) {
  await seedProducts();
  if (await db.demoProducts.where("sku").equals(product.sku).count()) throw new Error(`SKU ${product.sku} is already in use.`);
  await db.demoProducts.put({
    id: crypto.randomUUID(),
    name: product.name,
    sku: product.sku,
    price: product.price,
    stock: product.stock,
    category: product.categoryId ?? "Uncategorized",
  });
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

// ---------- Team ----------

export async function demoGetTeamMembers(): Promise<TeamMember[]> {
  if ((await db.demoMembers.count()) === 0) await db.demoMembers.put({ userId: DEMO_USER_ID, role: DEMO_ROLE });
  return db.demoMembers.toArray();
}

export async function demoSetTeamMemberRole(userId: string, role: StoreRole) {
  if (userId === DEMO_USER_ID && role !== "owner") throw new Error("The demo owner must stay an owner.");
  await db.demoMembers.put({ userId, role });
}
