import { AnimatePresence, motion } from "motion/react";
import { FolderOpen, X } from "lucide-react";
import { FileUploader } from "./FileUploader";

export interface EntityFilesModalsProps {
  selectedProductFiles: { id: string; name: string } | null;
  selectedCustomerFiles: { id: string; name: string } | null;
  selectedMaterialFiles: { id: string; name: string } | null;
  currentUser?: { role?: string } | null;
  setSelectedProductFiles: (value: any) => void;
  setSelectedCustomerFiles: (value: any) => void;
  setSelectedMaterialFiles: (value: any) => void;
}

export default function EntityFilesModals({ selectedProductFiles, selectedCustomerFiles, selectedMaterialFiles, currentUser, setSelectedProductFiles, setSelectedCustomerFiles, setSelectedMaterialFiles }: EntityFilesModalsProps) {
  return (
    <>
{/* Selected Product Files Modal */}
<AnimatePresence>
  {selectedProductFiles && (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 text-right font-sans"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <button
            onClick={() => setSelectedProductFiles(null)}
            className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[#c59257] font-bold text-sm">ملفات ووثائق المنتج: {selectedProductFiles.name}</span>
            <FolderOpen className="w-4 h-4 text-[#c59257]" />
          </div>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          ارفع رسومات المتجهات أو صور التصاميم أو كود G-Code النموذجي المرتبط بهذا المنتج لتسريع معايرة التشغيل عند الطلب.
        </p>
        <FileUploader entityType="product" entityId={selectedProductFiles.id} />
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setSelectedProductFiles(null)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

{/* Selected Customer Files Modal */}
<AnimatePresence>
  {selectedCustomerFiles && currentUser?.role !== 'accountant' && (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 text-right font-sans"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <button
            onClick={() => setSelectedCustomerFiles(null)}
            className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[#c59257] font-bold text-sm">ملفات ومستندات العميل: {selectedCustomerFiles.name}</span>
            <FolderOpen className="w-4 h-4 text-[#c59257]" />
          </div>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          احتفظ بسجلات العقود أو فواتير العميل أو المتطلبات التشغيلية والتصميمية ليكون الوصول إليها سهلاً عند تنفيذ مهام قص الليزر للعميل.
        </p>
        <FileUploader entityType="customer" entityId={selectedCustomerFiles.id} />
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setSelectedCustomerFiles(null)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

{/* Selected Material Files Modal */}
<AnimatePresence>
  {selectedMaterialFiles && (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 text-right font-sans"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <button
            onClick={() => setSelectedMaterialFiles(null)}
            className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[#c59257] font-bold text-sm">وثائق وملفات الخامة: {selectedMaterialFiles.name}</span>
            <FolderOpen className="w-4 h-4 text-[#c59257]" />
          </div>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          ارفق شهادات الجودة الفنية للخامة أو كتالوجات السلامة والحرارة المناسبة لتشغيل ليزر CO2 على هذه الخامة لتلافي الأخطاء التشغيلية.
        </p>
        <FileUploader entityType="material" entityId={selectedMaterialFiles.id} />
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setSelectedMaterialFiles(null)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

    </>
  );
}
