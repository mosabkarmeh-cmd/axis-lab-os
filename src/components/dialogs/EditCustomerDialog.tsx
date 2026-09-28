import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function EditCustomerDialog(props: GlobalDialogProps) {
  const { editCustAddress, editCustCategory, editCustCompany, editCustEmail, editCustName, editCustNotes, editCustPhone, editCustWhatsapp, editingCustomer, handleSaveEditCustomer, rows, setEditCustAddress, setEditCustCategory, setEditCustCompany, setEditCustEmail, setEditCustName, setEditCustNotes, setEditCustPhone, setEditCustWhatsapp, setEditingCustomer } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {editingCustomer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 dir-rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 15 }}
              className="bg-[#0c0a09] border border-zinc-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden font-sans text-right"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2.5">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 justify-end">
                      <span>تعديل ملف العميل</span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 rounded-md">
                        {editingCustomer.id}
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">تحديث المعلومات الشخصية والتواصل وملاحظات الورشة والطلبات</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Body Form */}
              <form onSubmit={handleSaveEditCustomer} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      اسم العميل <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editCustName}
                      onChange={(e) => setEditCustName(e.target.value)}
                      placeholder="اسم العميل الكامل..."
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      رقم الهاتف / الموبايل <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editCustPhone}
                      onChange={(e) => setEditCustPhone(e.target.value)}
                      placeholder="+9627..."
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 font-mono focus:outline-none text-right dir-ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      رقم الواتساب (للمراسلة الفورية)
                    </label>
                    <input
                      type="text"
                      value={editCustWhatsapp}
                      onChange={(e) => setEditCustWhatsapp(e.target.value)}
                      placeholder="رقم الواتساب..."
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 font-mono focus:outline-none text-right dir-ltr"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={editCustEmail}
                      onChange={(e) => setEditCustEmail(e.target.value)}
                      placeholder="example@domain.com"
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 font-mono focus:outline-none text-right dir-ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      الشركة / المكتب الهندسي / الجهة
                    </label>
                    <input
                      type="text"
                      value={editCustCompany}
                      onChange={(e) => setEditCustCompany(e.target.value)}
                      placeholder="اسم المؤسسة..."
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      تصنيف العميل (نوع الحساب)
                    </label>
                    <select
                      value={editCustCategory}
                      onChange={(e) => setEditCustCategory(e.target.value)}
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none font-sans cursor-pointer"
                    >
                      <option value="شركة">🏢 شركة / مؤسسة تجارية</option>
                      <option value="أفراد">👤 أفراد / عميل شخصي</option>
                      <option value="مقاول">👷 مقاول / مكتب هندسي / مصمم</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">
                    العنوان / الورشة / المدينة
                  </label>
                  <input
                    type="text"
                    value={editCustAddress}
                    onChange={(e) => setEditCustAddress(e.target.value)}
                    placeholder="مكان الإقامة أو العمل..."
                    className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">
                    ملاحظات العميل والتفاصيل الخاصة بالعمل
                  </label>
                  <textarea
                    rows={3}
                    value={editCustNotes}
                    onChange={(e) => setEditCustNotes(e.target.value)}
                    placeholder="تعليمات خاصة، تفضيلات سماكة الأكريليك أو حفر الخشب، الشحنات، الدفعات أو تفضيلات التسليم..."
                    className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-900/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}
