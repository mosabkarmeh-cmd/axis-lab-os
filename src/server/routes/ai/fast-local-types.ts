export interface FastLocalPayload {
  query?: string;
  customerId?: string;
  productName?: string;
  items?: Array<Record<string, unknown>>;
  rawText?: string;
  materialName?: string;
  materialId?: string;
  thicknessMm?: number;
  widthMm?: number;
  heightMm?: number;
  wasteOverridePercent?: number;
  targetProfitMarginPercent?: number;
  workType?: string;
  machineId?: string;
  widthCm?: number;
  lengthCm?: number;
  cutLengthCm?: number;
  engraveAreaCm2?: number;
  quantity?: number;
  laserPowerWatts?: number;
  tubeCostUSD?: number;
  tubeLifespanHours?: number;
  electricityRatePerKwh?: number;
  operatorRatePerHour?: number;
  setupFeeUSD?: number;
  [key: string]: unknown;
}
