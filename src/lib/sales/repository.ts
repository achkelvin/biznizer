import type { CatalogProduct } from "@/lib/catalog/types";
import { getStoreId } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type SaleLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type SalePayload = {
  saleId: string;
  total: number;
  paymentMethod: "cash" | "card" | "other";
  items: SaleLine[];
};

export function toSalePayload(saleId: string, products: CatalogProduct[]): SalePayload {
  const quantities = new Map<string, SaleLine>();
  products.forEach((product) => {
    const existing = quantities.get(product.id);
    quantities.set(product.id, {
      productId: product.id,
      quantity: (existing?.quantity ?? 0) + 1,
      unitPrice: product.price,
    });
  });

  return {
    saleId,
    total: products.reduce((sum, product) => sum + product.price, 0),
    paymentMethod: "cash",
    items: Array.from(quantities.values()),
  };
}

export async function recordSale(payload: SalePayload) {
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a valid store before recording sales.");

  const { error } = await createClient().rpc("record_sale", {
    target_sale_id: payload.saleId,
    target_store_id: storeId,
    target_total: payload.total,
    target_payment_method: payload.paymentMethod,
    target_items: payload.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
  });

  if (error) throw error;
}
