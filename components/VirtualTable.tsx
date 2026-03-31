import { useRef, useState, useCallback, useEffect, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Virtual table props
interface VirtualTableProps<T> {
  data: T[];
  columns: {
    key: keyof T | string;
    header: string;
    width?: string | number;
    render?: (item: T, index: number) => React.ReactNode;
    sortable?: boolean;
  }[];
  keyExtractor: (item: T) => string;
  rowHeight?: number;
  headerHeight?: number;
  maxHeight?: number;
  onRowClick?: (item: T) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
}

// Memoized table row for performance
const TableRow = memo(<T extends object>({
  item,
  index,
  columns,
  style,
  onClick,
  isEven
}: {
  item: T;
  index: number;
  columns: VirtualTableProps<T>['columns'];
  style: React.CSSProperties;
  onClick?: () => void;
  isEven: boolean;
}) => {
  return (
    <div
      style={style}
      onClick={onClick}
      className={`flex w-full border-b border-gray-100 ${
        isEven ? 'bg-white' : 'bg-gray-50/30'
      } ${onClick ? 'cursor-pointer hover:bg-blue-50/30' : ''} transition-colors`}
    >
      {columns.map((column, colIndex) => (
        <div
          key={String(column.key)}
          className="px-4 py-3 text-sm flex-shrink-0 overflow-hidden"
          style={{
            width: column.width || `${100 / columns.length}%`,
            flex: column.width ? undefined : 1,
          }}
        >
          {column.render
            ? column.render(item, index)
            : String((item as any)[column.key] || '-')
          }
        </div>
      ))}
    </div>
  );
});

TableRow.displayName = 'TableRow';

// Main virtual table component
export function VirtualTable<T extends object>({
  data,
  columns,
  keyExtractor,
  rowHeight = 56,
  headerHeight = 48,
  maxHeight = 600,
  onRowClick,
  sortConfig,
  onSort,
  emptyState,
  isLoading
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5, // Render 5 extra rows for smooth scrolling
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Handle sort click
  const handleSort = useCallback((column: VirtualTableProps<T>['columns'][0]) => {
    if (column.sortable && onSort) {
      onSort(String(column.key));
    }
  }, [onSort]);

  // Empty state
  if (!isLoading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto rounded-2xl border border-gray-100 bg-white"
      style={{ maxHeight }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex w-full bg-gray-50/90 backdrop-blur border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider"
        style={{ height: headerHeight }}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            onClick={() => handleSort(column)}
            className={`px-4 py-3 flex items-center gap-1 flex-shrink-0 ${
              column.sortable ? 'cursor-pointer hover:text-gray-900 select-none' : ''
            }`}
            style={{
              width: column.width || `${100 / columns.length}%`,
              flex: column.width ? undefined : 1,
            }}
          >
            {column.header}
            {column.sortable && sortConfig?.key === column.key && (
              sortConfig.direction === 'asc' ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )
            )}
          </div>
        ))}
      </div>

      {/* Virtual List Container */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = data[virtualItem.index];
          const isEven = virtualItem.index % 2 === 0;

          return (
            <div
              key={keyExtractor(item)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              onMouseEnter={() => setHoveredRow(virtualItem.index)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <TableRow
                item={item}
                index={virtualItem.index}
                columns={columns}
                style={{ height: '100%' }}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                isEven={isEven}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Optimized inventory table using virtual scrolling
export function InventoryVirtualTable({
  items,
  onEdit,
  onDelete,
  hasPermission,
  sortConfig,
  onSort
}: {
  items: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  hasPermission: (module: string, type: string) => boolean;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Expired': return 'bg-red-100 text-red-700 border-red-200';
      case 'Critical': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Good': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const columns = [
    {
      key: 'productName',
      header: 'Product',
      width: '25%',
      sortable: true,
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 truncate">{item.productName}</span>
          <span className="text-xs text-gray-500">{item.unitName}</span>
        </div>
      ),
    },
    {
      key: 'barcode',
      header: 'Barcode / ID',
      width: '20%',
      render: (item: any) => (
        <div className="flex flex-col">
          {item.barcode ? (
            <span className="font-mono text-xs text-gray-900">{item.barcode}</span>
          ) : (
            <span className="text-xs text-gray-400 italic">No Barcode</span>
          )}
          <span className="font-mono text-[10px] text-gray-400">#{item.id.slice(0, 8)}</span>
        </div>
      ),
    },
    {
      key: 'remainingQty',
      header: 'Stock',
      width: '10%',
      sortable: true,
      render: (item: any) => (
        <span className="font-medium text-gray-900">{item.remainingQty}</span>
      ),
    },
    {
      key: 'expDate',
      header: 'Expiry',
      width: '15%',
      sortable: true,
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-900">
            {new Date(item.expDate).toLocaleDateString('en-GB')}
          </span>
          <span className={`text-[10px] font-bold uppercase ${item.status === 'Expired' ? 'text-red-600' : 'text-blue-600'}`}>
            {item.status}
          </span>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      width: '15%',
      sortable: true,
      render: (item: any) => (
        <span className="text-sm text-gray-600">{item.branch}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '15%',
      sortable: true,
      render: (item: any) => {
        const diffDays = item.diffDays;
        const label = diffDays < 0 ? `${Math.abs(diffDays)}d Overdue` : 
                     diffDays === 0 ? 'Today' : `${diffDays}d Left`;
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
            {label}
          </span>
        );
      },
    },
  ];

  // Add actions column if user has permission
  if (hasPermission('Inventory', 'write')) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      width: '10%',
      render: (item: any) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    });
  }

  return (
    <VirtualTable
      data={items}
      columns={columns}
      keyExtractor={(item) => item.id}
      rowHeight={64}
      maxHeight={600}
      sortConfig={sortConfig}
      onSort={onSort}
      onRowClick={hasPermission('Inventory', 'write') ? onEdit : undefined}
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="font-medium">No inventory found</p>
          <p className="text-xs mt-1">Try adjusting your filters or add a new item.</p>
        </div>
      }
    />
  );
}

export default VirtualTable;
