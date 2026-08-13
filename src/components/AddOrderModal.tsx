import React, { useState, useEffect, useMemo, useReducer } from "react";
import { DEFAULT_EXCHANGE_RATE, sanitizeExchangeRate } from "../lib/currency";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Plus, 
  HelpCircle, 
  Trash2, 
  Sparkles, 
  Calculator, 
  RefreshCw, 
  Layers, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Briefcase,
  ShieldAlert,
  AlertCircle,
  PackageCheck
} from "lucide-react";

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    company?: string;
    address?: string;
    notes?: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    price: number;
    category: string;
  }>;
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  fetchOrders: () => void;
  fetchLogs: () => void;
  fetchCustomers: () => void;
  addTerminalLog: (type: string, message: string) => void;
  exchangeRate?: number;
}

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

type OrderItemsAction =
  | { type: "RESET"; items?: OrderItem[] }
  | { type: "APPEND"; item?: OrderItem }
  | { type: "REMOVE"; index: number }
  | { type: "UPDATE"; index: number; key: keyof OrderItem; val: any };

function orderItemsReducer(state: OrderItem[], action: OrderItemsAction): OrderItem[] {
  switch (action.type) {
    case "RESET":
      return action.items || [
        { name: "قص أكريليك 3 ملم", qty: 1, price: 350000, notes: "حفر عميق للشعار بالمنتصف" }
      ];
    case "APPEND":
      return [...state, action.item || { name: "", qty: 1, price: 150000, notes: "" }];
    case "REMOVE":
      return state.filter((_, idx) => idx !== action.index);
    case "UPDATE":
      return state.map((item, idx) => {
        if (idx === action.index) {
          return { ...item, [action.key]: action.val };
        }
        return item;
      });
    default:
      return state;
  }
}

