import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
  title,
  description,
  headerAction,
  footer,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        bg-white rounded-2xl border border-gray-100 shadow-sm
        ${hover ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {(title || description || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className={paddingClasses[padding]}>{children}</div>

      {footer && (
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  );
};

Card.displayName = 'Card';

export default Card;
