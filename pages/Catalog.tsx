import React, { useState, useEffect } from 'react';
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
    ChevronRight,
    ArrowUpDown,
    Plus,
    X,
    Edit2,
    CheckCircle2,
    Type
} from 'lucide-react';
import { catalogService, CatalogItem } from '../services/catalogService';

const Catalog: React.FC = () => {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [formData, setFormData] = useState({
        productName: '',
        barcode: '',
        unit: 'pcs'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSync = async () => {
        if (!window.confirm('This will scan all inventory records and add missing barcodes to the catalog. Continue?')) {
            return;
        }

        try {
            setIsSyncing(true);
            const result = await catalogService.syncWithInventory();
            alert(`Sync complete! Added ${result.syncedCount} new product mappings to the catalog.`);
            fetchCatalog();
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Failed to sync catalog with inventory.');
        } finally {
            setIsSyncing(false);
        }
    };

    const fetchCatalog = async () => {
        try {
            setLoading(true);
            const data = await catalogService.getAll();
            setItems(data);
        } catch (error) {
            console.error('Failed to fetch catalog:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this item from the catalog? This will not affect existing inventory but will remove the auto-fill association.')) {
            return;
        }

        try {
            await catalogService.deleteItem(id);
            setItems(items.filter(item => item.id !== id));
        } catch (error) {
            alert('Failed to delete catalog item');
        }
    };

    const openEditModal = (item: CatalogItem) => {
        setEditingItem(item);
        setFormData({
            productName: item.productName,
            barcode: item.barcode,
            unit: item.unit
        });
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData({
            productName: '',
            barcode: '',
            unit: 'pcs'
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            if (editingItem) {
                await catalogService.updateItem(editingItem.id, formData);
            } else {
                await catalogService.createItem(formData);
            }
            setIsModalOpen(false);
            fetchCatalog();
        } catch (error) {
            alert('Failed to save catalog item');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in p-2">
            {/* Header section with enhanced visibility */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-1 h-12 bg-blue-500 rounded-full blur-sm"></div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-4">
                        <Database className="w-10 h-10 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                        Product Catalog
                    </h1>
                    <p className="text-slate-300 font-medium mt-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Centralized inventory intelligence and barcode mappings.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:bg-slate-100 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Item
                    </button>

                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        {isSyncing ? 'Synchronizing...' : 'Sync with Inventory'}
                    </button>

                    <button
                        onClick={() => { setIsRefreshing(true); fetchCatalog(); }}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800/80 hover:bg-slate-700 text-white font-bold rounded-2xl border border-white/10 shadow-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Cards - Enhanced Contrast */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group p-1 rounded-3xl bg-gradient-to-br from-blue-500/20 to-transparent border border-white/10 hover:border-blue-500/30 transition-all">
                    <div className="p-6 bg-slate-900/60 backdrop-blur-2xl rounded-[1.4rem]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                <Hash className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">Master Data</span>
                        </div>
                        <p className="text-slate-300 font-bold text-sm tracking-wide uppercase">Total Catalog SKUs</p>
                        <p className="text-4xl font-black text-white mt-1 drop-shadow-md">{items.length}</p>
                    </div>
                </div>

                <div className="group p-1 rounded-3xl bg-gradient-to-br from-purple-500/20 to-transparent border border-white/10 hover:border-purple-500/30 transition-all">
                    <div className="p-6 bg-slate-900/60 backdrop-blur-2xl rounded-[1.4rem]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                                <Scale className="w-6 h-6 text-purple-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">Unique Identifiers</span>
                        </div>
                        <p className="text-slate-300 font-bold text-sm tracking-wide uppercase">Active Barcodes</p>
                        <p className="text-4xl font-black text-white mt-1 drop-shadow-md">
                            {new Set(items.map(i => i.barcode)).size}
                        </p>
                    </div>
                </div>

                <div className="group p-1 rounded-3xl bg-gradient-to-br from-orange-500/20 to-transparent border border-white/10 hover:border-orange-500/30 transition-all">
                    <div className="p-6 bg-slate-900/60 backdrop-blur-2xl rounded-[1.4rem]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                                <RefreshCw className="w-6 h-6 text-orange-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2 py-1 rounded-md">Auto-Update</span>
                        </div>
                        <p className="text-slate-300 font-bold text-sm tracking-wide uppercase">Sync Status</p>
                        <p className="text-4xl font-black text-white mt-1 drop-shadow-md">Active</p>
                    </div>
                </div>
            </div>

            {/* Main Content Table - Enhanced Text Visibility */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-[2rem] blur-2xl opacity-50"></div>

                <div className="relative bg-slate-900/80 backdrop-blur-3xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="relative max-w-lg w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/70" />
                            <input
                                type="text"
                                placeholder="Search by name, barcode, or SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-[1.25rem] text-white text-lg placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-slate-300 text-sm font-bold bg-white/5 px-4 py-2 rounded-xl">
                            <ArrowUpDown className="w-4 h-4 text-blue-400" />
                            Sorting by Last Updated
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/40 text-slate-200 text-xs font-black uppercase tracking-[0.15em] border-b border-white/5">
                                    <th className="px-8 py-6">Product Information</th>
                                    <th className="px-8 py-6">Code / Identifier</th>
                                    <th className="px-8 py-6">Standard Unit</th>
                                    <th className="px-8 py-6">Catalog Record</th>
                                    <th className="px-8 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-8 py-10">
                                                <div className="h-6 bg-white/5 rounded-xl w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredItems.length > 0 ? (
                                    filteredItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-500/[0.03] transition-colors group/row">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-blue-500/10 rounded-2xl group-hover/row:scale-110 transition-transform shadow-lg border border-blue-500/10">
                                                        <Package className="w-6 h-6 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg tracking-tight leading-tight">{item.productName}</p>
                                                        <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-widest mt-0.5">Verified Entry</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <code className="text-indigo-300 font-black text-md bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 select-all">
                                                    {item.barcode}
                                                </code>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-xl text-sm font-black text-white shadow-sm capitalize">
                                                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                                                    {item.unit}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-slate-300 font-bold">
                                                    <Calendar className="w-4 h-4 text-orange-400" />
                                                    {new Date(item.updatedAt).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="p-3 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-2xl transition-all shadow-sm active:scale-90"
                                                        title="Edit catalog item"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all shadow-sm active:scale-90"
                                                        title="Permanently remove from catalog"
                                                    >
                                                        <Trash2 className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center bg-slate-950/20">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="relative">
                                                    <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                                                    <div className="relative p-8 bg-slate-800/50 rounded-full border border-white/5">
                                                        <AlertCircle className="w-16 h-16 text-slate-500 opacity-50" />
                                                    </div>
                                                </div>
                                                <div className="max-w-xs mx-auto">
                                                    <p className="text-2xl font-black text-white mb-2">Discovery Needed</p>
                                                    <p className="text-slate-400 font-medium">
                                                        Try syncing with existing inventory or scan a new product to populate this list.
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 bg-slate-950/40 border-t border-white/5 flex justify-between items-center">
                        <span className="text-slate-400 text-sm font-bold">Showing {filteredItems.length} entries</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">System Synchronized</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] animate-scale-in">
                        <div className="p-8 border-b border-white/5 bg-slate-800/20 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl">
                                    <Database className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">
                                        {editingItem ? 'Edit Entry' : 'Manual Registry'}
                                    </h2>
                                    <p className="text-slate-400 text-sm font-medium">Update the global product intelligence.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-slate-300 font-black text-xs uppercase tracking-widest ml-1">
                                    <Type className="w-3 h-3 text-blue-400" />
                                    Product Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.productName}
                                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-inner"
                                    placeholder="Enter canonical name..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-slate-300 font-black text-xs uppercase tracking-widest ml-1">
                                        <Hash className="w-3 h-3 text-purple-400" />
                                        Barcode / SKU
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        value={formData.barcode}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || /^\d+$/.test(val)) {
                                                setFormData({ ...formData, barcode: val });
                                            }
                                        }}
                                        className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-mono font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all shadow-inner"
                                        placeholder="00000000..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-slate-300 font-black text-xs uppercase tracking-widest ml-1">
                                        <Scale className="w-3 h-3 text-orange-400" />
                                        Default Unit
                                    </label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all shadow-inner appearance-none cursor-pointer"
                                    >
                                        <option value="pcs">pcs</option>
                                        <option value="box">box</option>
                                        <option value="bundle">bundle</option>
                                        <option value="carton">carton</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSubmitting}
                                    type="submit"
                                    className="flex-2 flex items-center justify-center gap-2 px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            {editingItem ? 'Save Changes' : 'Register Item'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Catalog;
