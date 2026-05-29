import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'rect' | 'circle' | 'line';
}

export function Skeleton({
  className = '',
  width,
  height,
  variant = 'rect',
}: SkeletonProps) {
  const variantClasses = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    line: 'rounded-full h-2',
  };

  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${variantClasses[variant]} ${className}`}
      style={{
        width,
        height,
        animation: 'pulse 1.5s ease-in-out infinite, shimmer 2s linear infinite',
      }}
    />
  );
}

export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return <Skeleton className={`${sizeMap[size]} rounded-full`} variant="circle" />;
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          variant="line"
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-4">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <Skeleton className="w-16 h-6 rounded-full" />
          </div>
          <Skeleton className="w-24 h-8 mb-2" />
          <Skeleton className="w-32 h-4" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      <div className="flex gap-4 mb-3 px-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-5" width={`${100 / columns}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-4 px-4 border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4" width={`${100 / columns}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <AvatarSkeleton size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ bars = 7 }: { bars?: number }) {
  return (
    <div className="flex items-end justify-between h-[220px] gap-2">
      {Array.from({ length: bars }).map((_, i) => (
        <Skeleton
          key={i}
          className="w-full rounded-t-lg"
          height={`${Math.random() * 60 + 20}%`}
        />
      ))}
    </div>
  );
}

export function PageSkeleton({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex justify-between items-center">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-32 h-10 rounded-lg" />
        </div>
      )}
      <div className="glass-panel rounded-2xl p-6">
        <TableSkeleton rows={5} columns={6} />
      </div>
    </div>
  );
}

export default Skeleton;
