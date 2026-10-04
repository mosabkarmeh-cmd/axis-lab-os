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
  [key: string]: unknown;
}
