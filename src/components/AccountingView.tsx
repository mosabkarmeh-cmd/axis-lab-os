import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  Wallet, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  ArrowDown, 
  ArrowUp, 
  CheckCircle, 
  AlertCircle, 
  Edit, 
  Trash2, 
  FileText, 
  TrendingUp,
  X,
  CreditCard,
  User,
  Hash,
  Activity,
  Printer,
  Copy,
  Check,
  Download,
  Share2,
  MessageSquare,
  Send,
  Sparkles,
  Calculator,
  Clock,
  Instagram,
  MessageCircle,
  QrCode
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Invoice, Expense, Customer } from "../types";
import ReportsView from "./ReportsView";
import { DEFAULT_EXCHANGE_RATE, EXCHANGE_RATE_STORAGE_KEY, fetchExchangeRate, sanitizeExchangeRate, updateExchangeRate, usdToSyp } from "../lib/currency";

interface AccountingViewProps {
  customers: Customer[];
  onRefreshOrders?: () => void;
  currentUserRole?: string;
  initialTab?: "dashboard" | "reports" | "invoices" | "expenses" | "customers_balances";
  companySettings?: any;
}

export default function AccountingView({ customers, onRefreshOrders, currentUserRole, initialTab, companySettings: initialCompanySettings }: AccountingViewProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "reports" | "invoices" | "expenses" | "customers_balances">("dashboard");
  const [companySettings, setCompanySettings] = useState<any>(initialCompanySettings || null);

  useEffect(() => {
    if (!companySettings) {
      fetch("/api/settings")
        .then(res => res.json())
        .then(data => {
          if (data?.settings?.company) {
            setCompanySettings(data.settings.company);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [exchangeRate, setExchangeRate] = useState<number>(() => sanitizeExchangeRate(localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY), DEFAULT_EXCHANGE_RATE));

  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "SYP" | "BOTH">(
    () => (localStorage.getItem("axislab_preferred_currency") as "USD" | "SYP" | "BOTH") || "SYP"
  );

  useEffect(() => {
    localStorage.setItem("axislab_preferred_currency", selectedCurrency);
  }, [selectedCurrency]);

  const formatMoney = (usdVal: number, mode: "USD" | "SYP" | "AUTO" = "AUTO") => {
    const formatUSD = (val: number) => {
      return "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const formatSYP = (val: number) => {
      return usdToSyp(val, exchangeRate).toLocaleString("en-US") + " ل.س";
    };

    const currentMode = mode === "AUTO" ? (selectedCurrency === "BOTH" ? "BOTH" : selectedCurrency) : mode;

    if (currentMode === "BOTH") {
      return (
        <div className="text-right">
          <div className="font-mono font-bold text-[#c59257]">{formatSYP(usdVal)}</div>
          <div className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5">{formatUSD(usdVal)}</div>
        </div>
      );
    } else if (currentMode === "SYP") {
      return (
        <div className="text-right font-mono font-bold text-[#c59257]">
          {formatSYP(usdVal)}
        </div>
      );
    } else {
      return (
        <div className="text-right font-mono font-bold">
          {formatUSD(usdVal)}
        </div>
      );
    }
  };

  const formatMoneyString = (usdVal: number, mode: "USD" | "SYP" | "AUTO" = "AUTO") => {
    const formatUSD = (val: number) => {
      return "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const formatSYP = (val: number) => {
      return usdToSyp(val, exchangeRate).toLocaleString("en-US") + " ل.س";
    };

    const currentMode = mode === "AUTO" ? (selectedCurrency === "BOTH" ? "BOTH" : selectedCurrency) : mode;

    if (currentMode === "BOTH") {
      return `${formatSYP(usdVal)} (${formatUSD(usdVal)})`;
    } else if (currentMode === "SYP") {
      return formatSYP(usdVal);
    } else {
      return formatUSD(usdVal);
    }
  };

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate).catch(() => {});
    const handleRateChange = (event: Event) => setExchangeRate(sanitizeExchangeRate((event as CustomEvent<number>).detail));
    window.addEventListener("axislab:exchange-rate-changed", handleRateChange);
    return () => window.removeEventListener("axislab:exchange-rate-changed", handleRateChange);
  }, []);

  const handleExchangeRateUpdate = async (newRate: number) => {
    const savedRate = await updateExchangeRate(newRate);
    setExchangeRate(savedRate);
  };

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseFilter, setExpenseFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState("الكل");

  // Modals state
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [recordingPaymentInvoice, setRecordingPaymentInvoice] = useState<Invoice | null>(null);
  const [showSummaryReportModal, setShowSummaryReportModal] = useState(false);
  const [summaryReportCopied, setSummaryReportCopied] = useState(false);
  const [modalFilter, setModalFilter] = useState<"all" | "remaining" | "cleared">("all");

  // Selected Invoice audit, history, and edit states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  const [isEditingSelectedInvoice, setIsEditingSelectedInvoice] = useState(false);
  const [editedInvoiceItems, setEditedInvoiceItems] = useState<any[]>([]);
  const [editedInvoiceTaxPercent, setEditedInvoiceTaxPercent] = useState<number>(0);
  const [editedInvoiceDiscount, setEditedInvoiceDiscount] = useState<number>(0);
  const [editedInvoiceNotes, setEditedInvoiceNotes] = useState<string>("");
  const [editedInvoiceDueDate, setEditedInvoiceDueDate] = useState<string>("");

  const printedRate = invoiceToPrint?.exchangeRateAtFinalization || invoiceToPrint?.exchangeRateAtIssue || exchangeRate;
  const printedTotalUSD = invoiceToPrint ? Number(invoiceToPrint.totalPriceUSD ?? invoiceToPrint.totalPrice ?? 0) : 0;
  const printedPaidUSD = invoiceToPrint ? Number(invoiceToPrint.paidAmountUSD ?? invoiceToPrint.paidAmount ?? 0) : 0;
  const printedRemainingUSD = invoiceToPrint ? Number(invoiceToPrint.remainingUSD ?? invoiceToPrint.remaining ?? 0) : 0;
  const printedTotalSYP = invoiceToPrint ? Math.round(Number(invoiceToPrint.totalPriceSYP ?? (printedTotalUSD * printedRate))) : 0;
  const printedPaidSYP = invoiceToPrint ? Math.round(Number(invoiceToPrint.paidAmountSYP ?? (printedPaidUSD * printedRate))) : 0;
  const printedRemainingSYP = invoiceToPrint ? Math.round(Number(invoiceToPrint.remainingSYP ?? (printedRemainingUSD * printedRate))) : 0;

  // New Invoice Form state
  const [newInvCustomer, setNewInvCustomer] = useState("");
  const [newInvTotal, setNewInvTotal] = useState("");
  const [newInvDueDate, setNewInvDueDate] = useState("");
  const [newInvNotes, setNewInvNotes] = useState("");

  // New/Edit Expense Form state
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseStatus, setExpenseStatus] = useState<"paid" | "pending">("paid");

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState("");

  // Common expense categories
  const expenseCategories = ["رواتب", "صيانة", "كهرباء ومرافق", "خامات ومواد", "إيجار", "أخرى"];

  // Fetch all accounting data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return { success: false };
          const ct = res.headers.get("content-type");
          if (!ct || !ct.includes("application/json")) return { success: false };
          return await res.json();
        } catch {
          return { success: false };
        }
      };

      const [invRes, expRes, statsRes] = await Promise.all([
        safeFetch("/api/accounting/invoices"),
        safeFetch("/api/accounting/expenses"),
        safeFetch("/api/accounting/stats")
      ]);

      if (invRes?.success) setInvoices(invRes.invoices);
      if (expRes?.success) setExpenses(expRes.expenses);
      if (statsRes?.success) setStats(statsRes.stats);
    } catch (err) {
      console.error("Error loading accounting data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Select Invoice & fetch detailed items and logs
  const handleSelectInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/accounting/invoices/${invoiceId}`);
      const data = await res.json();
      if (data.success) {
        const fullInv = data.invoice;
        setSelectedInvoice(fullInv);
        setIsEditingSelectedInvoice(false);
        setEditedInvoiceItems(fullInv.items || []);
        setEditedInvoiceTaxPercent(fullInv.taxPercent || 0);
        setEditedInvoiceDiscount(fullInv.discount || 0);
        setEditedInvoiceNotes(fullInv.notes || "");
        setEditedInvoiceDueDate(fullInv.dueDate ? fullInv.dueDate.slice(0, 10) : "");
      }
    } catch (err) {
      console.error("Failed to fetch invoice details:", err);
    }
  };

  // WhatsApp quick invoice share helper
  const handleShareInvoiceWhatsApp = (inv: Invoice) => {
    const invTotalSYP = Math.round(Number(inv.totalPrice || 0)).toLocaleString();
    const invRemainingSYP = Math.round(Number(inv.remaining || 0)).toLocaleString();
    const statusLabel = inv.status === "paid" ? "مدفوعة بالكامل ✅" : inv.status === "partially_paid" ? "مدفوعة جزئياً ⚠️" : "غير مدفوعة ❌";
    const msg = `*AXIS LAB - فاتورة مبيعات*\n\n` +
      `📄 *رقم الفاتورة:* ${inv.invoiceNumber}\n` +
      `👤 *العميل:* ${inv.customerName}\n` +
      `📅 *تاريخ الإصدار:* ${new Date(inv.issueDate).toLocaleDateString("ar-EG")}\n` +
      `⏳ *تاريخ الاستحقاق:* ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("ar-EG") : "غير محدد"}\n` +
      `📌 *الحالة:* ${statusLabel}\n\n` +
      `💰 *المبلغ الإجمالي:* ${invTotalSYP} ل.س ($${(Number(inv.totalPrice || 0) / (exchangeRate || 135)).toFixed(2)})\n` +
      `💵 *المدفوع:* ${Math.round(Number(inv.paidAmount || 0)).toLocaleString()} ل.س\n` +
      `🔻 *المتبقي للتحصيل:* ${invRemainingSYP} ل.س ($${(Number(inv.remaining || 0) / (exchangeRate || 135)).toFixed(2)})\n\n` +
      `نشكركم لتعاملكم مع ورش AXIS LAB لليزر.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Save modified invoice details
  const handleUpdateSelectedInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      const res = await fetch(`/api/accounting/invoices/${selectedInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editedInvoiceItems,
          taxPercent: editedInvoiceTaxPercent,
          discount: editedInvoiceDiscount,
          notes: editedInvoiceNotes,
          dueDate: editedInvoiceDueDate
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingSelectedInvoice(false);
        await handleSelectInvoice(selectedInvoice.id);
        fetchData();
        if (onRefreshOrders) onRefreshOrders();
      }
    } catch (err) {
      console.error("Failed to update invoice:", err);
    }
  };

  // Change invoice status directly
  const handleChangeInvoiceStatus = async (status: string) => {
    if (!selectedInvoice) return;
    try {
      const res = await fetch(`/api/accounting/invoices/${selectedInvoice.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        await handleSelectInvoice(selectedInvoice.id);
        fetchData();
        if (onRefreshOrders) onRefreshOrders();
      }
    } catch (err) {
      console.error("Failed to change status:", err);
    }
  };

  // Issue Credit Note
  const handleIssueCreditNote = async () => {
    if (!selectedInvoice) return;
    if (!confirm("هل أنت متأكد من رغبتك بإصدار إشعار دائن سلبي كامل لهذه الفاتورة وإلغاء مديونيتها؟")) return;
    try {
      const res = await fetch(`/api/accounting/invoices/${selectedInvoice.id}/credit-note`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        alert(`تم إصدار الإشعار الدائن رقم ${data.creditInvoice.invoiceNumber} بنجاح!`);
        setSelectedInvoice(null);
        fetchData();
        if (onRefreshOrders) onRefreshOrders();
      }
    } catch (err) {
      console.error("Failed to issue credit note:", err);
    }
  };

  useEffect(() => {
    fetchData();

    const handleRefresh = () => {
      fetchData();
    };
    window.addEventListener("accounting-refresh", handleRefresh);
    return () => {
      window.removeEventListener("accounting-refresh", handleRefresh);
    };
  }, []);

  // Handle manual invoice creation
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvCustomer || !newInvTotal) return;

    try {
      const res = await fetch("/api/accounting/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: newInvCustomer,
          totalPrice: Number(newInvTotal),
          dueDate: newInvDueDate || undefined,
          notes: newInvNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowAddInvoice(false);
        setNewInvCustomer("");
        setNewInvTotal("");
        setNewInvDueDate("");
        setNewInvNotes("");
        fetchData();
        if (onRefreshOrders) onRefreshOrders();
      }
    } catch (err) {
      console.error("Failed to create invoice:", err);
    }
  };

  // Handle recording payment on invoice
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");
    if (!recordingPaymentInvoice || !paymentAmount) {
      setPaymentError("أدخل قيمة القسط أولًا.");
      return;
    }
    const amount = Number(paymentAmount);
    const remaining = Number(recordingPaymentInvoice.remaining) || 0;
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("قيمة القسط يجب أن تكون رقمًا أكبر من الصفر.");
      return;
    }
    if (amount > remaining + 0.01) {
      setPaymentError(`القسط يتجاوز المتبقي. الحد الأقصى هو ${remaining.toFixed(2)} $.`);
      return;
    }

    try {
      const res = await fetch(`/api/accounting/invoices/${recordingPaymentInvoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes: paymentNotes })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPaymentError(String(data.message || data.error || "تعذر تسجيل القسط. تحقق من أن الفاتورة غير نهائية وأن المبلغ ضمن المتبقي."));
        return;
      }
      setRecordingPaymentInvoice(null);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentError("");
      fetchData();
      if (onRefreshOrders) onRefreshOrders();
    } catch (err) {
      console.error("Failed to record payment:", err);
      setPaymentError("تعذر الاتصال بالخادم. لم يتم تسجيل القسط.");
    }
  };

  // Handle expense submit (add or edit)
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseCategory || !expenseAmount || !expenseDate) return;

    const body = {
      category: expenseCategory,
      amount: Number(expenseAmount),
      date: expenseDate,
      description: expenseDesc,
      status: expenseStatus
    };

    try {
      let url = "/api/accounting/expenses";
      let method = "POST";

      if (editingExpense) {
        url = `/api/accounting/expenses/${editingExpense.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        setShowAddExpense(false);
        setEditingExpense(null);
        setExpenseCategory("");
        setExpenseAmount("");
        setExpenseDate("");
        setExpenseDesc("");
        setExpenseStatus("paid");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to submit expense:", err);
    }
  };

  // Handle expense deletion
  const handleDeleteExpense = async (id: string) => {
    if (!confirm("هل أنت متأكد من رغبتك بحذف هذا المصروف نهائياً من القيود المالية؟")) return;

    try {
      const res = await fetch(`/api/accounting/expenses/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  // Copy financial summary report as plain text to clipboard
  const handleCopyReportText = () => {
    const lines = [];
    lines.push("========================================");
    lines.push("📊 تقرير الملخص المالي للحسابات والعملاء");
    lines.push(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`);
    lines.push(`سعر الصرف المعتمد: ${exchangeRate.toLocaleString()} ل.س/$`);
    lines.push("========================================");
    lines.push("");

    customers.forEach((c, index) => {
      const custInvoices = invoices.filter(inv => inv.customerId === c.id);
      const totalInvoiced = custInvoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
      const totalPaid = custInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
      const invoicesCount = custInvoices.length;
      const statusText = totalRemaining <= 0 ? "🟢 مسدد بالكامل" : `🔴 ذمة معلقة (${totalRemaining.toFixed(2)} $)`;

      lines.push(`${index + 1}. العميل: ${c.name}`);
      lines.push(`   - عدد الفواتير: ${invoicesCount}`);
      lines.push(`   - إجمالي المطالبات: $${totalInvoiced.toFixed(2)}`);
      lines.push(`   - إجمالي المقبوض: $${totalPaid.toFixed(2)}`);
      lines.push(`   - الرصيد المتبقي: $${totalRemaining.toFixed(2)} (${(totalRemaining * exchangeRate).toLocaleString()} ل.س)`);
      lines.push(`   - حالة الحساب: ${statusText}`);
      lines.push("----------------------------------------");
    });

    const totalOverallInvoiced = invoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
    const totalOverallPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOverallRemaining = invoices.reduce((sum, inv) => sum + inv.remaining, 0);

    lines.push("");
    lines.push("========================================");
    lines.push("📈 الخلاصة والتدقيق المالي الإجمالي");
    lines.push(`- إجمالي المطالبات (العمل): $${totalOverallInvoiced.toFixed(2)}`);
    lines.push(`- إجمالي المبالغ المقبوضة: $${totalOverallPaid.toFixed(2)}`);
    lines.push(`- إجمالي الذمم المتبقية بذمة العملاء: $${totalOverallRemaining.toFixed(2)}`);
    lines.push(`- مكافئ الذمم المتبقية بالليرة السورية: ${(totalOverallRemaining * exchangeRate).toLocaleString()} ل.س`);
    lines.push("========================================");

    navigator.clipboard.writeText(lines.join("\n"));
    setSummaryReportCopied(true);
    setTimeout(() => setSummaryReportCopied(false), 2000);
  };

  // Generate HTML and trigger system print dialog
  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير.");
      return;
    }
    
    const totalOverallInvoiced = invoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
    const totalOverallPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOverallRemaining = invoices.reduce((sum, inv) => sum + inv.remaining, 0);

    const rowsHtml = customers.map((c, idx) => {
      const custInvoices = invoices.filter(inv => inv.customerId === c.id);
      const totalInvoiced = custInvoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
      const totalPaid = custInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
      const isCleared = totalRemaining <= 0;
      
      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px; text-align: center; font-size: 11px;">
            <span style="padding: 3px 8px; border-radius: 12px; font-weight: bold; background-color: ${isCleared ? '#e2fbe8; color: #10b981;' : '#fff3e0; color: #f59e0b;'}">
              ${isCleared ? 'مسدد بالكامل' : 'ذمة معلقة'}
            </span>
          </td>
          <td style="padding: 10px; font-family: monospace; text-align: left; font-size: 11px;">${totalRemaining > 0 ? (totalRemaining * exchangeRate).toLocaleString() + ' ل.س' : '-'}</td>
          <td style="padding: 10px; font-family: monospace; text-align: left; font-size: 11px;">${totalRemaining > 0 ? '$' + totalRemaining.toFixed(2) : '-'}</td>
          <td style="padding: 10px; font-family: monospace; text-align: left; font-size: 11px; color: #10b981;">$${totalPaid.toFixed(2)}</td>
          <td style="padding: 10px; font-family: monospace; text-align: left; font-size: 11px; color: #666;">$${totalInvoiced.toFixed(2)}</td>
          <td style="padding: 10px; font-weight: bold; text-align: right; font-size: 11px;">${c.name}</td>
          <td style="padding: 10px; text-align: center; color: #888; font-size: 11px;">${idx + 1}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html lang="ar" dir="rtl">
      <head>
        <title>التقرير المالي للحسابات والعملاء</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #222; line-height: 1.6; background-color: #fff; }
          h2 { border-bottom: 3px double #222; padding-bottom: 12px; margin-bottom: 25px; text-align: center; font-size: 22px; }
          .meta-info { text-align: center; font-size: 12px; color: #555; margin-bottom: 30px; }
          .stats { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 35px; }
          .card { flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 10px; text-align: center; background-color: #fafafa; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .card span { font-size: 10px; color: #777; display: block; margin-bottom: 6px; font-weight: bold; text-transform: uppercase; }
          .card div { font-size: 18px; font-weight: bold; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 25px; }
          th { background-color: #f5f5f7; padding: 12px; font-size: 11px; font-weight: bold; border-bottom: 2px solid #ddd; text-align: right; color: #444; }
          td { font-size: 11px; }
          .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <h2>📊 تقرير الملخص المالي للحسابات والعملاء (Axis Lab)</h2>
        <div class="meta-info">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')} | سعر الصرف المعتمد: ${exchangeRate.toLocaleString()} ل.س/$</div>
        
        <div class="stats">
          <div class="card">
            <span>إجمالي المطالبات</span>
            <div style="color: #444;">$${totalOverallInvoiced.toFixed(2)}</div>
          </div>
          <div class="card">
            <span>إجمالي المقبوضات</span>
            <div style="color: #10b981;">$${totalOverallPaid.toFixed(2)}</div>
          </div>
          <div class="card">
            <span>إجمالي الذمم المعلقة</span>
            <div style="color: #e65100;">$${totalOverallRemaining.toFixed(2)}</div>
          </div>
          <div class="card">
            <span>مكافئ الذمم بالليرة</span>
            <div style="color: #a0522d;">${(totalOverallRemaining * exchangeRate).toLocaleString()} ل.س</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 100px;">حالة الحساب</th>
              <th style="text-align: left; width: 140px;">الرصيد بالليرة السورية</th>
              <th style="text-align: left; width: 120px;">الرصيد المتبقي ($)</th>
              <th style="text-align: left; width: 120px;">إجمالي المدفوعات ($)</th>
              <th style="text-align: left; width: 120px;">إجمالي المطالبات ($)</th>
              <th style="text-align: right;">اسم العميل</th>
              <th style="text-align: center; width: 40px;">#</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          مستند مالي مبسط لتدقيق الحسابات - نظام إدارة الإنتاج والمحاسبة Axis Lab - محمي وسري
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export financial summary report as CSV file for accountants
  const handleExportCSV = () => {
    const csvRows = [];
    
    // Add BOM for proper Arabic encoding in Excel
    csvRows.push("\uFEFF");
    
    // CSV Header
    csvRows.push([
      "الرقم",
      "اسم العميل",
      "إجمالي المطالبات ($)",
      "إجمالي المقبوض ($)",
      "الرصيد المتبقي ($)",
      "الرصيد بالليرة السورية (ل.س)",
      "حالة الحساب"
    ].join(","));

    customers.forEach((c, index) => {
      const custInvoices = invoices.filter(inv => inv.customerId === c.id);
      const totalInvoiced = custInvoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
      const totalPaid = custInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
      const statusText = totalRemaining <= 0 ? "مسدد بالكامل" : "ذمة معلقة";
      const remainingSYP = usdToSyp(totalRemaining, exchangeRate);

      // Escape comma/quotes in names
      const escapedName = `"${c.name.replace(/"/g, '""')}"`;

      csvRows.push([
        index + 1,
        escapedName,
        totalInvoiced.toFixed(2),
        totalPaid.toFixed(2),
        totalRemaining.toFixed(2),
        remainingSYP,
        statusText
      ].join(","));
    });

    // Overall summary row
    const totalOverallInvoiced = invoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
    const totalOverallPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOverallRemaining = invoices.reduce((sum, inv) => sum + inv.remaining, 0);
    const totalOverallRemainingSYP = usdToSyp(totalOverallRemaining, exchangeRate);

    csvRows.push("");
    csvRows.push([
      "المجموع الإجمالي",
      "",
      totalOverallInvoiced.toFixed(2),
      totalOverallPaid.toFixed(2),
      totalOverallRemaining.toFixed(2),
      totalOverallRemainingSYP,
      ""
    ].join(","));

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_الملخص_المالي_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Colors for Recharts pie chart
  const COLORS = ["#c59257", "#f43f5e", "#10b981", "#f59e0b", "#a855f7", "#6b7280"];

  // Filter lists
  const filteredInvoices = invoices.filter(inv => {
    const custName = inv.customerName || "";
    const invNo = inv.invoiceNumber || "";
    const matchesSearch = custName.toLowerCase().includes(invoiceSearch.toLowerCase()) || 
                          invNo.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchesFilter = invoiceFilter === "all" || inv.status === invoiceFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredExpenses = expenses.filter(exp => {
    const desc = exp.description || "";
    const cat = exp.category || "";
    const matchesSearch = desc.toLowerCase().includes(expenseSearch.toLowerCase()) || 
                          cat.toLowerCase().includes(expenseSearch.toLowerCase());
    const matchesFilter = expenseFilter === "all" || exp.status === expenseFilter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading && !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-24">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <span className="text-sm font-sans">جاري تحميل السجلات والقيود المالية...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right font-sans">
      
      {/* Upper Tab Switcher & Navigation Header */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center border-b border-zinc-850 pb-4 gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 order-2 lg:order-1 w-full lg:w-auto">
          <div className="flex gap-2 p-0.5 bg-zinc-950 rounded-lg border border-zinc-850 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("expenses")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "expenses" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              إدارة المصاريف والنفقات
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "invoices" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              سجل الفواتير والتحصيل
            </button>
            <button
              onClick={() => setActiveTab("customers_balances")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "customers_balances" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              أرصدة وحسابات العملاء
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "reports" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              مركز التحليلات والتقارير
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "dashboard" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              لوحة الأداء المالي
            </button>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850 text-xs">
            <span className="text-zinc-400 font-bold whitespace-nowrap">العملة المفضلة:</span>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as "USD" | "SYP" | "BOTH")}
              className="bg-zinc-900 text-[#c59257] font-bold border border-zinc-800 rounded px-2.5 py-1 outline-none text-xs cursor-pointer focus:border-[#c59257] transition-all"
            >
              <option value="SYP">ليرة سورية (ل.س) - العملة الأساسية</option>
              <option value="BOTH">عرض مزدوج (ل.س / $)</option>
              <option value="USD">دولار أمريكي ($)</option>
            </select>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 justify-end">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <span>نظام الإدارة والرقابة المالية والمحاسبة</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">تابع الدفعات، الفواتير، المصاريف الإدارية، وتدفق السيولة النقدية للورشة</p>
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && stats && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-zinc-950 p-5 rounded-2xl border border-emerald-950/40 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="flex justify-between items-start">
                <span className="p-2 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-500 font-bold block mb-1">إجمالي الإيرادات المحصلة</span>
                  {selectedCurrency === "BOTH" ? (
                    <>
                      <div className="text-lg font-mono text-emerald-400 font-bold">{(stats.totalRevenueSYP ?? stats.totalRevenue * exchangeRate).toLocaleString()} ل.س</div>
                      <span className="text-[11px] text-zinc-400 block font-sans font-medium mt-1">${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </>
                  ) : selectedCurrency === "SYP" ? (
                    <div className="text-lg font-mono text-emerald-400 font-bold">{(stats.totalRevenueSYP ?? stats.totalRevenue * exchangeRate).toLocaleString()} ل.س</div>
                  ) : (
                    <div className="text-lg font-mono text-zinc-100 font-bold">${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 mt-2">
                مجموع المبالغ المقبوضة من فواتير الطلبات
              </div>
            </div>

            <div className="bg-zinc-950 p-5 rounded-2xl border border-rose-950/40 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="flex justify-between items-start">
                <span className="p-2 bg-rose-950/20 text-rose-400 border border-rose-900/30 rounded-xl">
                  <ArrowUp className="w-4 h-4" />
                </span>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-500 font-bold block mb-1">إجمالي المصروفات والنفقات</span>
                  {selectedCurrency === "BOTH" ? (
                    <>
                      <div className="text-lg font-mono text-rose-400 font-bold">{(stats.totalExpensesSYP ?? stats.totalExpenses * exchangeRate).toLocaleString()} ل.س</div>
                      <span className="text-[11px] text-zinc-400 block font-sans font-medium mt-1">${stats.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </>
                  ) : selectedCurrency === "SYP" ? (
                    <div className="text-lg font-mono text-rose-400 font-bold">{(stats.totalExpensesSYP ?? stats.totalExpenses * exchangeRate).toLocaleString()} ل.س</div>
                  ) : (
                    <div className="text-lg font-mono text-zinc-100 font-bold">${stats.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 mt-2">
                رواتب وصيانة ومرافق ومشتريات خامات
              </div>
            </div>

            <div className="bg-zinc-950 p-5 rounded-2xl border border-indigo-950/40 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="flex justify-between items-start">
                <span className="p-2 bg-indigo-950/20 text-indigo-400 border border-indigo-900/30 rounded-xl">
                  <ArrowDown className="w-4 h-4" />
                </span>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-500 font-bold block mb-1">صافي الأرباح التشغيلية</span>
                  {selectedCurrency === "BOTH" ? (
                    <>
                      <div className={`text-lg font-mono font-bold ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(stats.netProfitSYP ?? stats.netProfit * exchangeRate).toLocaleString()} ل.س
                      </div>
                      <span className={`text-[11px] block font-sans font-medium mt-1 ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ${stats.netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </>
                  ) : selectedCurrency === "SYP" ? (
                    <div className={`text-lg font-mono font-bold ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {(stats.netProfitSYP ?? stats.netProfit * exchangeRate).toLocaleString()} ل.س
                    </div>
                  ) : (
                    <div className={`text-lg font-mono font-bold ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      ${stats.netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 mt-2">
                الفارق المالي الحقيقي (الإيرادات - المصاريف)
              </div>
            </div>

            <div className="bg-zinc-950 p-5 rounded-2xl border border-amber-950/40 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div className="flex justify-between items-start">
                <span className="p-2 bg-amber-950/20 text-amber-400 border border-amber-900/30 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-500 font-bold block mb-1">الذمم والديون المستحقة</span>
                  {selectedCurrency === "BOTH" ? (
                    <>
                      <div className="text-lg font-mono text-amber-400 font-bold">{(stats.totalReceivablesSYP ?? stats.totalReceivables * exchangeRate).toLocaleString()} ل.س</div>
                      <span className="text-[11px] text-zinc-400 block font-sans font-medium mt-1">${stats.totalReceivables.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </>
                  ) : selectedCurrency === "SYP" ? (
                    <div className="text-lg font-mono text-amber-400 font-bold">{(stats.totalReceivablesSYP ?? stats.totalReceivables * exchangeRate).toLocaleString()} ل.س</div>
                  ) : (
                    <div className="text-lg font-mono text-zinc-100 font-bold">${stats.totalReceivables.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 mt-2">
                المبالغ المتبقية للتحصيل من فواتير العملاء
              </div>
            </div>

          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Revenue vs Expenses Trend Chart */}
            <div className="lg:col-span-8 bg-zinc-950 border border-zinc-850 p-5 rounded-2xl">
              <h4 className="text-xs font-bold text-zinc-300 mb-4 block">مقارنة الإيرادات بالمصاريف - الأشهر الأخيرة</h4>
              <div className="h-72 w-full text-xs font-mono">
                {stats.monthlyTrends && stats.monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyTrends} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <XAxis dataKey="month" stroke="#52525b" tickLine={false} />
                      <YAxis stroke="#52525b" tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", color: "#f4f4f5" }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar name="الإيرادات ($)" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar name="المصاريف ($)" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600">
                    لا تتوفر بيانات كافية لعرض المخطط البياني للتدفقات النقدية.
                  </div>
                )}
              </div>
            </div>

            {/* Expenses breakdown by Category */}
            <div className="lg:col-span-4 bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between">
              <h4 className="text-xs font-bold text-zinc-300 mb-4 block">توزيع النفقات حسب فئة المصروف</h4>
              <div className="h-56 w-full flex items-center justify-center">
                {stats.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {stats.categoryBreakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", color: "#f4f4f5" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-zinc-600 text-xs">لا توجد مصاريف مسجلة لعرضها</div>
                )}
              </div>

              {/* Legends list */}
              <div className="space-y-1.5 max-h-32 overflow-y-auto pt-3 border-t border-zinc-900 text-xs text-zinc-400">
                {stats.categoryBreakdown && stats.categoryBreakdown.map((item: any, i: number) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <span className="font-mono font-bold text-zinc-300">{formatMoneyString(item.value)}</span>
                    <div className="flex items-center gap-1.5">
                      <span>{item.name}</span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* INVOICES TAB */}
      {activeTab === "invoices" && (
        <motion.div
          key="invoices"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* 📊 INVOICE SUMMARY STATS CARDS */}
          {(() => {
            const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.totalPrice || 0), 0);
            const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
            const totalRemaining = invoices.reduce((acc, inv) => acc + (inv.remaining || 0), 0);
            const collectionRate = totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : "0";

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl text-right space-y-1">
                  <span className="text-[11px] text-zinc-500 font-bold block">إجمالي الفواتير الصادرة</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-mono font-extrabold text-[#c59257]">{(totalInvoiced * exchangeRate).toLocaleString()} ل.س</span>
                    <span className="text-[10px] text-zinc-400 font-mono">${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">العدد الإجمالي: {invoices.length} فاتورة</div>
                </div>

                <div className="bg-zinc-950 border border-emerald-950/60 p-4 rounded-xl text-right space-y-1">
                  <span className="text-[11px] text-emerald-400 font-bold block">إجمالي المبالغ المحصلة</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-mono font-extrabold text-emerald-400">{(totalPaid * exchangeRate).toLocaleString()} ل.س</span>
                    <span className="text-[10px] text-emerald-500/80 font-mono">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[10px] text-emerald-500/80 font-mono">نسبة التحصيل: {collectionRate}%</div>
                </div>

                <div className="bg-zinc-950 border border-rose-950/60 p-4 rounded-xl text-right space-y-1">
                  <span className="text-[11px] text-rose-400 font-bold block">الذمم المعلقة للمطالبة</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-mono font-extrabold text-rose-400">{(totalRemaining * exchangeRate).toLocaleString()} ل.س</span>
                    <span className="text-[10px] text-rose-500/80 font-mono">${totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[10px] text-rose-500/80 font-mono">غير مدفوعة: {invoices.filter(i => i.status !== 'paid').length} فاتورة</div>
                </div>

                <div className="bg-zinc-950 border border-indigo-950/60 p-4 rounded-xl text-right space-y-1">
                  <span className="text-[11px] text-indigo-400 font-bold block">معدل الإنجاز والتحصيل</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-mono font-extrabold text-indigo-300">{collectionRate}%</span>
                    <span className="text-[10px] text-zinc-400">سعر الصرف: 1$ = {exchangeRate.toLocaleString()} ل.س</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden mt-2">
                    <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, parseFloat(collectionRate))}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Header Action Tools */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
            <div className="flex flex-wrap gap-2 order-2 sm:order-1">
              <button
                onClick={() => setShowAddInvoice(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 justify-center cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار فاتورة يدوية جديدة</span>
              </button>
              <a
                href="/api/export/invoices/excel"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[#c59257] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 justify-center cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير Excel</span>
              </a>
            </div>

            <div className="flex flex-1 sm:flex-none flex-col sm:flex-row gap-3 items-stretch sm:items-center order-1 sm:order-2">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  placeholder="ابحث برقم الفاتورة أو العميل..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg py-1.5 pr-8 pl-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-600 font-sans text-right"
                />
                <Search className="w-3.5 h-3.5 text-zinc-600 absolute top-2.5 right-2.5" />
              </div>

              <div className="flex items-center gap-1 bg-black border border-zinc-800 rounded-lg p-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setInvoiceFilter("unpaid")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer whitespace-nowrap ${invoiceFilter === "unpaid" ? "bg-zinc-900 text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  غير مدفوع
                </button>
                <button
                  onClick={() => setInvoiceFilter("partially_paid")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer whitespace-nowrap ${invoiceFilter === "partially_paid" ? "bg-zinc-900 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  مدفوع جزئياً
                </button>
                <button
                  onClick={() => setInvoiceFilter("paid")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer whitespace-nowrap ${invoiceFilter === "paid" ? "bg-zinc-900 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  مدفوع بالكامل
                </button>
                <button
                  onClick={() => setInvoiceFilter("all")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer whitespace-nowrap ${invoiceFilter === "all" ? "bg-zinc-900 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  الكل
                </button>
                <Filter className="w-3 h-3 text-zinc-600 mx-1.5 shrink-0" />
              </div>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-500 font-bold">
                    <th className="p-4 text-center">الإجراءات</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">المتبقي</th>
                    <th className="p-4">المدفوع</th>
                    <th className="p-4">القيمة الإجمالية</th>
                    <th className="p-4">تاريخ الاستحقاق</th>
                    <th className="p-4">تاريخ الإصدار</th>
                    <th className="p-4">العميل والمهمة</th>
                    <th className="p-4">رقم الفاتورة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-zinc-600 space-y-2">
                        <FileText className="w-10 h-10 text-zinc-800 mx-auto animate-pulse" />
                        <p className="text-xs">لا توجد فواتير تطابق شروط البحث أو الفلترة الحالية.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isPaid = inv.status === "paid";
                      const isPartial = inv.status === "partially_paid";
                      const isUnpaid = inv.status === "unpaid";

                      const statusColor = 
                        isPaid ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30" :
                        isPartial ? "bg-amber-950/40 text-amber-400 border-amber-900/30" :
                        "bg-rose-950/40 text-rose-400 border-rose-900/30";

                      const statusText = 
                        isPaid ? "مدفوع بالكامل" :
                        isPartial ? "مدفوع جزئياً" :
                        "غير مدفوع";

                      const invTotalSYP = Math.round(Number(inv.totalPrice || 0)).toLocaleString();
                      const invRemainingSYP = Math.round(Number(inv.remaining || 0)).toLocaleString();

                      return (
                        <tr key={inv.id} className="hover:bg-zinc-900/20 transition-all font-sans">
                          
                          {/* Actions */}
                          <td className="p-4 text-center">
                            <div className="flex gap-1.5 justify-center flex-wrap">
                              <button
                                onClick={() => handleSelectInvoice(inv.id)}
                                className="text-[10px] bg-indigo-950/30 border border-indigo-900/30 hover:bg-indigo-900/40 text-indigo-400 font-bold px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1"
                                title="عرض التفاصيل والتعديل"
                              >
                                <span>عرض</span>
                                <Search className="w-2.5 h-2.5 text-indigo-400" />
                              </button>
                              
                              <button
                                onClick={() => setInvoiceToPrint(inv)}
                                className="text-[10px] bg-[#c59257]/15 border border-[#c59257]/40 hover:bg-[#c59257]/30 text-[#c59257] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                title="معاينة وطباعة الفاتورة بتنسيق مبسط"
                              >
                                <span>طباعة الفاتورة</span>
                                <Printer className="w-2.5 h-2.5 text-[#c59257]" />
                              </button>

                              <button
                                onClick={() => handleShareInvoiceWhatsApp(inv)}
                                className="text-[10px] bg-emerald-950/30 border border-emerald-900/30 hover:bg-emerald-900/40 text-emerald-400 font-bold px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1"
                                title="إرسال الفاتورة عبر واتساب"
                              >
                                <span>واتساب</span>
                                <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                              </button>

                              {!isPaid && (
                                <button
                                  onClick={() => setRecordingPaymentInvoice(inv)}
                                  className="text-[10px] bg-amber-950/30 border border-amber-900/30 hover:bg-amber-900/40 text-amber-400 font-bold px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1"
                                  title="تسجيل دفعة مادية"
                                >
                                  <span>دفعة</span>
                                  <CreditCard className="w-2.5 h-2.5 text-amber-400" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">
                            <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full flex items-center gap-1.5 justify-end w-max ml-auto ${statusColor}`}>
                              {isPaid && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                              {isPartial && <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                              {isUnpaid && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                              <span>{statusText}</span>
                            </span>
                          </td>

                          {/* Remaining */}
                          <td className="p-4">
                            <div className={`font-mono font-bold ${inv.remaining > 0 ? "text-rose-400" : "text-zinc-500"}`}>
                              {formatMoney(inv.remaining)}
                            </div>
                            {inv.remaining > 0 && (
                              <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                {invRemainingSYP} ل.س
                              </div>
                            )}
                          </td>

                          {/* Paid amount */}
                          <td className="p-4 font-mono text-emerald-400">
                            {formatMoney(inv.paidAmount)}
                          </td>

                          {/* Total amount */}
                          <td className="p-4">
                            <div className="font-mono text-zinc-200 font-bold">
                              {formatMoney(inv.totalPrice)}
                            </div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                              {invTotalSYP} ل.س
                            </div>
                          </td>

                          {/* Due date */}
                          <td className="p-4 text-zinc-500 font-mono">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("ar-EG") : "غير محدد"}
                          </td>

                          {/* Issue date */}
                          <td className="p-4 text-zinc-500 font-mono">
                            {new Date(inv.issueDate).toLocaleDateString("ar-EG")}
                          </td>

                          {/* Customer */}
                          <td className="p-4">
                            <div className="space-y-0.5 text-right">
                              <span className="font-bold text-zinc-200 block">{inv.customerName}</span>
                              {inv.orderNumber ? (
                                <span className="text-[10px] font-mono text-indigo-400">مرتبطة بطلب: #{inv.orderNumber}</span>
                              ) : (
                                <span className="text-[10px] text-zinc-600">فاتورة عمل مستقلة</span>
                              )}
                            </div>
                          </td>

                          {/* Invoice Number */}
                          <td className="p-4 font-mono font-bold text-zinc-300">
                            {inv.invoiceNumber}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === "expenses" && (
        <motion.div
          key="expenses"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Action Tools */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
            <button
              onClick={() => {
                setEditingExpense(null);
                setExpenseCategory("");
                setExpenseAmount("");
                setExpenseDate(new Date().toISOString().slice(0, 10));
                setExpenseDesc("");
                setExpenseStatus("paid");
                setShowAddExpense(true);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 justify-center cursor-pointer shadow-lg shadow-rose-600/10 order-2 sm:order-1"
            >
              <Plus className="w-4 h-4" />
              <span>إدراج مستند صرف مالي</span>
            </button>

            <div className="flex flex-1 sm:flex-none flex-col sm:flex-row gap-3 items-stretch sm:items-center order-1 sm:order-2">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  placeholder="ابحث بوصف المصروف أو الفئة..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg py-1.5 pr-8 pl-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-sans text-right"
                />
                <Search className="w-3.5 h-3.5 text-zinc-600 absolute top-2.5 right-2.5" />
              </div>

              <div className="flex items-center gap-1 bg-black border border-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setExpenseFilter("pending")}
                  className={`px-3 py-1 text-[11px] font-medium rounded transition-all ${expenseFilter === "pending" ? "bg-zinc-900 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  معلق
                </button>
                <button
                  onClick={() => setExpenseFilter("paid")}
                  className={`px-3 py-1 text-[11px] font-medium rounded transition-all ${expenseFilter === "paid" ? "bg-zinc-900 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  تم الصرف
                </button>
                <button
                  onClick={() => setExpenseFilter("all")}
                  className={`px-3 py-1 text-[11px] font-medium rounded transition-all ${expenseFilter === "all" ? "bg-zinc-900 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  الكل
                </button>
                <Filter className="w-3 h-3 text-zinc-600 mx-1.5" />
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-500 font-bold">
                    <th className="p-4 text-center">الإجراءات</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">القيمة المصروفة</th>
                    <th className="p-4">تاريخ الصرف</th>
                    <th className="p-4">الوصف والتفاصيل</th>
                    <th className="p-4">الفئة الإدارية</th>
                    <th className="p-4">رقم القيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-600 space-y-2">
                        <AlertCircle className="w-10 h-10 text-zinc-800 mx-auto" />
                        <p className="text-xs">لا توجد قيود مصروفات تطابق شروط الفلترة والبحث.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const isPaid = exp.status === "paid";
                      const statusColor = isPaid 
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
                        : "bg-amber-950/40 text-amber-400 border-amber-900/30";

                      return (
                        <tr key={exp.id} className="hover:bg-zinc-900/20 transition-all font-sans">
                          
                          {/* Actions */}
                          <td className="p-4 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => {
                                  setEditingExpense(exp);
                                  setExpenseCategory(exp.category);
                                  setExpenseAmount(exp.amount.toString());
                                  setExpenseDate(exp.date);
                                  setExpenseDesc(exp.description || "");
                                  setExpenseStatus(exp.status);
                                  setShowAddExpense(true);
                                }}
                                className="p-1 text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded transition-colors cursor-pointer"
                                title="تعديل القيد المالي"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1 text-zinc-500 hover:text-rose-400 bg-zinc-900 hover:bg-rose-950/20 border border-zinc-850 rounded transition-colors cursor-pointer"
                                title="حذف القيد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${statusColor}`}>
                              {isPaid ? "تم الصرف" : "معلق"}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="p-4 font-mono font-bold text-rose-400">
                            {formatMoney(exp.amount)}
                          </td>

                          {/* Date */}
                          <td className="p-4 text-zinc-400 font-mono">
                            {new Date(exp.date).toLocaleDateString("ar-EG")}
                          </td>

                          {/* Description */}
                          <td className="p-4 text-zinc-300 text-right leading-relaxed font-sans max-w-[280px] truncate">
                            {exp.description || "لا يوجد شرح تفصيلي"}
                          </td>

                          {/* Category */}
                          <td className="p-4">
                            <span className="bg-zinc-900 text-zinc-300 border border-zinc-850 px-2 py-0.5 rounded text-[11px] font-bold">
                              {exp.category}
                            </span>
                          </td>

                          {/* Expense ID */}
                          <td className="p-4 font-mono font-bold text-zinc-500">
                            #{exp.id}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* CUSTOMER BALANCES TAB */}
      {activeTab === "customers_balances" && (
        <motion.div
          key="customers_balances"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 font-sans text-right"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col justify-between">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">إجمالي العملاء المسجلين</span>
              <div className="text-base font-mono text-zinc-200 font-bold">{customers.length} عميل</div>
            </div>
            
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col justify-between">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">حسابات بذمم معلقة</span>
              <div className="text-base font-mono text-amber-500 font-bold">
                {customers.map(c => {
                  const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                  const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                  return totalRemaining > 0;
                }).filter(Boolean).length} حساب
              </div>
            </div>

            {(selectedCurrency === "BOTH" || selectedCurrency === "USD") && (
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col justify-between">
                <span className="text-[10px] text-zinc-500 font-bold block mb-1">إجمالي المستحقات ($)</span>
                <div className="text-base font-mono text-emerald-400 font-bold">
                  ${customers.reduce((sum, c) => {
                    const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                    const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                    return sum + totalRemaining;
                  }, 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {(selectedCurrency === "BOTH" || selectedCurrency === "SYP") && (
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col justify-between">
                <span className="text-[10px] text-zinc-500 font-bold block mb-1">إجمالي المستحقات (ل.س)</span>
                <div className="text-base font-mono text-[#c59257] font-bold">
                  {(customers.reduce((sum, c) => {
                    const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                    const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                    return sum + totalRemaining;
                  }, 0) * exchangeRate).toLocaleString()} ل.س
                </div>
              </div>
            )}
          </div>

          {/* Search, Action & info note */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 order-2 md:order-1 w-full md:w-auto">
              <button
                onClick={() => setShowSummaryReportModal(true)}
                className="flex items-center justify-center gap-2 bg-[#c59257] hover:bg-[#b07d43] text-black text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer font-sans whitespace-nowrap"
              >
                <FileText className="w-4 h-4" />
                توليد ملخص التقرير المالي
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-[#c59257] border border-zinc-800 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer font-sans whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                تصدير ملخص الحسابات (CSV)
              </button>
              <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                💡 يظهر هذا الجدول الأسماء والبيانات الحسابية والتدقيق المالي فقط للعملاء بشكل مبسط، مع حجب كامل للمعلومات الشخصية والعناوين وأرقام الهواتف لحماية الخصوصية.
              </p>
            </div>

            <div className="flex items-center gap-2 order-1 md:order-2 w-full md:w-auto flex-wrap">
              {/* Category filter buttons */}
              <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 text-xs">
                {['الكل', 'شركة', 'أفراد', 'مقاول'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCustomerCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      customerCategoryFilter === cat
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {cat === 'شركة' && '🏢 '}
                    {cat === 'أفراد' && '👤 '}
                    {cat === 'مقاول' && '👷 '}
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-56">
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-600">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="ابحث باسم العميل..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full bg-black border border-zinc-850 rounded-lg py-2 pr-9 pl-3 text-xs text-zinc-300 focus:outline-none focus:border-indigo-600 font-sans text-right placeholder-zinc-700"
                />
              </div>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-500 font-bold">
                    <th className="p-3 text-center">حالة الحساب</th>
                    {(selectedCurrency === "BOTH" || selectedCurrency === "SYP") && (
                      <th className="p-3">الرصيد بالليرة السورية</th>
                    )}
                    {(selectedCurrency === "BOTH" || selectedCurrency === "USD") && (
                      <th className="p-3">الرصيد المتبقي بذمته ($)</th>
                    )}
                    <th className="p-3">إجمالي المدفوعات</th>
                    <th className="p-3">إجمالي المطالبات والعمل</th>
                    <th className="p-3">عدد الفواتير</th>
                    <th className="p-3 text-right">اسم العميل والتصنيف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) && (customerCategoryFilter === "الكل" || (c.category || "شركة") === customerCategoryFilter)).length === 0 ? (
                    <tr>
                      <td colSpan={selectedCurrency === "BOTH" ? 7 : 6} className="p-10 text-center text-zinc-600">
                        لا توجد حسابات عملاء تطابق بحثك والتصنيف المحدد.
                      </td>
                    </tr>
                  ) : (
                    customers
                      .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) && (customerCategoryFilter === "الكل" || (c.category || "شركة") === customerCategoryFilter))
                      .map((c) => {
                        const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                        const totalInvoiced = custInvoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
                        const totalPaid = custInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
                        const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                        const invoicesCount = custInvoices.length;

                        const isCleared = totalRemaining <= 0;

                        return (
                          <tr key={c.id} className="hover:bg-zinc-900/10 transition-all">
                            {/* Status Badge */}
                            <td className="p-3 text-center">
                              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                isCleared 
                                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" 
                                  : "bg-amber-950/40 text-amber-400 border border-amber-900/30"
                              }`}>
                                {isCleared ? "مسدد بالكامل" : "ذمة معلقة"}
                              </span>
                            </td>

                            {/* Remaining SYP */}
                            {(selectedCurrency === "BOTH" || selectedCurrency === "SYP") && (
                              <td className={`p-3 font-mono font-bold ${totalRemaining > 0 ? "text-rose-400" : "text-zinc-500"}`}>
                                {totalRemaining > 0 
                                  ? `${usdToSyp(totalRemaining, exchangeRate).toLocaleString()} ل.س` 
                                  : "-"
                                }
                              </td>
                            )}

                            {/* Remaining USD */}
                            {(selectedCurrency === "BOTH" || selectedCurrency === "USD") && (
                              <td className={`p-3 font-mono font-bold ${totalRemaining > 0 ? "text-rose-400" : "text-zinc-500"}`}>
                                {totalRemaining > 0 ? `$${totalRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                              </td>
                            )}

                            {/* Paid USD */}
                            <td className="p-3 font-mono text-emerald-400">
                              {formatMoney(totalPaid)}
                            </td>

                            {/* Invoiced USD */}
                            <td className="p-3 font-mono text-zinc-400">
                              {formatMoney(totalInvoiced)}
                            </td>

                            {/* Invoices Count */}
                            <td className="p-3 font-mono text-zinc-500">
                              {invoicesCount} فواتير
                            </td>

                            {/* Name and Category Badge */}
                            <td className="p-3 font-bold text-zinc-300 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span>{c.name}</span>
                                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border ${
                                  (c.category || 'شركة') === 'شركة'
                                    ? 'bg-blue-950/60 text-blue-300 border-blue-800/40'
                                    : (c.category || 'شركة') === 'أفراد'
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                                    : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
                                }`}>
                                  {(c.category || 'شركة') === 'شركة' && '🏢 شركة'}
                                  {(c.category || 'شركة') === 'أفراد' && '👤 أفراد'}
                                  {(c.category || 'شركة') === 'مقاول' && '👷 مقاول'}
                                  {(c.category || 'شركة') !== 'شركة' && (c.category || 'شركة') !== 'أفراد' && (c.category || 'شركة') !== 'مقاول' && (c.category || 'شركة')}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* REPORTS TAB */}
      {activeTab === "reports" && (
        <motion.div
          key="reports"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <ReportsView />
        </motion.div>
      )}

      {/* MODALS */}
      <AnimatePresence>

        {/* Modal: Simple Financial Summary Report */}
        {showSummaryReportModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-4xl relative text-right shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSummaryReportModal(false)}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="border-b border-zinc-900 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 justify-end order-2 sm:order-1">
                  <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-1 rounded text-zinc-500 font-mono">
                    سعر الصرف: {exchangeRate.toLocaleString()} ل.س/$
                  </span>
                </div>
                <h4 className="text-base font-black text-zinc-100 flex items-center gap-2 justify-end order-1 sm:order-2">
                  <FileText className="w-5 h-5 text-[#c59257]" />
                  <span>التقرير المالي المبسط ومطابقة الحسابات</span>
                </h4>
              </div>

              {/* Modal Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-1">إجمالي المطالبات</span>
                  <div className="text-sm font-mono text-zinc-300 font-bold">
                    ${invoices.reduce((sum, inv) => sum + inv.totalPrice, 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-1">إجمالي المقبوضات</span>
                  <div className="text-sm font-mono text-emerald-400 font-bold">
                    ${invoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-1">الذمم المعلقة</span>
                  <div className="text-sm font-mono text-amber-500 font-bold">
                    ${invoices.reduce((sum, inv) => sum + inv.remaining, 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-1">الذمم بالليرة السورية</span>
                  <div className="text-sm font-mono text-[#c59257] font-bold">
                    {Math.round(invoices.reduce((sum, inv) => sum + Number(inv.remaining || 0), 0)).toLocaleString()} ل.س
                  </div>
                </div>
              </div>

              {/* Toolbar & Filter Tabs */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-black/60 border border-zinc-900/80 p-2.5 rounded-xl mb-4 gap-3">
                {/* Actions */}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 bg-[#c59257]/10 hover:bg-[#c59257]/20 text-[#c59257] border border-[#c59257]/20 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير CSV / Excel</span>
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    <Printer className="w-3.5 h-3.5 text-zinc-400" />
                    <span>طباعة التقرير</span>
                  </button>
                  <button
                    onClick={handleCopyReportText}
                    className="flex items-center gap-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-400 border border-indigo-900/50 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    {summaryReportCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ النص للواتساب</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-zinc-900 border border-zinc-850 p-0.5 rounded-lg w-full sm:w-auto">
                  <button
                    onClick={() => setModalFilter("cleared")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      modalFilter === "cleared" ? "bg-black text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    المسددة بالكامل
                  </button>
                  <button
                    onClick={() => setModalFilter("remaining")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      modalFilter === "remaining" ? "bg-black text-amber-500" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    ذمم معلقة فقط
                  </button>
                  <button
                    onClick={() => setModalFilter("all")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      modalFilter === "all" ? "bg-black text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    الكل ({customers.length})
                  </button>
                </div>
              </div>

              {/* Data Table Container */}
              <div className="flex-1 overflow-y-auto border border-zinc-900 rounded-xl bg-black/20">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-900">
                    <tr className="text-zinc-500 font-bold bg-zinc-950/80">
                      <th className="p-3 text-center">حالة الحساب</th>
                      {(selectedCurrency === "BOTH" || selectedCurrency === "SYP") && (
                        <th className="p-3 text-left">الرصيد بالليرة السورية</th>
                      )}
                      {(selectedCurrency === "BOTH" || selectedCurrency === "USD") && (
                        <th className="p-3 text-left">الرصيد المتبقي ($)</th>
                      )}
                      <th className="p-3 text-left">إجمالي المقبوض ($)</th>
                      <th className="p-3 text-left">إجمالي المطالبات ($)</th>
                      <th className="p-3 text-right">اسم العميل</th>
                      <th className="p-3 text-center" style={{ width: "40px" }}>#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40">
                    {customers.filter(c => {
                      const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                      const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                      if (modalFilter === "remaining") return totalRemaining > 0;
                      if (modalFilter === "cleared") return totalRemaining <= 0;
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={selectedCurrency === "BOTH" ? 7 : 6} className="p-12 text-center text-zinc-600 font-sans">
                          لا توجد حسابات تطابق خيار التصفية المختار.
                        </td>
                      </tr>
                    ) : (
                      customers
                        .filter(c => {
                          const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                          const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                          if (modalFilter === "remaining") return totalRemaining > 0;
                          if (modalFilter === "cleared") return totalRemaining <= 0;
                          return true;
                        })
                        .map((c, index) => {
                          const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                          const totalInvoiced = custInvoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
                          const totalPaid = custInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
                          const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                          const isCleared = totalRemaining <= 0;

                          return (
                            <tr key={c.id} className="hover:bg-zinc-900/20 transition-all">
                              {/* Status Badge */}
                              <td className="p-3 text-center">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCleared 
                                    ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/20" 
                                    : "bg-amber-950/30 text-amber-400 border border-amber-900/20"
                                }`}>
                                  {isCleared ? "مسدد بالكامل" : "ذمة معلقة"}
                                </span>
                              </td>

                              {/* Remaining SYP */}
                              {(selectedCurrency === "BOTH" || selectedCurrency === "SYP") && (
                                <td className={`p-3 font-mono font-bold text-left ${totalRemaining > 0 ? "text-rose-400" : "text-zinc-500"}`}>
                                  {totalRemaining > 0 
                                    ? `${usdToSyp(totalRemaining, exchangeRate).toLocaleString()} ل.س` 
                                    : "-"
                                  }
                                </td>
                              )}

                              {/* Remaining USD */}
                              {(selectedCurrency === "BOTH" || selectedCurrency === "USD") && (
                                <td className={`p-3 font-mono font-bold text-left ${totalRemaining > 0 ? "text-rose-400" : "text-zinc-500"}`}>
                                  {totalRemaining > 0 ? `$${totalRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                                </td>
                              )}

                              {/* Paid USD */}
                              <td className="p-3 font-mono text-emerald-400 text-left">
                                {formatMoney(totalPaid)}
                              </td>

                              {/* Invoiced USD */}
                              <td className="p-3 font-mono text-zinc-500 text-left">
                                {formatMoney(totalInvoiced)}
                              </td>

                              {/* Name Only */}
                              <td className="p-3 font-bold text-zinc-300 text-right">
                                {c.name}
                              </td>

                              {/* Serial Number */}
                              <td className="p-3 text-center text-zinc-600 font-mono">
                                {index + 1}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Note / Info */}
              <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-zinc-600 text-center font-sans">
                ⚠️ التقرير أعلاه آمن تماماً، ولا يتضمن أي تفاصيل تعريفية حساسة مثل البريد الإلكتروني أو أرقام الهواتف أو العناوين.
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Create manual standalone invoice */}
        {showAddInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-md relative text-right shadow-2xl"
            >
              <button
                onClick={() => setShowAddInvoice(false)}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-zinc-100 flex items-center gap-2 justify-end mb-4 border-b border-zinc-900 pb-3">
                <FileText className="w-5 h-5 text-indigo-500" />
                <span>إصدار فاتورة عمل يدوية جديدة</span>
              </h4>

              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 font-bold block mb-1">العميل المستهدف *</label>
                  <select
                    required
                    value={newInvCustomer}
                    onChange={(e) => setNewInvCustomer(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">-- اختر عميلاً مسجلاً --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {currentUserRole === 'accountant' ? "" : (c.company ? `(${c.company})` : "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">تاريخ الاستحقاق</label>
                    <input
                      type="date"
                      value={newInvDueDate}
                      onChange={(e) => setNewInvDueDate(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">إجمالي قيمة الفاتورة ($) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={newInvTotal}
                      onChange={(e) => setNewInvTotal(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-indigo-600 font-mono text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">ملاحظات الفاتورة والتفاصيل</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب بنود أو غرض الفاتورة..."
                    value={newInvNotes}
                    onChange={(e) => setNewInvNotes(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-900 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                  >
                    إصدار الفاتورة وإدراجها بالدفاتر
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddInvoice(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Record Invoice Payment */}
        {recordingPaymentInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-sm relative text-right shadow-2xl"
            >
              <button
                onClick={() => { setPaymentError(""); setRecordingPaymentInvoice(null); }}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-zinc-100 flex items-center gap-2 justify-end mb-1">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>تسجيل دفعة مالية مقبوضة</span>
              </h4>
              <span className="text-[11px] text-zinc-500 font-mono block mb-4">
                تعديل رصيد الفاتورة رقم: {recordingPaymentInvoice.invoiceNumber}
              </span>

              <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3 mb-4 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono text-zinc-300">{formatMoneyString(recordingPaymentInvoice.totalPrice)}</span>
                  <span className="text-zinc-500">قيمة الفاتورة الإجمالية:</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-emerald-400">{formatMoneyString(recordingPaymentInvoice.paidAmount)}</span>
                  <span className="text-zinc-500">إجمالي المقبوض سابقاً:</span>
                </div>
                <div className="flex justify-between border-t border-zinc-850/60 pt-1.5 mt-1 font-bold">
                  <span className="font-mono text-amber-500">{formatMoneyString(recordingPaymentInvoice.remaining)}</span>
                  <span className="text-zinc-400">الحد الأقصى المتبقي للتحصيل:</span>
                </div>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                {paymentError && (
                  <div role="alert" className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-300">
                    {paymentError}
                  </div>
                )}
                <div>
                  <label className="text-xs text-zinc-500 font-bold block mb-1">المبلغ المدفوع حالياً ($) *</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    max={recordingPaymentInvoice.remaining}
                    step="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-emerald-600 font-mono text-left"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">شرح القيد أو رقم التحويلة البنكية</label>
                  <input
                    type="text"
                    placeholder="مثال: حوالة كليك أو دفعة نقدية بالمعرض..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-900 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
                  >
                    تثبيت الدفعة المقبوضة
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordingPaymentInvoice(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Insert / Edit Expense */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-md relative text-right shadow-2xl"
            >
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setEditingExpense(null);
                }}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-zinc-100 flex items-center gap-2 justify-end mb-4 border-b border-zinc-900 pb-3">
                <ArrowUp className="w-5 h-5 text-rose-500" />
                <span>{editingExpense ? "تعديل مستند الصرف المالي" : "إدراج قيد مصروف جديد"}</span>
              </h4>

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold block mb-1">الفئة المصنفة *</label>
                    <select
                      required
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
                    >
                      <option value="">-- اختر فئة الصرف --</option>
                      {expenseCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold block mb-1">القيمة المالية المصروفة ($) *</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-rose-500 font-mono text-left"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold block mb-1">حالة السداد *</label>
                    <select
                      value={expenseStatus}
                      onChange={(e: any) => setExpenseStatus(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none"
                    >
                      <option value="paid">تم الصرف بالكامل</option>
                      <option value="pending">مستحق / معلق بالذمة</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold block mb-1">تاريخ مستند الصرف *</label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">شرح تفصيلي للمصروف والغرض منه</label>
                  <textarea
                    rows={2}
                    placeholder="مثال: فاتورة صيانة عدسة رأس الليزر CO2 للماكينة الرئيسية..."
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-900 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/10"
                  >
                    {editingExpense ? "حفظ وتعديل القيود المالية" : "تسجيل المصروف وإصدار القيد"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExpense(false);
                      setEditingExpense(null);
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Detailed Invoice Auditor, Printer, and Editor */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-4xl relative text-right shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="border-b border-zinc-900 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-1 rounded text-zinc-400 font-mono">
                    الحالة: {selectedInvoice.status === "paid" ? "مدفوعة بالكامل" : selectedInvoice.status === "partially_paid" ? "مدفوعة جزئياً" : selectedInvoice.status === "cancelled" ? "ملغاة" : "غير مدفوعة"}
                  </span>
                  {selectedInvoice.orderId && (
                    <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-2 py-1 rounded">
                      مرتبط بالطلب: #{selectedInvoice.orderNumber}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black text-zinc-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#c59257]" />
                  <span>تفاصيل وإدارة الفاتورة رقم: {selectedInvoice.invoiceNumber}</span>
                </h4>
              </div>

              {/* Main Content Layout (Grid) */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                
                {/* General Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/20 p-4 rounded-xl border border-zinc-900">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">العميل المستهدف</span>
                    <span className="text-xs font-bold text-zinc-200">{selectedInvoice.customerName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">تاريخ الإصدار</span>
                    <span className="text-xs font-mono text-zinc-300">{new Date(selectedInvoice.issueDate).toLocaleDateString("ar-EG")}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">تاريخ الاستحقاق</span>
                    {isEditingSelectedInvoice ? (
                      <input
                        type="date"
                        value={editedInvoiceDueDate}
                        onChange={(e) => setEditedInvoiceDueDate(e.target.value)}
                        className="bg-black border border-zinc-850 rounded-lg p-1 text-xs text-zinc-200 font-mono w-full"
                      />
                    ) : (
                      <span className="text-xs font-mono text-zinc-300">
                        {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString("ar-EG") : "غير محدد"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items & Editor Area */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    {isEditingSelectedInvoice && (
                      <button
                        type="button"
                        onClick={() => setEditedInvoiceItems([...editedInvoiceItems, { name: "عنصر جديد", quantity: 1, unitPrice: 10 }])}
                        className="bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 hover:bg-indigo-900/40 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all"
                      >
                        + إضافة بند جديد للعمل
                      </button>
                    )}
                    <h5 className="text-xs font-bold text-[#c59257]">📋 بنود وعناصر الفاتورة الحالية</h5>
                  </div>

                  <div className="bg-black/40 border border-zinc-900 rounded-xl overflow-hidden">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-950/80 text-zinc-500 font-bold border-b border-zinc-900">
                          {isEditingSelectedInvoice && <th className="p-2.5 text-center" style={{ width: "60px" }}>إجراء</th>}
                          <th className="p-2.5 text-left">الإجمالي ($)</th>
                          <th className="p-2.5 text-left">سعر المفرد ($)</th>
                          <th className="p-2.5 text-left">الكمية</th>
                          <th className="p-2.5 text-right">بيان البند والخدمة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40">
                        {editedInvoiceItems.length === 0 ? (
                          <tr>
                            <td colSpan={isEditingSelectedInvoice ? 5 : 4} className="p-6 text-center text-zinc-600">
                              لا توجد بنود مدخلة لهذه الفاتورة. تظهر بقيمتها الإجمالية فقط.
                            </td>
                          </tr>
                        ) : (
                          editedInvoiceItems.map((item, idx) => {
                            const totalVal = (item.quantity || 1) * (item.unitPrice || 0);
                            return (
                              <tr key={idx} className="hover:bg-zinc-900/10">
                                {isEditingSelectedInvoice && (
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setEditedInvoiceItems(editedInvoiceItems.filter((_, i) => i !== idx))}
                                      className="text-[10px] text-rose-500 hover:text-rose-400 bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-900/30 cursor-pointer"
                                    >
                                      حذف
                                    </button>
                                  </td>
                                )}
                                
                                <td className="p-2 font-mono text-zinc-300 text-left">
                                  {formatMoneyString(totalVal)}
                                </td>
                                
                                <td className="p-2 text-left">
                                  {isEditingSelectedInvoice ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        const updated = [...editedInvoiceItems];
                                        updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                        setEditedInvoiceItems(updated);
                                      }}
                                      className="bg-black border border-zinc-800 rounded p-1 text-xs text-zinc-200 font-mono w-20 text-left"
                                    />
                                  ) : (
                                    <span className="font-mono">{formatMoneyString(item.unitPrice || 0)}</span>
                                  )}
                                </td>

                                <td className="p-2 text-left">
                                  {isEditingSelectedInvoice ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const updated = [...editedInvoiceItems];
                                        updated[idx].quantity = parseInt(e.target.value) || 1;
                                        setEditedInvoiceItems(updated);
                                      }}
                                      className="bg-black border border-zinc-800 rounded p-1 text-xs text-zinc-200 font-mono w-16 text-left"
                                    />
                                  ) : (
                                    <span className="font-mono">{item.quantity || 1}</span>
                                  )}
                                </td>

                                <td className="p-2 text-right">
                                  {isEditingSelectedInvoice ? (
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => {
                                        const updated = [...editedInvoiceItems];
                                        updated[idx].name = e.target.value;
                                        setEditedInvoiceItems(updated);
                                      }}
                                      className="bg-black border border-zinc-800 rounded p-1 text-xs text-zinc-200 w-full text-right"
                                    />
                                  ) : (
                                    <span className="text-zinc-200">{item.name}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary math block */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900/60 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 text-xs">
                    <div className="space-y-1 text-left">
                      <span className="text-zinc-500 block">الإجمالي المتبقي المستحق</span>
                      <span className="font-mono text-amber-400 font-bold text-sm">
                        {formatMoneyString(selectedInvoice.totalPrice - selectedInvoice.paidAmount)}
                      </span>
                    </div>

                    <div className="flex gap-4 items-center font-mono">
                      <div className="text-left">
                        <span className="text-zinc-500 text-[10px] block font-sans">الخصم الإضافي</span>
                        {isEditingSelectedInvoice ? (
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={editedInvoiceDiscount}
                              onChange={(e) => setEditedInvoiceDiscount(parseFloat(e.target.value) || 0)}
                              className="bg-black border border-zinc-800 rounded p-0.5 text-xs text-zinc-200 font-mono w-16 text-left"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-bold">{formatMoneyString(selectedInvoice.discount || 0)}</span>
                        )}
                      </div>

                      <div className="text-left">
                        <span className="text-zinc-500 text-[10px] block font-sans">الضريبة (%)</span>
                        {isEditingSelectedInvoice ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editedInvoiceTaxPercent}
                              onChange={(e) => setEditedInvoiceTaxPercent(parseFloat(e.target.value) || 0)}
                              className="bg-black border border-zinc-800 rounded p-0.5 text-xs text-zinc-200 font-mono w-14 text-left"
                            />
                            <span className="text-zinc-500">%</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-bold">{selectedInvoice.taxPercent || 0}%</span>
                        )}
                      </div>

                      <div className="text-left border-l border-zinc-900 pl-4">
                        <span className="text-zinc-500 text-[10px] block font-sans">صافي السعر النهائي</span>
                        <span className="text-zinc-200 font-black text-sm">
                          {formatMoneyString(selectedInvoice.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Block */}
                <div>
                  <span className="text-[10px] text-zinc-500 block mb-1">ملاحظات وشروط الفاتورة</span>
                  {isEditingSelectedInvoice ? (
                    <textarea
                      rows={2}
                      value={editedInvoiceNotes}
                      onChange={(e) => setEditedInvoiceNotes(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-zinc-200"
                    />
                  ) : (
                    <p className="text-xs bg-black/30 p-2.5 rounded border border-zinc-900 text-zinc-400 text-right">
                      {selectedInvoice.notes || "لا توجد ملاحظات مسجلة."}
                    </p>
                  )}
                </div>

                {/* History Timeline */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-zinc-500">📜 السجل الزمني للفاتورة والمطابقة الحسابية</h5>
                  <div className="bg-black/50 border border-zinc-900 p-4 rounded-xl space-y-3 font-sans text-right max-h-44 overflow-y-auto">
                    {selectedInvoice.history && selectedInvoice.history.length > 0 ? (
                      selectedInvoice.history.map((h: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start justify-end text-[11px] border-r-2 border-zinc-800 pr-2.5 mr-1">
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-600 font-mono">
                                {new Date(h.timestamp).toLocaleString("ar-EG")}
                              </span>
                              <span className="font-bold text-zinc-300">
                                {h.action === "draft" ? "إنشاء الفاتورة (مسودة)" : 
                                 h.action === "sent" ? "إرسال للعميل" : 
                                 h.action === "paid" ? "تثبيت سداد مالي" : 
                                 h.action === "cancelled" ? "إلغاء الفاتورة" : 
                                 h.action === "updated" ? "تعديل محتويات الفاتورة" : 
                                 h.action === "credit_note" ? "إصدار إشعار دائن" : h.action}
                              </span>
                            </div>
                            <p className="text-zinc-500 leading-relaxed text-right">
                              {h.notes || "-"} {h.user && <span className="text-indigo-400 font-mono">({h.user})</span>}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-zinc-600 text-center">لا توجد سجلات تاريخية سابقة لهذه الفاتورة.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="border-t border-zinc-900 pt-4 mt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                {/* Print & Download / External Actions */}
                <div className="flex flex-wrap gap-2 justify-end order-2 sm:order-1">
                  <button
                    onClick={() => setInvoiceToPrint(selectedInvoice)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-[#c59257] to-amber-600 hover:from-amber-600 hover:to-[#c59257] text-zinc-950 font-black border border-[#c59257] text-xs px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-sans shadow-md shadow-amber-950/30"
                  >
                    <Printer className="w-4 h-4 text-zinc-950" />
                    <span>طباعة الفاتورة</span>
                  </button>

                  <a
                    href={`/api/accounting/invoices/${selectedInvoice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    <Download className="w-4 h-4 text-[#c59257]" />
                    <span>تنزيل PDF</span>
                  </a>
                  
                  <button
                    onClick={() => handleShareInvoiceWhatsApp(selectedInvoice)}
                    className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans font-bold"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>مشاركة عبر واتساب 📱</span>
                  </button>

                  {selectedInvoice.orderId && (
                    <a
                      href={`/api/orders/${selectedInvoice.orderId}/delivery-note/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                    >
                      <Printer className="w-4 h-4 text-zinc-500" />
                      <span>سند التسليم (Delivery Note)</span>
                    </a>
                  )}
                  {selectedInvoice.status !== "cancelled" && (
                    <button
                      onClick={handleIssueCreditNote}
                      className="flex items-center gap-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/30 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                    >
                      <span>إصدار إشعار دائن 🔻</span>
                    </button>
                  )}
                </div>

                {/* Edit & Status transitions */}
                <div className="flex gap-2 justify-end order-1 sm:order-2">
                  {isEditingSelectedInvoice ? (
                    <>
                      <button
                        onClick={handleUpdateSelectedInvoice}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer font-bold font-sans"
                      >
                        حفظ التعديلات الحسابية
                      </button>
                      <button
                        onClick={() => setIsEditingSelectedInvoice(false)}
                        className="bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs px-4 py-1.5 rounded-lg cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditingSelectedInvoice(true)}
                        className="bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 hover:bg-indigo-900/40 text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer font-bold font-sans"
                      >
                        تعديل البنود والتسعير ✏️
                      </button>
                      
                      {selectedInvoice.status !== "paid" && (
                        <button
                          onClick={() => handleChangeInvoiceStatus("paid")}
                          className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/40 text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer font-bold font-sans"
                        >
                          تثبيت دفع الفاتورة 💵
                        </button>
                      )}

                      {selectedInvoice.status === "draft" && (
                        <button
                          onClick={() => handleChangeInvoiceStatus("sent")}
                          className="bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                        >
                          إرسال للعميل 🚀
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}

        {/* Modal: Print-Friendly Invoice Preview */}
        {invoiceToPrint && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[100] overflow-y-auto print:p-0 print:m-0 print:static print:bg-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none print:bg-white print:text-black flex flex-col max-h-[96vh] print:max-h-none"
            >
              {/* Top Action Control Bar (Hidden on Print) */}
              <div className="bg-zinc-900/90 border-b border-zinc-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#c59257]/20 border border-[#c59257]/40 flex items-center justify-center text-[#c59257]">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>معاينة طباعة الفاتورة</span>
                      <span className="text-[10px] font-mono text-[#c59257] bg-[#c59257]/10 border border-[#c59257]/30 px-2 py-0.5 rounded-full">
                        #{invoiceToPrint.invoiceNumber || invoiceToPrint.id}
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      تنسيق مبسط (Print-friendly) مع شعار الورشة وإخفاء اللوحات الجانبية والأزرار تلقائياً
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2 bg-gradient-to-r from-[#c59257] to-amber-600 hover:from-amber-600 hover:to-[#c59257] text-zinc-950 font-black rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/40"
                  >
                    <Printer className="w-4 h-4 text-zinc-950" />
                    <span>تأكيد الطباعة الفعلية</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setInvoiceToPrint(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>إغلاق</span>
                  </button>
                </div>
              </div>

              {/* Printable Document Area */}
              <div className="p-6 sm:p-10 overflow-y-auto font-sans bg-zinc-950 print:bg-white print:text-black print:p-6 print:overflow-visible text-right space-y-6">
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 sm:p-8 space-y-6 print:bg-white print:border-black print:text-black print:shadow-none print:p-0">
                  
                  {/* Header & Workshop Logo */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-zinc-800/80 pb-6 print:border-black">
                    {/* Workshop Brand Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c59257] to-amber-700 flex items-center justify-center text-zinc-950 shadow-md print:bg-black print:text-white print:shadow-none">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h1 className="text-xl font-extrabold text-zinc-100 print:text-black font-sans tracking-tight">
                            {companySettings?.name || "AXIS LAB"}
                          </h1>
                          <p className="text-xs font-bold text-[#c59257] print:text-black">
                            ورشة القص والنقش المتقدم بالليزر CO2 / CNC
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 print:text-zinc-700 font-sans mt-0.5">
                        {companySettings?.address || "عمان، الأردن"} | البريد: {companySettings?.email || "info@axislab.sy"}
                      </p>

                      {/* WhatsApp & Instagram Contact Info */}
                      <div className="flex items-center gap-2.5 text-[11px] pt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 font-mono font-bold print:bg-transparent print:border-black print:text-black print:p-0">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                          <span>واتساب المبيعات: {companySettings?.whatsapp || companySettings?.phone || "+962790000000"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-950/50 text-pink-300 border border-pink-800/40 font-mono font-bold print:bg-transparent print:border-black print:text-black print:p-0">
                          <Instagram className="w-3.5 h-3.5 text-pink-400 print:text-black" />
                          <span>إنستغرام: {companySettings?.instagram ? (companySettings.instagram.includes('/') ? `@${companySettings.instagram.split('/').filter(Boolean).pop()}` : companySettings.instagram) : "@axislab_laser"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Invoice Meta Box */}
                    <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl text-right space-y-1 min-w-[230px] print:bg-white print:border-black print:text-black">
                      <div className="text-xs font-black text-[#c59257] print:text-black uppercase font-mono">
                        فاتورة ماليـة معتمدة
                      </div>
                      <div className="text-xs font-mono font-bold text-zinc-200 print:text-black">
                        رقم الفاتورة: #{invoiceToPrint.invoiceNumber || invoiceToPrint.id}
                      </div>
                      <div className="text-[11px] text-zinc-400 print:text-zinc-800 font-mono">
                        تاريخ الإصدار: {new Date(invoiceToPrint.issueDate).toLocaleDateString("ar-EG")}
                      </div>
                      <div className="text-[11px] text-zinc-400 print:text-zinc-800 font-mono">
                        تاريخ الاستحقاق: {invoiceToPrint.dueDate ? new Date(invoiceToPrint.dueDate).toLocaleDateString("ar-EG") : "فوري عند التسليم"}
                      </div>
                      <div className="pt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          invoiceToPrint.status === "paid"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-400 print:border-black print:text-black"
                            : invoiceToPrint.status === "partially_paid"
                            ? "bg-amber-950/60 border-amber-800 text-amber-400 print:border-black print:text-black"
                            : "bg-rose-950/60 border-rose-800 text-rose-400 print:border-black print:text-black"
                        }`}>
                          {invoiceToPrint.status === "paid" ? "مدفوعة بالكامل" : invoiceToPrint.status === "partially_paid" ? "مدفوعة جزئياً" : "غير مدفوعة"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Order Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                    {/* Customer Info Box */}
                    <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl space-y-1.5 print:bg-white print:border-black print:text-black">
                      <h4 className="font-bold text-[#c59257] print:text-black text-xs border-b border-zinc-800 pb-1 print:border-black">
                        بيانات العميل المستلم
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 print:text-zinc-700">اسم العميل:</span>
                        <span className="font-bold text-zinc-200 print:text-black">{invoiceToPrint.customerName || "عميل الورشة"}</span>
                      </div>
                      {invoiceToPrint.orderNumber && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400 print:text-zinc-700">رقم الطلب المرتبط:</span>
                          <span className="font-mono font-bold text-indigo-400 print:text-black">#{invoiceToPrint.orderNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Workshop Order Summary Box */}
                    <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl space-y-1.5 print:bg-white print:border-black print:text-black">
                      <h4 className="font-bold text-[#c59257] print:text-black text-xs border-b border-zinc-800 pb-1 print:border-black">
                        معلومات التوثيق والاعتماد
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 print:text-zinc-700">مرجع النظام:</span>
                        <span className="font-mono text-zinc-300 print:text-black">{invoiceToPrint.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 print:text-zinc-700">جهة الإصدار:</span>
                        <span className="font-bold text-zinc-300 print:text-black">قسم المحاسبة والمالية - AXIS LAB</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-zinc-300 print:text-black text-xs">
                      تفاصيل البنود والمشغولات المشحونة:
                    </h4>
                    <div className="border border-zinc-800 rounded-xl overflow-hidden print:border-black">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono print:bg-zinc-100 print:text-black print:border-black">
                            <th className="p-3 text-center w-10">#</th>
                            <th className="p-3 text-right">وصف البند / المادة والمنتج</th>
                            <th className="p-3 text-center w-20">الكمية</th>
                            <th className="p-3 text-right w-28">السعر الفردي ($)</th>
                            <th className="p-3 text-right w-28">الإجمالي ($)</th>
                            <th className="p-3 text-right w-36">المكافئ (ل.س)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850 print:divide-zinc-300">
                          {invoiceToPrint.items && invoiceToPrint.items.length > 0 ? (
                            invoiceToPrint.items.map((item: any, idx: number) => {
                              const lineTotalUSD = (item.quantity || 1) * (item.unitPrice || 0);
                              const lineTotalSYP = Math.round(lineTotalUSD * exchangeRate);
                              return (
                                <tr key={idx} className="hover:bg-zinc-900/40 print:hover:bg-transparent">
                                  <td className="p-3 text-center font-mono text-zinc-500 print:text-black">{idx + 1}</td>
                                  <td className="p-3 font-semibold text-zinc-200 print:text-black">{item.name}</td>
                                  <td className="p-3 text-center font-mono text-zinc-300 print:text-black">{item.quantity}</td>
                                  <td className="p-3 font-mono text-zinc-300 print:text-black">${item.unitPrice?.toFixed(2)}</td>
                                  <td className="p-3 font-mono font-bold text-zinc-200 print:text-black">${lineTotalUSD.toFixed(2)}</td>
                                  <td className="p-3 font-mono text-[#c59257] print:text-black font-bold">{lineTotalSYP.toLocaleString()} ل.س</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="p-3 text-center font-mono text-zinc-500 print:text-black">1</td>
                              <td className="p-3 font-semibold text-zinc-200 print:text-black">
                                خدمة قص ونقش بالليزر وتنفيذ طلبية #{invoiceToPrint.orderNumber || invoiceToPrint.invoiceNumber}
                              </td>
                              <td className="p-3 text-center font-mono text-zinc-300 print:text-black">1</td>
                              <td className="p-3 font-mono text-zinc-300 print:text-black">${printedTotalUSD.toFixed(2)}</td>
                              <td className="p-3 font-mono font-bold text-zinc-200 print:text-black">${printedTotalUSD.toFixed(2)}</td>
                              <td className="p-3 font-mono text-[#c59257] print:text-black font-bold">{printedTotalSYP.toLocaleString()} ل.س</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Totals Breakdown Box */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-t border-zinc-800 pt-4 print:border-black">
                    <div className="text-xs text-zinc-400 print:text-zinc-800 max-w-sm space-y-1">
                      <span className="font-bold text-zinc-300 print:text-black block">ملاحظات وتعليمات الفاتورة:</span>
                      <p className="leading-relaxed">
                        {invoiceToPrint.notes || "لا توجد ملاحظات إضافية مسجلة على هذه الفاتورة."}
                      </p>
                    </div>

                    <div className="w-full sm:w-80 bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2 text-xs font-sans print:bg-white print:border-black print:text-black">
                      <div className="flex justify-between text-zinc-400 print:text-zinc-700">
                        <span>الخصم الممنوح:</span>
                        <span className="font-mono font-bold">${Number(invoiceToPrint.discount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400 print:text-zinc-700">
                        <span>نسبة الضريبة:</span>
                        <span className="font-mono font-bold">{invoiceToPrint.taxPercent || 0}%</span>
                      </div>
                      <div className="border-t border-zinc-850 pt-2 flex justify-between items-center print:border-black">
                        <span className="font-bold text-zinc-200 print:text-black">المبلغ الإجمالي بالدولار:</span>
                        <span className="text-base font-mono font-extrabold text-zinc-100 print:text-black">${printedTotalUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#c59257] print:text-black">
                        <span className="font-extrabold text-xs">المبلغ الإجمالي بالليرة السورية:</span>
                        <span className="text-base font-mono font-black">{printedTotalSYP.toLocaleString()} ل.س</span>
                      </div>
                      <div className="border-t border-zinc-850 pt-2 flex justify-between text-emerald-400 print:text-black">
                        <span>المبلغ المقبوض:</span>
                        <span className="font-mono font-bold">{printedPaidSYP.toLocaleString()} ل.س (${printedPaidUSD.toFixed(2)})</span>
                      </div>
                      <div className="flex justify-between text-rose-400 print:text-black font-bold">
                        <span>المبلغ المتبقي للتحصيل:</span>
                        <span className="font-mono">{printedRemainingSYP.toLocaleString()} ل.س (${printedRemainingUSD.toFixed(2)})</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Signatures */}
                  <div className="pt-6 border-t border-zinc-800 space-y-6 print:border-black">
                    <div className="text-[10px] text-zinc-500 print:text-zinc-800 leading-relaxed bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 print:bg-white print:border-black">
                      <span className="font-bold text-zinc-400 print:text-black block mb-0.5">الشروط والأحكام المالية:</span>
                      البضائع والمشغولات الخاصة المقصوصة بالليزر تصنع حسب الطلب خصيصاً وهي غير قابلة للإرجاع بعد القص والتسليم. تعد هذه الفاتورة سنداً مالياً وتصميمياً معتمداً من الورشة.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 text-center text-xs print:grid-cols-3">
                      <div className="space-y-6 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 print:bg-white print:border-black print:p-1">
                        <span className="text-xs font-bold text-zinc-300 print:text-black block">
                          توقيع الموظف المسؤول
                        </span>
                        <span className="text-[10px] text-zinc-500 print:text-zinc-700 block -mt-4 font-mono">
                          (منظم الفاتورة)
                        </span>
                        <div className="border-b border-dashed border-zinc-700 w-32 mx-auto print:border-black"></div>
                      </div>

                      <div className="space-y-6 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 print:bg-white print:border-black print:p-1">
                        <span className="text-xs font-bold text-zinc-300 print:text-black block">
                          اعتماد قسم المحاسبة والمالية
                        </span>
                        <span className="text-[10px] text-zinc-500 print:text-zinc-700 block -mt-4">
                          (الختم المالي)
                        </span>
                        <div className="border-b border-dashed border-zinc-700 w-32 mx-auto print:border-black"></div>
                      </div>

                      <div className="space-y-6 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 print:bg-white print:border-black print:p-1">
                        <span className="text-xs font-bold text-zinc-300 print:text-black block">
                          توقيع واستلام الزبون المستلم
                        </span>
                        <span className="text-[10px] text-zinc-500 print:text-zinc-700 block -mt-4">
                          (المستلم المعتمد)
                        </span>
                        <div className="border-b border-dashed border-zinc-700 w-32 mx-auto print:border-black"></div>
                      </div>
                    </div>
                  </div>

                  {/* 📱 DYNAMIC QR CODE FOR PUBLIC INVOICE PDF ACCESS */}
                  {(() => {
                    const qrUrl = typeof window !== 'undefined'
                      ? `${window.location.origin}/api/orders/${invoiceToPrint.orderId || invoiceToPrint.id}/pdf`
                      : `https://axislab-portal.sy/api/orders/${invoiceToPrint.orderId || invoiceToPrint.id}/pdf`;
                    return (
                      <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-4 print:bg-white print:border-black print:p-2 print:rounded-lg">
                        <div className="space-y-1 text-right flex-1">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-amber-400 print:text-black">
                            <span>التحقق من الفاتورة وتحميل نسخة PDF (QR Code)</span>
                            <QrCode className="w-4 h-4 text-[#c59257] print:text-black" />
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed print:text-zinc-700">
                            امسح الرمز ضوئياً للتحقق من صحة الفاتورة المالية واستعراض النسخة الإلكترونية المعتمدة.
                          </p>
                          <div className="text-[9px] font-mono text-zinc-500 truncate dir-ltr text-left print:text-black print:font-bold">
                            {qrUrl}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-zinc-700 shadow-md print:border-black print:shadow-none shrink-0 flex items-center justify-center">
                          <QRCodeSVG 
                            value={qrUrl} 
                            size={76} 
                            bgColor="#ffffff" 
                            fgColor="#000000" 
                            level="M" 
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Footer Branding & Social Contact */}
                  <div className="text-center text-[10px] text-zinc-400 print:text-black pt-3 border-t border-zinc-900 print:border-black space-y-1">
                    <div className="flex items-center justify-center gap-4 text-xs font-bold flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                        <span>واتساب: {companySettings?.whatsapp || companySettings?.phone || "+962790000000"}</span>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Instagram className="w-3.5 h-3.5 text-pink-400 print:text-black" />
                        <span>إنستغرام: {companySettings?.instagram ? (companySettings.instagram.includes('/') ? `@${companySettings.instagram.split('/').filter(Boolean).pop()}` : companySettings.instagram) : "@axislab_laser"}</span>
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-600 print:text-zinc-700 font-mono">
                      AXIS LAB OS • Powered by CNC Laser Technologies • تم إنشاء وطباعة الفاتورة برمجياً بواسطة النظام المالي
                    </p>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}
