import React, { useState, useEffect } from "react";
import { DEFAULT_EXCHANGE_RATE } from "../lib/currency";
import { materialPriceSYP, materialPriceUSD } from "../lib/materials";
import {
  GitCompare,
  DollarSign,
  Truck,
  Star,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Phone,
  MessageSquare,
  ShieldCheck,
  TrendingDown,
  Printer,
  Copy,
  Check,
  X,
  Building2,
  Award,
  ShoppingCart
} from "lucide-react";

export interface SupplierQuote {
  id: string;
  materialId: string;
  supplierId: string;
  supplierName: string;
  pricePerUnit: number;
  minOrderQuantity: number;
  deliveryDays: number;
  paymentTerms: string;
  qualityRating: number;
  notes: string;
  updatedAt: string;
}

interface SupplierPriceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: any;
  materials: any[];
  suppliers: any[];
  exchangeRate?: number;
  onSelectMaterial: (m: any) => void;
  onCreateSupplyOrder: (supplierId: string, materialId: string, quantity: number, unitPrice: number, notes: string) => void;
  onMaterialUpdated?: () => void;
}

export default function SupplierPriceComparisonModal({
  isOpen,
  onClose,
  material,
  materials,
  suppliers,
  exchangeRate = DEFAULT_EXCHANGE_RATE,
  onSelectMaterial,
  onCreateSupplyOrder,
  onMaterialUpdated
}: SupplierPriceComparisonModalProps) {
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'rating'>('price');
  const [batchQty, setBatchQty] = useState<number>(20);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // New Quote Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [customSupplierName, setCustomSupplierName] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newMinQty, setNewMinQty] = useState<string>("10");
  const [newDeliveryDays, setNewDeliveryDays] = useState<string>("2");
  const [newPaymentTerms, setNewPaymentTerms] = useState<string>("آجل 30 يوم");
  const [newRating, setNewRating] = useState<number>(4.8);
  const [newNotes, setNewNotes] = useState<string>("");

  // Direct Supply Order Quick Form state
  const [orderModalQuote, setOrderModalQuote] = useState<SupplierQuote | null>(null);
  const [orderQty, setOrderQty] = useState<number>(20);
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Fetch Quotes for selected material
  useEffect(() => {
    if (!material?.id || !isOpen) return;
    fetchQuotes();
  }, [material?.id, isOpen]);

  const fetchQuotes = async () => {
    if (!material?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/materials/${material.id}/supplier-quotes`);
      const data = await res.json();
      if (data.success && Array.isArray(data.quotes)) {
        setQuotes(data.quotes);
      } else {
        // Fallback quotes if empty
        generateDefaultQuotes();
      }
    } catch {
      generateDefaultQuotes();
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultQuotes = () => {
    if (!material) return;
    const basePrice = materialPriceSYP(material.pricePerUnit) || 1350;
    const primarySupName = material.supplier?.name || "الشركة الوطنية للاكريليك";

    const defaultList: SupplierQuote[] = [
      {
        id: "sq-def-1",
        materialId: material.id,
        supplierId: material.supplierId || "s-1",
        supplierName: primarySupName,
        pricePerUnit: basePrice,
        minOrderQuantity: 10,
        deliveryDays: 2,
        paymentTerms: "آجل 30 يوم",
        qualityRating: 4.8,
        notes: "المورد المعتمد الحالي - ضمان حماية الألواح وتوصيل مجاني للورشة.",
        updatedAt: new Date().toISOString()
      },
      {
        id: "sq-def-2",
        materialId: material.id,
        supplierId: "s-2",
        supplierName: "شركة البلاستيك والمواد الصناعية",
        pricePerUnit: Math.max(5, Number((basePrice * 0.91).toFixed(2))),
        minOrderQuantity: 25,
        deliveryDays: 4,
        paymentTerms: "نقدي عند الطلب (خصم 5%)",
        qualityRating: 4.5,
        notes: "سعر جملة منافس جداً عند طلب أكثر من 25 لوح.",
        updatedAt: new Date().toISOString()
      },
      {
        id: "sq-def-3",
        materialId: material.id,
        supplierId: "s-3",
        supplierName: "مستورد الشام للتوريد السريع",
        pricePerUnit: Number((basePrice * 1.06).toFixed(2)),
        minOrderQuantity: 3,
        deliveryDays: 1,
        paymentTerms: "دفع عند الاستلام",
        qualityRating: 4.9,
        notes: "تسليم فوري بنفس اليوم لحالات الطلبات الطارئة السريعة.",
        updatedAt: new Date().toISOString()
      }
    ];
    setQuotes(defaultList);
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material?.id || !newPrice) return;

    let supName = customSupplierName;
    if (selectedSupplierId) {
      const found = suppliers.find(s => s.id === selectedSupplierId);
      if (found) supName = found.name;
    }

    try {
      const res = await fetch(`/api/materials/${material.id}/supplier-quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId || "s-custom",
          supplierName: supName || "مورد جديد",
          pricePerUnit: Number(newPrice),
          minOrderQuantity: Number(newMinQty) || 1,
          deliveryDays: Number(newDeliveryDays) || 1,
          paymentTerms: newPaymentTerms,
          qualityRating: Number(newRating) || 4.5,
          notes: newNotes
        })
      });
      const data = await res.json();
      if (data.success && data.quotes) {
        setQuotes(data.quotes);
      } else if (data.quote) {
        setQuotes([...quotes, data.quote]);
      }
      setShowAddForm(false);
      setNewPrice("");
      setCustomSupplierName("");
      setNewNotes("");
    } catch (err) {
      console.error("Error adding supplier quote:", err);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!window.confirm("هل أنت تأكد من حذف عرض السعر هذا من المقارنة؟")) return;
    try {
      await fetch(`/api/materials/${material.id}/supplier-quotes/${quoteId}`, {
        method: "DELETE"
      });
      setQuotes(quotes.filter(q => q.id !== quoteId));
    } catch {
      setQuotes(quotes.filter(q => q.id !== quoteId));
    }
  };

  const handleSetPrimarySupplier = async (quote: SupplierQuote) => {
    if (!window.confirm(`هل تريد اعتماد المورد (${quote.supplierName}) كمورد رئيسي وسعره (${quote.pricePerUnit.toLocaleString()} ل.س) لهذه الخامة؟`)) return;

    try {
      await fetch(`/api/materials/${material.id}/set-primary-supplier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: quote.supplierId,
          supplierName: quote.supplierName,
          pricePerUnit: quote.pricePerUnit
        })
      });
      if (onMaterialUpdated) onMaterialUpdated();
      alert(`تم اعتماد المورد (${quote.supplierName}) وتحديث السعر الأساسي للخامة بنجاح!`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmSupplyOrder = () => {
    if (!orderModalQuote || !material) return;
    onCreateSupplyOrder(
      orderModalQuote.supplierId,
      material.id,
      orderQty,
      orderModalQuote.pricePerUnit,
      orderNotes || `طلب توريد بناءً على مقارنة الأسعار - سعر الوحدة المتفق عليه ${orderModalQuote.pricePerUnit.toLocaleString()} ل.س`
    );
    setOrderModalQuote(null);
  };

  const handleCopyWhatsAppSummary = () => {
    if (!material || quotes.length === 0) return;
    const lowest = sortedQuotes[0];
    const fastest = [...quotes].sort((a, b) => a.deliveryDays - b.deliveryDays)[0];

    let summary = `📊 *تقرير مقارنة أسعار الموردين - AXIS LAB*\n`;
    summary += `📦 *الخامة:* ${material.name} (${material.category} ${material.thickness ? `${material.thickness}مم` : ""})\n`;
    summary += `💲 *السعر الحالي المعتمد:* ${Number(material.pricePerUnit).toLocaleString()} ل.س (≈ $${(Number(material.pricePerUnit) / (exchangeRate || DEFAULT_EXCHANGE_RATE)).toFixed(2)})\n\n`;
    summary += `*عروض الموردين المتاحة:*\n`;

    quotes.forEach((q, idx) => {
      summary += `${idx + 1}. *${q.supplierName}*\n`;
      summary += `   - السعر: ${q.pricePerUnit.toLocaleString()} ل.س / ${material.unit || 'وحدة'} (≈ $${(q.pricePerUnit / (exchangeRate || DEFAULT_EXCHANGE_RATE)).toFixed(2)})\n`;
      summary += `   - مدة التوريد: ${q.deliveryDays} أيام | أدنى طلب: ${q.minOrderQuantity} قطع\n`;
      summary += `   - شروط الدفع: ${q.paymentTerms}\n\n`;
    });

    if (lowest) {
      summary += `⭐ *التوصية المالية بالدفعة:* الشراء من (${lowest.supplierName}) بسعر ${lowest.pricePerUnit.toLocaleString()} ل.س يوفر ${(Math.round((Number(material.pricePerUnit) - lowest.pricePerUnit) * batchQty)).toLocaleString()} ل.س لدفعة مكونة من ${batchQty} لوح.`;
    }

    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  if (!isOpen || !material) return null;

  // Sorting
  const sortedQuotes = [...quotes].sort((a, b) => {
    if (sortBy === 'price') return a.pricePerUnit - b.pricePerUnit;
    if (sortBy === 'delivery') return a.deliveryDays - b.deliveryDays;
    if (sortBy === 'rating') return b.qualityRating - a.qualityRating;
    return 0;
  });

  const lowestQuote = sortedQuotes.reduce((prev, curr) => (curr.pricePerUnit < prev.pricePerUnit ? curr : prev), quotes[0]);
  const highestQuote = sortedQuotes.reduce((prev, curr) => (curr.pricePerUnit > prev.pricePerUnit ? curr : prev), quotes[0]);
  const fastestQuote = quotes.reduce((prev, curr) => (curr.deliveryDays < prev.deliveryDays ? curr : prev), quotes[0]);
  const topRatedQuote = quotes.reduce((prev, curr) => (curr.qualityRating > prev.qualityRating ? curr : prev), quotes[0]);

  const currentPrice = Number(material.pricePerUnit) || 0;
  const widthM = material.width ? Number(material.width) / 1000 : 0;
  const heightM = material.height ? Number(material.height) / 1000 : 0;
  const areaM2 = widthM * heightM;

  const maxPriceDiff = highestQuote && lowestQuote ? (highestQuote.pricePerUnit - lowestQuote.pricePerUnit) * batchQty : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right">
        
        {/* HEADER BAR */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 px-5 py-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c59257]/10 border border-[#c59257]/30 flex items-center justify-center shrink-0 shadow-inner">
              <GitCompare className="w-5 h-5 text-[#c59257]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">مركز مقارنة أسعار الموردين</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c59257]/20 text-[#c59257] border border-[#c59257]/30 font-mono">
                  قسم المشتريات والمالية
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                تحليل وتتبع عروض أسعار الموردين المختلفة لنفس الخامة لاتخاذ قرار شراء ذكي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsAppSummary}
              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="نسخ ملخص المقارنة للمشاركة مع قسم المشتريات والمالية"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? "تم النسخ!" : "نسخ التقرير لـ WhatsApp"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MATERIAL SELECTOR & SPECS TOOLBAR */}
        <div className="bg-zinc-900/60 px-5 py-3 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-bold">الخامة المحددة:</span>
              <select
                value={material.id}
                onChange={(e) => {
                  const m = materials.find(mat => mat.id === e.target.value);
                  if (m) onSelectMaterial(m);
                }}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 font-bold focus:border-[#c59257] focus:outline-none cursor-pointer"
              >
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category} {m.thickness ? `${m.thickness}مم` : ""}) - {Math.round(Number(m.pricePerUnit || 0)).toLocaleString()} ل.س
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800 text-[11px] font-mono">
              <span className="text-zinc-500">التصنيف:</span>
              <span className="text-amber-400 font-bold">{material.category}</span>
              {material.thickness && (
                <>
                  <span className="text-zinc-700">•</span>
                  <span className="text-zinc-300">سماكة {material.thickness} مم</span>
                </>
              )}
              {areaM2 > 0 && (
                <>
                  <span className="text-zinc-700">•</span>
                  <span className="text-zinc-400">مساحة اللوح {areaM2.toFixed(2)} م²</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800 font-mono text-xs">
            <span className="text-zinc-400">السعر الأساسي المعتمد:</span>
            <span className="text-[#c59257] font-extrabold text-sm">{Math.round(currentPrice).toLocaleString()} ل.س</span>
            <span className="text-zinc-500 text-[10px]">/ {material.unit || "وحدة"}</span>
          </div>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">

          {/* FINANCIAL ANALYTICS HIGHLIGHT CARDS */}
          {quotes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* BEST PRICE CARD */}
              {lowestQuote && (
                <div className="bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-xl flex items-start gap-3 relative overflow-hidden shadow-md">
                  <div className="w-9 h-9 rounded-lg bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">العرض الأقل سعراً 🏆</span>
                      <span className="text-[10px] font-mono bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
                        توفير {((1 - lowestQuote.pricePerUnit / (currentPrice || lowestQuote.pricePerUnit)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-sm font-bold text-zinc-100">{lowestQuote.supplierName}</div>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-xl font-black text-emerald-400">{Math.round(lowestQuote.pricePerUnit).toLocaleString()} ل.س</span>
                      <span className="text-[10px] text-zinc-500">/ {material.unit || "وحدة"}</span>
                      {currentPrice > lowestQuote.pricePerUnit && (
                        <span className="text-[10px] text-emerald-300 font-bold mr-1">
                          (توفير {(currentPrice - lowestQuote.pricePerUnit).toLocaleString()} ل.س)
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{lowestQuote.notes || `شروط الدفع: ${lowestQuote.paymentTerms}`}</p>
                  </div>
                </div>
              )}

              {/* FASTEST DELIVERY CARD */}
              {fastestQuote && (
                <div className="bg-indigo-950/20 border border-indigo-800/40 p-3.5 rounded-xl flex items-start gap-3 relative overflow-hidden shadow-md">
                  <div className="w-9 h-9 rounded-lg bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">الأسرع توريداً ⚡</span>
                      <span className="text-[10px] font-mono bg-indigo-950 border border-indigo-800 px-1.5 py-0.5 rounded text-indigo-300 font-bold">
                        {fastestQuote.deliveryDays} {fastestQuote.deliveryDays === 1 ? 'يوم واحد' : 'أيام'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-zinc-100">{fastestQuote.supplierName}</div>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-lg font-extrabold text-indigo-300">{Math.round(fastestQuote.pricePerUnit).toLocaleString()} ل.س</span>
                      <span className="text-[10px] text-zinc-500">تسليم طارئ</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{fastestQuote.paymentTerms}</p>
                  </div>
                </div>
              )}

              {/* HIGHEST RATING CARD */}
              {topRatedQuote && (
                <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-xl flex items-start gap-3 relative overflow-hidden shadow-md">
                  <div className="w-9 h-9 rounded-lg bg-amber-900/40 border border-amber-700/50 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">الأعلى جودة وتصنيفاً ⭐</span>
                      <span className="text-[10px] font-mono bg-amber-950 border border-amber-800 px-1.5 py-0.5 rounded text-amber-300 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {topRatedQuote.qualityRating}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-zinc-100">{topRatedQuote.supplierName}</div>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-lg font-extrabold text-amber-300">{Math.round(topRatedQuote.pricePerUnit).toLocaleString()} ل.س</span>
                      <span className="text-[10px] text-zinc-500">ضمان شامل</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{topRatedQuote.notes || "مورد معتمد مع شهادة جودة"}</p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* INTERACTIVE BATCH PURCHASING CALCULATOR */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#c59257]" />
                <h4 className="text-xs font-bold text-zinc-200">حاسبة التوفير للدفعة الشرائية (Batch Purchasing Decision)</h4>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-zinc-400 font-bold">الكمية المستهدفة للشراء:</label>
                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <input
                    type="number"
                    min="1"
                    value={batchQty}
                    onChange={(e) => setBatchQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 bg-transparent text-center font-mono font-bold text-xs text-[#c59257] p-1 focus:outline-none"
                  />
                  <span className="bg-zinc-900 text-zinc-400 px-2 py-1 text-[10px] border-r border-zinc-800">{material.unit || "لوح"}</span>
                </div>
              </div>
            </div>

            {quotes.length > 0 && lowestQuote && highestQuote && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 space-y-1">
                  <span className="text-[10px] text-zinc-500 block">تكلفة الدفعة بالأقل سعراً ({lowestQuote.supplierName})</span>
                  <div className="text-lg font-mono font-black text-emerald-400">
                    {(lowestQuote.pricePerUnit * batchQty).toLocaleString()} ل.س
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    (≈ ${(lowestQuote.pricePerUnit * batchQty / (exchangeRate || DEFAULT_EXCHANGE_RATE)).toFixed(2)} USD)
                  </span>
                </div>

                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 space-y-1">
                  <span className="text-[10px] text-zinc-500 block">تكلفة الدفعة بالسعر الأعلى المتاح</span>
                  <div className="text-lg font-mono font-black text-rose-400">
                    {(highestQuote.pricePerUnit * batchQty).toLocaleString()} ل.س
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    (≈ ${(highestQuote.pricePerUnit * batchQty / (exchangeRate || DEFAULT_EXCHANGE_RATE)).toFixed(2)} USD)
                  </span>
                </div>

                <div className="bg-gradient-to-r from-emerald-950/60 to-zinc-950 p-3 rounded-lg border border-emerald-900/50 space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold block">صافي التوفير المالي للورشة (Net Financial Savings)</span>
                  <div className="text-xl font-mono font-black text-emerald-300">
                    +{maxPriceDiff.toLocaleString()} ل.س
                  </div>
                  <span className="text-[10px] text-emerald-200/80 block">
                    (≈ +${(maxPriceDiff / (exchangeRate || DEFAULT_EXCHANGE_RATE)).toFixed(2)} USD) - توفير مؤكد لزيادة هامش الربح
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* QUOTES COMPARISON TABLE & ACTIONS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-850">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200">عروض أسعار الموردين ({quotes.length})</span>
                <span className="text-[10px] text-zinc-500 font-mono">مرتبة حسب الأفضلية</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* SORT BUTTONS */}
                <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[10px]">
                  <button
                    onClick={() => setSortBy('price')}
                    className={`px-2.5 py-1 font-bold rounded transition-all cursor-pointer ${
                      sortBy === 'price'
                        ? "bg-[#c59257] text-zinc-950 font-black shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    الأقل سعراً 💲
                  </button>
                  <button
                    onClick={() => setSortBy('delivery')}
                    className={`px-2.5 py-1 font-bold rounded transition-all cursor-pointer ${
                      sortBy === 'delivery'
                        ? "bg-[#c59257] text-zinc-950 font-black shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    الأسرع تسليماً ⚡
                  </button>
                  <button
                    onClick={() => setSortBy('rating')}
                    className={`px-2.5 py-1 font-bold rounded transition-all cursor-pointer ${
                      sortBy === 'rating'
                        ? "bg-[#c59257] text-zinc-950 font-black shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    الأعلى تقييماً ⭐
                  </button>
                </div>

                {/* ADD NEW QUOTE BUTTON */}
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 bg-[#c59257] hover:bg-[#a67438] text-zinc-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة عرض سعر جديد</span>
                </button>
              </div>
            </div>

            {/* INLINE ADD NEW QUOTE FORM */}
            {showAddForm && (
              <form onSubmit={handleAddQuote} className="bg-zinc-900 border border-[#c59257]/40 p-4 rounded-xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-bold text-[#c59257] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>تسجيل عرض سعر جديد لمورد لهذه الخامة</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                  >
                    إلغاء ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">المورد:</label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 focus:border-[#c59257] focus:outline-none"
                    >
                      <option value="">-- اختر مورد مسجل أو ادخل اسماً --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.phone || "بدون هاتف"})</option>
                      ))}
                    </select>
                  </div>

                  {!selectedSupplierId && (
                    <div>
                      <label className="text-zinc-400 font-bold block mb-1">اسم المورد الجديد:</label>
                      <input
                        type="text"
                        placeholder="مثال: شركة النصر للبلاستيك"
                        value={customSupplierName}
                        onChange={(e) => setCustomSupplierName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 focus:border-[#c59257] focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">سعر الوحدة المعروض ($):</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="مثال: 22.50"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-emerald-400 font-mono font-bold focus:border-[#c59257] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">الحد الأدنى للطلب (MOQ):</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={newMinQty}
                      onChange={(e) => setNewMinQty(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">مدة التوريد بالتسليم (أيام):</label>
                    <input
                      type="number"
                      placeholder="2"
                      value={newDeliveryDays}
                      onChange={(e) => setNewDeliveryDays(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">شروط وطريقة الدفع:</label>
                    <input
                      type="text"
                      placeholder="مثال: آجل 30 يوم / نقدي مع خصم 5%"
                      value={newPaymentTerms}
                      onChange={(e) => setNewPaymentTerms(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 focus:border-[#c59257] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="text-zinc-400 font-bold block mb-1">ملاحظات وخصائص العرض الإضافية:</label>
                    <input
                      type="text"
                      placeholder="مثال: شامل التوصيل لمستودع الورشة، حماية ورقية مزدوجة ممتازة للقص بآلات الليزر"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 focus:border-[#c59257] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#c59257] hover:bg-[#a67438] text-zinc-950 font-bold text-xs rounded-lg cursor-pointer shadow"
                  >
                    حفظ وربط عرض السعر
                  </button>
                </div>
              </form>
            )}

            {/* QUOTES CARDS LIST */}
            {loading ? (
              <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                جاري تحميل عروض الأسعار المقارنة...
              </div>
            ) : sortedQuotes.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-2">
                <GitCompare className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-zinc-400 text-xs font-bold">لا يوجد عروض أسعار مسجلة لهذه الخامة حالياً.</p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="text-xs text-[#c59257] underline font-bold cursor-pointer"
                >
                  اضغط هنا لإضافة أول عرض سعر للبدء بالمقارنة
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedQuotes.map((q, idx) => {
                  const isPrimary = material.supplierId === q.supplierId || material.supplier?.name === q.supplierName;
                  const isCheapest = lowestQuote && lowestQuote.id === q.id;
                  const unitCostPerM2 = areaM2 > 0 ? q.pricePerUnit / areaM2 : null;
                  const priceDiff = currentPrice > 0 ? ((q.pricePerUnit - currentPrice) / currentPrice) * 100 : 0;

                  // Find supplier phone if available
                  const supObj = suppliers.find(s => s.id === q.supplierId || s.name === q.supplierName);

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-4 rounded-xl border transition-all text-right ${
                        isCheapest
                          ? "bg-emerald-950/20 border-emerald-800/60 shadow-lg shadow-emerald-950/20"
                          : isPrimary
                          ? "bg-zinc-900/80 border-[#c59257]/40"
                          : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* SUPPLIER & BADGES INFO */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-[#c59257]" />
                              <span>{q.supplierName}</span>
                            </span>

                            {isPrimary && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#c59257]/20 text-[#c59257] border border-[#c59257]/40 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-[#c59257]" />
                                <span>المورد الرئيسي الحقيقي</span>
                              </span>
                            )}

                            {isCheapest && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                                <Award className="w-2.5 h-2.5" />
                                <span>الأرخص مالياً 🏆</span>
                              </span>
                            )}

                            {q.deliveryDays <= 2 && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                                ⚡ توريد سريع ({q.deliveryDays} يوم)
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-zinc-400">{q.notes || "لا توجد ملاحظات إضافية على هذا العرض."}</p>

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-400 font-mono">
                            <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
                              الحد الأدنى للطلب: <strong className="text-zinc-200">{q.minOrderQuantity} {material.unit || 'وحدة'}</strong>
                            </span>
                            <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
                              مدة التوريد: <strong className="text-zinc-200">{q.deliveryDays} أيام</strong>
                            </span>
                            <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
                              شروط الدفع: <strong className="text-amber-300">{q.paymentTerms}</strong>
                            </span>
                            {q.qualityRating && (
                              <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850 flex items-center gap-1 text-amber-400 font-bold">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {q.qualityRating} / 5
                              </span>
                            )}
                          </div>
                        </div>

                        {/* PRICE & FINANCIAL COMPARISON STATS */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 border-zinc-800 pt-3 lg:pt-0">
                          
                          <div className="text-right lg:text-left font-mono">
                            <div className="text-xl font-black text-zinc-100 flex items-center gap-1">
                              <span className="text-[#c59257]">{q.pricePerUnit.toLocaleString()} ل.س</span>
                              <span className="text-xs text-zinc-500 font-sans font-normal">/ {material.unit || "وحدة"}</span>
                            </div>
                            <div className="text-xs text-zinc-400 font-mono">
                              ≈ ${(q.pricePerUnit / (exchangeRate || DEFAULT_EXCHANGE_RATE)).toFixed(2)} USD
                            </div>

                            {unitCostPerM2 !== null && (
                              <div className="text-[10px] text-amber-400/90 font-bold mt-0.5">
                                {Math.round(unitCostPerM2).toLocaleString()} ل.س / م² (≈ ${(unitCostPerM2 / (exchangeRate || DEFAULT_EXCHANGE_RATE)).toFixed(2)})
                              </div>
                            )}

                            {/* PRICE VARIANCE BADGE */}
                            {priceDiff !== 0 && (
                              <div className="mt-1">
                                {priceDiff < 0 ? (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                                    {Math.abs(priceDiff).toFixed(1)}% أرخص من السعر المعتمد
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded">
                                    +{priceDiff.toFixed(1)}% أعلى من السعر المعتمد
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ACTIONS */}
                          <div className="flex items-center gap-1.5">
                            {supObj?.phone && (
                              <a
                                href={`https://wa.me/${supObj.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-400 rounded-lg transition-all cursor-pointer"
                                title="محادثة المورد مباشرة عبر واتساب"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOrderModalQuote(q);
                                setOrderQty(q.minOrderQuantity || 20);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>طلب توريد</span>
                            </button>

                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimarySupplier(q)}
                                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg border border-zinc-700 transition-all cursor-pointer"
                                title="اعتماد هذا المورد كمورد رئيسي وسعره كأساس لهذه الخامة"
                              >
                                <span>اعتماد كرئيسي</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteQuote(q.id)}
                              className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="حذف هذا العرض"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* QUICK SUPPLY ORDER DIALOG OVERLAY */}
        {orderModalQuote && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-[#c59257]/50 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-right">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#c59257]" />
                  <span>تأكيد إنتاج طلب توريد للمورد</span>
                </h4>
                <button
                  onClick={() => setOrderModalQuote(null)}
                  className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-1">
                  <div className="text-zinc-400 font-bold">المورد: <span className="text-zinc-100">{orderModalQuote.supplierName}</span></div>
                  <div className="text-zinc-400 font-bold">الخامة: <span className="text-[#c59257]">{material.name}</span></div>
                  <div className="text-zinc-400 font-bold">سعر الوحدة المعروض: <span className="text-emerald-400 font-mono font-black">${orderModalQuote.pricePerUnit.toFixed(2)}</span></div>
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">الكمية المطلوبة للشحن:</label>
                  <input
                    type="number"
                    min="1"
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 font-mono font-bold focus:border-[#c59257] focus:outline-none"
                  />
                  {orderModalQuote.minOrderQuantity > 1 && (
                    <span className="text-[10px] text-amber-400 block mt-1">
                      ⚠️ حد المورد الأدنى لهذه الفئة: {orderModalQuote.minOrderQuantity} {material.unit || 'وحدة'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">إجمالي المباشر المتوقع:</label>
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-lg font-mono font-black text-emerald-400">
                    ${(orderQty * orderModalQuote.pricePerUnit).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">ملاحظات طلب الشراء:</label>
                  <input
                    type="text"
                    placeholder="ملاحظات طارئة أو تفاصيل التسليم..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 focus:border-[#c59257] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setOrderModalQuote(null)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSupplyOrder}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer shadow"
                >
                  إرسال طلب التوريد فوراً
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
