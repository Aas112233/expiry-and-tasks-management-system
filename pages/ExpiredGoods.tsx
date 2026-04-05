import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { Plus, Filter, Scan, Save, X, AlertCircle, Trash2, Edit2, AlertTriangle, Package, Loader2, RefreshCw, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ExpiryStatus, ExpiredItem, Role } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { catalogService } from '../services/catalogService';
import { useAuth } from '../AuthContext';
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from '../hooks/useInventory';
import { useInventoryShortcuts } from '../hooks/useKeyboardShortcuts';
import { PageSkeleton } from '../components/Skeleton';
import { InventoryVirtualTable } from '../components/VirtualTable';

const ITEMS_PER_PAGE = 20;
type SortableInventoryKey = keyof ExpiredItem | 'diffDays';
type InventoryRow = ExpiredItem & { diffDays: number; _optimistic?: boolean };

export default function Inventory() {
  const location = useLocation();
  const { selectedBranch, branches } = useBranch();
  const { debouncedQuery } = useSearch();
  const { hasPermission, user } = useAuth();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [localBranchFilter, setLocalBranchFilter] = useState('All Branches');
  const [filterUnit, setFilterUnit] = useState('All Units');
  const [barcodeFilter, setBarcodeFilter] = useState<'all' | 'with-barcode' | 'without-barcode'>('all');
  const [notesFilter, setNotesFilter] = useState<'all' | 'with-notes' | 'without-notes'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableInventoryKey; direction: 'asc' | 'desc' } | null>({ key: 'status', direction: 'asc' });
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [newItem, setNewItem] = useState<Partial<ExpiredItem>>({
    remainingQty: 0,
    branch: user?.role !== Role.Admin ? (user?.branchId || '') : (selectedBranch !== 'All Branches' ? selectedBranch : (branches[0]?.name || 'Main Branch')),
    unitName: 'pcs',
    notes: ''
  });
  const [isLookingUp, setIsLookingUp] = useState(false);

  // React Query hooks
  const { data, isLoading, error, refetch } = useInventory({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedQuery || undefined,
    status: filterStatus !== 'All' ? filterStatus : undefined,
    branch: selectedBranch !== 'All Branches'
      ? selectedBranch
      : (localBranchFilter !== 'All Branches' ? localBranchFilter : undefined),
    unit: filterUnit !== 'All Units' ? filterUnit : undefined,
    barcodeState: barcodeFilter !== 'all' ? barcodeFilter : undefined,
    notesState: notesFilter !== 'all' ? notesFilter : undefined
  });

  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  // Search input ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, filterStatus, selectedBranch, localBranchFilter, filterUnit, barcodeFilter, notesFilter]);

  // Sync with global branch context
  useEffect(() => {
    if (selectedBranch !== 'All Branches') {
      setLocalBranchFilter(selectedBranch);
    } else {
      setLocalBranchFilter('All Branches');
    }
  }, [selectedBranch]);

  // Handle URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    if (statusParam) {
      if (statusParam === 'expired') setFilterStatus(ExpiryStatus.Expired);
      else if (statusParam === 'critical') setFilterStatus(ExpiryStatus.Critical);
      else if (statusParam === 'warning') setFilterStatus(ExpiryStatus.Warning);
    }
  }, [location]);

  const statusPriority: Record<string, number> = {
    [ExpiryStatus.Expired]: 0,
    [ExpiryStatus.Critical]: 1,
    [ExpiryStatus.Warning]: 2,
    [ExpiryStatus.Good]: 3,
    [ExpiryStatus.Safe]: 4,
  };

  const getStatusColor = (status: ExpiryStatus) => {
    switch (status) {
      case ExpiryStatus.Expired: return 'bg-red-500 text-white border-red-600 shadow-[0_0_10px_-3px_rgba(239,68,68,0.4)]';
      case ExpiryStatus.Critical: return 'bg-orange-500 text-white border-orange-600 shadow-[0_0_10px_-3px_rgba(249,115,22,0.4)]';
      case ExpiryStatus.Warning: return 'bg-amber-400 text-slate-900 border-amber-500 shadow-[0_0_10px_-3px_rgba(251,191,36,0.3)]';
      case ExpiryStatus.Good: return 'bg-emerald-500 text-white border-emerald-600 shadow-[0_0_10px_-3px_rgba(16,185,129,0.4)]';
      default: return 'bg-blue-500 text-white border-blue-600 shadow-[0_0_10px_-3px_rgba(59,130,246,0.4)]';
    }
  };

  const handleOpenModal = useCallback((item?: ExpiredItem) => {
    if (item) {
      setEditingId(item.id);
      setNewItem({
        ...item,
        mfgDate: item.mfgDate ? new Date(item.mfgDate).toISOString().split('T')[0] : '',
        expDate: item.expDate ? new Date(item.expDate).toISOString().split('T')[0] : ''
      });
    } else {
      setEditingId(null);
      setNewItem({
        remainingQty: 0,
        unitName: 'pcs',
        notes: '',
        branch: selectedBranch !== 'All Branches' ? selectedBranch : (branches[0]?.name || 'Main Branch')
      });
    }
    setValidationError(null);
    setIsModalOpen(true);
  }, [selectedBranch, branches]);

  const handleBarcodeChange = async (barcode: string) => {
    setNewItem(prev => ({ ...prev, barcode }));

    if (barcode.length >= 4) {
      setIsLookingUp(true);
      try {
        const catalogItem = await catalogService.getByBarcode(barcode);
        if (catalogItem && !newItem.productName) {
          setNewItem(prev => ({
            ...prev,
            productName: catalogItem.productName || prev.productName,
            unitName: catalogItem.unit || prev.unitName
          }));
        }
      } catch (error) {
        // Silently ignore failures/not found
      } finally {
        setIsLookingUp(false);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewItem({ remainingQty: 0, unitName: 'pcs', notes: '' });
    setEditingId(null);
    setValidationError(null);
  };

  // Keyboard shortcuts - must be after function definitions
  useInventoryShortcuts({
    onNew: () => hasPermission('Inventory', 'write') && handleOpenModal(),
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: () => refetch(),
    onCloseModal: handleCloseModal,
    isModalOpen
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!newItem.productName || !newItem.expDate || !newItem.mfgDate) {
      setValidationError('Please fill in all required fields.');
      return;
    }
    if (new Date(newItem.expDate) <= new Date(newItem.mfgDate)) {
      setValidationError('Expiry Date must be after Manufacturing Date.');
      return;
    }
    if ((newItem.remainingQty || 0) < 0) {
      setValidationError('Remaining Quantity cannot be negative.');
      return;
    }

    try {
      if (editingId) {
        await updateItem.mutateAsync({ id: editingId, updates: newItem });
      } else {
        await createItem.mutateAsync(newItem as Omit<ExpiredItem, 'id' | 'status'>);
      }
      handleCloseModal();
    } catch (error) {
      setValidationError("Failed to save item. Please try again.");
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteItem.mutateAsync(deleteId);
        setDeleteId(null);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const handleSort = (key: SortableInventoryKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExportExcel = () => {
    if (!visibleItems.length) {
      alert("No data available to export.");
      return;
    }

    const exportData = visibleItems.map(item => ({
      'ID': item.id,
      'Product Name': item.productName,
      'Barcode/SKU': item.barcode || 'N/A',
      'Remaining Qty': item.remainingQty,
      'Unit': item.unitName,
      'Mfg Date': new Date(item.mfgDate).toLocaleDateString('en-GB'),
      'Expiry Date': new Date(item.expDate).toLocaleDateString('en-GB'),
      'Branch': item.branch,
      'Live Status': item.status,
      'Server Status': item.serverStatus || item.status,
      'Notes': item.notes || '',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : 'N/A',
      'Updated At': item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-GB') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Data");

    const wscols = [
      { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 40 }, { wch: 22 }, { wch: 22 }
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Process and sort items
  // Process items and calculate dynamic status
  const processedItems = useMemo<InventoryRow[]>(() => {
    if (!data?.items) return [];
    
    return data.items.map((item) => {
      const exp = new Date(item.expDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let liveStatus = ExpiryStatus.Safe;
      if (diffDays <= 0) liveStatus = ExpiryStatus.Expired;
      else if (diffDays <= 15) liveStatus = ExpiryStatus.Critical;
      else if (diffDays <= 45) liveStatus = ExpiryStatus.Warning;
      else if (diffDays <= 60) liveStatus = ExpiryStatus.Good;

      return { ...item, status: liveStatus, diffDays, _optimistic: item._optimistic };
    });
  }, [data?.items]);

  const availableBranches = useMemo(() => {
    const branchNames = new Set<string>();
    branches.forEach((branch) => branchNames.add(branch.name));
    processedItems.forEach((item) => branchNames.add(item.branch));
    if (localBranchFilter !== 'All Branches') branchNames.add(localBranchFilter);
    if (selectedBranch !== 'All Branches') branchNames.add(selectedBranch);
    return ['All Branches', ...Array.from(branchNames).sort((a, b) => a.localeCompare(b))];
  }, [branches, processedItems, localBranchFilter, selectedBranch]);

  const availableUnits = useMemo(() => {
    const unitNames = processedItems
      .map((item) => item.unitName || item.unit)
      .filter((unit): unit is string => Boolean(unit));
    if (filterUnit !== 'All Units') unitNames.push(filterUnit);
    return ['All Units', ...Array.from(new Set(unitNames)).sort((a, b) => a.localeCompare(b))];
  }, [processedItems, filterUnit]);

  const statusCounts = useMemo(() => {
    return processedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  }, [processedItems]);

  const sortedItems = useMemo(() => {
    if (!sortConfig) return processedItems;

    return [...processedItems].sort((a, b) => {
      if (sortConfig.key === 'status') {
        const aPriority = statusPriority[a.status] ?? 99;
        const bPriority = statusPriority[b.status] ?? 99;
        return sortConfig.direction === 'asc' ? aPriority - bPriority : bPriority - aPriority;
      }

      if (sortConfig.key === 'diffDays') {
        return sortConfig.direction === 'asc' ? a.diffDays - b.diffDays : b.diffDays - a.diffDays;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === undefined || bValue === undefined) return 0;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedItems, sortConfig]);

  const visibleItems = sortedItems;

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (filterStatus !== 'All') chips.push(`Status: ${filterStatus}`);
    if ((selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter) !== 'All Branches') {
      chips.push(`Branch: ${selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter}`);
    }
    if (filterUnit !== 'All Units') chips.push(`Unit: ${filterUnit}`);
    if (barcodeFilter === 'with-barcode') chips.push('Barcode only');
    if (barcodeFilter === 'without-barcode') chips.push('Missing barcode');
    if (notesFilter === 'with-notes') chips.push('With notes');
    if (notesFilter === 'without-notes') chips.push('Without notes');
    if (debouncedQuery) chips.push(`Search: ${debouncedQuery}`);
    return chips;
  }, [debouncedQuery, filterStatus, filterUnit, barcodeFilter, notesFilter, selectedBranch, localBranchFilter]);

  const clearFilters = () => {
    setFilterStatus('All');
    if (selectedBranch === 'All Branches') {
      setLocalBranchFilter('All Branches');
    }
    setFilterUnit('All Units');
    setBarcodeFilter('all');
    setNotesFilter('all');
  };

  const bucketTabs = [
    { label: 'All Items', value: 'All', count: data?.summary?.all ?? data?.pagination?.totalCount ?? 0 },
    { label: 'Expired', value: ExpiryStatus.Expired, count: data?.summary?.expired ?? statusCounts[ExpiryStatus.Expired] ?? 0 },
    { label: 'Critical (0-15d)', value: ExpiryStatus.Critical, count: data?.summary?.critical ?? statusCounts[ExpiryStatus.Critical] ?? 0 },
    { label: 'Warning (16-45d)', value: ExpiryStatus.Warning, count: data?.summary?.warning ?? statusCounts[ExpiryStatus.Warning] ?? 0 },
    { label: 'Good (46-60d)', value: ExpiryStatus.Good, count: data?.summary?.good ?? statusCounts[ExpiryStatus.Good] ?? 0 },
    { label: 'Safe (60+d)', value: ExpiryStatus.Safe, count: data?.summary?.safe ?? statusCounts[ExpiryStatus.Safe] ?? 0 },
  ];

  const pagination = data?.pagination;

  // Show skeleton on initial load
  if (isLoading && !data) {
    return <PageSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Failed to load inventory</h3>
        <p className="text-gray-500 mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expired Goods <span className="text-xs text-blue-500 font-mono">server-backed inventory</span></h1>
          <p className="text-gray-500 mt-1">Review expiry risk, apply server-backed filters, and inspect the full record details for each item.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-600" />
            Export Excel Report
          </button>
          {hasPermission('Inventory', 'write') && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Control Bar - Glassmorphism */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4 hover:shadow-md transition-shadow">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  className={`pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer ${selectedBranch !== 'All Branches' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-700'}`}
                  value={selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter}
                  onChange={(e) => setLocalBranchFilter(e.target.value)}
                  disabled={selectedBranch !== 'All Branches'}
                >
                  {availableBranches.map((branchName) => (
                    <option key={branchName} value={branchName}>{branchName}</option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <select
                className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
              >
                {availableUnits.map((unitName) => (
                  <option key={unitName} value={unitName}>{unitName}</option>
                ))}
              </select>

              <select
                className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={barcodeFilter}
                onChange={(e) => setBarcodeFilter(e.target.value as 'all' | 'with-barcode' | 'without-barcode')}
              >
                <option value="all">All Barcode States</option>
                <option value="with-barcode">With Barcode</option>
                <option value="without-barcode">No Barcode</option>
              </select>

              <select
                className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={notesFilter}
                onChange={(e) => setNotesFilter(e.target.value as 'all' | 'with-notes' | 'without-notes')}
              >
                <option value="all">All Notes States</option>
                <option value="with-notes">With Notes</option>
                <option value="without-notes">No Notes</option>
              </select>

              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>

              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilterChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Filtered Total</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{pagination?.totalCount ?? 0}</div>
              <div className="text-xs text-gray-500">Rows matching the active server filters</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Loaded Page</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{processedItems.length}</div>
              <div className="text-xs text-gray-500">
                {pagination ? `Page ${pagination.page} of ${pagination.totalPages}` : 'Current server page'}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Rows Per Page</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{visibleItems.length}</div>
              <div className="text-xs text-gray-500">Current page after sorting</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
          {bucketTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${filterStatus === tab.value
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200'
                }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table Area with Virtual Scrolling for large datasets */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3">Loading inventory...</span>
          </div>
        ) : visibleItems.length > 100 ? (
          // Virtual table for large datasets (>100 items)
          <InventoryVirtualTable
            items={visibleItems}
            onEdit={handleOpenModal}
            onDelete={setDeleteId}
            hasPermission={hasPermission}
            sortConfig={sortConfig as any}
            onSort={(key) => handleSort(key as SortableInventoryKey)}
          />
        ) : (
          // Regular table for smaller datasets
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('productName')}>
                      Product Name
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('id')}>
                      ID / Barcode
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('remainingQty')}>
                      Stock / Unit
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('mfgDate')}>
                      Mfg / Expiry
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('branch')}>
                      Branch
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('diffDays')}>
                      Status
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('notes')}>
                      Notes
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('updatedAt')}>
                      Server Data
                    </th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <Package className="w-12 h-12 text-gray-200 mb-3" />
                          <p className="font-medium">No inventory found</p>
                          <p className="text-xs mt-1">No rows matched the current server-side filters. Adjust the filters or clear them.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((item) => (
                      <tr key={item.id} className={`group hover:bg-blue-50/30 transition-colors ${item._optimistic ? 'opacity-70' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{item.productName}</span>
                            <span className="text-xs text-gray-500">{item.unitName}</span>
                            {item._optimistic && <span className="text-[10px] text-blue-500">Saving...</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {item.barcode ? (
                              <div className="flex items-center gap-1.5 text-gray-900">
                                <Scan className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-mono text-xs font-bold tracking-wide">{item.barcode}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic pl-1">No Barcode</span>
                            )}
                            <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1 pl-0.5" title={item.id}>
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                              #{item.id.slice(0, 8)}...
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{item.remainingQty}</span>
                            <span className="text-xs text-gray-500">{item.unitName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-xs space-y-1">
                            <span className="font-medium text-gray-500">
                              Mfg: {new Date(item.mfgDate).toLocaleDateString('en-GB')}
                            </span>
                            <span className="font-bold text-gray-900">
                              {new Date(item.expDate).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">{item.branch}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-medium border ring-1 ring-inset ${getStatusColor(item.status)}`}>
                              {item.diffDays < 0 ? `${Math.abs(item.diffDays)}d Overdue` : 
                               item.diffDays === 0 ? 'Today' : `${item.diffDays}d Left`}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              Live: {item.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.notes ? (
                            <p className="max-w-xs whitespace-pre-wrap break-words text-xs text-gray-600">{item.notes}</p>
                          ) : (
                            <span className="text-xs italic text-gray-400">No notes</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-[11px] text-gray-500">
                            <span>Server status: <span className="font-semibold text-gray-700">{item.serverStatus || item.status}</span></span>
                            <span>Created: {item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : 'N/A'}</span>
                            <span>Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-GB') : 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {hasPermission('Inventory', 'write') && (
                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenModal(item)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteId(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage || isLoading}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={isLoading}
                          className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                            pageNum === pagination.page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasNextPage || isLoading}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" style={{ animationFillMode: 'forwards' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Inventory Item' : 'Add New Item'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {validationError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm animate-pulse">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {validationError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                    placeholder="e.g. Organic Whole Milk"
                    value={newItem.productName || ''}
                    onChange={e => setNewItem({ ...newItem, productName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Barcode / SKU</label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono tracking-wide transition-all"
                          placeholder="Scan..."
                          value={newItem.barcode || ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              handleBarcodeChange(val);
                            }
                          }}
                        />
                        <Scan className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBarcodeChange(newItem.barcode || '')}
                        disabled={isLookingUp || !newItem.barcode}
                        className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sync from Catalog"
                      >
                        <RefreshCw className={`w-5 h-5 ${isLookingUp ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Unit Type</label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white font-medium transition-all cursor-pointer"
                    value={newItem.unitName || 'pcs'}
                    onChange={e => setNewItem({ ...newItem, unitName: e.target.value })}
                  >
                    <option value="pcs">pcs</option>
                    <option value="box">box</option>
                    <option value="bundle">bundle</option>
                    <option value="carton">carton</option>
                    <option value="kg">kg</option>
                    <option value="l">l</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono font-medium transition-all"
                    value={newItem.remainingQty}
                    onChange={e => setNewItem({ ...newItem, remainingQty: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Branch <span className="text-red-500">*</span></label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500 font-medium transition-all cursor-pointer"
                    value={newItem.branch || ''}
                    onChange={e => setNewItem({ ...newItem, branch: e.target.value })}
                    required
                    disabled={user?.role !== Role.Admin}
                  >
                    {user?.role !== Role.Admin ? (
                      <option value={user?.branchId}>{user?.branchId}</option>
                    ) : (
                      <>
                        <option value="" disabled>Select Branch</option>
                        {branches.map(b => <option key={b.id}>{b.name}</option>)}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Mfg Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all cursor-pointer"
                    value={newItem.mfgDate || ''}
                    onChange={e => {
                      const newMfg = e.target.value;
                      setNewItem({ ...newItem, mfgDate: newMfg });
                      if (newItem.expDate && new Date(newItem.expDate) > new Date(newMfg)) {
                        setValidationError(null);
                      }
                    }}
                  />
                  <p className="text-[10px] text-gray-400 mt-1 font-medium">Date of manufacturing</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Exp Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    min={newItem.mfgDate ? new Date(new Date(newItem.mfgDate).getTime() + 86400000).toISOString().split('T')[0] : ''}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all cursor-pointer ${newItem.mfgDate && newItem.expDate && new Date(newItem.expDate) <= new Date(newItem.mfgDate)
                      ? 'border-red-300 focus:border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 focus:border-blue-500'
                      }`}
                    value={newItem.expDate || ''}
                    onChange={e => {
                      const newExp = e.target.value;
                      setNewItem({ ...newItem, expDate: newExp });

                      if (newItem.mfgDate && new Date(newExp) <= new Date(newItem.mfgDate)) {
                        setValidationError('Expiry Date must be strictly after Manufacturing Date.');
                      } else {
                        setValidationError(null);
                      }
                    }}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {newItem.mfgDate && newItem.expDate && new Date(newItem.expDate) <= new Date(newItem.mfgDate)
                      ? <span className="text-red-600 font-bold flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Invalid Date</span>
                      : "Best before / Expiry date"
                    }
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Notes</label>
                  <textarea
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                    rows={3}
                    placeholder="Add any additional details..."
                    value={newItem.notes || ''}
                    onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-bold transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createItem.isPending || updateItem.isPending}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold flex items-center shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70"
                >
                  {(createItem.isPending || updateItem.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (editingId ? <Edit2 className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />)}
                  {editingId ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-sm p-6 text-center border border-white/20">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 ring-4 ring-red-50">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Item?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteItem.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-70 flex items-center"
              >
                {deleteItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
