import React, { useState, useEffect } from 'react';
import {
    Package,
    Search,
    Trash2,
    Database,
    RefreshCw,
    AlertCircle,
    Hash,
    Scale
} from 'lucide-react';
import { catalogService, CatalogItem } from '../services/catalogService';

const Catalog: React.FC = () => {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

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

    const filteredItems = items.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Database className="w-8 h-8 text-blue-400" />
                        Product Catalog
                    </h1>
                    <p className="text-slate-400 mt-1">Manage global barcode mappings and auto-fill data.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30 transition-all disabled:opacity-50"
                        title="Search inventory for missing barcodes"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync with Inventory'}
                    </button>

                    <button
                        onClick={() => { setIsRefreshing(true); fetchCatalog(); }}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-xl border border-slate-700/50 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh Catalog
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-2xl">
                            <Hash className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Total SKUs</p>
                            <p className="text-2xl font-bold text-white">{items.length}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-2xl">
                            <Scale className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Active Mappings</p>
                            <p className="text-2xl font-bold text-white">
                                {new Set(items.map(i => i.barcode)).size}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/20 rounded-2xl">
                            <RefreshCw className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Last Synced</p>
                            <p className="text-lg font-bold text-white">Real-time</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search barcode or product name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900/30 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Product Details</th>
                                <th className="px-6 py-4 font-medium">Barcode / SKU</th>
                                <th className="px-6 py-4 font-medium">Default Unit</th>
                                <th className="px-6 py-4 font-medium">Last Updated</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8">
                                            <div className="h-4 bg-slate-700/50 rounded w-3/4 mx-auto"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                                    <Package className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <span className="font-medium text-white">{item.productName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                            {item.barcode}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-300">
                                                {item.unit}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(item.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                                title="Remove from catalog"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-4 bg-slate-700/30 rounded-full">
                                                <AlertCircle className="w-10 h-10 text-slate-500" />
                                            </div>
                                            <div className="text-slate-400">
                                                <p className="font-medium">No records found</p>
                                                <p className="text-sm">New items will be added automatically when scanned.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Catalog;
