export function calculateLaserJobCost(params: {
  perimeterMm: number;
  areaMm2: number;
  materialRate: number;
  cuttingRatePerMeter: number;
  quantity: number;
}) {
  const perimeterM = params.perimeterMm / 1000;
  const cuttingCost = perimeterM * params.cuttingRatePerMeter * params.quantity;
  const materialCost = (params.areaMm2 / 1000000) * params.materialRate * params.quantity;
  return {
    cuttingCost,
    materialCost,
    total: cuttingCost + materialCost
  };
}