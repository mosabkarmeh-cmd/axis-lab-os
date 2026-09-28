import { AnimatePresence, motion } from "motion/react";
import { Command, PlusCircle, Search } from "lucide-react";

export interface CommandPaletteProps {
  isSearchPaletteOpen: boolean;
  searchQuery: string;
  searchResults: any;
  isSearching: boolean;
  setIsSearchPaletteOpen: (open: boolean) => void;
  setSearchQuery: (value: string) => void;
  setSearchResults: (value: any) => void;
  setActiveView: (view: string) => void;
}

export default function CommandPalette({ isSearchPaletteOpen, searchQuery, searchResults, isSearching, setIsSearchPaletteOpen, setSearchQuery, setSearchResults, setActiveView }: CommandPaletteProps) {
  return (
    <>
{/* Global Command Palette / Search Modal */}
<AnimatePresence>
  {isSearchPaletteOpen && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-[10vh] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -20 }}
        className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden font-sans text-right flex flex-col"
      >
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between gap-3 bg-zinc-900/20">
          <button
            onClick={() => {
              setIsSearchPaletteOpen(false);
              setSearchQuery("");
              setSearchResults(null);
            }}
            className="px-2 py-1 text-[10px] text-zinc-500 hover:text-white rounded bg-zinc-900 border border-zinc-800 transition-colors"
          >
            إغلاق (Esc)
          </button>
          <div className="flex-1 relative">
            <input
              autoFocus
              type="text"
              placeholder="البحث الشامل في الورشة... (رقم طلب، عميل، منتج، خامة)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#c59257]/50 focus:ring-1 focus:ring-[#c59257]/30 text-right"
            />
            {isSearching && (
              <div className="absolute left-3 top-3">
                <span className="w-4 h-4 border-2 border-[#c59257] border-t-transparent rounded-full animate-spin block"></span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[#c59257]">
            <span className="text-xs font-bold font-mono">CTRL + K</span>
            <Search className="w-4 h-4" />
          </div>
        </div>

        {/* Search Results Area */}
        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4">
          {!searchQuery.trim() ? (
            <div className="text-center py-10 text-zinc-500 space-y-2">
              <Command className="w-8 h-8 text-zinc-700 mx-auto animate-pulse" />
              <p className="text-xs">اكتب أي كلمة مفتاحية للبحث الفوري في كافة كيانات نظام AXIS LAB</p>
              <p className="text-[10px] text-zinc-600 font-mono">تبحث هذه الأداة في الطلبات والعملاء والمنتجات والمواد والفواتير</p>
            </div>
          ) : searchResults && (
            Object.values(searchResults as Record<string, unknown[]>).every((arr) => arr.length === 0) ? (
              <div className="text-center py-12 text-zinc-500 font-sans">
                لا توجد نتائج مطابقة لـ "<span className="text-zinc-200 font-semibold">{searchQuery}</span>"
              </div>
            ) : (
              <div className="space-y-4">
                {/* Orders Results */}
                {searchResults.orders && searchResults.orders.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-indigo-500">الطلبات الفنية</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {searchResults.orders.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveView("orders");
                            setIsSearchPaletteOpen(false);
                            setSearchQuery("");
                            setSearchResults(null);
                          }}
                          className="w-full text-right p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                        >
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            item.status === 'new' ? 'bg-indigo-950 text-indigo-400' : 'bg-emerald-950 text-emerald-400'
                          }`}>
                            {item.status === 'new' ? 'جديد' : 'مكتمل'}
                          </span>
                          <div className="text-right">
                            <div className="font-semibold text-zinc-200">طلب #{item.orderNumber || item.id}</div>
                            <div className="text-[10px] text-zinc-500">العميل: {item.customerName || "غير محدد"} • القيمة: ${item.totalPrice}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customers Results */}
                {searchResults.customers && searchResults.customers.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-emerald-500">قاعدة بيانات العملاء</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {searchResults.customers.map((item: any) => (
                        <div
                          key={item.id}
                          className="w-full p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomerIdForOrder(item.id);
                                setShowAddOrder(true);
                                setIsSearchPaletteOpen(false);
                                setSearchQuery("");
                                setSearchResults(null);
                              }}
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="إنشاء طلب جديد فوري لهذا العميل"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>طلب جديد</span>
                            </button>
                            <span className="text-[10px] text-zinc-500 font-mono">{item.phone}</span>
                          </div>
                          <button
                            onClick={() => {
                              setActiveView("database");
                              setIsSearchPaletteOpen(false);
                              setSearchQuery("");
                              setSearchResults(null);
                            }}
                            className="text-right hover:underline cursor-pointer"
                          >
                            <div className="font-semibold text-zinc-200">{item.name}</div>
                            <div className="text-[10px] text-zinc-500">{item.email} • {item.address}</div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products Results */}
                {searchResults.products && searchResults.products.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-[#c59257]">مكتبة المنتجات والتصاميم</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {searchResults.products.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveView("products");
                            setIsSearchPaletteOpen(false);
                            setSearchQuery("");
                            setSearchResults(null);
                          }}
                          className="w-full text-right p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                        >
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{item.category}</span>
                          <div className="text-right">
                            <div className="font-semibold text-zinc-200">{item.name}</div>
                            <div className="text-[10px] text-zinc-500">كود المنتج: {item.code || "N/A"}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials Results */}
                {searchResults.materials && searchResults.materials.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-amber-500">المخازن والمواد الأولية</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {searchResults.materials.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveView("database");
                            setIsSearchPaletteOpen(false);
                            setSearchQuery("");
                            setSearchResults(null);
                          }}
                          className="w-full text-right p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                        >
                          <span className="text-[10px] text-zinc-400 font-mono">{item.thickness} مم</span>
                          <div className="text-right">
                            <div className="font-semibold text-zinc-200">{item.name}</div>
                            <div className="text-[10px] text-zinc-500">الفئة: {item.category} • السعر: ${item.unitPrice}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoices Results */}
                {searchResults.invoices && searchResults.invoices.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-purple-500">الفواتير والدفعات المالية</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {searchResults.invoices.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveView("accounting");
                            setIsSearchPaletteOpen(false);
                            setSearchQuery("");
                            setSearchResults(null);
                          }}
                          className="w-full text-right p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                        >
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            item.status === 'paid' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            {item.status === 'paid' ? 'مدفوعة' : 'مستحقة'}
                          </span>
                          <div className="text-right">
                            <div className="font-semibold text-zinc-200">فاتورة #{item.invoiceNumber || item.id}</div>
                            <div className="text-[10px] text-zinc-500">الإجمالي: ${item.amount} • الضريبة: {item.taxAmount || 0}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Search Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
          <span>تكامل ذكي فوري لنظام AXIS LAB</span>
          <span>اضغط على أي نتيجة للانتقال التلقائي للقسم والفلترة</span>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

    </>
  );
}
