import React from 'react';
import { X, Filter } from 'lucide-react';
import { Button } from '../ui';

export interface FilterBarProps {
  children: React.ReactNode;
  clearFilters?: () => void;
  activeFilterCount?: number;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  clearFilters,
  activeFilterCount = 0,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        {clearFilters && activeFilterCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={clearFilters}
            leftIcon={<X className="w-3.5 h-3.5" />}
          >
            Clear {activeFilterCount}
          </Button>
        )}
      </div>
    </div>
  );
};

FilterBar.displayName = 'FilterBar';

export default FilterBar;
