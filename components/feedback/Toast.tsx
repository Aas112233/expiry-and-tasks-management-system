import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, ...toast };

    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[100] space-y-3">
            {toasts.map((toast) => {
              const Icon = iconMap[toast.type];
              return (
                <div
                  key={toast.id}
                  className={`
                    flex items-start gap-3 p-4 rounded-xl border shadow-lg
                    bg-white/95 backdrop-blur-sm
                    animate-slide-up min-w-[320px] max-w-md
                  `}
                >
                  <div className={`p-2 rounded-lg ${colorMap[toast.type].split(' ')[0]}`}>
                    <Icon className={`w-5 h-5 ${colorMap[toast.type].split(' ')[2]}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{toast.title}</p>
                    {toast.message && (
                      <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
                    )}
                  </div>
                  <button
                    onClick={() => dismissToast(toast.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors -mt-1 -mr-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
