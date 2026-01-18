
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 5s for better readability
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none sm:top-6 sm:right-6">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto flex items-stretch min-w-[320px] max-w-md 
                            backdrop-blur-md bg-white/90 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] 
                            border border-white/20 overflow-hidden animate-toast-in
                            ${toast.type === 'success' ? 'bg-green-50/95 border-l-4 border-l-green-500' : ''}
                            ${toast.type === 'error' ? 'bg-red-50/95 border-l-4 border-l-red-500' : ''}
                            ${toast.type === 'warning' ? 'bg-amber-50/95 border-l-4 border-l-amber-500' : ''}
                            ${toast.type === 'info' ? 'bg-blue-50/95 border-l-4 border-l-blue-500' : ''}
                        `}
                    >
                        <div className="flex-1 p-4 flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                                {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                                {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                                {toast.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-semibold uppercase tracking-wider mb-0.5
                                    ${toast.type === 'success' ? 'text-green-800' : ''}
                                    ${toast.type === 'error' ? 'text-red-800' : ''}
                                    ${toast.type === 'warning' ? 'text-amber-800' : ''}
                                    ${toast.type === 'info' ? 'text-blue-800' : ''}
                                `}>
                                    {toast.type}
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                    {toast.message}
                                </p>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black/5 transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        {/* Progress bar effect can be added here if desired */}
                    </div>
                ))}
            </div>
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
