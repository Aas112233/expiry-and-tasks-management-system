import React from 'react';

export interface FormGroupProps {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  error,
  hint,
  children,
  className = '',
}) => {
  // Clone child to inject id if it's an input-like element
  const childWithId = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childId = child.props.id || child.props.name;
      return React.cloneElement(child as React.ReactElement<any>, {
        id: childId,
        error: child.props.error || error,
      });
    }
    return child;
  });

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      {childWithId}
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
};

FormGroup.displayName = 'FormGroup';

export default FormGroup;
