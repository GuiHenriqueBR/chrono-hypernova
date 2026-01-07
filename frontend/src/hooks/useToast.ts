// ============================================
// useToast - Hook for toast notifications
// ============================================

import { useToastStore, Toast } from "../store/toastStore";

interface LegacyToastParams {
  title: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info";
}

export function useToast() {
  const { addToast, removeToast, clearToasts } = useToastStore();

  return {
    // Legacy pattern: toast({ title, description, type })
    toast: (params: LegacyToastParams) =>
      addToast({
        type: params.type || "info",
        title: params.title,
        message: params.description,
      }),
    // New patterns
    success: (title: string, message?: string) =>
      addToast({ type: "success", title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: "error", title, message, duration: 8000 }),
    warning: (title: string, message?: string) =>
      addToast({ type: "warning", title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: "info", title, message }),
    custom: (toast: Omit<Toast, "id">) => addToast(toast),
    dismiss: removeToast,
    dismissAll: clearToasts,
  };
}
