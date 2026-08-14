import { useState } from "react";

type SmartSupplyItem = {
  materialId: string;
  materialName: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  suggestedQty: number;
  unitPrice: number;
  supplierId: string;
  supplierName: string;
  selected: boolean;
};

type MaterialQualityStatus = "inspected" | "defective" | "in_preparation";
type ProductSubTab = "products" | "materials" | "remnants" | "suppliers" | "supply_orders";
type SupplyOrderStatus = "all" | "pending" | "completed" | "cancelled";

type MaterialStats = {
  totalMaterials: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
};

export function useInventoryWorkspace() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [draggedMaterialId, setDraggedMaterialId] = useState<string | null>(null);
  const [dragOverMaterialId, setDragOverMaterialId] = useState<string | null>(null);
  const [materialCategories, setMaterialCategories] = useState<string[]>([]);
  const [remnants, setRemnants] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplyOrders, setSupplyOrders] = useState<any[]>([]);
  const [materialStats, setMaterialStats] = useState<MaterialStats>({ totalMaterials: 0, totalValue: 0, lowStock: 0, outOfStock: 0 });
  const [activeProductSubTab, setActiveProductSubTab] = useState<ProductSubTab>("materials");
  const [supplyOrdersFilterStatus, setSupplyOrdersFilterStatus] = useState<SupplyOrderStatus>("all");
  const [supplyOrdersSearch, setSupplyOrdersSearch] = useState("");
  const [materialSortBy, setMaterialSortBy] = useState<"default" | "most_used">("default");
  const [materialQualityFilter, setMaterialQualityFilter] = useState<"all" | MaterialQualityStatus>("all");
  const [showSmartSupplyModal, setShowSmartSupplyModal] = useState(false);
  const [smartSupplyItems, setSmartSupplyItems] = useState<SmartSupplyItem[]>([]);
  const [isSubmittingSmartSupply, setIsSubmittingSmartSupply] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [matName, setMatName] = useState("");
  const [matCategory, setMatCategory] = useState("الأكريليك");
  const [matSubCategory, setMatSubCategory] = useState("");
  const [matThickness, setMatThickness] = useState("");
  const [matColor, setMatColor] = useState("");
  const [matWidth, setMatWidth] = useState("");
  const [matHeight, setMatHeight] = useState("");
  const [matUnit, setMatUnit] = useState("sheet");
  const [matPrice, setMatPrice] = useState("");
  const [matMinStock, setMatMinStock] = useState("");
  const [matSupplierId, setMatSupplierId] = useState("");
  const [matNotes, setMatNotes] = useState("");
  const [matLocation, setMatLocation] = useState("");
  const [matQualityStatus, setMatQualityStatus] = useState<MaterialQualityStatus>("inspected");
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [aiClassificationResult, setAiClassificationResult] = useState<any | null>(null);
  const [showAdjustStock, setShowAdjustStock] = useState<any | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"purchase" | "consumption" | "adjustment" | "waste">("purchase");
  const [adjustReason, setAdjustReason] = useState("");
  const [priceComparisonMaterial, setPriceComparisonMaterial] = useState<any | null>(null);
  const [isCurrencyConverterOpen, setIsCurrencyConverterOpen] = useState(false);
  const [selectedDashboardSupplierId, setSelectedDashboardSupplierId] = useState("");
  const [newSupplyMaterialId, setNewSupplyMaterialId] = useState("");
  const [newSupplyQty, setNewSupplyQty] = useState("");
  const [newSupplyPrice, setNewSupplyPrice] = useState("");
  const [newSupplyExpectedDate, setNewSupplyExpectedDate] = useState("");
  const [newSupplyNotes, setNewSupplyNotes] = useState("");
  const [isSubmittingSupplyOrder, setIsSubmittingSupplyOrder] = useState(false);
  const [showAddRemnant, setShowAddRemnant] = useState(false);
  const [remMatId, setRemMatId] = useState("");
  const [remWidth, setRemWidth] = useState("");
  const [remHeight, setRemHeight] = useState("");
  const [remQty, setRemQty] = useState("1");
  const [remLocation, setRemLocation] = useState("");
  const [findSuitableMatId, setFindSuitableMatId] = useState("");
  const [findSuitableW, setFindSuitableW] = useState("");
  const [findSuitableH, setFindSuitableH] = useState("");
  const [suitableRemnantResult, setSuitableRemnantResult] = useState<any | null>(null);

  return {
    materials, setMaterials, draggedMaterialId, setDraggedMaterialId, dragOverMaterialId, setDragOverMaterialId,
    materialCategories, setMaterialCategories, remnants, setRemnants, suppliers, setSuppliers, supplyOrders, setSupplyOrders,
    materialStats, setMaterialStats, activeProductSubTab, setActiveProductSubTab, supplyOrdersFilterStatus, setSupplyOrdersFilterStatus,
    supplyOrdersSearch, setSupplyOrdersSearch, materialSortBy, setMaterialSortBy, materialQualityFilter, setMaterialQualityFilter,
    showSmartSupplyModal, setShowSmartSupplyModal, smartSupplyItems, setSmartSupplyItems, isSubmittingSmartSupply, setIsSubmittingSmartSupply,
    showAddMaterial, setShowAddMaterial, matName, setMatName, matCategory, setMatCategory, matSubCategory, setMatSubCategory,
    matThickness, setMatThickness, matColor, setMatColor, matWidth, setMatWidth, matHeight, setMatHeight, matUnit, setMatUnit,
    matPrice, setMatPrice, matMinStock, setMatMinStock, matSupplierId, setMatSupplierId, matNotes, setMatNotes, matLocation, setMatLocation,
    matQualityStatus, setMatQualityStatus, editingMaterial, setEditingMaterial, isAiClassifying, setIsAiClassifying,
    aiClassificationResult, setAiClassificationResult, showAdjustStock, setShowAdjustStock, adjustQty, setAdjustQty,
    adjustType, setAdjustType, adjustReason, setAdjustReason, priceComparisonMaterial, setPriceComparisonMaterial,
    isCurrencyConverterOpen, setIsCurrencyConverterOpen, selectedDashboardSupplierId, setSelectedDashboardSupplierId,
    newSupplyMaterialId, setNewSupplyMaterialId, newSupplyQty, setNewSupplyQty, newSupplyPrice, setNewSupplyPrice,
    newSupplyExpectedDate, setNewSupplyExpectedDate, newSupplyNotes, setNewSupplyNotes, isSubmittingSupplyOrder, setIsSubmittingSupplyOrder,
    showAddRemnant, setShowAddRemnant, remMatId, setRemMatId, remWidth, setRemWidth, remHeight, setRemHeight, remQty, setRemQty,
    remLocation, setRemLocation, findSuitableMatId, setFindSuitableMatId, findSuitableW, setFindSuitableW, findSuitableH, setFindSuitableH,
    suitableRemnantResult, setSuitableRemnantResult,
  };
}
