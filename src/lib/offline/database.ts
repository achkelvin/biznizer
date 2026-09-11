import Dexie, { type EntityTable } from "dexie";

import type { CatalogProduct } from "@/lib/catalog/types";

export type PendingSale = {
  id: string;
  createdAt: string;
  payload: Record<string, unknown>;
  syncStatus: "pending" | "syncing" | "failed";
};

export class BiznizerDatabase extends Dexie {
  pendingSales!: EntityTable<PendingSale, "id">;
  catalogProducts!: EntityTable<CatalogProduct, "id">;

  constructor() {
    super("biznizer");
    this.version(1).stores({
      pendingSales: "id, createdAt, syncStatus",
      catalogProducts: "id, category, sku",
    });
  }
}

export const offlineDatabase = new BiznizerDatabase();