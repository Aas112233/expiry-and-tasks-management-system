import React from 'react';

export interface FormActionsProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  align = 'right',
  className = '',
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div
      className={`flex items-center gap-3 pt-4 border-t border-gray-100 ${alignClasses[align]} ${className}`}
    >
      {children}
    </div>
  );
};

FormActions.displayName = 'FormActions';

export default FormActions;
