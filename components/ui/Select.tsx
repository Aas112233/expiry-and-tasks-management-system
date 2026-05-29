import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full px-4 py-2.5 text-sm text-gray-900
              bg-white border rounded-xl appearance-none cursor-pointer
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-200'
              }
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
            <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-gray-500 font-medium">{hint}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
