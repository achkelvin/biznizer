export type ProductionInputs = {
  name: string;
  numScents: number;
  qty30: number;
  qty10: number;
  concentration: number;
  buffer: number;
  topPct: number;
  heartPct: number;
  basePct: number;
  oilCostPerMl: number;
  alcoholCostPerL: number;
  bottle30Cost: number;
  bottle10Cost: number;
  labelCost: number;
  boxCost: number;
  packagingBuffer: number;
  toolsCost: number;
  includeTools: boolean;
};

export type ProductionResults = {
  splitTotal: number;
  totalLiquidBuffered: number;
  totalOil: number;
  totalAlcohol: number;
  oilTop: number;
  oilHeart: number;
  oilBase: number;
  bottles30Needed: number;
  bottles10Needed: number;
  labelsNeeded: number;
  boxesNeeded: number;
  totalUnits: number;
  oilCostTotal: number;
  alcoholCostTotal: number;
  bottle30CostTotal: number;
  bottle10CostTotal: number;
  labelCostTotal: number;
  boxCostTotal: number;
  toolsCostTotal: number;
  grandTotal: number;
  averageCostPerUnit: number;
};

export function calculateProduction(inputs: ProductionInputs): ProductionResults {
  const concentration = inputs.concentration / 100;
  const buffer = 1 + inputs.buffer / 100;
  const packagingBuffer = 1 + inputs.packagingBuffer / 100;
  const splitTotal = inputs.topPct + inputs.heartPct + inputs.basePct;
  const liquidPerScent = inputs.qty30 * 30 + inputs.qty10 * 10;
  const totalLiquidBuffered = liquidPerScent * inputs.numScents * buffer;
  const totalOil = totalLiquidBuffered * concentration;
  const totalAlcohol = totalLiquidBuffered - totalOil;
  const bottles30Needed = Math.ceil(inputs.qty30 * inputs.numScents * packagingBuffer);
  const bottles10Needed = Math.ceil(inputs.qty10 * inputs.numScents * packagingBuffer);
  const labelsNeeded = bottles30Needed + bottles10Needed;
  const boxesNeeded = bottles30Needed;
  const oilCostTotal = totalOil * inputs.oilCostPerMl;
  const alcoholCostTotal = totalAlcohol / 1000 * inputs.alcoholCostPerL;
  const bottle30CostTotal = bottles30Needed * inputs.bottle30Cost;
  const bottle10CostTotal = bottles10Needed * inputs.bottle10Cost;
  const labelCostTotal = labelsNeeded * inputs.labelCost;
  const boxCostTotal = boxesNeeded * inputs.boxCost;
  const toolsCostTotal = inputs.includeTools ? inputs.toolsCost : 0;
  const grandTotal = oilCostTotal + alcoholCostTotal + bottle30CostTotal + bottle10CostTotal + labelCostTotal + boxCostTotal + toolsCostTotal;
  const totalUnits = (inputs.qty30 + inputs.qty10) * inputs.numScents;

  return {
    splitTotal,
    totalLiquidBuffered,
    totalOil,
    totalAlcohol,
    oilTop: totalOil * inputs.topPct / 100,
    oilHeart: totalOil * inputs.heartPct / 100,
    oilBase: totalOil * inputs.basePct / 100,
    bottles30Needed,
    bottles10Needed,
    labelsNeeded,
    boxesNeeded,
    totalUnits,
    oilCostTotal,
    alcoholCostTotal,
    bottle30CostTotal,
    bottle10CostTotal,
    labelCostTotal,
    boxCostTotal,
    toolsCostTotal,
    grandTotal,
    averageCostPerUnit: totalUnits > 0 ? grandTotal / totalUnits : 0,
  };
}
