// ============================================
// Toast Notification Store
// ============================================

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// ============================================
// Toast Helper Functions
// ============================================

export const toast = {
  success: (title: string, message?: string) => {
    return useToastStore.getState().addToast({ type: 'success', title, message });
  },
  
  error: (title: string, message?: string) => {
    return useToastStore.getState().addToast({ type: 'error', title, message, duration: 8000 });
  },
  
  warning: (title: string, message?: string) => {
    return useToastStore.getState().addToast({ type: 'warning', title, message });
  },
  
  info: (title: string, message?: string) => {
    return useToastStore.getState().addToast({ type: 'info', title, message });
  },
  
  custom: (toast: Omit<Toast, 'id'>) => {
    return useToastStore.getState().addToast(toast);
  },
  
  dismiss: (id: string) => {
    useToastStore.getState().removeToast(id);
  },
  
  dismissAll: () => {
    useToastStore.getState().clearToasts();
  },
};
