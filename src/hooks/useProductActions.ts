import type React from "react";

type ProductActionsOptions = {
  prodName: string;
  prodCode: string;
  prodCategory: string;
  prodPrice: string;
  prodDescription: string;
  prodStock: string;
  editingProduct: any;
  setProdName: (value: string) => void;
  setProdCode: (value: string) => void;
  setProdCategory: (value: string) => void;
  setProdPrice: (value: string) => void;
  setProdDescription: (value: string) => void;
  setProdStock: (value: string) => void;
  setShowAddProduct: (value: boolean) => void;
  setEditingProduct: (value: any) => void;
  fetchProducts: () => void | Promise<void>;
  addTerminalLog: (scope: string, message: string) => void;
};

export function useProductActions({
  prodName,
  prodCode,
  prodCategory,
  prodPrice,
  prodDescription,
  prodStock,
  editingProduct,
  setProdName,
  setProdCode,
  setProdCategory,
  setProdPrice,
  setProdDescription,
  setProdStock,
  setShowAddProduct,
  setEditingProduct,
  fetchProducts,
  addTerminalLog,
}: ProductActionsOptions) {
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice) return;

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName,
          code: prodCode,
          category: prodCategory,
          price: Number(prodPrice) || 0,
          description: prodDescription,
          stock: Number(prodStock) || 0
        })
      });
      if (res.ok) {
        addTerminalLog("DB", `Added product: ${prodName}`);
        setProdName("");
        setProdCode("");
        setProdCategory("الأكريليك");
        setProdPrice("");
        setProdDescription("");
        setProdStock("");
        setShowAddProduct(false);
        fetchProducts();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to add product");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.price) return;

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct)
      });
      if (res.ok) {
        addTerminalLog("DB", `Updated product: ${editingProduct.name}`);
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to update product");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        addTerminalLog("DB", `Purged product: ${name}`);
        fetchProducts();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to delete product");
    }
  };

  return {
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
  };
}
