import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Scan, Calendar, Save, X, ArrowUpDown, AlertCircle, Trash2, Edit2, AlertTriangle, Package, Loader2, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ExpiryStatus, ExpiredItem } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { inventoryService } from '../services/inventoryService';
import { BRANCHES } from '../constants';
import { useAuth } from '../AuthContext';

export default function Inventory() {
  const location = useLocation();
  const { selectedBranch } = useBranch();
  const { searchQuery } = useSearch();
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<ExpiredItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [localBranchFilter, setLocalBranchFilter] = useState('All Branches');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExpiredItem; direction: 'asc' | 'desc' } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [newItem, setNewItem] = useState<Partial<ExpiredItem>>({
    remainingQty: 0,
    unitName: 'pcs',
    notes: ''
  });

  // Initial Load
  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryService.getAllItems();
      setItems(data);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getStatusColor = (status: ExpiryStatus) => {
    switch (status) {
      case ExpiryStatus.Expired: return 'bg-red-50 text-red-700 border-red-200 ring-red-500/20';
      case ExpiryStatus.Critical: return 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20';
      case ExpiryStatus.Warning: return 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-yellow-500/20';
      case ExpiryStatus.Good: return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20';
      default: return 'bg-green-50 text-green-700 border-green-200 ring-green-500/20';
    }
  };

  const handleOpenModal = (item?: ExpiredItem) => {
    if (item) {
      setEditingId(item.id);
      // Format dates to YYYY-MM-DD for input fields if they exist
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
        branch: selectedBranch !== 'All Branches' ? selectedBranch : BRANCHES[0].name
      });
    }
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewItem({ remainingQty: 0, unitName: 'pcs', notes: '' });
    setEditingId(null);
    setValidationError(null);
    setIsSaving(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsSaving(true);

    if (!newItem.productName || !newItem.expDate || !newItem.mfgDate) {
      setValidationError('Please fill in all required fields.');
      setIsSaving(false);
      return;
    }
    if (new Date(newItem.expDate) <= new Date(newItem.mfgDate)) {
      setValidationError('Expiry Date must be after Manufacturing Date.');
      setIsSaving(false);
      return;
    }
    if ((newItem.remainingQty || 0) < 0) {
      setValidationError('Remaining Quantity cannot be negative.');
      setIsSaving(false);
      return;
    }

    try {
      if (editingId) {
        const updated = await inventoryService.updateItem(editingId, newItem);
        setItems(prev => prev.map(item => item.id === editingId ? updated : item));
      } else {
        const created = await inventoryService.createItem(newItem as Omit<ExpiredItem, 'id' | 'status'>);
        setItems(prev => [created, ...prev]);
      }
      handleCloseModal();
    } catch (error) {
      setValidationError("Failed to save item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await inventoryService.deleteItem(deleteId);
        setItems(prev => prev.filter(i => i.id !== deleteId));
        setDeleteId(null);
      } catch (error) {
        alert("Failed to delete item");
      }
    }
  };

  const handleSort = (key: keyof ExpiredItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery) ||
      item.id.includes(searchQuery); // Search by ID too

    const matchesStatus = filterStatus === 'All' ? true : item.status === filterStatus;

    let matchesBranch = true;
    if (selectedBranch !== 'All Branches') {
      matchesBranch = item.branch === selectedBranch;
    } else {
      matchesBranch = localBranchFilter === 'All Branches' ? true : item.branch === localBranchFilter;
    }

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue === undefined || bValue === undefined) return 0;
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ columnKey }: { columnKey: keyof ExpiredItem }) => {
    if (sortConfig?.key === columnKey) {
      return <ArrowUpDown className={`w-3 h-3 ml-1 inline ${sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-blue-600'}`} />;
    }
    return <ArrowUpDown className="w-3 h-3 ml-1 inline text-gray-300 opacity-0 group-hover:opacity-100" />;
  };

  const bucketTabs = [
    { label: 'All Items', value: 'All' },
    { label: 'Expired', value: ExpiryStatus.Expired },
    { label: 'Critical (0-15d)', value: ExpiryStatus.Critical },
    { label: 'Warning (16-45d)', value: ExpiryStatus.Warning },
    { label: 'Good (46-60d)', value: ExpiryStatus.Good },
    { label: 'Safe (60+d)', value: ExpiryStatus.Safe },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track stock levels, expiry dates, and product details.</p>
        </div>
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

      {/* Control Bar - Glassmorphism */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative">
              <select
                className={`pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer ${selectedBranch !== 'All Branches' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-700'}`}
                value={selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter}
                onChange={(e) => setLocalBranchFilter(e.target.value)}
                disabled={selectedBranch !== 'All Branches'}
              >
                <option>All Branches</option>
                {BRANCHES.map(b => <option key={b.id}>{b.name}</option>)}
              </select>
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={loadInventory} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden md:flex items-center text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <Search className="w-3 h-3 mr-2" />
            Showing {filteredItems.length} items
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
            </button>
          ))}
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3">Loading inventory...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('productName')}>
                    Product Name <SortIcon columnKey="productName" />
                  </th>
                  <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('id')}>
                    ID / Barcode <SortIcon columnKey="id" />
                  </th>
                  <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('remainingQty')}>
                    Stock <SortIcon columnKey="remainingQty" />
                  </th>
                  <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-gray-100/50" onClick={() => handleSort('expDate')}>
                    Expiry <SortIcon columnKey="expDate" />
                  </th>
                  <th className="px-6 py-4 font-semibold">Branch</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-12 h-12 text-gray-200 mb-3" />
                        <p className="font-medium">No inventory found</p>
                        <p className="text-xs mt-1">Try adjusting your filters or add a new item.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => (
                    <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{item.productName}</span>
                          <span className="text-xs text-gray-500">{item.unitName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {/* Barcode First (Top) */}
                          {item.barcode ? (
                            <div className="flex items-center gap-1.5 text-gray-900">
                              <Scan className="w-3.5 h-3.5 text-blue-600" />
                              <span className="font-mono text-xs font-bold tracking-wide">{item.barcode}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic pl-1">No Barcode</span>
                          )}

                          {/* ID Second (Bottom) */}
                          <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1 pl-0.5" title={item.id}>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            #{item.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.remainingQty}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs space-y-1">
                          <span className="font-bold text-red-600">
                            {new Date(item.expDate).toLocaleDateString('en-GB')}
                          </span>
                          <span className="font-medium text-blue-600">
                            Mfg: {new Date(item.mfgDate).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{item.branch}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ring-1 ring-inset ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
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
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Inventory Item' : 'Add New Item'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {validationError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {validationError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    placeholder="e.g. Organic Whole Milk"
                    value={newItem.productName || ''}
                    onChange={e => setNewItem({ ...newItem, productName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode / SKU</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono"
                      placeholder="Scan or type..."
                      value={newItem.barcode || ''}
                      onChange={e => setNewItem({ ...newItem, barcode: e.target.value })}
                    />
                    <Scan className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    placeholder="e.g. Box, Kg, Liter"
                    value={newItem.unitName || ''}
                    onChange={e => setNewItem({ ...newItem, unitName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={newItem.remainingQty}
                    onChange={e => setNewItem({ ...newItem, remainingQty: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch <span className="text-red-500">*</span></label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                    value={newItem.branch || ''}
                    onChange={e => setNewItem({ ...newItem, branch: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select Branch</option>
                    {BRANCHES.map(b => <option key={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mfg Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]} // Cannot be in future
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={newItem.mfgDate || ''}
                    onChange={e => {
                      const newMfg = e.target.value;
                      setNewItem({ ...newItem, mfgDate: newMfg });
                      // Clear error if resolved
                      if (newItem.expDate && new Date(newItem.expDate) > new Date(newMfg)) {
                        setValidationError(null);
                      }
                    }}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Date of manufacturing (cannot be future)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exp Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    min={newItem.mfgDate ? new Date(new Date(newItem.mfgDate).getTime() + 86400000).toISOString().split('T')[0] : ''} // Must be > Mfg
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm ${newItem.mfgDate && newItem.expDate && new Date(newItem.expDate) <= new Date(newItem.mfgDate)
                        ? 'border-red-300 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-blue-500'
                      }`}
                    value={newItem.expDate || ''}
                    onChange={e => {
                      const newExp = e.target.value;
                      setNewItem({ ...newItem, expDate: newExp });

                      // Real-time validation
                      if (newItem.mfgDate && new Date(newExp) <= new Date(newItem.mfgDate)) {
                        setValidationError('Expiry Date must be strictly after Manufacturing Date.');
                      } else {
                        setValidationError(null);
                      }
                    }}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {newItem.mfgDate && newItem.expDate && new Date(newItem.expDate) <= new Date(newItem.mfgDate)
                      ? <span className="text-red-500 font-medium">Invalid: Must be after Mfg Date</span>
                      : "Best before / Expiry date"
                    }
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
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
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingId ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-white/20">
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition-colors"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}