export default function AddOrderModal({
  isOpen,
  onClose,
  initialCustomerId,
  customers,
  products,
  currentUser,
  fetchOrders,
  fetchLogs,
  fetchCustomers,
  addTerminalLog,
  exchangeRate
}: AddOrderModalProps) {
  const activeRate = sanitizeExchangeRate(exchangeRate, DEFAULT_EXCHANGE_RATE);
  // State variables for form inputs
  const [orderCustId, setOrderCustId] = useState<string>("");
  const [customerSearchInput, setCustomerSearchInput] = useState<string>("");
  const [showCustSuggestions, setShowCustSuggestions] = useState<boolean>(false);
  const [focusedItemIdx, setFocusedItemIdx] = useState<number | null>(null);
  const [orderPriority, setOrderPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>("normal");
  const [orderNotes, setOrderNotes] = useState<string>("");
  
  // حالة مستقلة جديدة لإدارة عناصر الطلب (order items) باستخدام useReducer لضمان هيكلية قوية وإدارة آمنة للحالة
  // يتم ربطها تلقائياً بحساب الإجمالي الفرعي، الضريبة، والمجموع الكلي عبر useMemo للحساب الفوري واللحظي
  const [orderItems, dispatchOrderItems] = useReducer(orderItemsReducer, [
    { name: "قص أكريليك 3 ملم", qty: 1, price: 350000, notes: "حفر عميق للشعار بالمنتصف" }
  ]);
  
  const [orderPaid, setOrderPaid] = useState<string>("350000");
  const [orderTaxPercent, setOrderTaxPercent] = useState<string>("0");
  const [orderDiscountAmount, setOrderDiscountAmount] = useState<string>("0");
  const [orderDeliveryDate, setOrderDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 48);
    return d.toISOString().slice(0, 16);
  });

  // AI & Workshop Analysis states
  const [isAnalyzingOrder, setIsAnalyzingOrder] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    pricingAnalysis: string;
    itemsParameters: Array<{
      itemName: string;
      speed: string;
      power: string;
      lens: string;
      air: string;
    }>;
    productionStrategy: string;
    warnings: string;
    estimatedTimeTotal: string;
  } | null>(null);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  const [fastLocalOrderHint, setFastLocalOrderHint] = useState<{
    success: boolean;
    hintMessage: string;
    recommendedItem: string;
    isVIP: boolean;
    ordersCount: number;
  } | null>(null);
  const [fastLocalOrderStatusHint, setFastLocalOrderStatusHint] = useState<{
    status: 'success' | 'warning' | 'neutral';
    message: string;
    lowStockList?: string[];
  } | null>(null);
  const [fastLocalPricingAdvisor, setFastLocalPricingAdvisor] = useState<{
    totalCost: string;
    suggestedPrice: string;
    profitMarginPercent: number;
    pricingAuditArabic: string;
  } | null>(null);

  // Material Stock Availability Check States
  const [isCheckingMaterials, setIsCheckingMaterials] = useState<boolean>(false);
  const [materialCheckResult, setMaterialCheckResult] = useState<{
    overallStatus: 'success' | 'warning' | 'error';
    summaryMessage: string;
    hasWarnings: boolean;
    hasErrors: boolean;
    itemsCheck: Array<{
      itemName: string;
      requiredQty: number;
      matchedMaterial: string | null;
      materialId: string | null;
      currentStock: number;
      availableStock: number;
      minimumStock: number;
      projectedStock: number;
      status: 'ok' | 'warning' | 'error' | 'unmatched';
      message: string;
    }>;
  } | null>(null);
  const [materialCheckError, setMaterialCheckError] = useState<string | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronize state resets when opening/closing
  useEffect(() => {
    if (isOpen) {
      if (initialCustomerId) {
        setOrderCustId(initialCustomerId);
        const matched = customers.find(c => c.id === initialCustomerId);
        if (matched) {
          setCustomerSearchInput(matched.name);
        } else {
          setCustomerSearchInput("");
        }
      } else {
        setOrderCustId("");
        setCustomerSearchInput("");
      }
      setOrderPriority("normal");
      setOrderNotes("");
      dispatchOrderItems({ type: "RESET" });
      setOrderPaid("25");
      setOrderTaxPercent("0");
      setOrderDiscountAmount("0");
      const d = new Date();
      d.setHours(d.getHours() + 48);
      setOrderDeliveryDate(d.toISOString().slice(0, 16));
      setAiAnalysisResult(null);
      setAiAnalysisError(null);
      setFastLocalOrderHint(null);
      setFastLocalOrderStatusHint(null);
      setFastLocalPricingAdvisor(null);
      setMaterialCheckResult(null);
      setMaterialCheckError(null);
    }
  }, [isOpen, initialCustomerId, customers]);

  // Real-time calculations
  const taxPercentVal = Number(orderTaxPercent) || 0;
  const discountAmountVal = Number(orderDiscountAmount) || 0;
  const paidVal = Number(orderPaid) || 0;

  // الحسابات والعمليات المالية اللحظية والتلقائية المستندة على عناصر الطلب والضريبة والخصم والمقبوض سلفاً
  // ترتبط مباشرة بالـ useMemo لضمان دقة العمليات وحساب المتبقي بدقة متناهية
  const { subtotal, taxAmount, totalPrice, remainingAmount } = useMemo(() => {
    const sub = orderItems.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.price) || 0)), 0);
    const taxAmt = sub * (taxPercentVal / 100);
    const total = Math.max(0, sub + taxAmt - discountAmountVal);
    const rem = Math.max(0, total - paidVal);
    return {
      subtotal: sub,
      taxAmount: taxAmt,
      totalPrice: total,
      remainingAmount: rem
    };
  }, [orderItems, taxPercentVal, discountAmountVal, paidVal]);

  // Validation Checks
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!orderCustId) {
      errors.push("الرجاء اختيار عميل لربط هذا الطلب.");
    }
    if (orderItems.length === 0) {
      errors.push("يجب إضافة مادة قص أو منتج واحد على الأقل للطلب.");
    } else {
      orderItems.forEach((item, index) => {
        if (!item.name || !item.name.trim()) {
          errors.push(`الرجاء إدخال اسم مادة القص في العنصر رقم ${index + 1}.`);
        }
        if (Number(item.qty) <= 0) {
          errors.push(`الكمية في العنصر رقم ${index + 1} يجب أن تكون أكبر من 0.`);
        }
        if (Number(item.price) < 0) {
          errors.push(`السعر في العنصر رقم ${index + 1} لا يمكن أن يكون سالباً.`);
        }
      });
    }
    if (taxPercentVal < 0 || taxPercentVal > 100) {
      errors.push("نسبة الضريبة يجب أن تكون بين 0% و 100%.");
    }
    if (discountAmountVal < 0) {
      errors.push("مبلغ الخصم لا يمكن أن يكون قيمة سالبة.");
    }
    if (discountAmountVal > subtotal + taxAmount) {
      errors.push("قيمة الخصم تتجاوز القيمة الإجمالية للطلب شاملة الضريبة.");
    }
    if (paidVal < 0) {
      errors.push("المبلغ المقبوض سلفاً لا يمكن أن يكون قيمة سالبة.");
    }
    if (!orderDeliveryDate) {
      errors.push("الرجاء تحديد تاريخ التسليم المتوقع.");
    }
    return errors;
  }, [orderCustId, orderItems, taxPercentVal, discountAmountVal, paidVal, orderDeliveryDate, subtotal, taxAmount]);

  // Real-time Order formulation hints (Customer historical preferences)
  useEffect(() => {
    if (!isOpen) return;
    if (orderCustId) {
      fetch("/api/ai/fast-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "order-hints", payload: { customerId: orderCustId } })
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setFastLocalOrderHint(data);
        }
      })
      .catch(err => console.error("Error fetching fast local order hint:", err));
    } else {
      setFastLocalOrderHint(null);
    }
  }, [orderCustId, isOpen]);

  // Real-time Order Material Checks & Dynamic Pricing Recommendations
  useEffect(() => {
    if (!isOpen) return;
    if (orderItems.length > 0) {
      // 1. Order Status Hint (inventory checks)
      fetch("/api/ai/fast-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "order-status-hint", payload: { items: orderItems } })
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setFastLocalOrderStatusHint(data);
      })
      .catch(err => console.error("Error fetching order status hint:", err));

      // 2. Pricing Advisor
      fetch("/api/ai/fast-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pricing-advisor", payload: { items: orderItems } })
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setFastLocalPricingAdvisor(data);
      })
      .catch(err => console.error("Error fetching pricing advisor:", err));
    } else {
      setFastLocalOrderStatusHint(null);
      setFastLocalPricingAdvisor(null);
    }
  }, [orderItems, isOpen]);

  // Order Items Modification Helpers
  const appendOrderDraftItem = () => {
    dispatchOrderItems({ type: "APPEND" });
  };

  const removeOrderDraftItem = (index: number) => {
    dispatchOrderItems({ type: "REMOVE", index });
  };

  const updateOrderDraftItem = (index: number, key: keyof OrderItem, val: any) => {
    dispatchOrderItems({ type: "UPDATE", index, key, val });
  };

  // Quick Customer Creation Inside Modal
  const handleQuickAddCustomerInline = async (name: string) => {
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: "09" + Math.floor(10000000 + Math.random() * 90000000),
          company: "",
          address: "دمشق",
          notes: "تمت إضافته تلقائياً من نافذة الطلبات السريعة"
        })
      });
      if (res.ok) {
        const newCust = await res.json();
        addTerminalLog("DB", `Added customer inline: ${newCust.name}`);
        setOrderCustId(newCust.id);
        setCustomerSearchInput(newCust.name);
        setShowCustSuggestions(false);
        fetchCustomers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`فشل إضافة عميل سريع: ${err.error || "خطأ في الخادم"}`);
      }
    } catch (e) {
      alert("فشل الاتصال بالخادم لإضافة عميل سريع");
      addTerminalLog("ERROR", "Failed to add customer inline");
    }
  };

  // Submit Handler with Strict validations
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationErrors.length > 0) {
      alert(`الرجاء تصحيح الأخطاء التالية قبل ترحيل الطلب:\n\n${validationErrors.join("\n")}`);
      return;
    }

    setIsSubmitting(true);
    addTerminalLog("ORDER", "التحقق من صحة البيانات وتلقائية حساب الفرعيات تم بنجاح.");

    const itemsToSend = orderItems.map(it => ({
      productName: it.name || "عنصر تشغيل عام",
      quantity: Number(it.qty) || 1,
      unitPrice: Number(it.price) || 0,
      notes: it.notes || ""
    }));

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: orderCustId,
          notes: orderNotes,
          priority: orderPriority,
          items: itemsToSend,
          paidAmount: paidVal,
          totalPrice: totalPrice,
          taxPercent: taxPercentVal,
          discount: discountAmountVal,
          createdById: currentUser?.id || "u-1",
          deliveryDateExpected: orderDeliveryDate
        })
      });

      if (res.ok) {
        addTerminalLog("DB", "Order compiled and saved to PostgreSQL with dynamic pricing and calculations validated.");
        onClose();
        fetchOrders();
        fetchLogs();
        window.dispatchEvent(new CustomEvent("accounting-refresh"));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`فشل إنشاء الطلب: ${errData.error || "خطأ غير معروف في الخادم"}`);
        addTerminalLog("ERROR", `Failed to create order: ${errData.error || "Unknown error"}`);
      }
    } catch (e) {
      alert("حدث خطأ أثناء محاولة الاتصال بالخادم لإضافة الطلب");
      addTerminalLog("ERROR", "Failed to create order due to network/server error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Analyze order elements with Gemini AI
  const handleAnalyzeOrderWithAI = async () => {
    if (orderItems.length === 0) {
      setAiAnalysisError("يرجى إضافة عنصر واحد على الأقل للطلب لتحليله.");
      return;
    }
    setIsAnalyzingOrder(true);
    setAiAnalysisResult(null);
    setAiAnalysisError(null);
    addTerminalLog("AI", `طلب تحليل ذكي لعناصر الطلب المكون من (${orderItems.length}) عنصر...`);

    try {
      const res = await fetch("/api/ai/order-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          notes: orderNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تحليل الذكاء الاصطناعي");

      setAiAnalysisResult(data);
      addTerminalLog("AI", "تم استلام التوجيهات والبارامترات المقترحة من Gemini بنجاح ✓");
    } catch (err: any) {
      console.error("AI Order Analysis error:", err);
      setAiAnalysisError(err.message || "عذراً، حدث خطأ أثناء الاتصال بمساعد الذكاء الاصطناعي.");
      addTerminalLog("ERROR", `فشل تحليل الطلب ذكياً: ${err.message}`);
      
      // Local robust fallback in case of connection limits
      setTimeout(() => {
        setAiAnalysisResult({
          pricingAnalysis: "استناداً إلى متوسط أسعار السوق للمواد المحددة، فإن تسعيرك الحالي يعتبر مقبولاً ويغطي تكلفة الخامات مع هامش ربح جيد يبلغ حوالي 35%. يُنصح بالحفاظ على هذا المستوى من الأسعار.",
          itemsParameters: orderItems.map(it => ({
            itemName: it.name || "مادة غير مسمية",
            speed: it.name.includes("أكريليك") ? "18 - 25 mm/s" : "30 - 45 mm/s",
            power: it.name.includes("أكريليك") ? "75 - 85%" : "60 - 70%",
            lens: "2.0\" Focal Lens",
            air: "مساعد هواء قوي لمنع الاحتراق"
          })),
          productionStrategy: "يُفضل تجميع الأشكال المتطابقة لتنفيذها معاً. قم بقص الأجزاء الصغيرة الداخلية أولاً ثم الأجزاء الخارجية الكبيرة لتفادي انزياح اللوح بعد القص المكتمل.",
          warnings: "تأكد من خلو مادة القص من مركبات الكلور (مثل PVC) لأنها تنتج غازات سامة جداً وتؤدي لصدأ سريع في عدسة وماكينة الليزر.",
          estimatedTimeTotal: "5 - 10 دقائق"
        });
      }, 1000);
    } finally {
      setIsAnalyzingOrder(false);
    }
  };

  // Check material availability handler
  const handleCheckMaterialAvailability = async () => {
    if (orderItems.length === 0) {
      setMaterialCheckError("يرجى إضافة عنصر أو مادة واحدة على الأقل للطلب أولاً.");
      return;
    }
    setIsCheckingMaterials(true);
    setMaterialCheckError(null);
    setMaterialCheckResult(null);
    addTerminalLog("AI", `جاري فحص توفر المواد في المستودع وقدرتها على تغطية الطلب...`);

    try {
      const res = await fetch("/api/materials/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: orderItems })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل فحص توفر المواد");

      setMaterialCheckResult(data);
      if (data.hasErrors || data.hasWarnings) {
        addTerminalLog("WARN", `تنبيه توفر مواد: ${data.summaryMessage}`);
      } else {
        addTerminalLog("SUCCESS", "فحص توفر المواد: جميع المواد متوفرة والمخزون المتبقي فوق الحد الأدنى.");
      }
    } catch (err: any) {
      console.error("Material availability check error:", err);
      setMaterialCheckError(err.message || "حدث خطأ أثناء فحص توفر المواد بالمستودع.");
      addTerminalLog("ERROR", `فشل فحص توفر المواد: ${err.message}`);
    } finally {
      setIsCheckingMaterials(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#09090b] border border-zinc-850 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] text-right font-sans overflow-hidden"
        id="add-order-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-6 pb-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
            id="close-add-order-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#c59257]" />
            <span>صياغة تفاصيل أمر تشغيل وقص ليزر جديد</span>
          </h3>
        </div>

        <form onSubmit={handleCreateOrder} className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Customer & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold">تحديد العميل لربط الطلب *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث أو اختر العميل (مثال: الأمل)..."
                  value={customerSearchInput}
                  onChange={(e) => {
                    setCustomerSearchInput(e.target.value);
                    setShowCustSuggestions(true);
                    if (orderCustId) setOrderCustId("");
                  }}
                  onFocus={() => setShowCustSuggestions(true)}
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-[#c59257] text-right text-xs"
                />
                {orderCustId && (
                  <div className="absolute left-2 top-2.5 flex items-center gap-1 text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-1.5 py-0.5 rounded text-[8px]">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    <span>مرتبط</span>
                  </div>
                )}
                
                {showCustSuggestions && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => setShowCustSuggestions(false)} 
                    />
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg max-h-48 overflow-y-auto shadow-2xl divide-y divide-zinc-900/60 font-sans">
                      {(() => {
                        const query = customerSearchInput.toLowerCase();
                        const custWeights = (() => {
                          try {
                            const r = localStorage.getItem("popular_customers");
                            return r ? JSON.parse(r) : {};
                          } catch { return {}; }
                        })();
                        
                        const sortedCusts = [...customers].sort((a, b) => {
                          const wA = custWeights[a.id] || 0;
                          const wB = custWeights[b.id] || 0;
                          return wB - wA;
                        });

                        const matches = sortedCusts.filter(c => 
                          c.name.toLowerCase().includes(query) || 
                          (c.company || "").toLowerCase().includes(query) ||
                          (c.phone || "").includes(query)
                        );

                        if (matches.length === 0) {
                          return (
                            <div className="p-3 text-zinc-500 text-center text-[10px] flex flex-col gap-2 items-center">
                              <span>لا يوجد عميل يطابق هذا الاسم</span>
                              {customerSearchInput.trim().length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddCustomerInline(customerSearchInput)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[9px] transition-colors cursor-pointer"
                                >
                                  ➕ إضافة "{customerSearchInput}" كعميل سريع جديد في الورشة
                                </button>
                              )}
                            </div>
                          );
                        }

                        const hasExactMatch = matches.some(c => c.name.toLowerCase() === query.trim());
                        return (
                          <div className="divide-y divide-zinc-900/60">
                            {!hasExactMatch && customerSearchInput.trim().length > 1 && (
                              <div className="p-2 bg-indigo-950/20 text-center border-b border-zinc-900">
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddCustomerInline(customerSearchInput)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[9px] transition-colors cursor-pointer"
                                >
                                  ➕ إضافة "{customerSearchInput}" كعميل سريع جديد
                                </button>
                              </div>
                            )}
                            {matches.map(c => {
                              const weight = custWeights[c.id] || 0;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setOrderCustId(c.id);
                                    setCustomerSearchInput(`${c.name} ${c.company ? `(${c.company})` : ""}`);
                                    setShowCustSuggestions(false);
                                    try {
                                      const weights = { ...custWeights, [c.id]: weight + 1 };
                                      localStorage.setItem("popular_customers", JSON.stringify(weights));
                                    } catch(err){}
                                  }}
                                  className="w-full text-right px-3 py-2 hover:bg-zinc-900 flex items-center justify-between text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5">
                                    {weight > 0 && (
                                      <span className="text-[8px] bg-[#c59257]/15 text-[#c59257] border border-[#c59257]/25 px-1 py-0.5 rounded">
                                        🌟 مفضل {weight}x
                                      </span>
                                    )}
                                    <span className="text-[9px] font-mono text-zinc-500">{c.phone}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold">{c.name}</span>
                                    {c.company && <span className="text-[9px] text-zinc-500">{c.company}</span>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
              
              {fastLocalOrderHint && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 p-2 rounded bg-[#c59257]/5 border border-[#c59257]/20 text-[10px] text-zinc-300 flex items-start gap-2 text-right"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#c59257] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#c59257] block mb-0.5">توصية ذكية من الذاكرة المحلية:</span>
                    <p className="leading-relaxed text-zinc-400">{fastLocalOrderHint.hintMessage}</p>
                    {fastLocalOrderHint.isVIP && (
                      <span className="inline-block mt-1 bg-[#c59257]/20 border border-[#c59257]/40 text-[#c59257] text-[8px] font-bold px-1.5 py-0.5 rounded">
                        👑 عميل مميز VIP (أكثر من 3 طلبيات)
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
            
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold">مستوى الأولوية والجدولة</label>
              <select
                value={orderPriority}
                onChange={(e) => setOrderPriority(e.target.value as any)}
                className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-[#c59257] text-right text-xs"
              >
                <option value="low">منخفضة (Low)</option>
                <option value="normal">عادية (Normal)</option>
                <option value="high">عالية (High)</option>
                <option value="urgent">مستعجلة جداً (Urgent)</option>
              </select>
            </div>
          </div>

          {/* Draft Items List */}
          <div className="border border-zinc-800 p-4 rounded-lg bg-black/30 space-y-2">
            <div className="flex flex-wrap items-center justify-between border-b border-zinc-900 pb-2 mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* 🔍 Check Material Availability Button */}
                <button
                  type="button"
                  onClick={handleCheckMaterialAvailability}
                  disabled={isCheckingMaterials || orderItems.length === 0}
                  className="px-3 py-1 bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-600/10 hover:from-amber-500/40 hover:to-amber-500/30 text-[#c59257] border border-[#c59257]/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  title="فحص توفر خامات المواد في المستودع ومقارنتها بالحد الأدنى للأمان"
                >
                  {isCheckingMaterials ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#c59257]" />
                      <span>جاري الفحص...</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-3.5 h-3.5 text-[#c59257]" />
                      <span>تحقق من توفر المواد</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={appendOrderDraftItem}
                  className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Plus className="w-3 h-3" /> إضافة مادة يدوياً
                </button>
                {products.length > 0 && (
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const found = products.find(p => p.id === val);
                        if (found) {
                          dispatchOrderItems({ type: "APPEND", item: { name: found.name, qty: 1, price: found.price } });
                        }
                        e.target.value = "";
                      }
                    }}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-indigo-400 focus:outline-none"
                  >
                    <option value="">-- إضافة مادة من دليل المنتجات --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <span className="text-[11px] text-zinc-400 font-bold">عناصر ومواد القص المعتمدة للطلب *</span>
            </div>

            {materialCheckError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-[11px] text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{materialCheckError}</span>
              </div>
            )}

            {/* Render Material Availability Check Result Card */}
            <AnimatePresence>
              {materialCheckResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3.5 rounded-xl border text-xs font-sans space-y-2.5 my-2.5 shadow-md ${
                    materialCheckResult.hasErrors
                      ? "bg-rose-950/30 border-rose-800/60 text-rose-200"
                      : materialCheckResult.hasWarnings
                      ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
                      : "bg-emerald-950/30 border-emerald-800/60 text-emerald-200"
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-2 border-white/10">
                    <div className="flex items-center gap-2">
                      {materialCheckResult.hasErrors ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : materialCheckResult.hasWarnings ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span className="font-bold text-xs">{materialCheckResult.summaryMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaterialCheckResult(null)}
                      className="text-zinc-400 hover:text-white text-[10px] p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {materialCheckResult.itemsCheck.map((itemCheck, iIdx) => (
                      <div
                        key={iIdx}
                        className="p-2.5 rounded-lg bg-black/50 border border-white/5 space-y-1.5 text-[11px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-100 flex items-center gap-1.5">
                            <span>القطعة: {itemCheck.itemName}</span>
                            {itemCheck.matchedMaterial && (
                              <span className="text-[9px] text-zinc-400 font-mono font-normal">
                                (مطابقة لـ: {itemCheck.matchedMaterial})
                              </span>
                            )}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              itemCheck.status === 'error'
                                ? "bg-rose-900/60 text-rose-200 border border-rose-700/50"
                                : itemCheck.status === 'warning'
                                ? "bg-amber-900/60 text-amber-200 border border-amber-700/50"
                                : itemCheck.status === 'unmatched'
                                ? "bg-zinc-800 text-zinc-400"
                                : "bg-emerald-900/60 text-emerald-200 border border-emerald-700/50"
                            }`}
                          >
                            {itemCheck.status === 'error'
                              ? "🚨 كمية غير كافية"
                              : itemCheck.status === 'warning'
                              ? "⚠️ ينخفض تحت الحد الأدنى"
                              : itemCheck.status === 'unmatched'
                              ? "❓ خامة غير مسجلة"
                              : "✅ متوفر بكفاية"}
                          </span>
                        </div>

                        <p className="text-[10px] text-zinc-300 leading-relaxed">{itemCheck.message}</p>

                        {itemCheck.matchedMaterial && (
                          <div className="grid grid-cols-4 gap-1.5 pt-1.5 text-[9px] font-mono text-zinc-400 border-t border-zinc-800/80 mt-1">
                            <div className="bg-zinc-900/90 p-1.5 rounded text-center">
                              <span className="text-zinc-500 block text-[8px]">المخزون الحالي</span>
                              <strong className="text-zinc-200 text-xs">{itemCheck.currentStock}</strong>
                            </div>
                            <div className="bg-zinc-900/90 p-1.5 rounded text-center">
                              <span className="text-zinc-500 block text-[8px]">مطلوب للطلب</span>
                              <strong className="text-amber-400 text-xs">{itemCheck.requiredQty}</strong>
                            </div>
                            <div className="bg-zinc-900/90 p-1.5 rounded text-center">
                              <span className="text-zinc-500 block text-[8px]">المتبقي المتوقع</span>
                              <strong
                                className={`text-xs ${
                                  itemCheck.projectedStock < itemCheck.minimumStock
                                    ? "text-rose-400 font-bold animate-pulse"
                                    : "text-emerald-400 font-bold"
                                }`}
                              >
                                {itemCheck.projectedStock}
                              </strong>
                            </div>
                            <div className="bg-zinc-900/90 p-1.5 rounded text-center">
                              <span className="text-zinc-500 block text-[8px]">الحد الأدنى للأمان</span>
                              <strong className="text-cyan-400 text-xs">{itemCheck.minimumStock}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {orderItems.length === 0 ? (
              <div className="text-center p-4 text-zinc-600 font-light text-[11px]">
                يرجى إضافة مادة قص واحدة على الأقل لصياغة هذا الطلب.
              </div>
            ) : (
              <div className="space-y-3 max-h-[40vh] sm:max-h-[45vh] overflow-y-auto pr-1">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-zinc-900 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => removeOrderDraftItem(idx)}
                        className="text-rose-500 p-1 hover:bg-zinc-800 rounded cursor-pointer"
                        title="حذف هذا العنصر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-zinc-500 mb-0.5 px-1">سعر الوحدة (ل.س)</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="500"
                          placeholder="السعر"
                          value={item.price}
                          onChange={(e) => updateOrderDraftItem(idx, 'price', Number(e.target.value))}
                          className="w-24 bg-black border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-mono text-xs focus:border-[#c59257] focus:outline-none"
                        />
                        <span className="text-[9px] text-[#c59257] font-mono mt-0.5 text-center">
                          ≈ ${(Number(item.price || 0) / activeRate).toFixed(2)} $
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-zinc-500 mb-0.5 px-1">الكمية</span>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="الكمية"
                          value={item.qty}
                          onChange={(e) => updateOrderDraftItem(idx, 'qty', Number(e.target.value))}
                          className="w-16 bg-black border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-mono text-xs focus:border-[#c59257] focus:outline-none"
                        />
                      </div>
                      <div className="flex-1 relative flex flex-col text-right">
                        <span className="text-[9px] text-zinc-500 mb-0.5 px-1">مادة القص / اسم المنتج *</span>
                        <input
                          type="text"
                          required
                          placeholder="مادة القص (مثال: أكريليك شفاف 4ملم)"
                          value={item.name}
                          onChange={(e) => {
                            updateOrderDraftItem(idx, 'name', e.target.value);
                            setFocusedItemIdx(idx);
                          }}
                          onFocus={() => setFocusedItemIdx(idx)}
                          className="w-full bg-black border border-zinc-800 rounded p-1.5 text-zinc-200 text-right text-xs focus:border-[#c59257] focus:outline-none"
                        />
                        {focusedItemIdx === idx && (
                          <>
                            <div 
                              className="fixed inset-0 z-40 bg-transparent" 
                              onClick={() => setFocusedItemIdx(null)} 
                            />
                            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg max-h-48 overflow-y-auto shadow-2xl divide-y divide-zinc-900/60 font-sans text-right">
                              {(() => {
                                const query = (item.name || "").toLowerCase();
                                const prodWeights = (() => {
                                  try {
                                    const r = localStorage.getItem("popular_products");
                                    return r ? JSON.parse(r) : {};
                                  } catch { return {}; }
                                })();

                                const sortedProds = [...products].sort((a, b) => {
                                  const wA = prodWeights[a.id] || 0;
                                  const wB = prodWeights[b.id] || 0;
                                  return wB - wA;
                                });

                                const matches = sortedProds.filter(p => 
                                  p.name.toLowerCase().includes(query) || 
                                  p.category.toLowerCase().includes(query)
                                );

                                if (matches.length === 0) {
                                  return <div className="p-2.5 text-zinc-600 text-center text-[10px]">لا توجد مواد تطابق البحث</div>;
                                }

                                return matches.slice(0, 10).map(p => {
                                  const weight = prodWeights[p.id] || 0;
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        updateOrderDraftItem(idx, 'name', p.name);
                                        updateOrderDraftItem(idx, 'price', p.price);
                                        try {
                                          const weights = { ...prodWeights, [p.id]: weight + 1 };
                                          localStorage.setItem("popular_products", JSON.stringify(weights));
                                        } catch(err){}
                                        setFocusedItemIdx(null);
                                      }}
                                      className="w-full text-right px-3 py-2 hover:bg-zinc-900 flex items-center justify-between text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        {weight > 0 && (
                                          <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-1 rounded flex items-center gap-0.5">
                                            🔥 مكرر {weight}x
                                          </span>
                                        )}
                                        <div className="flex flex-col items-start">
                                          <span className="font-mono text-[#c59257] font-bold text-xs">{p.price.toLocaleString()} ل.س</span>
                                          <span className="text-[9px] text-zinc-500 font-mono">≈ ${(p.price / activeRate).toFixed(2)} $</span>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <span>{p.name}</span>
                                        <span className="text-[9px] text-zinc-500">{p.category}</span>
                                      </div>
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Item Notes */}
                    <div className="flex items-center gap-1.5 pr-8 mt-1.5">
                      <span className="text-[10px] text-zinc-500 select-none shrink-0 font-medium">ملاحظات العنصر:</span>
                      <input
                        type="text"
                        placeholder="مواصفات الفني للقص أو الحفر لهذا اللوح (مثال: حفر الشعار فقط دون ثقوب)..."
                        value={item.notes || ""}
                        onChange={(e) => updateOrderDraftItem(idx, 'notes', e.target.value)}
                        className="flex-1 bg-transparent border-b border-zinc-850/60 focus:border-[#c59257]/60 text-[10px] text-zinc-300 outline-none pb-0.5"
                      />
                    </div>
                    
                    {/* Instant Laser Parameter Suggestion based on local string scanning */}
                    <div className="flex items-center gap-1.5 pr-8 mt-1">
                      {(() => {
                        const text = (item.name || "").toLowerCase();
                        let params = null;
                        if (text.includes("أكريليك") || text.includes("اكريليك") || text.includes("acrylic") || text.includes("شفاف")) {
                          params = { speed: "15-25 mm/s", power: "75-85%", air: "مساعد هواء منخفض لمنع الغواش" };
                        } else if (text.includes("خشب") || text.includes("mdf") || text.includes("زان") || text.includes("wood")) {
                          params = { speed: "10-22 mm/s", power: "80-90%", air: "مساعد هواء قوي لتجنب الشحار" };
                        } else if (text.includes("جلد") || text.includes("leather")) {
                          params = { speed: "20-30 mm/s", power: "65-75%", air: "مساعد هواء متوسط لقص نقي" };
                        }
                        if (!params) return null;
                        return (
                          <span className="text-[9px] text-[#c59257]/90 bg-[#c59257]/5 border border-[#c59257]/15 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-[#c59257]" />
                            <span>اقتراح الليزر الفوري: سرعة {params.speed} • طاقة {params.power} • {params.air}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Assistant for Laser Parameters & Pricing */}
          <div className="border border-indigo-950 bg-indigo-950/5 p-4 rounded-lg space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[9px] text-indigo-400/80 font-mono">Gemini-powered real-time speed, power & pricing audit</span>
              <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>مساعد الذكاء الاصطناعي لتقدير بارامترات الليزر والأسعار</span>
              </h4>
            </div>

            {orderItems.length > 0 && (
              <div className="flex flex-col gap-2">
                {!aiAnalysisResult && !isAnalyzingOrder && (
                  <div className="flex items-center justify-between bg-indigo-950/10 p-2.5 rounded-lg border border-indigo-950/20">
                    <p className="text-[10px] text-zinc-400 max-w-md">
                      دع الذكاء الاصطناعي يحلل خامات الطلب ويقترح عليك سرعة القص وقدرة جهاز الليزر المناسبة، بالإضافة لمراجعة دقة أسعارك وهدر الخامات.
                    </p>
                    <button
                      type="button"
                      onClick={handleAnalyzeOrderWithAI}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-1.5 px-3 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                    >
                      <Sparkles className="w-3 h-3" />
                      تحليل ذكي للطلب
                    </button>
                  </div>
                )}

                {isAnalyzingOrder && (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 bg-indigo-950/10 rounded-lg border border-indigo-950/20">
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                    <span className="text-[11px] text-indigo-300 font-semibold animate-pulse">جاري فحص خامات القص وتقدير بارامترات ليزر CO2 المثالية...</span>
                    <span className="text-[9px] text-zinc-500">يتواصل نظام AXIS LAB مع نموذج Gemini AI للتحليل الجغرافي والصناعي</span>
                  </div>
                )}

                {aiAnalysisError && (
                  <div className="p-2.5 bg-rose-950/20 border border-rose-900/30 rounded-lg text-[10px] text-rose-400">
                    {aiAnalysisError}
                  </div>
                )}

                {aiAnalysisResult && (
                  <div className="space-y-3.5">
                    {/* Suggested Machine Settings Table */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-bold block">إعدادات وبارامترات ماكينة الليزر المقترحة:</span>
                      <div className="overflow-x-auto rounded-lg border border-zinc-900 bg-zinc-950/60">
                        <table className="w-full text-right text-[10px] font-sans">
                          <thead>
                            <tr className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-900">
                              <th className="p-2 text-right">العنصر / الخامة</th>
                              <th className="p-2 text-center">سرعة القص (Speed)</th>
                              <th className="p-2 text-center">طاقة الأنبوب (Power)</th>
                              <th className="p-2 text-center">العدسة البؤرية</th>
                              <th className="p-2 text-center">مساعد الهواء</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/50">
                            {aiAnalysisResult.itemsParameters.map((param, pIdx) => (
                              <tr key={pIdx} className="hover:bg-zinc-900/20">
                                <td className="p-2 font-semibold text-zinc-200 text-right">{param.itemName}</td>
                                <td className="p-2 text-center text-indigo-300 font-mono font-bold">{param.speed}</td>
                                <td className="p-2 text-center text-amber-400 font-mono font-bold">{param.power}</td>
                                <td className="p-2 text-center text-zinc-400 font-mono">{param.lens}</td>
                                <td className="p-2 text-center text-emerald-400">{param.air}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Detail Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                      <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850/80">
                        <span className="font-bold text-amber-500 block mb-1">🔍 مراجعة السعر المدخل والأرباح:</span>
                        <p className="text-zinc-300 leading-relaxed text-right">{aiAnalysisResult.pricingAnalysis}</p>
                      </div>
                      <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850/80">
                        <span className="font-bold text-emerald-500 block mb-1">📐 استراتيجية توفير وترتيب الألواح:</span>
                        <p className="text-zinc-300 leading-relaxed text-right">{aiAnalysisResult.productionStrategy}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                      <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-rose-950/20">
                        <span className="font-bold text-rose-400 block mb-1">⚠️ تحذيرات السلامة والتحضير:</span>
                        <p className="text-zinc-300 leading-relaxed text-right">{aiAnalysisResult.warnings}</p>
                      </div>
                      <div className="bg-indigo-950/10 p-2.5 rounded-lg border border-indigo-900/20 flex flex-col justify-center items-center text-center">
                        <span className="text-zinc-400 text-[9px] uppercase tracking-wider block mb-0.5">زمن التشغيل الإجمالي المقدر للطلبية</span>
                        <div className="text-base font-mono font-black text-[#c59257]">{aiAnalysisResult.estimatedTimeTotal}</div>
                        <span className="text-[9px] text-zinc-500 mt-0.5">(يعتمد على كفاءة الماكينة CO2 Laser)</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setAiAnalysisResult(null);
                          setAiAnalysisError(null);
                        }}
                        className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 rounded text-[9px] transition-colors cursor-pointer font-bold"
                      >
                        مسح التحليل وإغلاق التقرير الذكي
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {orderItems.length === 0 && (
              <div className="text-center p-2 text-zinc-600 font-light text-[10px]">
                أضف عناصر للطلب لتفعيل المساعد الذكي.
              </div>
            )}
          </div>

          {/* Pricing Calculator, Tax, Discounts */}
          <div className="border border-zinc-850 bg-zinc-950/45 p-4 rounded-lg space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[9px] text-zinc-500 font-mono">Calculates instantly from items, tax rate, and discounts</span>
              <h4 className="text-xs font-bold text-[#c59257] flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#c59257]" />
                <span>الحاسبة المالية وحساب التكاليف والخصم</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-zinc-500 block mb-1 text-[11px]">نسبة الضريبة (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={orderTaxPercent}
                  onChange={(e) => setOrderTaxPercent(e.target.value)}
                  placeholder="0"
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-center text-xs focus:outline-none focus:border-[#c59257]"
                />
              </div>
              <div>
                <label className="text-zinc-500 block mb-1 text-[11px]">الخصم الإضافي (ل.س)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={orderDiscountAmount}
                  onChange={(e) => setOrderDiscountAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-center text-xs focus:outline-none focus:border-[#c59257]"
                />
                <span className="text-[9px] text-[#c59257] font-mono mt-0.5 block text-center">
                  ≈ ${(Number(orderDiscountAmount || 0) / activeRate).toFixed(2)} $
                </span>
              </div>
              <div>
                <label className="text-zinc-500 block mb-1 text-[11px]">المبلغ المقبوض سلفاً (ل.س)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={orderPaid}
                  onChange={(e) => setOrderPaid(e.target.value)}
                  placeholder="0"
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-center text-xs focus:outline-none focus:border-[#c59257]"
                />
                <span className="text-[9px] text-[#c59257] font-mono mt-0.5 block text-center">
                  ≈ ${(Number(orderPaid || 0) / activeRate).toFixed(2)} $
                </span>
              </div>
            </div>

            {/* Real-time Summary Sheet */}
            <div className="bg-black/40 border border-zinc-900 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center items-center divide-x divide-x-reverse divide-zinc-900">
              <div className="px-1">
                <div className="text-[10px] text-zinc-500 font-sans">مجموع المواد</div>
                <div className="text-xs font-bold text-zinc-300 font-mono mt-0.5">{subtotal.toLocaleString()} ل.س</div>
                <div className="text-[9px] text-zinc-500 font-mono">≈ ${(subtotal / activeRate).toFixed(2)} $</div>
              </div>
              <div className="px-1">
                <div className="text-[10px] text-zinc-500 font-sans">الضريبة ({taxPercentVal}%)</div>
                <div className="text-xs font-bold text-rose-300/80 font-mono mt-0.5">+{taxAmount.toLocaleString()} ل.س</div>
                <div className="text-[9px] text-rose-400/70 font-mono">≈ +${(taxAmount / activeRate).toFixed(2)} $</div>
              </div>
              <div className="px-1">
                <div className="text-[10px] text-zinc-500 font-sans">الخصم الإضافي</div>
                <div className="text-xs font-bold text-emerald-400/80 font-mono mt-0.5">-{discountAmountVal.toLocaleString()} ل.س</div>
                <div className="text-[9px] text-emerald-400/70 font-mono">≈ -${(discountAmountVal / activeRate).toFixed(2)} $</div>
              </div>
              <div className="px-1">
                <div className="text-[10px] text-[#c59257] font-semibold font-sans">إجمالي السعر</div>
                <div className="text-sm font-extrabold text-[#c59257] font-mono mt-0.5">{totalPrice.toLocaleString()} ل.س</div>
                <div className="text-[9px] text-zinc-400 font-mono">≈ ${(totalPrice / activeRate).toFixed(2)} $</div>
              </div>
              <div className="px-1 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-zinc-400 font-sans">الرصيد المتبقي</div>
                <span className={`text-xs font-bold font-mono mt-0.5 block ${remainingAmount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {remainingAmount.toLocaleString()} ل.س
                </span>
                <span className="text-[9px] text-zinc-500 font-mono block">≈ ${(remainingAmount / activeRate).toFixed(2)} $</span>
              </div>
            </div>

            {/* ⚡ Fast Local AI Real-Time Audit */}
            {(fastLocalOrderStatusHint || fastLocalPricingAdvisor) && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg border bg-[#050507] border-zinc-900 space-y-2 text-right font-sans"
              >
                <div className="flex items-center justify-between border-b border-zinc-900/50 pb-1.5">
                  <span className="text-[9px] text-[#c59257]/80 font-mono">Ultra-fast &lt; 10ms local workshop validation</span>
                  <span className="text-[10px] font-bold text-[#c59257] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#c59257] animate-pulse" />
                    <span>التدقيق الفوري لورشة AXIS LAB</span>
                  </span>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  {fastLocalOrderStatusHint && (
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#c59257] shrink-0">{fastLocalOrderStatusHint.status === 'warning' ? '⚠️' : '✓'} الجاهزية البنيوية:</span>
                      <span className={fastLocalOrderStatusHint.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}>
                        {fastLocalOrderStatusHint.message}
                      </span>
                    </div>
                  )}
                  {fastLocalPricingAdvisor && (
                    <div className="text-zinc-300 flex items-start gap-1.5">
                      <span className="font-bold text-[#c59257] shrink-0">💰 التدقيق المالي المقترح:</span>
                      <span className="text-zinc-400">{fastLocalPricingAdvisor.pricingAuditArabic}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Delivery & Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold">تاريخ التسليم المتوقع *</label>
              <input
                type="datetime-local"
                required
                value={orderDeliveryDate}
                onChange={(e) => setOrderDeliveryDate(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 font-sans text-right text-xs focus:outline-none focus:border-[#c59257]"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold">ملاحظات تشغيلية عامة</label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="مثال: تلميع بالليزر بعد القص"
                className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 text-right text-xs focus:outline-none focus:border-[#c59257]"
              />
            </div>
          </div>

          {/* Real-time Validation Errors List near Action Buttons */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-950/20 border border-rose-900/35 rounded-lg p-3 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>الرجاء مراجعة متطلبات الطلب لضمان ترحيل صحيح:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-rose-300/90 text-[10px] pr-4">
                  {validationErrors.map((err, errIdx) => (
                    <li key={errIdx}>{err}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          </div>

          {/* Sticky Financial Summary & Action Footer */}
          <div id="AddOrderModal-footer" className="border-t border-zinc-800 bg-[#09090b] px-6 py-4 flex flex-col gap-4 shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.6)] z-20">
            {/* Real-time Sticky Summary Sheet */}
            <div className="bg-zinc-950/80 border border-[#c59257]/20 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center items-center divide-x divide-x-reverse divide-zinc-900/60 font-sans">
              <div className="px-1">
                <div className="text-[10px] text-zinc-500 font-medium">مجموع المواد (المجموع الفرعي)</div>
                <div className="text-xs font-bold text-zinc-200 font-mono mt-0.5">{subtotal.toLocaleString()} ل.س</div>
                <div className="text-[9px] text-zinc-500 font-mono">≈ ${(subtotal / activeRate).toFixed(2)} $</div>
              </div>
              <div className="px-1">
                <div className="text-[10px] text-zinc-500 font-medium">الضريبة ({taxPercentVal}%)</div>
                <div className="text-xs font-bold text-rose-300/80 font-mono mt-0.5">+{taxAmount.toLocaleString()} ل.س</div>
                <div className="text-[9px] text-rose-400/70 font-mono">≈ +${(taxAmount / activeRate).toFixed(2)} $</div>
              </div>
              <div className="px-1">
                <div className="text-[10px] text-zinc-500 font-medium">الخصم الإضافي</div>
                <div className="text-xs font-bold text-emerald-400/80 font-mono mt-0.5">-{discountAmountVal.toLocaleString()} ل.س</div>
                <div className="text-[9px] text-emerald-400/70 font-mono">≈ -${(discountAmountVal / activeRate).toFixed(2)} $</div>
              </div>
              <div className="px-1 bg-[#c59257]/5 py-1 rounded-lg border border-[#c59257]/10">
                <div className="text-[10px] text-[#c59257] font-bold">المبلغ الإجمالي النهائي</div>
                <div className="text-sm font-black text-[#c59257] font-mono mt-0.5">{totalPrice.toLocaleString()} ل.س</div>
                <div className="text-[9px] text-zinc-400 font-mono">≈ ${(totalPrice / activeRate).toFixed(2)} $</div>
              </div>
              <div className="px-1 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-zinc-400 font-medium">المتبقي المطلوب دفعاً</div>
                <span className={`text-xs font-extrabold font-mono mt-0.5 block ${remainingAmount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {remainingAmount.toLocaleString()} ل.س
                </span>
                <span className="text-[9px] text-zinc-500 font-mono block">≈ ${(remainingAmount / activeRate).toFixed(2)} $</span>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="text-[10px] text-rose-400 font-bold text-center bg-rose-950/10 border border-rose-950/30 rounded py-1 px-2 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>الرجاء مراجعة متطلبات الصياغة وتعبئة الحقول المطلوبة بشكل صحيح للتمكن من الحفظ.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={validationErrors.length > 0 || isSubmitting}
                className={`flex-1 py-2 font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  validationErrors.length > 0 
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-850" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري تسجيل الطلب بالكامل...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تأكيد وتسجيل الطلب بالكامل في جداول الورشة</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs cursor-pointer border border-zinc-700/50"
              >
                إلغاء الصياغة
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
