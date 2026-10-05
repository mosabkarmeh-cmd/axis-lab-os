export type PaymentRecord = {
  id?: string;
  amountSYP?: number;
  amountUSD?: number;
  exchangeRate?: number;
  [key: string]: unknown;
};
