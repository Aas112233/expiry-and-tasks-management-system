import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  keyExtractor: (item: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data available',
  emptyDescription,
  onRowClick,
  rowClassName,
  keyExtractor,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = getValueForKey(a, sortConfig.key);
      const bValue = getValueForKey(b, sortConfig.key);

      if (aValue === undefined || bValue === undefined) return 0;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const getValueForKey = (item: T, key: string): any => {
    if (key.includes('.')) {
      return key.split('.').reduce((obj, k) => (obj as any)?.[k], item);
    }
    return (item as any)[key];
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <div className="w-4 h-4 opacity-0 group-hover:opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <Skeleton variant="line" className="w-full h-10 mb-2" />
          <Skeleton variant="line" className="w-full h-10 mb-2" />
          <Skeleton variant="line" className="w-full h-10 mb-2" />
          <Skeleton variant="line" className="w-full h-10 mb-2" />
          <Skeleton variant="line" className="w-full h-10" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <EmptyState
          title={emptyMessage}
          description={emptyDescription}
          icon="inbox"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={`px-6 py-4 font-semibold ${
                    column.sortable ? 'cursor-pointer group hover:bg-gray-100/50' : ''
                  } ${column.headerClassName || ''}`}
                  onClick={() => column.sortable && handleSort(column.key as string)}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {column.sortable && (
                      <span className="text-gray-400">{getSortIcon(column.key as string)}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedData.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={`group transition-colors ${
                  rowClassName ? rowClassName(item) : 'hover:bg-blue-50/30'
                } ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column) => (
                  <td
                    key={`${keyExtractor(item)}-${column.key as string}`}
                    className={`px-6 py-4 ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(item, index)
                      : getValueForKey(item, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

DataTable.displayName = 'DataTable';

export default DataTable;
