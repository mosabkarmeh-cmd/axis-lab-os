import type {
  InventoryReportRecord,
  MaterialReportRecord,
} from "./types.ts";

export function buildInventoryAnalytics(
  materials: MaterialReportRecord[],
  inventory: InventoryReportRecord[],
  currentRate: number,
  sypToUsd: (amountSYP: number, exchangeRate?: number) => number,
) {
  const stockStatus = materials.map(material => {
    const inventoryRecord = inventory.find(item => item.materialId === material.id);
    const stockQuantity = Number(inventoryRecord?.quantity || 0);
    const minimumStock = Number(material.minimumStock || 0);
    const stockValueSYP = stockQuantity * Math.round(Number(material.pricePerUnit) || 0);

    return {
      id: material.id,
      name: material.name,
      category: material.category,
      stockQuantity,
      minimumStock,
      unit: material.unit,
      isLowStock: stockQuantity < minimumStock,
      stockValue: stockValueSYP,
      stockValueSYP,
      stockValueUSD: sypToUsd(stockValueSYP, currentRate),
    };
  });

  return {
    stockStatus,
    lowStockCount: stockStatus.filter(item => item.isLowStock).length,
    totalInventoryValue: stockStatus.reduce((sum, item) => sum + item.stockValue, 0),
  };
}
