import React, { createContext, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X, HelpCircle } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmDialog {
  id: string;
  message: string;
  title: string;
  resolve: (value: boolean) => void;
}

export interface AlertDialog {
  id: string;
  message: string;
  title: string;
  resolve: () => void;
}

interface NotificationContextProps {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showAlert: (message: string, title?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirms, setConfirms] = useState<ConfirmDialog[]>([]);
  const [alerts, setAlerts] = useState<AlertDialog[]>([]);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const showConfirm = (message: string, title: string = "تأكيد الإجراء"): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(2, 9);
      setConfirms((prev) => [...prev, { id, message, title, resolve }]);
    });
  };

  const showAlert = (message: string, title: string = "تنبيه"): Promise<void> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(2, 9);
      setAlerts((prev) => [...prev, { id, message, title, resolve }]);
    });
  };

  if (typeof window !== "undefined") {
    (window as any).showToast = showToast;
    (window as any).showConfirm = showConfirm;
    (window as any).showAlert = showAlert;
  }

  const handleConfirmResolve = (id: string, value: boolean, resolve: (val: boolean) => void) => {
    resolve(value);
    setConfirms((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAlertResolve = (id: string, resolve: () => void) => {
    resolve();
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm, showAlert }}>
      {children}

      {/* Modern Toast Container */}
      <div id="toast-container" className="fixed top-5 left-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="w-5 h-5 text-emerald-400" id={`icon-success-${toast.id}`} />,
              error: <XCircle className="w-5 h-5 text-rose-400" id={`icon-error-${toast.id}`} />,
              warning: <AlertTriangle className="w-5 h-5 text-amber-400" id={`icon-warning-${toast.id}`} />,
              info: <Info className="w-5 h-5 text-blue-400" id={`icon-info-${toast.id}`} />,
            };

            const bgClasses = {
              success: "bg-slate-900 border-emerald-500/30 text-slate-100",
              error: "bg-slate-900 border-rose-500/30 text-slate-100",
              warning: "bg-slate-900 border-amber-500/30 text-slate-100",
              info: "bg-slate-900 border-blue-500/30 text-slate-100",
            };

            return (
              <motion.div
                key={toast.id}
                id={`toast-${toast.id}`}
                initial={{ opacity: 0, x: -100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl ${bgClasses[toast.type]}`}
                style={{ direction: "rtl" }}
              >
                <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
                <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
                <button
                  id={`btn-close-toast-${toast.id}`}
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modern Confirm/Alert Dialog Overlays */}
      <AnimatePresence>
        {confirms.map((c) => (
          <div key={c.id} id={`confirm-overlay-${c.id}`} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" style={{ direction: "rtl" }}>
            <motion.div
              id={`confirm-modal-${c.id}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/40">
                <div className="p-2 bg-[#c59257]/10 rounded-lg text-[#c59257]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">{c.title}</h3>
              </div>
              <div className="px-6 py-6 text-sm leading-relaxed text-slate-300">
                {c.message}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/20">
                <button
                  id={`btn-confirm-cancel-${c.id}`}
                  onClick={() => handleConfirmResolve(c.id, false, c.resolve)}
                  className="px-4 py-2 text-sm font-medium transition-colors border rounded-xl bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                >
                  إلغاء
                </button>
                <button
                  id={`btn-confirm-ok-${c.id}`}
                  onClick={() => handleConfirmResolve(c.id, true, c.resolve)}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#c59257] hover:bg-[#b0814b] rounded-xl transition-colors shadow-lg shadow-[#c59257]/10"
                >
                  موافق
                </button>
              </div>
            </motion.div>
          </div>
        ))}

        {alerts.map((a) => (
          <div key={a.id} id={`alert-overlay-${a.id}`} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" style={{ direction: "rtl" }}>
            <motion.div
              id={`alert-modal-${a.id}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/40">
                <div className="p-2 bg-[#c59257]/10 rounded-lg text-[#c59257]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">{a.title}</h3>
              </div>
              <div className="px-6 py-6 text-sm leading-relaxed text-slate-300">
                {a.message}
              </div>
              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/20">
                <button
                  id={`btn-alert-ok-${a.id}`}
                  onClick={() => handleAlertResolve(a.id, a.resolve)}
                  className="px-6 py-2 text-sm font-medium text-white bg-[#c59257] hover:bg-[#b0814b] rounded-xl transition-colors shadow-lg shadow-[#c59257]/10"
                >
                  حسناً
                </button>
              </div>
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
