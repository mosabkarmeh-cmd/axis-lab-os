import { useMemo } from "react";

type CustomerLookup = { id: string; name: string };

type FilterableOrder = {
  isArchived?: boolean;
  orderNumber: string;
  customerId: string;
  notes?: string;
  priority?: string;
  status?: string;
  createdAt: string;
};

type OrderFilterOptions<T extends FilterableOrder> = {
  orders: T[];
  customers: CustomerLookup[];
  databaseTab: "active" | "archived" | "all";
  search: string;
  startDate: string;
  endDate: string;
  priority: string;
  customer: string;
  status: string;
};

export function useOrderFilters<T extends FilterableOrder>({
  orders,
  customers,
  databaseTab,
  search,
  startDate,
  endDate,
  priority,
  customer,
  status,
}: OrderFilterOptions<T>) {
  return useMemo(() => orders.filter((order) => {
    if (databaseTab === "active" && order.isArchived) return false;
    if (databaseTab === "archived" && !order.isArchived) return false;

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      const customerName = customers.find((item) => item.id === order.customerId)?.name.toLowerCase() || "";
      const matchesOrderNumber = order.orderNumber.toLowerCase().includes(query);
      const matchesCustomer = customerName.includes(query);
      const matchesNotes = order.notes?.toLowerCase().includes(query) || false;
      if (!matchesOrderNumber && !matchesCustomer && !matchesNotes) return false;
    }

    if (priority !== "all" && order.priority !== priority) return false;
    if (customer !== "all" && order.customerId !== customer) return false;
    if (status !== "all" && order.status !== status) return false;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (new Date(order.createdAt) < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(order.createdAt) > end) return false;
    }
    return true;
  }), [orders, customers, databaseTab, search, startDate, endDate, priority, customer, status]);
}
