import { Lock } from "lucide-react";
import AccountingView from "./AccountingView";
import type { Customer, User } from "../types";

type AccountingPageProps = {
  customers: Customer[];
  onRefreshOrders: () => Promise<void> | void;
  currentUserRole?: User["role"];
  initialTab: "dashboard" | "reports" | "invoices" | "expenses" | "customers_balances";
  companySettings: Record<string, unknown>;
};

export default function AccountingPage({
  customers,
  onRefreshOrders,
  currentUserRole,
  initialTab,
  companySettings,
}: AccountingPageProps) {
  if (currentUserRole === "employee") {
    return (
      <div className="flex flex-col justify-center items-center text-center p-12 min-h-[400px]">
        <Lock className="w-16 h-16 text-rose-500 mb-4" aria-hidden="true" />
        <h3 className="text-lg font-bold text-zinc-100">قسم الحسابات والمالية محمي</h3>
        <p className="text-sm text-zinc-500 mt-2 max-w-md leading-relaxed">
          غير مصرح لصلاحيات الموظف (Employee) بالاطلاع على الحسابات أو الكشوفات المالية أو تحرير الفواتير. يرجى مراجعة المسؤول.
        </p>
      </div>
    );
  }

  return (
    <AccountingView
      customers={customers}
      onRefreshOrders={onRefreshOrders}
      currentUserRole={currentUserRole}
      initialTab={initialTab}
      companySettings={companySettings}
    />
  );
}
