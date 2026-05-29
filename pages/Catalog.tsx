import React, { useState, useEffect, useRef } from 'react';
import {
    Package,
    Search,
    Trash2,
    Database,
    RefreshCw,
    AlertCircle,
    Hash,
    Scale,
    Calendar,
    Plus,
    X,
    Edit2,
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { catalogService, CatalogItem, ImportResult } from '../services/catalogService';
import { Button, Badge, Card, Modal, Input, EmptyState, Skeleton, Select } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { useToast } from '../ToastContext';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';

const Catalog: React.FC = () => {
    const { showToast } = useToast();
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Summary Statistics
    const [summary, setSummary] = useState({
        totalProducts: 0,
        uniqueBarcodes: 0,
        dualNamedProducts: 0
    });

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [formData, setFormData] = useState({
        productName: '',
        productName2: '',
        barcode: '',
        unit: 'pcs',
        itemCode: '',
        category: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Import modal state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [importError, setImportError] = useState<string | null>(null);

    // Delete state
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search input debouncing (500ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    const fetchCatalog = async (currentPage = page, currentLimit = limit, currentSearch = debouncedSearch) => {
        try {
            setLoading(true);
            const res = await catalogService.getAll(currentPage, currentLimit, currentSearch);
            setItems(res.items);
            setTotalPages(res.pagination.totalPages);
            setTotalCount(res.pagination.totalCount);
            setSummary(res.summary);
        } catch (error) {
            console.error('Failed to fetch catalog:', error);
            showToast({ title: 'Error', message: 'Failed to load catalog', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCatalog(page, limit, debouncedSearch);
    }, [page, limit, debouncedSearch]);

    const handleSync = async () => {
        try {
            const result = await catalogService.syncWithInventory();
            showToast({
                title: 'Sync Complete',
                message: `Added ${result.syncedCount} new product mappings`,
                type: 'success'
            });
            fetchCatalog(page, limit, debouncedSearch);
        } catch (error) {
            console.error('Sync failed:', error);
            showToast({ title: 'Error', message: 'Failed to sync catalog', type: 'error' });
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await catalogService.deleteItem(deleteId);
            showToast({ title: 'Success', message: 'Catalog item deleted', type: 'success' });
            setDeleteId(null);
            fetchCatalog();
        } catch (error) {
            showToast({ title: 'Error', message: 'Failed to delete item', type: 'error' });
        }
    };

    const openEditModal = (item: CatalogItem) => {
        setEditingItem(item);
        setFormData({
            productName: item.productName,
            productName2: item.productName2 || '',
            barcode: item.barcode,
            unit: item.unit,
            itemCode: item.itemCode || '',
            category: ''
        });
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData({
            productName: '',
            productName2: '',
            barcode: '',
            unit: 'pcs',
            itemCode: '',
            category: ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const payload = {
                productName: formData.productName,
                productName2: formData.productName2,
                barcode: formData.barcode,
                unit: formData.unit,
                itemCode: formData.itemCode,
                category: formData.category
            };

            if (editingItem) {
                await catalogService.updateItem(editingItem.id, payload);
                showToast({ title: 'Success', message: 'Item updated successfully', type: 'success' });
            } else {
                await catalogService.createItem(payload);
                showToast({ title: 'Success', message: 'Item created successfully', type: 'success' });
            }
            setIsModalOpen(false);
            fetchCatalog();
        } catch (error) {
            showToast({ title: 'Error', message: 'Failed to save item', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Import Handlers
    const openImportModal = () => {
        setImportFile(null);
        setImportResult(null);
        setImportError(null);
        setIsImporting(false);
        setIsImportModalOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImportFile(file);
            setImportError(null);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;

        try {
            setIsImporting(true);
            setImportError(null);

            const result = await catalogService.importExcel(importFile);
            setImportResult(result);
            showToast({
                title: 'Import Complete',
                message: `Created ${result.created} items, updated ${result.updated}`,
                type: 'success'
            });
            fetchCatalog();
        } catch (error: any) {
            setImportError(error.message || 'Import failed');
            showToast({ title: 'Error', message: 'Import failed', type: 'error' });
        } finally {
            setIsImporting(false);
        }
    };

    const limitOptions = [10, 20, 50, 100, 200].map(opt => ({ value: String(opt), label: String(opt) }));

    return (
        <div className="space-y-6">
            <PageHeader
                title="Product Catalog"
                description="Centralized inventory intelligence and barcode mappings."
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            leftIcon={<RefreshCw />}
                            onClick={() => fetchCatalog()}
                            disabled={loading}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="secondary"
                            leftIcon={<RefreshCw />}
                            onClick={handleSync}
                        >
                            Sync with Inventory
                        </Button>
                        <Button variant="primary" leftIcon={<Plus />} onClick={openAddModal}>
                            Add New Item
                        </Button>
                        <Button variant="outline" leftIcon={<Upload />} onClick={openImportModal}>
                            Import Excel
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Hash className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Catalog SKUs</span>
                    </div>
                    <p className="text-4xl font-black text-gray-900">{summary.totalProducts}</p>
                </Card>

                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Scale className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Barcodes</span>
                    </div>
                    <p className="text-4xl font-black text-gray-900">{summary.uniqueBarcodes}</p>
                </Card>

                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Scale className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Dual-Named Products</span>
                    </div>
                    <p className="text-4xl font-black text-gray-900">{summary.dualNamedProducts}</p>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-lg">
                        <input
                            type="text"
                            placeholder="Search by name, barcode, item code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Showing {totalCount > 0 ? ((page - 1) * limit) + 1 : 0} - {Math.min(page * limit, totalCount)} of {totalCount}</span>
                    </div>
                </div>
            </Card>

            {/* Main Table */}
            <Card padding="none">
                {loading ? (
                    <div className="p-6">
                        <Skeleton variant="line" className="w-full h-12 mb-2" />
                        <Skeleton variant="line" className="w-full h-12 mb-2" />
                        <Skeleton variant="line" className="w-full h-12" />
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        title="No catalog items found"
                        description={searchTerm ? `No results for "${searchTerm}"` : 'Add items manually or import from Excel'}
                        icon="inbox"
                        actionLabel="Add Item"
                        onAction={openAddModal}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Product</th>
                                    <th className="px-6 py-4 font-semibold">Barcode</th>
                                    <th className="px-6 py-4 font-semibold">Unit</th>
                                    <th className="px-6 py-4 font-semibold">Last Updated</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.map((item) => (
                                    <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.productName}</p>
                                                    {item.productName2 && (
                                                        <p className="text-xs text-gray-500">{item.productName2}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                                {item.barcode}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="neutral">{item.unit}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(item.updatedAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(item.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Show:</span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                {limitOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <span className="text-sm font-medium text-gray-600 px-2">
                                Page {page} of {totalPages}
                            </span>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}
                description="Enter product details for barcode auto-fill during inventory entry"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
                            {editingItem ? 'Save Changes' : 'Add Item'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Product Information Section */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            Product Information
                        </h4>
                        <div className="space-y-4">
                            <Input
                                label="Product Name *"
                                required
                                placeholder="e.g., Organic Whole Milk"
                                value={formData.productName}
                                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                hint="This is the primary name that will appear in inventory"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Barcode / SKU *"
                                    required
                                    type="text"
                                    pattern="[0-9]*"
                                    inputMode="numeric"
                                    placeholder="e.g., 883471002"
                                    value={formData.barcode}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d+$/.test(val)) {
                                            setFormData({ ...formData, barcode: val });
                                        }
                                    }}
                                    hint="Numeric barcode for scanning"
                                />

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Unit of Measure *
                                    </label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white transition-colors"
                                    >
                                        <option value="pcs">pcs - Pieces</option>
                                        <option value="box">box - Box</option>
                                        <option value="bundle">bundle - Bundle</option>
                                        <option value="carton">carton - Carton</option>
                                        <option value="kg">kg - Kilogram</option>
                                        <option value="g">g - Gram</option>
                                        <option value="l">l - Liter</option>
                                        <option value="ml">ml - Milliliter</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information Section */}
                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4 text-purple-600" />
                            Additional Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Item Code"
                                placeholder="e.g., ITEM-001"
                                value={formData.itemCode}
                                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                                hint="Optional internal item code"
                            />

                            <Input
                                label="Category"
                                placeholder="e.g., Dairy, Beverages"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                hint="Optional product category"
                            />
                        </div>
                        <div className="mt-4">
                            <Input
                                label="Alternative Name"
                                placeholder="e.g., Secondary product name or alias"
                                value={formData.productName2}
                                onChange={(e) => setFormData({ ...formData, productName2: e.target.value })}
                                hint="Optional secondary name (e.g., local language)"
                            />
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <h5 className="font-semibold text-blue-900 text-sm">Auto-Fill Enabled</h5>
                                <p className="text-xs text-blue-700 mt-1">
                                    When adding inventory items, scanning this barcode will automatically fill the product name and unit.
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Import Catalog from Excel"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsImportModalOpen(false)} disabled={isImporting}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            leftIcon={<FileSpreadsheet />}
                            onClick={handleImport}
                            isLoading={isImporting}
                            disabled={!importFile}
                        >
                            {isImporting ? 'Importing...' : 'Import Data'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        {importFile ? (
                            <div>
                                <p className="font-semibold text-gray-900">{importFile.name}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {(importFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="font-semibold text-gray-900">Click to upload or drag and drop</p>
                                <p className="text-sm text-gray-500 mt-1">Excel files (.xlsx, .xls)</p>
                            </div>
                        )}
                    </div>

                    {importError && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                            {importError}
                        </div>
                    )}

                    {importResult && (
                        <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-green-800">
                                    <p className="font-semibold">Import completed successfully!</p>
                                    <p className="mt-1">
                                        Created: {importResult.created} | Updated: {importResult.updated} | Skipped: {importResult.skipped}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Catalog Item?"
                description="Are you sure you want to remove this item from the catalog? This will not affect existing inventory."
                variant="danger"
                confirmLabel="Delete"
            />
        </div>
    );
};

export default Catalog;
