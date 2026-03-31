import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gray-200 rounded ${className}`}
            style={{
                width: width,
                height: height,
            }}
        />
    );
}

// Table skeleton for data tables
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex gap-4 mb-3 px-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton
                        key={`header-${i}`}
                        className="h-5"
                        width={`${100 / columns}%`}
                    />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className="flex gap-4 py-4 px-4 border-b border-gray-100"
                >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-4"
                            width={`${100 / columns}%`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

// Card skeleton for dashboard/stat cards
export function CardSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="glass-panel p-6 rounded-3xl"
                >
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

// Form skeleton for modals
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-full h-10 rounded-lg" />
                </div>
            ))}
            <div className="flex justify-end gap-3 pt-4">
                <Skeleton className="w-24 h-10 rounded-lg" />
                <Skeleton className="w-32 h-10 rounded-lg" />
            </div>
        </div>
    );
}

// Page skeleton with header
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
