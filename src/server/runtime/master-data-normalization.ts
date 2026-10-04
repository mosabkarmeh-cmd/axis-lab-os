export const LEGACY_MATERIAL_PRICES_SYP_CANONICAL: Record<string, number> = {
  "m-1": 1350,
  "m-2": 6075,
  "m-3": 2700,
  "m-4": 1620,
  "m-5": 4725,
};

export const LEGACY_MATERIAL_PRICES_SYP: Record<string, number> = {
  "m-1": 362500,
  "m-2": 652500,
  "m-3": 290000,
  "m-4": 174000,
  "m-5": 507500,
};

export const DEMO_LOW_PRICE_MATERIALS: readonly Record<string, unknown>[] = [
  { id: "m-6", name: "لوح أكريليك أبيض 2 ملم", category: "الأكريليك", subCategory: "acrylic", thickness: 2, color: "white", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 540, minimumStock: 10, supplierId: "s-1", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
  { id: "m-7", name: "لوح PVC خفيف 3 ملم", category: "البلاستيك", subCategory: "pvc", thickness: 3, color: "white", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 405, minimumStock: 8, supplierId: "s-1", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
  { id: "m-8", name: "خشب MDF رقيق 3 ملم", category: "الأخشاب", subCategory: "wood", thickness: 3, color: "brown", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 337, minimumStock: 12, supplierId: "s-2", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
  { id: "m-9", name: "فوم بورد 5 ملم", category: "الفوم", subCategory: "foam", thickness: 5, color: "white", width: 700, height: 1000, unit: "sheet", pricePerUnit: 270, minimumStock: 15, supplierId: "s-1", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
  { id: "m-10", name: "جلد صناعي للحفر", category: "الجلود", subCategory: "leather", thickness: 1, color: "black", width: 1000, height: 1000, unit: "piece", pricePerUnit: 202, minimumStock: 20, supplierId: "s-3", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
];

export const DEMO_LOW_PRICE_INVENTORY: readonly Record<string, unknown>[] = [
  { id: "inv-6", materialId: "m-6", quantity: 20, reservedQuantity: 0, availableQuantity: 20, location: "مستودع أ - رف 6" },
  { id: "inv-7", materialId: "m-7", quantity: 15, reservedQuantity: 0, availableQuantity: 15, location: "مستودع أ - رف 7" },
  { id: "inv-8", materialId: "m-8", quantity: 25, reservedQuantity: 0, availableQuantity: 25, location: "مستودع ب - رف 3" },
  { id: "inv-9", materialId: "m-9", quantity: 30, reservedQuantity: 0, availableQuantity: 30, location: "مستودع ب - رف 4" },
  { id: "inv-10", materialId: "m-10", quantity: 40, reservedQuantity: 0, availableQuantity: 40, location: "مستودع أ - رف 8" },
];

export interface MasterDataNormalizationDependencies {
  materials: unknown[];
  inventory: unknown[];
  supplierQuotes: unknown[];
  supplyOrders: unknown[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function createMasterDataNormalizationRuntime(
  deps: MasterDataNormalizationDependencies,
) {
  function normalizeLegacyMaterialPrices() {
    // Material prices are canonical SYP values. Convert only known legacy values;
    // exact matching makes this migration idempotent across every restart.
    for (const value of deps.materials) {
      const material = asRecord(value);
      const materialId = String(material.id);
      const oldValue = LEGACY_MATERIAL_PRICES_SYP[materialId];
      const targetSyp = LEGACY_MATERIAL_PRICES_SYP_CANONICAL[materialId];
      if (
        oldValue !== undefined &&
        targetSyp !== undefined &&
        Number(material.pricePerUnit) === oldValue
      ) {
        material.pricePerUnit = targetSyp;
      }
    }

    // Supplier quotes and supply orders were seeded in USD in older builds.
    // They are material purchasing prices, so migrate them to the same SYP unit.
    const legacySupplierPricesUSD = new Set([
      10.5, 12, 18.2, 19, 20, 22.8, 24.5, 25, 26.5, 32,
      33, 35, 41.5, 43, 45,
    ]);
    for (const value of deps.supplierQuotes) {
      const quote = asRecord(value);
      const price = Number(quote.pricePerUnit);
      if (legacySupplierPricesUSD.has(price)) {
        quote.pricePerUnit = Math.round(price * 135);
      }
    }
    for (const value of deps.supplyOrders) {
      const order = asRecord(value);
      const price = Number(order.unitPrice);
      if (legacySupplierPricesUSD.has(price)) {
        const migratedPrice = Math.round(price * 135);
        order.unitPrice = migratedPrice;
        order.totalPrice = migratedPrice * Number(order.quantity || 0);
      }
    }
  }

  function normalizeInventoryState() {
    let changed = false;
    for (const value of deps.inventory) {
      const inventory = asRecord(value);
      const quantity = Math.max(0, Number(inventory.quantity) || 0);
      const reservedQuantity = Math.min(
        quantity,
        Math.max(0, Number(inventory.reservedQuantity) || 0),
      );
      const availableQuantity = quantity - reservedQuantity;
      if (
        inventory.quantity !== quantity ||
        inventory.reservedQuantity !== reservedQuantity ||
        inventory.availableQuantity !== availableQuantity
      ) {
        inventory.quantity = quantity;
        inventory.reservedQuantity = reservedQuantity;
        inventory.availableQuantity = availableQuantity;
        changed = true;
      }
    }
    return changed;
  }

  function ensureDemoLowPriceMaterials() {
    for (const material of DEMO_LOW_PRICE_MATERIALS) {
      if (!deps.materials.some((value) => asRecord(value).id === material.id)) {
        deps.materials.push({ ...material });
      }
    }
    for (const inventory of DEMO_LOW_PRICE_INVENTORY) {
      if (!deps.inventory.some((value) => asRecord(value).id === inventory.id)) {
        deps.inventory.push({ ...inventory });
      }
    }
  }

  return {
    normalizeLegacyMaterialPrices,
    normalizeInventoryState,
    ensureDemoLowPriceMaterials,
  };
}
