import express from "express";
import * as core from "../../../server-core.ts";

const { INVOICES, CUSTOMERS, ORDERS } = core;

export function registerInvoiceReadRoutes(app: express.Express) {
  app.get("/api/accounting/invoices", (req, res) => {
    // In-memory INVOICES is always immediately consistent with the latest
    // mutation; SQLite writes are debounced (~400ms) so reading from the
    // SQLite tables here can return stale data right after a write.
    // Durability across restarts is already guaranteed separately by
    // loadPersistedState() repopulating memory from SQLite at boot.
    const sourceInvoices = INVOICES;
    const list = sourceInvoices.map(inv => {
      const cust = CUSTOMERS.find(c => c.id === inv.customerId);
      const ord = ORDERS.find(o => o.id === inv.orderId);
      return {
        ...inv,
        customerName: cust ? cust.name : "عميل غير معروف",
        orderNumber: ord ? ord.orderNumber : null
      };
    });
    res.json({ success: true, invoices: list });
  });
  app.get("/api/accounting/invoices/:id", (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }
    const cust = CUSTOMERS.find(c => c.id === inv.customerId);
    const ord = ORDERS.find(o => o.id === inv.orderId);
    res.json({
      success: true,
      invoice: {
        ...inv,
        customerName: cust ? cust.name : "عميل غير معروف",
        orderNumber: ord ? ord.orderNumber : null
      }
    });
  });
}
