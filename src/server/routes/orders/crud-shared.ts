export type OrderItem = {
  productName?: string;
  quantity?: number | string;
  completedQuantity?: number | string;
  isCompleted?: boolean;
  unitPrice?: number | string;
  totalPrice?: number | string;
  notes?: string;
  id?: string;
  [key: string]: unknown;
};

export function asOrderItem(value: unknown): OrderItem {
  return value && typeof value === "object" ? value as OrderItem : {};
}
