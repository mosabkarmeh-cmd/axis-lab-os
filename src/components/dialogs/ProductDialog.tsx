import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function ProductDialog(props: GlobalDialogProps) {
  const { editingProduct, handleCreateProduct, handleUpdateProduct, prodCategory, prodCode, prodDescription, prodName, prodPrice, prodStock, setEditingProduct, setProdCategory, setProdCode, setProdDescription, setProdName, setProdPrice, setProdStock, setShowAddProduct, showAddProduct } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {(showAddProduct || editingProduct) && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4 text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                  }}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100">
                  {editingProduct ? "تعديل بيانات مادة / منتج" : "إضافة مادة أو خامة قص جديدة"}
                </span>
              </div>

              <form
                onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="text-zinc-500 block mb-1">اسم المنتج / الخامة</label>
                  <input
                    type="text"
                    required
                    value={editingProduct ? editingProduct.name : prodName}
                    onChange={(e) => {
                      if (editingProduct) {
                        setEditingProduct({ ...editingProduct, name: e.target.value });
                      } else {
                        setProdName(e.target.value);
                      }
                    }}
                    placeholder="مثال: أكريليك شفاف 3 ملم مميز"
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 block mb-1">تصنيف المادة</label>
                    <select
                      value={editingProduct ? editingProduct.category : prodCategory}
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, category: e.target.value });
                        } else {
                          setProdCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 text-right focus:outline-none focus:border-pink-500"
                    >
                      <option value="الأكريليك">الأكريليك</option>
                      <option value="الأخشاب">الأخشاب</option>
                      <option value="الجلود">الجلود</option>
                      <option value="عام">عام</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1">الرمز / الكود المميز</label>
                    <input
                      type="text"
                      value={editingProduct ? editingProduct.code : prodCode}
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, code: e.target.value });
                        } else {
                          setProdCode(e.target.value);
                        }
                      }}
                      placeholder="مثال: ACR-3TR"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">الكمية بالمخزن (وحدة)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct ? (editingProduct.stock ?? "") : prodStock}
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, stock: Number(e.target.value) });
                        } else {
                          setProdStock(e.target.value);
                        }
                      }}
                      placeholder="مثال: 100"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">سعر البيع الافتراضي ($)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={editingProduct ? editingProduct.price : prodPrice}
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, price: Number(e.target.value) });
                        } else {
                          setProdPrice(e.target.value);
                        }
                      }}
                      placeholder="مثال: 25.00"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-500 block mb-1">وصف المادة ومواصفاتها فنية</label>
                  <textarea
                    value={editingProduct ? (editingProduct.description ?? "") : prodDescription}
                    onChange={(e) => {
                      if (editingProduct) {
                        setEditingProduct({ ...editingProduct, description: e.target.value });
                      } else {
                        setProdDescription(e.target.value);
                      }
                    }}
                    placeholder="مثال: ألواح أكريليك شفافة بمقاس 120x240 سم ممتازة للأحرف البارزة وقص ليزر CO2"
                    className="w-full h-20 bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-pink-500 font-sans"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    {editingProduct ? "حفظ التعديلات المعتمدة" : "إضافة إلى دليل الورشة"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProduct(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}
