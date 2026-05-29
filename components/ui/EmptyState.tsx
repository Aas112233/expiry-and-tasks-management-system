import React from 'react';
import { Package, Inbox, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui';

export interface EmptyStateProps {
  icon?: 'default' | 'inbox' | 'error' | 'success' | 'search';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'default',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const iconMap = {
    default: <Package className="w-12 h-12 text-gray-200" />,
    inbox: <Inbox className="w-12 h-12 text-gray-200" />,
    error: <AlertCircle className="w-12 h-12 text-red-200" />,
    success: <CheckCircle className="w-12 h-12 text-emerald-200" />,
    search: <Package className="w-12 h-12 text-gray-200" />,
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="mb-4">{iconMap[icon]}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-2 max-w-md">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

export default EmptyState;
