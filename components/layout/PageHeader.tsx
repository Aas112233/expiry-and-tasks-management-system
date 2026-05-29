import React from 'react';
import { Button } from '../ui';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {description && (
          <p className="text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

PageHeader.displayName = 'PageHeader';

export default PageHeader;
