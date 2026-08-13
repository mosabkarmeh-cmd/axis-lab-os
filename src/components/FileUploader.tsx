import React, { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Download, AlertCircle, FileText, ImageIcon, FileCode, CheckCircle2 } from "lucide-react";

interface FileUploaderProps {
  entityType: "order" | "product" | "customer" | "material";
  entityId: string;
}

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export function FileUploader({ entityType, entityId }: FileUploaderProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/files/entity/${entityType}/${entityId}`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchFiles();
    }
  }, [entityType, entityId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setUploadProgress(10);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    formData.append("entityId", entityId);
    formData.append("uploadedBy", "u-1");

    try {
      setUploadProgress(50);
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadProgress(100);
        setSuccess("تم رفع الملف المرفق بنجاح.");
        fetchFiles();
        setTimeout(() => setUploadProgress(null), 1000);
      } else {
        setError(data.message || "فشل رفع الملف.");
        setUploadProgress(null);
      }
    } catch (err: any) {
      setError("خطأ في الاتصال بالخادم أثناء الرفع.");
      setUploadProgress(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDownload = (id: string, originalName: string) => {
    window.open(`/api/files/${id}/download`, "_blank");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الملف الملحق نهائياً؟")) return;
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم حذف الملف بنجاح.");
        fetchFiles();
      } else {
        setError(data.message || "فشل حذف الملف.");
      }
    } catch (err) {
      setError("خطأ أثناء محاولة حذف الملف.");
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes("image")) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    if (mime.includes("pdf")) return <FileText className="w-5 h-5 text-rose-400" />;
    if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return <FileText className="w-5 h-5 text-green-400" />;
    return <FileCode className="w-5 h-5 text-amber-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4 font-sans text-right" dir="rtl">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
          dragActive
            ? "border-[#c59257] bg-[#c59257]/10"
            : "border-zinc-850 hover:border-zinc-700 bg-zinc-900/30"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="p-3 bg-[#c59257]/10 rounded-full border border-[#c59257]/20 text-[#c59257]">
          <Upload className="w-6 h-6" />
        </div>
        <p className="text-xs text-zinc-300 font-medium">
          اسحب الملف وأفلته هنا، أو <span className="text-[#c59257] underline cursor-pointer">اختر ملفاً</span> من القرص
        </p>
        <p className="text-[10px] text-zinc-500">
          يدعم ملفات الصور، مستندات PDF، ملفات الأوتوكاد (DXF) والتصميمات
        </p>
      </div>

      {/* Progress Bar */}
      {uploadProgress !== null && (
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#c59257] h-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30 text-[11px] text-rose-400 flex items-center gap-2 justify-end">
          <span>{error}</span>
          <AlertCircle className="w-4 h-4" />
        </div>
      )}

      {success && (
        <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-[11px] text-emerald-400 flex items-center gap-2 justify-end">
          <span>{success}</span>
          <CheckCircle2 className="w-4 h-4" />
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2">
        <h5 className="text-[11px] font-bold text-zinc-400">الملفات المرفقة حالياً ({files.length})</h5>
        {loading ? (
          <div className="text-center p-4 text-xs text-zinc-500">جاري تحميل المستندات المرفقة...</div>
        ) : files.length === 0 ? (
          <div className="text-center p-6 border border-zinc-900/40 rounded-xl text-xs text-zinc-600 bg-zinc-950/10">
            لا توجد وثائق أو ملفات ملحقة بعد.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-zinc-900/40 border border-zinc-850 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.originalName); }}
                    className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-[#c59257] rounded transition-all cursor-pointer"
                    title="تنزيل الملف"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                    className="p-1.5 hover:bg-rose-950/20 text-zinc-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                    title="حذف المرفق"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2.5 text-right overflow-hidden">
                  <div className="text-right">
                    <span className="font-medium text-zinc-200 block truncate max-w-[200px]" title={file.originalName}>
                      {file.originalName}
                    </span>
                    <span className="text-[9px] text-zinc-500 block font-mono">
                      {formatSize(file.size)} • {new Date(file.createdAt).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-850 shrink-0">
                    {getFileIcon(file.mimeType)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
