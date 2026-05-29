import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, QuestionCircle, X } from 'lucide-react';
import { Button } from '../ui';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: AlertTriangle,
      iconClass: 'bg-red-100 text-red-600',
      confirmButtonVariant: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'bg-amber-100 text-amber-600',
      confirmButtonVariant: 'primary' as const,
    },
    info: {
      icon: Info,
      iconClass: 'bg-blue-100 text-blue-600',
      confirmButtonVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const dialogContent = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in-scale"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className={`w-12 h-12 ${config.iconClass} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className="w-6 h-6" />
        </div>

        <h3 id="dialog-title" className="text-lg font-bold text-gray-900 mb-2">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-gray-500 mb-6">{description}</p>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmButtonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

ConfirmDialog.displayName = 'ConfirmDialog';

export default ConfirmDialog;
