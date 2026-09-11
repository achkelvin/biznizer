import Dexie, { type EntityTable } from "dexie";

export type PendingSale = {
  id: string;
  createdAt: string;
  payload: Record<string, unknown>;
  syncStatus: "pending" | "syncing" | "failed";
};

export class BiznizerDatabase extends Dexie {
  pendingSales!: EntityTable<PendingSale, "id">;

  constructor() {
    super("biznizer");
    this.version(1).stores({
      pendingSales: "id, createdAt, syncStatus",
    });
  }
}

export const offlineDatabase = new BiznizerDatabase();