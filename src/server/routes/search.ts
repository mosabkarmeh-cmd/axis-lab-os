import express from "express";
import * as core from "../server-core.ts";
const { ORDERS, CUSTOMERS, PRODUCTS, MATERIALS, INVOICES } = core;

export function registerSearchRoutes(app: express.Express) {
  app.get("/api/search", (req, res) => {
    const query = String(req.query.q || "").toLowerCase().trim();
    if (!query) {
      res.json({ success: true, results: { orders: [], customers: [], products: [], materials: [], invoices: [] } });
      return;
    }

    const filteredOrders = ORDERS.filter(o => 
      o.orderNumber.toLowerCase().includes(query) ||
      (o.notes && o.notes.toLowerCase().includes(query)) ||
      (CUSTOMERS.find(c => c.id === o.customerId)?.name || "").toLowerCase().includes(query)
    ).map(o => ({
      id: o.id,
      title: o.orderNumber,
      subtitle: CUSTOMERS.find(c => c.id === o.customerId)?.name || "عميل عام",
      details: o.notes || "لا توجد تفاصيل",
      type: "order",
      link: "dashboard" // Active Tab in frontend
    }));

    const filteredCustomers = CUSTOMERS.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      (c.company && c.company.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    ).map(c => ({
      id: c.id,
      title: c.name,
      subtitle: c.company || "أفراد",
      details: c.phone,
      type: "customer",
      link: "database"
    }));

    const filteredProducts = PRODUCTS.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    ).map(p => ({
      id: p.id,
      title: p.name,
      subtitle: p.code,
      details: `${p.price} $ - ${p.category}`,
      type: "product",
      link: "database"
    }));

    const filteredMaterials = MATERIALS.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query)
    ).map(m => ({
      id: m.id,
      title: m.name,
      subtitle: m.category,
      details: `${m.pricePerUnit} $ - السماكة: ${m.thickness} مم`,
      type: "material",
      link: "database"
    }));

    const filteredInvoices = INVOICES.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(query) ||
      (inv.notes && inv.notes.toLowerCase().includes(query)) ||
      (CUSTOMERS.find(c => c.id === inv.customerId)?.name || "").toLowerCase().includes(query)
    ).map(inv => ({
      id: inv.id,
      title: inv.invoiceNumber,
      subtitle: CUSTOMERS.find(c => c.id === inv.customerId)?.name || "عميل عام",
      details: `القيمة: $${inv.totalPrice.toFixed(2)} - المتبقي: $${inv.remaining.toFixed(2)}`,
      type: "invoice",
      link: "accounting"
    }));

    res.json({
      success: true,
      results: {
        orders: filteredOrders,
        customers: filteredCustomers,
        products: filteredProducts,
        materials: filteredMaterials,
        invoices: filteredInvoices
      }
    });
  });

  // 6. QUOTATION PDF API
}
