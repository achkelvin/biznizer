import Dexie, { type EntityTable } from "dexie";

import type { CatalogProduct } from "@/lib/catalog/types";
import type { SalePayload } from "@/lib/sales/repository";

export type PendingSale = {
  id: string;
  createdAt: string;
  payload: SalePayload;
  syncStatus: "pending" | "syncing" | "failed";
};

export class BiznizerDatabase extends Dexie {
  pendingSales!: EntityTable<PendingSale, "id">;
  catalogProducts!: EntityTable<CatalogProduct, "id">;

  constructor() {
    super("biznizer");
    this.version(3).stores({
      pendingSales: "id, createdAt, syncStatus",
      catalogProducts: "id, category, sku",
    });
  }
}

export const offlineDatabase = new BiznizerDatabase();