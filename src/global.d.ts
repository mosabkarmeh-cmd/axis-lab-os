import { ToastType } from "./components/NotificationProvider";

declare global {
  interface Window {
    showToast?: (message: string, type?: ToastType) => void;
    showConfirm?: (message: string, title?: string) => Promise<boolean>;
    showAlert?: (message: string, title?: string) => Promise<void>;
  }
}

export {};
