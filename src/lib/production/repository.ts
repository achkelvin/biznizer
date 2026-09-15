import { getStoreId } from "@/lib/env";
import type { ProductionInputs, ProductionResults } from "@/lib/production/calculator";
import { createClient } from "@/lib/supabase/client";

export type ProductionBatch = {
  id: string;
  name: string;
  status: "planned" | "completed" | "cancelled";
  totalUnits: number;
  totalCost: number;
  createdAt: string;
};

export async function getProductionBatches(): Promise<ProductionBatch[]> {
  const storeId = getStoreId();
  if (!storeId) return [];
  const { data, error } = await createClient().from("production_batches").select("id, name, status, total_units, total_cost, created_at").eq("store_id", storeId).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []).map((batch) => ({ id: batch.id, name: batch.name, status: batch.status, totalUnits: batch.total_units, totalCost: Number(batch.total_cost), createdAt: batch.created_at }));
}

export async function createProductionBatch(inputs: ProductionInputs, results: ProductionResults) {
  const storeId = getStoreId();
  if (!storeId) throw new Error("Configure a valid store before saving production batches.");
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) throw new Error("Sign in before saving a production batch.");

  const { error } = await createClient().from("production_batches").insert({
    store_id: storeId,
    created_by: user.id,
    name: inputs.name,
    inputs,
    materials: {
      totalLiquidBuffered: results.totalLiquidBuffered,
      totalOil: results.totalOil,
      totalAlcohol: results.totalAlcohol,
      oilTop: results.oilTop,
      oilHeart: results.oilHeart,
      oilBase: results.oilBase,
      bottles30Needed: results.bottles30Needed,
      bottles10Needed: results.bottles10Needed,
      labelsNeeded: results.labelsNeeded,
      boxesNeeded: results.boxesNeeded,
    },
    costs: {
      oil: results.oilCostTotal,
      alcohol: results.alcoholCostTotal,
      bottle30: results.bottle30CostTotal,
      bottle10: results.bottle10CostTotal,
      labels: results.labelCostTotal,
      boxes: results.boxCostTotal,
      tools: results.toolsCostTotal,
    },
    total_units: results.totalUnits,
    total_cost: results.grandTotal,
  });
  if (error) throw error;
}
