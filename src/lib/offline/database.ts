import Dexie, { type EntityTable } from "dexie";

import type { CatalogProduct } from "@/lib/catalog/types";
import type { InventoryMovement } from "@/lib/inventory/repository";
import type { ProductionBatch } from "@/lib/production/repository";
import type { SaleDetail } from "@/lib/sales/history";
import type { SalePayload } from "@/lib/sales/repository";
import type { TeamMember } from "@/lib/supabase/auth";

export type PendingSale = {
  id: string;
  createdAt: string;
  payload: SalePayload;
  syncStatus: "pending" | "syncing" | "failed";
};

export class BiznizerDatabase extends Dexie {
  pendingSales!: EntityTable<PendingSale, "id">;
  catalogProducts!: EntityTable<CatalogProduct, "id">;
  // Demo-mode tables: the whole "database" when login is switched off. See src/lib/demo/store.ts.
  demoProducts!: EntityTable<CatalogProduct, "id">;
  demoCategories!: EntityTable<{ id: string; name: string }, "id">;
  demoSales!: EntityTable<SaleDetail, "id">;
  demoMovements!: EntityTable<InventoryMovement, "id">;
  demoBatches!: EntityTable<ProductionBatch, "id">;
  demoMembers!: EntityTable<TeamMember, "userId">;

  constructor() {
    super("biznizer");
    this.version(3).stores({
      pendingSales: "id, createdAt, syncStatus",
      catalogProducts: "id, category, sku",
    });
    this.version(4).stores({
      demoProducts: "id, sku",
      demoSales: "id, createdAt",
      demoMovements: "id, createdAt",
      demoBatches: "id, createdAt",
      demoMembers: "userId",
    });
    this.version(5).stores({
      demoCategories: "id",
    });
  }
}

export const offlineDatabase = new BiznizerDatabase();