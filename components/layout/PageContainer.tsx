import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  padding = 'none',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
};

PageContainer.displayName = 'PageContainer';

export default PageContainer;
