import type React from "react";
import type { Customer, Order } from "../types";

type CustomerActionsOptions = {
  customers: Customer[];
  orders: Order[];
  custName: string;
  custPhone: string;
  custCompany: string;
  custAddress: string;
  custNotes: string;
  custCategory: string;
  editingCustomer: Customer | null;
  editCustName: string;
  editCustPhone: string;
  editCustWhatsapp: string;
  editCustEmail: string;
  editCustCompany: string;
  editCustAddress: string;
  editCustNotes: string;
  editCustCategory: string;
  setCustName: (value: string) => void;
  setCustPhone: (value: string) => void;
  setCustCompany: (value: string) => void;
  setCustAddress: (value: string) => void;
  setCustNotes: (value: string) => void;
  setCustCategory: (value: string) => void;
  setShowAddCustomer: (value: boolean) => void;
  setEditingCustomer: (customer: Customer | null) => void;
  setEditCustName: (value: string) => void;
  setEditCustPhone: (value: string) => void;
  setEditCustWhatsapp: (value: string) => void;
  setEditCustEmail: (value: string) => void;
  setEditCustCompany: (value: string) => void;
  setEditCustAddress: (value: string) => void;
  setEditCustNotes: (value: string) => void;
  setEditCustCategory: (value: string) => void;
  fetchCustomers: () => void | Promise<void>;
  addTerminalLog: (scope: string, message: string) => void;
};

export function useCustomerActions({
  customers,
  orders,
  custName,
  custPhone,
  custCompany,
  custAddress,
  custNotes,
  custCategory,
  editingCustomer,
  editCustName,
  editCustPhone,
  editCustWhatsapp,
  editCustEmail,
  editCustCompany,
  editCustAddress,
  editCustNotes,
  editCustCategory,
  setCustName,
  setCustPhone,
  setCustCompany,
  setCustAddress,
  setCustNotes,
  setCustCategory,
  setShowAddCustomer,
  setEditingCustomer,
  setEditCustName,
  setEditCustPhone,
  setEditCustWhatsapp,
  setEditCustEmail,
  setEditCustCompany,
  setEditCustAddress,
  setEditCustNotes,
  setEditCustCategory,
  fetchCustomers,
  addTerminalLog,
}: CustomerActionsOptions) {
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: custName,
          phone: custPhone,
          company: custCompany,
          address: custAddress,
          notes: custNotes,
          category: custCategory
        })
      });
      if (res.ok) {
        addTerminalLog("DB", `Added customer: ${custName}`);
        setCustName("");
        setCustPhone("");
        setCustCompany("");
        setCustAddress("");
        setCustNotes("");
        setCustCategory("شركة");
        setShowAddCustomer(false);
        fetchCustomers();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to add customer");
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        addTerminalLog("DB", `Purged customer: ${name}`);
        fetchCustomers();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to delete customer");
    }
  };

  // Edit Customer Actions
  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditCustName(cust.name || "");
    setEditCustPhone(cust.phone || "");
    setEditCustWhatsapp(cust.whatsapp || cust.phone || "");
    setEditCustEmail(cust.email || "");
    setEditCustCompany(cust.company || "");
    setEditCustAddress(cust.address || "");
    setEditCustNotes(cust.notes || "");
    setEditCustCategory(cust.category || "شركة");
  };

  const handleSaveEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editCustName || !editCustPhone) return;

    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCustName,
          phone: editCustPhone,
          whatsapp: editCustWhatsapp || editCustPhone,
          email: editCustEmail,
          company: editCustCompany,
          address: editCustAddress,
          notes: editCustNotes,
          category: editCustCategory
        })
      });
      if (res.ok) {
        addTerminalLog("DB", `تم تحديث ملف العميل بنجاح: ${editCustName} (${editingCustomer.id})`);
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        const errData = await res.json().catch(() => ({}));
        addTerminalLog("ERROR", `فشل تعديل بيانات العميل: ${errData.error || res.statusText}`);
      }
    } catch (e) {
      addTerminalLog("ERROR", "خطأ أثناء تحديث بيانات العميل");
    }
  };

  const handleExportCustomersCSV = (customersList: any[] = customers) => {
    if (!customersList || customersList.length === 0) {
      addTerminalLog("WARN", "لا يوجد عملاء للتصدير");
      return;
    }

    const headers = [
      "معرف العميل",
      "اسم العميل",
      "رقم الهاتف",
      "الواتساب",
      "الشركة / الجهة",
      "العنوان",
      "عدد الطلبات",
      "إجمالي المسحوبات ($)",
      "الملاحظات والتفضيلات"
    ];

    const rows = customersList.map(c => {
      const custOrders = orders.filter(o => o.customerId === c.id);
      const totalSpent = custOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0).toFixed(2);
      return [
        c.id,
        c.name || '',
        c.phone || '',
        c.whatsapp || c.phone || '',
        c.company || 'فردي',
        c.address || '',
        custOrders.length,
        totalSpent,
        c.notes || ''
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `AXIS_LAB_Customers_Outreach_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addTerminalLog("EXPORT", `تم تصدير سجل بيانات العملاء (${customersList.length} عميل) كملف CSV للتسويق والتواصل والتدقيق الخارجي`);
  };

  return {
    handleAddCustomer,
    handleDeleteCustomer,
    handleOpenEditCustomer,
    handleSaveEditCustomer,
    handleExportCustomersCSV,
  };
}
